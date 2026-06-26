# 部署与运行协同

- 生产聊天页面挂在 `/chat/`，调整 base path 或代理路径时，要同时检查 [frontend/vite.config.js](../../frontend/vite.config.js)、[conf/nginx/nginx.conf](../../conf/nginx/nginx.conf)、[conf/nginx/conf.d/chat.location](../../conf/nginx/conf.d/chat.location) 和 [conf/nginx/conf.d/xn.location](../../conf/nginx/conf.d/xn.location)。
- Nginx、Compose、前端产物目录和运行时配置目录必须保持一致，否则本地开发能跑并不代表容器环境可用。
