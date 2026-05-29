# API开发规范

## 接口路径和方法

如无特殊说明，接口路径统一挂载在 `/api` 前缀下，接口文档中无需再指定前缀。

接口请求路径和方法应符合 RESTful 风格。

以用户接口为例：

- `/users`：新增用户接口，方法为 POST。
- `/users/{id}`：获取用户详情接口，方法为 GET。
- `/users/{id}`：更新用户接口，方法为 PUT。
- `/users/{id}`：删除用户接口，方法为 DELETE。
- `/users`：获取用户列表接口，方法为 GET。

## 接口返回值

如无特殊说明，接口统一返回 JSON 格式数据。
接口返回值统一通过以下格式返回：

```json
{
    "code": 200,
    "success": true,
    "msg": null,
    "data": {
        "id": 1,
        "username": "xiaonaimo",
        "email": "xiaonaimo@gmail.com"
    }
}
```

其中：
- code：状态码，200表示成功。
- success：是否成功，true表示成功，false表示失败。
- msg：错误信息，成功时为null。
- data：返回数据，根据接口返回不同的具体对象或数组。

对于未声明返回对象的接口，`data` 字段为 null。

## 错误处理

对于接口调用失败的情况，通过返回体进行错误返回，而不是通过 HTTP 错误码。
不管接口调用是否成功，HTTP 错误码都为 200。这样做的目的是与外部容器的报错做区分。

接口错误信息通过返回体中的 `code`、`success`、`msg` 字段进行返回。

例如：

```json
{
    "code": 400,
    "success": false,
    "msg": "用户名或密码错误"
}
```


## 认证与鉴权

### 认证

需要登录的接口，需要在请求头中传递 `Authorization: Bearer <token>` 头。
token 是用户登录后获取的令牌，用于验证用户身份。

接口调用前，需要先登录，获取 token。

### 鉴权

某些接口及资源需要用户有特定的权限才能访问。
用户的权限通过用户组赋予。

鉴权相关的具体说明，参考[用户认证模块](../apis/auth.md)和[权限模块](../apis/permission.md)。

