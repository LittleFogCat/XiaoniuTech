export const PERMISSION_GROUPS = [
  {
    module: 'stock',
    label: '股票模块',
    permissions: [
      'stock:review:view',
      'stock:review:view_all',
      'stock:review:create',
      'stock:review:update',
      'stock:review:delete',
    ],
  },
  {
    module: 'blog',
    label: '博客模块',
    permissions: [
      'blog:view',
      'blog:read',
      'blog:write',
      'blog:delete',
      'blog:update',
      'blog:manage',
    ],
  },
  {
    module: 'chat',
    label: '聊天模块',
    permissions: [
      'chat:view',
      'chat:chat_free',
      'chat:chat_paid',
      'chat:agent_free',
      'chat:agent_paid',
      'chat:manage_model',
      'chat:manage_agent',
    ],
  },
  {
    module: 'user',
    label: '用户模块',
    permissions: [
      'user:view',
      'user:listall',
      'user:update',
      'user:delete',
      'user:view_by_nickname',
    ],
  },
  {
    module: 'perm',
    label: '权限模块',
    permissions: [
      'perm:view',
      'perm:add_group',
      'perm:delete_group',
      'perm:update_group',
      'perm:update_group_perm',
    ],
  },
  {
    module: 'blacklist',
    label: '黑名单模块',
    permissions: [
      'blacklist:view',
      'blacklist:add',
      'blacklist:delete',
    ],
  },
  {
    module: 'statistics',
    label: '访问统计模块',
    permissions: [
      'statistics:view',
      'statistics:export',
    ],
  },
];

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((group) => group.permissions);

const USER_PERMISSIONS = [
  'blog:view',
  'blog:read',
  'blog:write',
  'blog:delete',
  'blog:update',
  'chat:view',
  'chat:chat_free',
  'chat:agent_free',
  'user:view_by_nickname',
];

export const SYSTEM_GROUP_DEFINITIONS = [
  {
    key: 'user',
    name: '普通用户',
    description: '默认用户组，包含基本权限。',
    permissions: USER_PERMISSIONS,
    isSystem: true,
  },
  {
    key: 'admin',
    name: '管理员',
    description: '拥有站点的管理权限。',
    permissions: ALL_PERMISSIONS,
    isSystem: true,
  },
  {
    key: 'owner',
    name: '站点所有者',
    description: '拥有站点所有权限，且成员唯一。',
    permissions: ALL_PERMISSIONS,
    isSystem: true,
  },
];