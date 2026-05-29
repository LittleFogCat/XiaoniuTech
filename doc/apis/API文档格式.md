# 接口文档规范

## 内容说明

接口格式包含：
1. 接口名称（H3标题）
2. 接口描述
3. 路径及路径参数说明（如果有）
4. 请求body示例及参数说明（如果有）
5. 返回body示例及参数说明（如果有）
6. 所需权限（如果有）
7. 其他特殊说明（如果有）

## 格式说明

- 格式：接口名称为段落标题，其余各项以粗体单行做为小标题。
- 参数说明：参数说明需以表格形式。表格列包括：参数名，参数类型，是否必需，参数说明及示例值。
- 枚举参数：如果参数是枚举形式的，需要在参数说明中列出所有枚举值；如果可选值太多，则新建一个专门的说明文档，在参数说明中链接该文档。

## 示例

以下是接口示例：

---

#### 新增用户

**描述**

新增用户接口，用于创建新的用户账号。

**路径：** `/users`

**方法：** POST

**请求Body示例**

```json
{
    "username": "xiaonaimo",
    "email": "xiaonaimo@gmail.com",
    "password": "be946cafd43a3c5be97b2271a95367f7fcac666077a84a3daa9ab2b6fc1d71e4",
}
```

**请求Body参数说明**

| 参数名 | 参数类型 | 必需 | 参数说明 |
| --- | --- | --- | --- |
| username | string | 是 | 用户名，唯一 |
| email | string | 是 | 用户邮箱，唯一 |
| password | string | 是 | 用户密码进行SHA256哈希后的结果 |

**返回Body示例**

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

**返回Body说明**

| 参数名 | 参数类型 | 参数说明 |
| --- | --- | --- |
| code | int | 状态码，200表示成功 |
| success | boolean | 是否成功 |
| msg | string | 错误信息，成功时为null |
| data | object | 返回数据，成功时包含用户信息 |
| data.id | int | 用户ID |
| data.username | string | 用户名 |
| data.email | string | 用户邮箱 |

---

以上为接口示例，到此结束。