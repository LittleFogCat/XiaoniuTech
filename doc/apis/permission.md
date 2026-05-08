# Permission 模块

所有路径前缀 `/api`。所有管理接口需要认证。

## 当前用户权限

### GET /api/perm/me

```json
{
  "access": {
    "userId": "...", "username": "email", "email": "email",
    "nickname": "昵称", "groups": ["默认用户组"],
    "groupIds": ["...", "..."], "permissions": ["blog:write", "blog:read"],
    "isBlacklisted": false
  },
  "catalog": [
    { "id": "blog:write", "label": "发布文章", "description": "创建和编辑博客文章", "group": "blog" }
  ]
}
```

## 用户组管理

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | /api/perm/usergroup | `perm:view` | 列出所有组和用户 |
| POST | /api/perm/usergroup | `perm:add_group` | 创建组 `{ name, description, userIds, permissions }` |
| PUT | /api/perm/usergroup/:groupId | `perm:update_group` | 更新组信息（名称/成员） |
| PUT | /api/perm/usergroup/:groupId/perm | `perm:update_group_perm` | 更新组权限 `{ permissions: [...] }` |
| DELETE | /api/perm/usergroup/:groupId | `perm:delete_group` | 删除组 |

## 用户列表

### GET /api/perm/users

需要 `user:listall` 权限。

## 黑名单

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | /api/blacklist | `blacklist:view` | 列出 |
| POST | /api/blacklist/:userId | `blacklist:add` | 添加 `{ blockReason }` |
| DELETE | /api/blacklist/:userId | `blacklist:delete` | 移除 |

被加入黑名单的用户在 `requireAuth` 中间件中返回 403。
