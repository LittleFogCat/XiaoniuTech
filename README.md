# XiaoniuTech

XiaoniuTech 是个人网站。前端基于 React + Vite，后端基于 Express + MongoDB，生产环境通过 Docker Compose + Nginx 部署。

## 技术栈

- **前端**：React 18、Vite、Tailwind CSS、Radix UI
- **后端**：Express（Node.js ESM）、MongoDB、Mongoose
- **部署**：Docker Compose、Nginx
- **AI 接入**：多提供商 OpenAI-compatible API（LongCat / ZAI / OpenRouter / DeepSeek）

## 主要能力

- 主页为静态信息展示
- AI Chat 模块，支持多模型、多智能体对话
- MongoDB 持久化聊天数据
- 本地打包与服务器部署脚本

## 项目结构

```text
backend/         后端源码（Express + MongoDB）
frontend/        前端源码（React + Vite）
  src/           前端源代码
  dist/          生产构建产物
conf/            部署与运行配置
  backend/       后端运行时配置（models.json、identities/）
  compose/       Docker Compose 文件
  nginx/         Nginx 配置
script/          打包与部署脚本
doc/             文档
  apis/          API 接口文档
  plan/          开发计划
  task/          需求说明
```

## 快速开始

### 1. 准备 MongoDB

本地开发默认连接 `mongodb://127.0.0.1:27017/xn_chat`。可以直接启动本地 MongoDB，或者用 Docker：

```bash
docker run -d --name mongodb -p 27017:27017 mongo:7
```

如需只启动数据库容器，也可以使用：

```bash
docker compose -f conf/compose/docker-compose.yml up -d mongodb
```

### 2. 启动后端

```bash
cd backend
npm install
npm run dev
```

常用脚本：

- `npm start`：启动后端服务
- `npm run dev`：开发模式启动（watch）
- `npm run migrate:legacy-chats`：迁移历史聊天数据

默认监听 `3001` 端口。启动成功后可通过 `http://localhost:3001/health` 做健康检查。

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

常用脚本：

- `npm run dev`：启动开发服务器
- `npm run build`：构建生产文件到 `frontend/dist/`
- `npm run preview`：预览生产构建

默认监听 `5173` 端口，开发环境会将 `/api` 代理到 `http://localhost:3001`。

## 打包与部署

### 本地打包

Windows 环境可以使用：

```bat
script\build.bat
```

PowerShell 也可以直接调用：

```powershell
.\script\build.ps1
```


### 服务器部署

将 `build.tar.gz` 上传到服务器并解压后，在解压目录执行：

```bash
sh install.sh
```

说明：

- `script/install.sh` 支持 `--artifact` / `--include` / `-A` / `-I`
- 部署时会备份并删除旧目录
- 脚本会在需要时自动检查并安装 Docker / Docker Compose

核心部署配置位于：

- [conf/compose/docker-compose.yml](conf/compose/docker-compose.yml)
- [conf/nginx/nginx.conf](conf/nginx/nginx.conf)

打包与部署均支持通过参数指定自定义产物及输出目录等信息。完整部署流程见 [doc/部署说明.md](doc/部署说明.md)。

## 环境与配置

常见环境变量包括：

| 变量 | 说明 |
|------|------|
| `MONGODB_URI` | 本地开发时后端 MongoDB 连接串，可选，不设置时使用 `mongodb://127.0.0.1:27017/xn_chat` |
| `MONGODB_ROOT_PASSWORD` | Docker 部署时 MongoDB root 密码 |
| `LONGCAT_API_KEY` | LongCat API Key |
| `ZAI_API_KEY` | ZAI API Key |
| `OPENROUTER_API_KEY` | OpenRouter API Key |
| `DEEPSEEK_API_KEY` | DeepSeek API Key |
| `CHAT_AUTH_SECRET` | 登录态签名密钥 |
| `ALIYUN_SMTP_*` | SMTP 邮件服务配置 |

模型配置和智能体种子位于 `conf/backend/`。其中：

- `conf/backend/models.json`：模型与提供商配置
- `conf/backend/identities/`：智能体 Markdown 种子文件

后端启动时会将缺失的智能体种子初始化到 MongoDB，已存在记录不会被覆盖。

## 文档

- [聊天接口文档](doc/apis/chat.md)
- [用户接口文档](doc/apis/users.md)
- [部署说明](doc/部署说明.md)
- [目录结构说明](doc/目录结构说明.md)

## 注意事项

- 生产静态资源以 `frontend/dist/` 为准
- 后端依赖 MongoDB；数据库不可用时服务会在启动阶段退出
- 当前没有自动化测试；`backend/test.js` 只是手工 smoke 脚本
- 生产部署行为以 `conf/compose/docker-compose.yml` 和 `conf/nginx/nginx.conf` 为准
