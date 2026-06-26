# 后端与配置约束

- 后端使用 Node.js ESM，所有相对导入都必须保留 `.js` 扩展名。
- 模型配置权威入口是 [conf/backend/models.json](../../conf/backend/models.json)，加载逻辑在 [backend/src/config/models.js](../../backend/src/config/models.js)。新增模型或 Provider 时优先改配置，不要在代码里硬编码 provider 到环境变量的映射。
- API Key 等敏感信息必须通过环境变量或外部配置注入，禁止回退到硬编码密钥、默认管理员账号或启动时随机密钥。
- [conf/backend/identities](../../conf/backend/identities) 只负责在启动时补齐缺失身份记录；运行时权威数据来自 MongoDB，修改种子文件不会回写已有数据库记录。
- 公开 API 规范和文档格式以 [doc/apis/API开发规范.md](../../doc/apis/API开发规范.md) 和 [doc/apis/API文档格式.md](../../doc/apis/API文档格式.md) 为准；对外接口变更时同步更新文档。
