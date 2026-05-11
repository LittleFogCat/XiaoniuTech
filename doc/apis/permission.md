# 权限与黑名单接口

所有接口路径前缀均为 `/api`。

## 通用对象

**用户组对象字段**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| id | string | 是 | 用户组 ID。 |
| key | string | 是 | 用户组标识，例如 `user`、`admin`。 |
| name | string | 是 | 用户组名称，例如 `普通用户`。 |
| description | string | 是 | 用户组描述。 |
| permissions | array<string> | 是 | 组内权限列表。 |
| isSystem | boolean | 是 | 是否为系统用户组。 |
| members | array<object> | 是 | 成员列表，元素包含 `id`、`email`、`nickname`。 |
| memberCount | number | 是 | 成员数量。 |
| createdAt | number\|null | 是 | 创建时间，Unix 毫秒时间戳。 |
| updatedAt | number\|null | 是 | 更新时间，Unix 毫秒时间戳。 |

**用户对象字段**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| id | string | 是 | 用户 ID。 |
| email | string | 是 | 用户邮箱，例如 `user@example.com`。 |
| nickname | string | 是 | 用户昵称。 |
| groups | array<object> | 是 | 所属用户组数组，每项包含 `id`、`key`、`name`。 |
| isBlacklisted | boolean | 是 | 是否处于黑名单中。 |
| createdAt | number\|null | 是 | 账号创建时间，Unix 毫秒时间戳。 |

### 获取当前账号权限信息

**接口描述**

返回当前登录账号的权限快照以及完整权限目录。

**请求路径**

`GET /api/perm/me`

**路径参数**

无。

**请求参数**

无。

**返回示例**

```json
{
  "access": {
    "userId": "681f7f0ab2a2e8d7d4f69301",
    "username": "user@example.com",
    "email": "user@example.com",
    "nickname": "XiaoNiu",
    "groups": [
      {
        "id": "681f7f0ab2a2e8d7d4f69310",
        "key": "user",
        "name": "普通用户",
        "isSystem": true
      }
    ],
    "groupIds": [
      "681f7f0ab2a2e8d7d4f69310"
    ],
    "permissions": [
      "blog:view",
      "blog:read",
      "blog:write"
    ],
    "isBlacklisted": false
  },
  "catalog": {
    "groups": [
      {
        "module": "blog",
        "label": "博客模块",
        "permissions": [
          "blog:view",
          "blog:read",
          "blog:write"
        ]
      }
    ],
    "permissions": [
      "blog:view",
      "blog:read",
      "blog:write"
    ]
  }
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| access | object | 是 | 当前账号的访问权限快照。 |
| access.userId | string | 是 | 当前用户 ID。 |
| access.username | string | 是 | 邮箱身份，例如 `user@example.com`。 |
| access.email | string | 是 | 用户邮箱。 |
| access.nickname | string | 是 | 用户昵称。 |
| access.groups | array<object> | 是 | 当前所属用户组数组，元素包含 `id`、`key`、`name`、`isSystem`。 |
| access.groupIds | array<string> | 是 | 用户组 ID 列表。 |
| access.permissions | array<string> | 是 | 当前账号实际拥有的权限列表。 |
| access.isBlacklisted | boolean | 是 | 是否处于黑名单中。 |
| catalog | object | 是 | 权限目录对象。 |
| catalog.groups | array<object> | 是 | 按模块分组后的权限目录，每项包含 `module`、`label`、`permissions`。 |
| catalog.permissions | array<string> | 是 | 全部权限标识平铺数组。 |

**所需权限**

需要登录。

**其他说明**

可能返回的错误状态码：`401`（未登录或令牌失效）、`403`（账号在黑名单中）。

### 获取用户组总览

**接口描述**

返回所有用户组、全部用户列表和权限目录，供后台权限管理页使用。

**请求路径**

`GET /api/perm/usergroup`

**路径参数**

无。

**请求参数**

无。

**返回示例**

```json
{
  "groups": [
    {
      "id": "681f7f0ab2a2e8d7d4f69310",
      "key": "user",
      "name": "普通用户",
      "description": "默认用户组，包含基本权限。",
      "permissions": [
        "blog:view",
        "blog:read"
      ],
      "isSystem": true,
      "members": [
        {
          "id": "681f7f0ab2a2e8d7d4f69301",
          "email": "user@example.com",
          "nickname": "XiaoNiu"
        }
      ],
      "memberCount": 1,
      "createdAt": 1778486400000,
      "updatedAt": 1778486400000
    }
  ],
  "users": [
    {
      "id": "681f7f0ab2a2e8d7d4f69301",
      "email": "user@example.com",
      "nickname": "XiaoNiu",
      "groups": [
        {
          "id": "681f7f0ab2a2e8d7d4f69310",
          "key": "user",
          "name": "普通用户"
        }
      ],
      "isBlacklisted": false,
      "createdAt": 1778486400000
    }
  ],
  "catalog": {
    "groups": [],
    "permissions": []
  }
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| groups | array<object> | 是 | 用户组数组，字段见本文档“用户组对象字段”。 |
| users | array<object> | 是 | 用户数组，字段见本文档“用户对象字段”。 |
| catalog | object | 是 | 权限目录对象，字段同 `/api/perm/me` 返回的 `catalog`。 |

**所需权限**

需要 `perm:view` 权限。

**其他说明**

系统用户组包括 `user`、`admin`、`owner`。

### 获取用户列表

**接口描述**

返回全站用户列表及其分组/黑名单状态。

**请求路径**

`GET /api/perm/users`

**路径参数**

无。

**请求参数**

无。

**返回示例**

```json
{
  "users": [
    {
      "id": "681f7f0ab2a2e8d7d4f69301",
      "email": "user@example.com",
      "nickname": "XiaoNiu",
      "groups": [
        {
          "id": "681f7f0ab2a2e8d7d4f69310",
          "key": "user",
          "name": "普通用户"
        }
      ],
      "isBlacklisted": false,
      "createdAt": 1778486400000
    }
  ]
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| users | array<object> | 是 | 用户数组，字段见本文档“用户对象字段”。 |

**所需权限**

需要 `user:listall` 权限。

**其他说明**

该接口不返回权限目录，也不返回黑名单详情原因。

### 创建用户组

**接口描述**

创建一个新的非系统用户组，并可选地把现有用户加入该组。

**请求路径**

`POST /api/perm/usergroup`

**路径参数**

无。

**请求参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| key | string | 是 | 用户组标识，仅允许小写字母、数字、下划线和短横线，例如 `blog_editor`。 |
| name | string | 是 | 用户组名称，例如 `博客编辑`。 |
| description | string | 否 | 用户组说明。 |
| memberIds | array<string> | 否 | 初始成员用户 ID 数组。 |

**请求示例**

```json
{
  "key": "blog_editor",
  "name": "博客编辑",
  "description": "负责博客发布",
  "memberIds": [
    "681f7f0ab2a2e8d7d4f69301"
  ]
}
```

**返回示例**

```json
{
  "group": {
    "_id": "681f7f0ab2a2e8d7d4f69320",
    "key": "blog_editor",
    "name": "博客编辑",
    "description": "负责博客发布",
    "permissions": [],
    "isSystem": false,
    "createdAt": "2026-05-11T08:00:00.000Z",
    "updatedAt": "2026-05-11T08:00:00.000Z"
  }
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| group | object | 是 | 新建后的用户组文档对象。返回值为 Mongoose 原始文档结构，包含 `_id`、`key`、`name`、`description`、`permissions`、`isSystem`、`createdAt`、`updatedAt`。 |

**所需权限**

需要 `perm:add_group` 权限。

**其他说明**

可能返回的错误状态码：`400`（标识不合法或名称为空）、`409`（用户组标识已存在）。

### 更新用户组基础信息

**接口描述**

更新用户组名称、描述，或用完整成员列表覆盖成员关系。

**请求路径**

`PUT /api/perm/usergroup/:groupId`

**路径参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| groupId | string | 是 | 用户组 ID。 |

**请求参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| name | string | 否 | 用户组名称，例如 `博客编辑`。不传则沿用原值。 |
| description | string | 否 | 用户组描述。 |
| memberIds | array<string> | 否 | 完整成员 ID 列表；传入后会以该列表覆盖原成员关系。 |

**请求示例**

```json
{
  "name": "博客编辑",
  "description": "负责博客内容维护",
  "memberIds": [
    "681f7f0ab2a2e8d7d4f69301"
  ]
}
```

**返回示例**

```json
{
  "group": {
    "_id": "681f7f0ab2a2e8d7d4f69320",
    "key": "blog_editor",
    "name": "博客编辑",
    "description": "负责博客内容维护",
    "permissions": [],
    "isSystem": false,
    "createdAt": "2026-05-11T08:00:00.000Z",
    "updatedAt": "2026-05-11T08:10:00.000Z"
  }
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| group | object | 是 | 更新后的用户组文档对象。 |

**所需权限**

需要 `perm:update_group` 权限。

**其他说明**

- `owner` 用户组必须且只能保留一个成员。
- 可能返回的错误状态码：`400`（名称为空或 owner 组成员数量不合法）、`404`（用户组不存在）。

### 更新用户组权限

**接口描述**

整体替换指定用户组的权限集合。

**请求路径**

`PUT /api/perm/usergroup/:groupId/perm`

**路径参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| groupId | string | 是 | 用户组 ID。 |

**请求参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| permissions | array<string> | 是 | 目标权限列表，例如 `["blog:write","blog:update"]`。非法权限标识会被过滤。 |

**请求示例**

```json
{
  "permissions": [
    "blog:view",
    "blog:read",
    "blog:write",
    "blog:update"
  ]
}
```

**返回示例**

```json
{
  "group": {
    "_id": "681f7f0ab2a2e8d7d4f69320",
    "key": "blog_editor",
    "name": "博客编辑",
    "description": "负责博客内容维护",
    "permissions": [
      "blog:view",
      "blog:read",
      "blog:write",
      "blog:update"
    ],
    "isSystem": false
  }
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| group | object | 是 | 更新后的用户组文档对象。 |

**所需权限**

需要 `perm:update_group_perm` 权限。

**其他说明**

- 不能修改当前操作者自己所属用户组的权限。
- 不能授予超出当前操作者自身权限范围的权限。
- 可能返回的错误状态码：`403`（越权授予权限或修改自身所属组）、`404`（用户组不存在）。

### 删除用户组

**接口描述**

删除一个非系统用户组，并将该组从所有成员身上移除。

**请求路径**

`DELETE /api/perm/usergroup/:groupId`

**路径参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| groupId | string | 是 | 用户组 ID。 |

**请求参数**

无。

**返回示例**

```json
{
  "success": true
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| success | boolean | 是 | 删除是否成功。 |

**所需权限**

需要 `perm:delete_group` 权限。

**其他说明**

系统用户组不允许删除，尝试删除时会返回 `400`。

### 获取黑名单列表

**接口描述**

返回所有黑名单记录及对应的目标用户、操作人信息。

**请求路径**

`GET /api/blacklist`

**路径参数**

无。

**请求参数**

无。

**返回示例**

```json
{
  "entries": [
    {
      "id": "682084f7b47b4f1ed6b4747d",
      "user": {
        "id": "681f7f0ab2a2e8d7d4f69301",
        "email": "user@example.com",
        "nickname": "XiaoNiu"
      },
      "blockedBy": {
        "id": "681f7f0ab2a2e8d7d4f69399",
        "email": "admin@example.com",
        "nickname": "Admin"
      },
      "blockReason": "刷接口",
      "createdAt": 1778487600000
    }
  ]
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| entries | array<object> | 是 | 黑名单条目数组。 |
| entries[].id | string | 是 | 黑名单记录 ID。 |
| entries[].user | object\|null | 是 | 被拉黑用户，包含 `id`、`email`、`nickname`。 |
| entries[].blockedBy | object\|null | 是 | 执行拉黑操作的用户，包含 `id`、`email`、`nickname`。 |
| entries[].blockReason | string | 是 | 拉黑原因，最多 200 字。 |
| entries[].createdAt | number\|null | 是 | 创建时间，Unix 毫秒时间戳。 |

**所需权限**

需要 `blacklist:view` 权限。

**其他说明**

已拉黑用户在所有 `requireAuth` / `requirePermission` 接口中都会返回 `403`。

### 添加或更新黑名单条目

**接口描述**

将指定用户加入黑名单；若该用户已在黑名单中，则更新拉黑原因和时间。

**请求路径**

`POST /api/blacklist/:userId`

**路径参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| userId | string | 是 | 目标用户 ID。 |

**请求参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| blockReason | string | 否 | 拉黑原因，例如 `刷接口`。服务端会裁剪到最多 `200` 个字符。 |

**请求示例**

```json
{
  "blockReason": "刷接口"
}
```

**返回示例**

```json
{
  "success": true
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| success | boolean | 是 | 是否写入成功。 |

**所需权限**

需要 `blacklist:add` 权限。

**其他说明**

可能返回的错误状态码：`404`（目标用户不存在）。

### 移除黑名单条目

**接口描述**

将指定用户移出黑名单。

**请求路径**

`DELETE /api/blacklist/:userId`

**路径参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| userId | string | 是 | 目标用户 ID。 |

**请求参数**

无。

**返回示例**

```json
{
  "success": true
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| success | boolean | 是 | 是否处理成功。即使用户不在黑名单中，当前实现也会返回 `true`。 |

**所需权限**

需要 `blacklist:delete` 权限。

**其他说明**

如果 `userId` 不是合法 ObjectId，当前实现同样会直接返回成功。
