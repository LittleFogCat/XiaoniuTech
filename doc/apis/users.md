# 用户公开资料接口

所有接口路径前缀均为 `/api`。

### 获取用户公开资料

**接口描述**

根据用户昵称获取公开资料，用于用户主页、评论作者信息等公开展示场景。

**请求路径**

`GET /api/users/:nickname`

**路径参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| nickname | string | 是 | 用户昵称，例如 `XiaoNiu`。 |

**请求参数**

无。

**返回示例**

```json
{
	"user": {
		"nickname": "XiaoNiu",
		"bio": "全栈开发者",
		"avatarUrl": "/api/files/68207a7105d9d5a1bc3aa7a5"
	}
}
```

**返回参数**

| 参数名 | 参数类型 | 是否必需 | 参数说明及示例值 |
| --- | --- | --- | --- |
| user | object | 是 | 用户公开资料对象。 |
| user.nickname | string | 是 | 用户昵称，例如 `XiaoNiu`。 |
| user.bio | string | 是 | 用户简介，未填写时可能为空字符串。 |
| user.avatarUrl | string | 是 | 头像访问地址，未设置头像时为空字符串。 |

**所需权限**

无需登录。

**其他说明**

- 接口只返回公开资料，不返回邮箱、权限等敏感信息。
- 用户公开文章列表接口见 [blog.md](blog.md) 中的 `/api/blog/users/:nickname/posts`。
- 可能返回的错误状态码：`404`（用户不存在）。
