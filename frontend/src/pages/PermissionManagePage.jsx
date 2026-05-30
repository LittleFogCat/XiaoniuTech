import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  addBlacklistEntry,
  createUserGroup,
  deleteUserGroup,
  fetchBlacklistEntries,
  fetchPermissionMe,
  fetchUserGroupsOverview,
  removeBlacklistEntry,
  updateUserGroup,
  updateUserGroupPermissions,
} from '../services/adminApi';
import usePageSeo from '../hooks/usePageSeo';
import { useAuthState } from '../contexts/AuthContext';
import ManagementPageLayout from '../components/layout/ManagementPageLayout';

function normalizeMemberIds(group) {
  return Array.isArray(group?.members) ? group.members.map((member) => member.id) : [];
}

export default function PermissionManagePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasSession } = useAuthState();
  const [access, setAccess] = useState(null);
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [catalog, setCatalog] = useState({ groups: [], permissions: [] });
  const [blacklistEntries, setBlacklistEntries] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [groupDraft, setGroupDraft] = useState({ name: '', description: '', memberIds: [] });
  const [permissionDraft, setPermissionDraft] = useState([]);
  const [createDraft, setCreateDraft] = useState({ key: '', name: '', description: '' });
  const [blacklistDraft, setBlacklistDraft] = useState({ userId: '', blockReason: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const canViewGroups = access?.permissions?.includes('perm:view');
  const canViewBlacklist = access?.permissions?.includes('blacklist:view');
  const canUpdateGroup = access?.permissions?.includes('perm:update_group');
  const canUpdateGroupPermissions = access?.permissions?.includes('perm:update_group_perm');
  const canCreateGroup = access?.permissions?.includes('perm:add_group');
  const canDeleteGroup = access?.permissions?.includes('perm:delete_group');
  const canAddBlacklist = access?.permissions?.includes('blacklist:add');
  const canDeleteBlacklist = access?.permissions?.includes('blacklist:delete');
  const currentTab = searchParams.get('tab') || (canViewGroups ? 'groups' : 'blacklist');

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) || null,
    [groups, selectedGroupId]
  );
  const sortedUsers = useMemo(() => {
    const selectedMemberIds = new Set(groupDraft.memberIds || []);
    return [...users].sort((left, right) => {
      const leftSelected = selectedMemberIds.has(left.id) ? 1 : 0;
      const rightSelected = selectedMemberIds.has(right.id) ? 1 : 0;
      if (leftSelected !== rightSelected) {
        return rightSelected - leftSelected;
      }

      const leftLabel = String(left.nickname || left.email || '');
      const rightLabel = String(right.nickname || right.email || '');
      return leftLabel.localeCompare(rightLabel, 'zh-CN');
    });
  }, [users, groupDraft.memberIds]);

  usePageSeo({
    title: '权限管理 - XiaoNiu Tech',
    description: '管理权限组、成员分配与黑名单策略的后台页面。',
    robots: 'noindex, nofollow',
  });

  useEffect(() => {
    if (!hasSession) {
      navigate('/login?redirect=%2Fpermissions', { replace: true });
    }
  }, [navigate, hasSession]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (currentTab === 'groups' && !canViewGroups && canViewBlacklist) {
      updateTab('blacklist');
    }

    if (currentTab === 'blacklist' && !canViewBlacklist && canViewGroups) {
      updateTab('groups');
    }
  }, [loading, currentTab, canViewGroups, canViewBlacklist]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const me = await fetchPermissionMe();
      setAccess(me.access);

      if (!me.access?.permissions?.includes('perm:view') && !me.access?.permissions?.includes('blacklist:view')) {
        setError('当前账号没有权限管理模块访问权限');
        setLoading(false);
        return;
      }

      if (me.access?.permissions?.includes('perm:view')) {
        const overview = await fetchUserGroupsOverview();
        setGroups(overview.groups || []);
        setUsers(overview.users || []);
        setCatalog(overview.catalog || { groups: [], permissions: [] });
        if (!selectedGroupId && overview.groups?.length) {
          setSelectedGroupId(overview.groups[0].id);
        }
      }

      if (me.access?.permissions?.includes('blacklist:view')) {
        const blacklist = await fetchBlacklistEntries();
        setBlacklistEntries(blacklist.entries || []);
      }
    } catch (nextError) {
      setError(nextError.message || '加载权限管理数据失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!hasSession) {
      return;
    }
    loadData();
  }, [hasSession]);

  useEffect(() => {
    if (!selectedGroup) {
      return;
    }
    setGroupDraft({
      name: selectedGroup.name || '',
      description: selectedGroup.description || '',
      memberIds: normalizeMemberIds(selectedGroup),
    });
    setPermissionDraft(selectedGroup.permissions || []);
  }, [selectedGroup]);

  function updateTab(tab) {
    const params = new URLSearchParams();
    params.set('tab', tab);
    setSearchParams(params, { replace: true });
  }

  async function handleCreateGroup() {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await createUserGroup(createDraft);
      setCreateDraft({ key: '', name: '', description: '' });
      setMessage('用户组已创建');
      await loadData();
    } catch (nextError) {
      setError(nextError.message || '创建用户组失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveGroupInfo() {
    if (!selectedGroup) {
      return;
    }
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await updateUserGroup(selectedGroup.id, groupDraft);
      setMessage('用户组信息已更新');
      await loadData();
    } catch (nextError) {
      setError(nextError.message || '更新用户组失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePermissions() {
    if (!selectedGroup) {
      return;
    }
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await updateUserGroupPermissions(selectedGroup.id, permissionDraft);
      setMessage('用户组权限已更新');
      await loadData();
    } catch (nextError) {
      setError(nextError.message || '更新用户组权限失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteGroup() {
    if (!selectedGroup || selectedGroup.isSystem) {
      return;
    }
    if (!window.confirm(`确定要删除用户组“${selectedGroup.name}”吗？`)) {
      return;
    }
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await deleteUserGroup(selectedGroup.id);
      setSelectedGroupId('');
      setMessage('用户组已删除');
      await loadData();
    } catch (nextError) {
      setError(nextError.message || '删除用户组失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddBlacklist() {
    if (!blacklistDraft.userId) {
      setError('请选择要加入黑名单的用户');
      return;
    }
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await addBlacklistEntry(blacklistDraft.userId, blacklistDraft.blockReason);
      setBlacklistDraft({ userId: '', blockReason: '' });
      setMessage('用户已加入黑名单');
      await loadData();
    } catch (nextError) {
      setError(nextError.message || '添加黑名单失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveBlacklist(userId) {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await removeBlacklistEntry(userId);
      setMessage('黑名单记录已移除');
      await loadData();
    } catch (nextError) {
      setError(nextError.message || '移除黑名单失败');
    } finally {
      setSaving(false);
    }
  }

  function togglePermission(permission) {
    setPermissionDraft((previous) => (
      previous.includes(permission)
        ? previous.filter((item) => item !== permission)
        : [...previous, permission]
    ));
  }

  function toggleMember(userId) {
    setGroupDraft((previous) => ({
      ...previous,
      memberIds: previous.memberIds.includes(userId)
        ? previous.memberIds.filter((item) => item !== userId)
        : [...previous.memberIds, userId],
    }));
  }

  return (
    <ManagementPageLayout eyebrow="Permissions" title="权限管理">
        <div className="mb-5 flex flex-wrap gap-2">
          {canViewGroups && (
            <button
              type="button"
              onClick={() => updateTab('groups')}
              className={`rounded-xl px-4 py-2 text-sm transition ${currentTab === 'groups' ? 'bg-[var(--accent-soft)] text-[color:var(--text-primary)]' : 'bg-[var(--surface-bg)] text-[color:var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}
            >
              用户组与权限
            </button>
          )}
          {canViewBlacklist && (
            <button
              type="button"
              onClick={() => updateTab('blacklist')}
              className={`rounded-xl px-4 py-2 text-sm transition ${currentTab === 'blacklist' ? 'bg-[var(--accent-soft)] text-[color:var(--text-primary)]' : 'bg-[var(--surface-bg)] text-[color:var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}
            >
              黑名单管理
            </button>
          )}
        </div>

        {(message || error) && (
          <div className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${error ? 'border-[color:var(--danger-border)] bg-[var(--danger-soft)] text-[color:var(--danger-text)]' : 'border-[color:var(--success-border)] bg-[var(--success-soft)] text-[color:var(--success-text)]'}`}>
            {error || message}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-4 py-12 text-center text-[color:var(--text-muted)]">加载权限管理数据中...</div>
        ) : error && !access ? (
          <div className="rounded-3xl border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-4 py-8 text-[color:var(--danger-text)]">{error}</div>
        ) : currentTab === 'groups' ? (
          <div className="grid gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]">
            <aside className="space-y-4">
              {canCreateGroup && (
                <div className="rounded-3xl border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-4">
                  <h2 className="text-lg font-semibold">新增用户组</h2>
                  <div className="mt-4 space-y-3 text-sm">
                    <input value={createDraft.key} onChange={(event) => setCreateDraft((previous) => ({ ...previous, key: event.target.value }))} placeholder="组标识，例如 editor" className="w-full rounded-xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-3 py-2.5 outline-none" />
                    <input value={createDraft.name} onChange={(event) => setCreateDraft((previous) => ({ ...previous, name: event.target.value }))} placeholder="组名称" className="w-full rounded-xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-3 py-2.5 outline-none" />
                    <textarea value={createDraft.description} onChange={(event) => setCreateDraft((previous) => ({ ...previous, description: event.target.value }))} placeholder="组描述" rows={3} className="w-full rounded-xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-3 py-2.5 outline-none" />
                    <button type="button" disabled={saving} onClick={handleCreateGroup} className="w-full rounded-xl border border-[color:var(--accent-border)] bg-[var(--accent-soft)] px-4 py-2.5 text-sm text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-40">创建用户组</button>
                  </div>
                </div>
              )}

              <div className="rounded-3xl border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-3">
                {groups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setSelectedGroupId(group.id)}
                    className={`mb-2 w-full rounded-2xl px-4 py-3 text-left transition ${selectedGroupId === group.id ? 'bg-[var(--accent-soft)] text-[color:var(--text-primary)]' : 'bg-[var(--surface-bg)] text-[color:var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{group.name}</div>
                        <div className="mt-1 text-xs text-[color:var(--text-faint)]">{group.key}</div>
                      </div>
                      <div className="text-xs text-[color:var(--text-faint)]">{group.memberCount} 人</div>
                    </div>
                  </button>
                ))}
              </div>
            </aside>

            <section className="space-y-5">
              {selectedGroup ? (
                <>
                  <div className="rounded-3xl border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.24em] text-[color:var(--accent-solid)]">{selectedGroup.key}</div>
                        <h2 className="mt-2 text-xl font-semibold">{selectedGroup.name}</h2>
                      </div>
                      {canDeleteGroup && !selectedGroup.isSystem && (
                        <button type="button" disabled={saving} onClick={handleDeleteGroup} className="rounded-xl border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-4 py-2.5 text-sm text-[color:var(--danger-text)] transition hover:opacity-85 disabled:opacity-40">删除用户组</button>
                      )}
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                      <div className="space-y-3">
                        <input value={groupDraft.name} disabled={!canUpdateGroup || saving} onChange={(event) => setGroupDraft((previous) => ({ ...previous, name: event.target.value }))} className="w-full rounded-xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-3 py-2.5 outline-none disabled:opacity-50" />
                        <textarea value={groupDraft.description} disabled={!canUpdateGroup || saving} onChange={(event) => setGroupDraft((previous) => ({ ...previous, description: event.target.value }))} rows={3} className="w-full rounded-xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-3 py-2.5 outline-none disabled:opacity-50" />
                        {canUpdateGroup && (
                          <button type="button" disabled={saving} onClick={handleSaveGroupInfo} className="rounded-xl border border-[color:var(--accent-border)] bg-[var(--accent-soft)] px-4 py-2.5 text-sm text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-40">保存用户组信息</button>
                        )}
                      </div>

                      <div>
                        <div className="mb-3 text-sm font-medium text-[color:var(--text-secondary)]">成员</div>
                        <div className="max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] p-3">
                          {sortedUsers.map((user) => (
                            <label key={user.id} className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm text-[color:var(--text-secondary)] hover:bg-[var(--surface-hover)]">
                              <input type="checkbox" checked={groupDraft.memberIds.includes(user.id)} disabled={!canUpdateGroup || saving} onChange={() => toggleMember(user.id)} />
                              <span>{user.nickname}</span>
                              <span className="text-xs text-[color:var(--text-faint)]">{user.email}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-5">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold">权限配置</h3>
                      {canUpdateGroupPermissions && (
                        <button type="button" disabled={saving} onClick={handleSavePermissions} className="rounded-xl border border-[color:var(--accent-border)] bg-[var(--accent-soft)] px-4 py-2.5 text-sm text-[color:var(--text-primary)] transition hover:bg-[var(--surface-hover)] disabled:opacity-40">保存权限配置</button>
                      )}
                    </div>
                    <div className="mt-4 space-y-4">
                      {catalog.groups.map((group) => (
                        <div key={group.module} className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] p-4">
                          <div className="mb-3 text-sm font-medium text-[color:var(--text-primary)]">{group.label}</div>
                          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                            {group.permissions.map((permission) => (
                              <label key={permission} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-[color:var(--text-secondary)] hover:bg-[var(--surface-hover)]">
                                <input type="checkbox" checked={permissionDraft.includes(permission)} disabled={!canUpdateGroupPermissions || saving} onChange={() => togglePermission(permission)} />
                                <span>{permission}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-3xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-4 py-12 text-center text-[color:var(--text-muted)]">请选择一个用户组</div>
              )}
            </section>
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
            <section className="rounded-3xl border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-5">
              <h2 className="text-lg font-semibold">添加黑名单</h2>
              <div className="mt-4 space-y-3">
                <select value={blacklistDraft.userId} disabled={!canAddBlacklist || saving} onChange={(event) => setBlacklistDraft((previous) => ({ ...previous, userId: event.target.value }))} className="w-full rounded-xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-3 py-2.5 outline-none disabled:opacity-50">
                  <option value="">请选择用户</option>
                  {users.filter((user) => !user.isBlacklisted).map((user) => (
                    <option key={user.id} value={user.id}>{user.nickname} · {user.email}</option>
                  ))}
                </select>
                <textarea value={blacklistDraft.blockReason} disabled={!canAddBlacklist || saving} onChange={(event) => setBlacklistDraft((previous) => ({ ...previous, blockReason: event.target.value }))} rows={3} placeholder="封禁原因" className="w-full rounded-xl border border-[color:var(--surface-border)] bg-[var(--input-bg)] px-3 py-2.5 outline-none disabled:opacity-50" />
                {canAddBlacklist && (
                  <button type="button" disabled={saving} onClick={handleAddBlacklist} className="rounded-xl border border-[color:var(--danger-border)] bg-[var(--danger-soft)] px-4 py-2.5 text-sm text-[color:var(--danger-text)] transition hover:opacity-85 disabled:opacity-40">加入黑名单</button>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-[color:var(--surface-border)] bg-[var(--surface-bg-strong)] p-5">
              <h2 className="text-lg font-semibold">当前黑名单</h2>
              <div className="mt-4 space-y-3">
                {blacklistEntries.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[color:var(--surface-border)] bg-[var(--surface-bg)] px-4 py-10 text-center text-sm text-[color:var(--text-muted)]">暂无黑名单记录</div>
                ) : blacklistEntries.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-[color:var(--surface-border)] bg-[var(--surface-bg)] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-[color:var(--text-primary)]">{entry.user?.nickname || '未知用户'}</div>
                        <div className="mt-1 text-xs text-[color:var(--text-faint)]">{entry.user?.email || '未知邮箱'}</div>
                      </div>
                      {canDeleteBlacklist && (
                        <button type="button" disabled={saving} onClick={() => handleRemoveBlacklist(entry.user?.id)} className="rounded-xl border border-[color:var(--success-border)] bg-[var(--success-soft)] px-3 py-2 text-sm text-[color:var(--success-text)] transition hover:opacity-85 disabled:opacity-40">移除</button>
                      )}
                    </div>
                    <div className="mt-3 text-sm text-[color:var(--text-secondary)]">原因：{entry.blockReason || '未填写'}</div>
                    <div className="mt-2 text-xs text-[color:var(--text-faint)]">封禁时间：{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '-'}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
    </ManagementPageLayout>
  );
}