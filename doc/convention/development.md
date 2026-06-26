# 开发与验证

- 前端命令在 [frontend/package.json](../../frontend/package.json) 所在目录执行，常用命令是 `npm install`、`npm run dev`、`npm run build`、`npm run preview`。
- 后端命令在 [backend/package.json](../../backend/package.json) 所在目录执行，常用命令是 `npm install`、`npm start`、`npm run dev` 和 `npm run migrate:legacy-chats`。
- 仓库没有正式自动化测试套件；[backend/test.js](../../backend/test.js) 只是手工 smoke 脚本。提交改动前优先做最窄范围的 build、联调或手工路径验证。
- 后端联调前先确认 MongoDB 可用；数据库连不上时服务会在启动阶段退出，`/health` 是最低成本的活性检查。
- 使用 Docker 或 Nginx 验证前，先构建 [frontend/dist](../../frontend/dist)，因为静态站点根目录依赖该产物。
- 变更部署产物、目录布局或容器挂载时，要同步检查 [script/build.bat](../../script/build.bat)、[script/build.ps1](../../script/build.ps1)、[script/install.sh](../../script/install.sh)、[script/deploy.sh](../../script/deploy.sh) 和 [doc/ops/README.md](../../doc/ops/README.md)。

## 目录边界与归属

- 活跃前端只在 [frontend](../../frontend)；[frontend/chat](../../frontend/chat) 是旧版实现，[frontend/home.bak](../../frontend/home.bak) 是备份，不应继续作为当前功能开发入口。
- 后端按领域拆分路由：认证与资料在 [backend/src/routes/auth.js](../../backend/src/routes/auth.js)，聊天在 [backend/src/routes/chat.js](../../backend/src/routes/chat.js)，博客在 [backend/src/routes/blog.js](../../backend/src/routes/blog.js)，上传在 [backend/src/routes/upload.js](../../backend/src/routes/upload.js)，权限、统计、股市复盘和聊天管理各有独立路由文件。
- 修改功能时优先改它的 owning slice，不要把聊天、博客、认证或上传逻辑重新糅回同一文件。
- 公开 API、前端页面路由和后端路由形状有联动关系，改 URL、请求体或返回结构时要同步更新实现和文档。
