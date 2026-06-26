# XiaoniuTech

个人网站。AI Chat + 博客，React + Express + MongoDB，Docker 部署。

## 快速开始

```bash
# 1. 启动 MongoDB
docker run -d --name mongodb -p 27017:27017 mongo:7

# 2. 启动后端 (端口 3001)
cd backend && npm install && npm run dev

# 3. 启动前端 (端口 5173)
cd frontend && npm install && npm run dev
```

健康检查：`http://localhost:3001/health`

## 主要功能

- **AI Chat**：多模型流式对话、多智能体、游客模式
- **博客**：Markdown 写作、草稿/发布/垃圾桶管理、标签、评论、点赞
- **用户系统**：邮箱注册登录、个人主页、头像上传、昵称/简介设置

## 生产部署

项目提供了基于 Ubuntu 的 Docker Compose 一键部署脚本，方便部署。
一键部署脚本会自动检测并安装 Docker、Docker Compose、MongoDB。

**注意：一键安装脚本会全量覆盖部署文件夹（默认为 `/usr/local/compose`）的所有文件，包括前端、后端、配置文件。旧文件将打包并备份在 `{deploy_root}/bak` 目录下。**

```bash
# 本地打包
script\build.bat          # Windows
.\script\build.ps1        # PowerShell

# 服务器部署
sh install.sh
```

详见 [doc/ops/README.md](doc/ops/README.md)。

## 环境变量

项目运行依赖以下环境变量：

| 变量 | 说明 |
|------|------|
| `CHAT_AUTH_SECRET` | 登录令牌签名密钥，自定义字符串 |
| `MONGODB_ROOT_PASSWORD` | Docker 部署时 MongoDB root 密码 |
| `BACKEND_LOG_ENABLED` | 后端日志开关（`true`/`false`） |
| `ZAI_API_KEY` | 智谱AI API Key |
| `OPENROUTER_API_KEY` | OpenRouter API Key |
| `DEEPSEEK_API_KEY` | DeepSeek API Key |
| `XIAOMI_API_KEY` | 小米 Mimo API Key |
| `LONGCAT_API_KEY` | LongCat LLM API Key |
| `ALIYUN_SMTP_HOST` | SMTP 服务器（注册验证码邮件） |
| `ALIYUN_SMTP_PORT` | SMTP 端口（默认 80） |
| `ALIYUN_SMTP_USER` | SMTP 用户名 |
| `ALIYUN_SMTP_PASS` | SMTP 密码 |

开发调试时，在 `/backend` 目录下创建 `.env` 文件，填写以上环境变量。

服务器部署时，在部署文件夹根目录（默认为 `/usr/local/compose`）中创建 `.env` 文件，填写以上环境变量。

## 文档

- [API 文档](doc/apis/)
- [部署说明](doc/ops/README.md)
- [目录结构说明](doc/目录结构说明.md)
