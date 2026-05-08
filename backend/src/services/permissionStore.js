import mongoose from 'mongoose';
import User from '../models/User.js';
import UserGroup from '../models/UserGroup.js';
import Blacklist from '../models/Blacklist.js';
import { ALL_PERMISSIONS, PERMISSION_GROUPS, SYSTEM_GROUP_DEFINITIONS } from './permissionConstants.js';

function uniqStrings(values = []) {
  return [...new Set(values.filter(Boolean).map((value) => String(value)))];
}

function normalizePermissionList(permissions = []) {
  const allowed = new Set(ALL_PERMISSIONS);
  return uniqStrings(permissions).filter((permission) => allowed.has(permission));
}

function toObjectIds(values = []) {
  return uniqStrings(values)
    .filter((value) => mongoose.isValidObjectId(value))
    .map((value) => new mongoose.Types.ObjectId(value));
}

function serializeUserGroup(doc, members = []) {
  return {
    id: String(doc._id),
    key: doc.key,
    name: doc.name,
    description: doc.description || '',
    permissions: normalizePermissionList(doc.permissions || []),
    isSystem: Boolean(doc.isSystem),
    members,
    memberCount: members.length,
    createdAt: doc.createdAt ? new Date(doc.createdAt).getTime() : null,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).getTime() : null,
  };
}

function serializeUser(doc, blacklistSet = new Set()) {
  return {
    id: String(doc._id),
    email: doc.email,
    nickname: doc.nickname || doc.email,
    groups: Array.isArray(doc.groups)
      ? doc.groups.map((group) => ({
          id: String(group._id || group),
          key: group.key || '',
          name: group.name || '',
        }))
      : [],
    isBlacklisted: blacklistSet.has(String(doc._id)),
    createdAt: doc.createdAt ? new Date(doc.createdAt).getTime() : null,
  };
}

function buildAccessPayload(userDoc, groupDocs, blacklistDoc) {
  const groupIds = [];
  const groups = [];
  const permissionSet = new Set();

  for (const group of groupDocs) {
    const groupId = String(group._id);
    groupIds.push(groupId);
    groups.push({
      id: groupId,
      key: group.key,
      name: group.name,
      isSystem: Boolean(group.isSystem),
    });

    for (const permission of normalizePermissionList(group.permissions || [])) {
      permissionSet.add(permission);
    }
  }

  if (groups.some((group) => group.key === 'owner')) {
    for (const permission of ALL_PERMISSIONS) {
      permissionSet.add(permission);
    }
  }

  return {
    userId: String(userDoc._id),
    username: userDoc.email,
    email: userDoc.email,
    nickname: userDoc.nickname || userDoc.email,
    groupIds,
    groups,
    permissions: [...permissionSet].sort(),
    isBlacklisted: Boolean(blacklistDoc),
    blacklist: blacklistDoc
      ? {
          id: String(blacklistDoc._id),
          reason: blacklistDoc.blockReason || '',
          createdAt: blacklistDoc.createdAt ? new Date(blacklistDoc.createdAt).getTime() : null,
        }
      : null,
  };
}

async function getSystemGroupMap() {
  const groups = await UserGroup.find({ key: { $in: SYSTEM_GROUP_DEFINITIONS.map((item) => item.key) } }).lean();
  return new Map(groups.map((group) => [group.key, group]));
}

function getLegacyGroupKey(userDoc) {
  if (userDoc.role === 'owner') {
    return 'owner';
  }
  if (userDoc.role === 'admin') {
    return 'admin';
  }
  return 'user';
}

async function ensureSingleOwnerMembership(ownerGroupId, adminGroupId) {
  const owners = await User.find({ groups: ownerGroupId })
    .sort({ createdAt: 1, _id: 1 })
    .select('_id groups')
    .lean();

  if (owners.length <= 1) {
    return;
  }

  const extraOwnerIds = owners.slice(1).map((user) => user._id);
  const update = {
    $pull: { groups: ownerGroupId },
  };

  if (adminGroupId) {
    update.$addToSet = { groups: adminGroupId };
  }

  await User.updateMany({ _id: { $in: extraOwnerIds } }, update);
}

export async function initializePermissionSystem() {
  for (const group of SYSTEM_GROUP_DEFINITIONS) {
    await UserGroup.updateOne(
      { key: group.key },
      {
        $setOnInsert: {
          key: group.key,
        },
        $set: {
          name: group.name,
          description: group.description,
          permissions: normalizePermissionList(group.permissions),
          isSystem: true,
        },
      },
      { upsert: true }
    );
  }

  const systemGroups = await getSystemGroupMap();
  const bulkOps = [];
  const users = await User.find({}).select('_id role groups').lean();

  for (const user of users) {
    const existingGroups = Array.isArray(user.groups) ? user.groups : [];
    if (existingGroups.length > 0) {
      continue;
    }

    const groupKey = getLegacyGroupKey(user);
    const targetGroup = systemGroups.get(groupKey) || systemGroups.get('user');
    if (!targetGroup) {
      continue;
    }

    bulkOps.push({
      updateOne: {
        filter: { _id: user._id },
        update: { $set: { groups: [targetGroup._id] } },
      },
    });
  }

  if (bulkOps.length > 0) {
    await User.bulkWrite(bulkOps, { ordered: false });
  }

  const ownerGroup = systemGroups.get('owner');
  const adminGroup = systemGroups.get('admin');
  if (ownerGroup) {
    await ensureSingleOwnerMembership(ownerGroup._id, adminGroup?._id || null);
  }

  const [groupCount, blacklistCount] = await Promise.all([
    UserGroup.countDocuments(),
    Blacklist.countDocuments(),
  ]);

  return {
    groupCount,
    blacklistCount,
  };
}

export async function getUserAccessByEmail(email) {
  const user = await User.findOne({ email })
    .select('email nickname groups')
    .populate('groups', 'key name permissions isSystem')
    .lean();

  if (!user) {
    return null;
  }

  const blacklist = await Blacklist.findOne({ userId: user._id }).select('_id blockReason createdAt').lean();
  return buildAccessPayload(user, user.groups || [], blacklist);
}

export async function getUserAccessById(userId) {
  if (!mongoose.isValidObjectId(userId)) {
    return null;
  }

  const user = await User.findById(userId)
    .select('email nickname groups')
    .populate('groups', 'key name permissions isSystem')
    .lean();

  if (!user) {
    return null;
  }

  const blacklist = await Blacklist.findOne({ userId: user._id }).select('_id blockReason createdAt').lean();
  return buildAccessPayload(user, user.groups || [], blacklist);
}

export function hasPermission(access, permission) {
  return Boolean(access && Array.isArray(access.permissions) && access.permissions.includes(permission));
}

function assertPermissionSubset(candidatePermissions, actorPermissions) {
  const actorSet = new Set(actorPermissions || []);
  const invalid = normalizePermissionList(candidatePermissions).find((permission) => !actorSet.has(permission));
  if (invalid) {
    const error = new Error(`不能授予超出自身范围的权限：${invalid}`);
    error.statusCode = 403;
    throw error;
  }
}

function assertTargetGroupEditable(actorAccess, groupDoc) {
  if (!groupDoc) {
    const error = new Error('用户组不存在');
    error.statusCode = 404;
    throw error;
  }

  if ((actorAccess.groupIds || []).includes(String(groupDoc._id))) {
    const error = new Error('不能修改自身所属用户组的权限');
    error.statusCode = 403;
    throw error;
  }

  assertPermissionSubset(groupDoc.permissions || [], actorAccess.permissions || []);
}

async function listMembersByGroupId(groupIds) {
  const users = await User.find({ groups: { $in: groupIds } })
    .select('email nickname groups')
    .lean();

  const membersByGroupId = new Map(groupIds.map((groupId) => [String(groupId), []]));
  for (const user of users) {
    const member = {
      id: String(user._id),
      email: user.email,
      nickname: user.nickname || user.email,
    };

    for (const groupId of user.groups || []) {
      const key = String(groupId);
      if (membersByGroupId.has(key)) {
        membersByGroupId.get(key).push(member);
      }
    }
  }

  for (const members of membersByGroupId.values()) {
    members.sort((left, right) => left.email.localeCompare(right.email, 'zh-CN'));
  }

  return membersByGroupId;
}

export async function listUserGroupsDetailed() {
  const groups = await UserGroup.find({}).sort({ isSystem: -1, key: 1 }).lean();
  const groupIds = groups.map((group) => group._id);
  const membersByGroupId = await listMembersByGroupId(groupIds);
  return groups.map((group) => serializeUserGroup(group, membersByGroupId.get(String(group._id)) || []));
}

export async function listUsersDetailed() {
  const [users, blacklisted] = await Promise.all([
    User.find({}).select('email nickname groups createdAt').populate('groups', 'key name').sort({ createdAt: 1 }).lean(),
    Blacklist.find({}).select('userId').lean(),
  ]);

  const blacklistSet = new Set(blacklisted.map((item) => String(item.userId)));
  return users.map((user) => serializeUser(user, blacklistSet));
}

export async function createUserGroup(payload = {}) {
  const key = String(payload.key || '').trim().toLowerCase();
  const name = String(payload.name || '').trim();
  const description = String(payload.description || '').trim();
  const memberIds = toObjectIds(payload.memberIds || []);

  if (!key || !/^[a-z0-9_-]+$/.test(key)) {
    const error = new Error('用户组标识只能包含小写字母、数字、下划线和短横线');
    error.statusCode = 400;
    throw error;
  }

  if (!name) {
    const error = new Error('用户组名称不能为空');
    error.statusCode = 400;
    throw error;
  }

  const existing = await UserGroup.findOne({ key }).select('_id').lean();
  if (existing) {
    const error = new Error('用户组标识已存在');
    error.statusCode = 409;
    throw error;
  }

  const group = await UserGroup.create({
    key,
    name,
    description,
    permissions: [],
    isSystem: false,
  });

  if (memberIds.length > 0) {
    await User.updateMany({ _id: { $in: memberIds } }, { $addToSet: { groups: group._id } });
  }

  return group;
}

async function replaceGroupMembers(groupDoc, memberIds) {
  const nextMemberIds = new Set(memberIds.map((id) => String(id)));
  const currentUsers = await User.find({ groups: groupDoc._id }).select('_id').lean();
  const currentMemberIds = new Set(currentUsers.map((user) => String(user._id)));
  const toRemove = [...currentMemberIds].filter((id) => !nextMemberIds.has(id));
  const toAdd = [...nextMemberIds].filter((id) => !currentMemberIds.has(id));

  if (groupDoc.key === 'owner' && nextMemberIds.size !== 1) {
    const error = new Error('owner 用户组必须且只能包含一个成员');
    error.statusCode = 400;
    throw error;
  }

  if (toRemove.length > 0) {
    await User.updateMany({ _id: { $in: toObjectIds(toRemove) } }, { $pull: { groups: groupDoc._id } });
  }

  if (toAdd.length > 0) {
    await User.updateMany({ _id: { $in: toObjectIds(toAdd) } }, { $addToSet: { groups: groupDoc._id } });
  }
}

export async function updateUserGroup(groupId, payload = {}) {
  if (!mongoose.isValidObjectId(groupId)) {
    const error = new Error('用户组不存在');
    error.statusCode = 404;
    throw error;
  }

  const group = await UserGroup.findById(groupId);
  if (!group) {
    const error = new Error('用户组不存在');
    error.statusCode = 404;
    throw error;
  }

  const name = payload.name === undefined ? group.name : String(payload.name || '').trim();
  const description = payload.description === undefined ? group.description : String(payload.description || '').trim();
  const memberIds = payload.memberIds === undefined ? null : toObjectIds(payload.memberIds || []);

  if (!name) {
    const error = new Error('用户组名称不能为空');
    error.statusCode = 400;
    throw error;
  }

  group.name = name;
  group.description = description;
  await group.save();

  if (memberIds) {
    await replaceGroupMembers(group, memberIds);
  }

  return group;
}

export async function deleteUserGroup(groupId) {
  if (!mongoose.isValidObjectId(groupId)) {
    const error = new Error('用户组不存在');
    error.statusCode = 404;
    throw error;
  }

  const group = await UserGroup.findById(groupId);
  if (!group) {
    const error = new Error('用户组不存在');
    error.statusCode = 404;
    throw error;
  }

  if (group.isSystem) {
    const error = new Error('系统用户组不允许删除');
    error.statusCode = 400;
    throw error;
  }

  await User.updateMany({ groups: group._id }, { $pull: { groups: group._id } });
  await group.deleteOne();
  return { success: true };
}

export async function updateUserGroupPermissions(groupId, permissions, actorAccess) {
  if (!mongoose.isValidObjectId(groupId)) {
    const error = new Error('用户组不存在');
    error.statusCode = 404;
    throw error;
  }

  const group = await UserGroup.findById(groupId);
  assertTargetGroupEditable(actorAccess, group);

  const nextPermissions = normalizePermissionList(permissions || []);
  assertPermissionSubset(nextPermissions, actorAccess.permissions || []);

  group.permissions = nextPermissions;
  await group.save();
  return group;
}

export async function listBlacklistEntries() {
  const entries = await Blacklist.find({})
    .populate('userId', 'email nickname')
    .populate('blockedBy', 'email nickname')
    .sort({ createdAt: -1 })
    .lean();

  return entries.map((entry) => ({
    id: String(entry._id),
    user: entry.userId
      ? {
          id: String(entry.userId._id),
          email: entry.userId.email,
          nickname: entry.userId.nickname || entry.userId.email,
        }
      : null,
    blockedBy: entry.blockedBy
      ? {
          id: String(entry.blockedBy._id),
          email: entry.blockedBy.email,
          nickname: entry.blockedBy.nickname || entry.blockedBy.email,
        }
      : null,
    blockReason: entry.blockReason || '',
    createdAt: entry.createdAt ? new Date(entry.createdAt).getTime() : null,
  }));
}

export async function addUserToBlacklist(userId, blockedBy, blockReason = '') {
  if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(blockedBy)) {
    const error = new Error('用户不存在');
    error.statusCode = 404;
    throw error;
  }

  const targetUser = await User.findById(userId).select('_id').lean();
  if (!targetUser) {
    const error = new Error('用户不存在');
    error.statusCode = 404;
    throw error;
  }

  await Blacklist.findOneAndUpdate(
    { userId },
    {
      userId,
      blockedBy,
      blockReason: String(blockReason || '').trim().slice(0, 200),
      createdAt: new Date(),
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );

  return true;
}

export async function removeUserFromBlacklist(userId) {
  if (!mongoose.isValidObjectId(userId)) {
    return { success: true };
  }

  await Blacklist.deleteOne({ userId });
  return { success: true };
}

export function getPermissionCatalog() {
  return {
    groups: PERMISSION_GROUPS,
    permissions: ALL_PERMISSIONS,
  };
}