import { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import {
  addUserToBlacklist,
  createUserGroup,
  deleteUserGroup,
  getPermissionCatalog,
  listBlacklistEntries,
  listUserGroupsDetailed,
  listUsersDetailed,
  removeUserFromBlacklist,
  updateUserGroup,
  updateUserGroupPermissions,
} from '../services/permissionStore.js';

const router = Router();

function getStatusCode(error, fallback = 500) {
  return error?.statusCode || fallback;
}

router.get('/perm/me', requireAuth, async (req, res) => {
  try {
    res.json({
      access: {
        userId: req.user.userId,
        username: req.user.username,
        email: req.user.email,
        nickname: req.user.nickname,
        groups: req.user.groups,
        groupIds: req.user.groupIds,
        permissions: req.user.permissions,
        isBlacklisted: req.user.isBlacklisted,
      },
      catalog: getPermissionCatalog(),
    });
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

router.get('/perm/usergroup', requirePermission('perm:view'), async (req, res) => {
  try {
    const [groups, users] = await Promise.all([
      listUserGroupsDetailed(),
      listUsersDetailed(),
    ]);
    res.json({
      groups,
      users,
      catalog: getPermissionCatalog(),
    });
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

router.get('/perm/users', requirePermission('user:listall'), async (req, res) => {
  try {
    res.json({ users: await listUsersDetailed() });
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

router.post('/perm/usergroup', requirePermission('perm:add_group'), async (req, res) => {
  try {
    const group = await createUserGroup(req.body || {});
    res.status(201).json({ group });
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

router.put('/perm/usergroup/:groupId', requirePermission('perm:update_group'), async (req, res) => {
  try {
    const group = await updateUserGroup(req.params.groupId, req.body || {});
    res.json({ group });
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

router.delete('/perm/usergroup/:groupId', requirePermission('perm:delete_group'), async (req, res) => {
  try {
    const result = await deleteUserGroup(req.params.groupId);
    res.json(result);
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

router.put('/perm/usergroup/:groupId/perm', requirePermission('perm:update_group_perm'), async (req, res) => {
  try {
    const group = await updateUserGroupPermissions(req.params.groupId, req.body?.permissions || [], req.user);
    res.json({ group });
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

router.get('/blacklist', requirePermission('blacklist:view'), async (req, res) => {
  try {
    res.json({ entries: await listBlacklistEntries() });
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

router.post('/blacklist/:userId', requirePermission('blacklist:add'), async (req, res) => {
  try {
    await addUserToBlacklist(req.params.userId, req.user.userId, req.body?.blockReason || '');
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

router.delete('/blacklist/:userId', requirePermission('blacklist:delete'), async (req, res) => {
  try {
    const result = await removeUserFromBlacklist(req.params.userId);
    res.json(result);
  } catch (error) {
    res.status(getStatusCode(error)).json({ error: error.message });
  }
});

export default router;