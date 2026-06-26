# CLAUDE.md

# 项目说明

本文件仅作为项目文档导航，不存放具体开发规范。

在开始分析、修改代码或新增功能前，请先判断任务所属模块，并**仅按需读取相关文档**，避免加载无关内容。

## 通用文档（按需读取）

以下文档包含项目的整体规范，仅在需要时阅读：

| 场景                    | 文档                    |
| --------------------- | --------------------- |
| 了解项目整体架构              | `doc/architecture/README.md` |
| 遵循开发规范、代码风格           | `doc/convention/README.md`   |
| 修改或新增 API             | `doc/apis/README.md`  |
| 修改前端页面或 UI            | `doc/ui/README.md`    |
| 运维相关（部署、Docker、Nginx、服务器等） | `doc/ops/README.md`         |

## 业务模块文档（按需读取）

仅当任务涉及对应业务时，再读取对应文档：

| 涉及内容          | 文档                                                    |
| ------------- | ----------------------------------------------------- |
| 登录、认证、用户资料、权限 | `.github/instructions/auth-profile.instructions.md`   |
| Blog 模块       | `.github/instructions/blog-module.instructions.md`    |
| Chat 状态管理     | `.github/instructions/chat-state.instructions.md`     |
| Chat 流式输出     | `.github/instructions/chat-streaming.instructions.md` |

## 工作原则

1. **不要一次读取所有文档。**
2. 先理解任务，再判断需要哪些文档。
3. **仅加载当前任务所需的文档。**
4. 如果多个模块均受影响，可同时读取多个相关文档。
5. 不要凭经验猜测项目规范，如存在对应文档，应优先阅读后再进行实现。
6. 若任务涉及的规范文档不存在，可结合现有代码实现保持一致的编码风格。

## 示例

用户："新增博客点赞接口"

建议读取：

* `doc/convention/README.md`
* `doc/apis/README.md`
* `.github/instructions/blog-module.instructions.md`

---

用户："调整聊天页面 UI"

建议读取：

* `doc/ui/README.md`

---

用户："修复 JWT 登录"

建议读取：

* `doc/apis/README.md`
* `.github/instructions/auth-profile.instructions.md`

---

用户："修改 Docker Compose"

建议读取：

* `doc/ops/README.md`
