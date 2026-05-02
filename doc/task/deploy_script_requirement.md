# 部署脚本需求说明

## 1. 需求背景

为了简化部署流程，提高部署效率，我们需要一个一键部署的脚本。

## 2. 功能需求

### 2.1 前置条件

- 开发环境为 Windows 11。
- 脚本执行时，如果对应目录不存在，则创建。
- 脚本执行时，如果遇到错误，则立即退出、回滚所有操作、打印错误信息。

### 2.2 本地打包脚本

实现开发环境执行本地一键打包的脚本。脚本文件名为 `build.bat`，存放在 `/script/` 目录。

执行命令格式如下：
```
build [--output target_dir] [--artifact backend,frontend,conf] [--keeptmpfile]
```
参数说明：
- output: 打包临时根目录。默认为 `./tmp/build`。
- artifact: 需要打包哪些产物，通过逗号分隔。默认为 `backend,frontend,conf`。
- keeptmpfile: 保留临时文件。如果包含该参数，则不删除临时文件。

以下，假定输出目录为 `{output}`，临时文件目录为 `{tmp}` = `{output}/target/`，打包脚本功能如下：

- 每次打包之前，清空输出目录。
- 对 `/frontend` 目录执行 npm 打包，目标目录 `{tmp}/frontend` （目前是 `/frontend/dist`）。
- 将 `/backend` 目录中，除了 `/backend/.gitignore` 中定义的文件之外的文件复制到 `{tmp}/backend/` 目录。
- 将 `/conf` 目录中的文件，复制到 `{tmp}/conf` 目录中。
- 将服务器执行脚本复制到 `{tmp}/install.sh` 中。
- 将 `{tmp}` 目录中的所有文件压缩保存在 `{output}/build.tar.gz`。

### 2.3 部署脚本

实现服务器端执行的部署脚本。脚本文件名为 `install.sh`，存放在 `/script/` 目录。

脚本执行命令格式如下：
```bash
sh install.sh [--outputdir target_dir] [--include backend,frontend,conf]
```
参数说明：
- outputdir: 项目根目录。默认为 `/usr/local/compose`。
- include: 需要部署哪些产物，通过逗号分隔。默认为 `backend,frontend,conf`。

我们假设已经将打包好的压缩包上传到服务器并解压。
假定部署项目根目录（outputdir）为 `{project}`。部署脚本功能如下：

- 如果产物包含 `backend`：
-- 将 `{project}/data/backend/` 目录打包为 `data.bak.{datetime}.zip`，并备份在 `{project}/bak/` 目录下。
-- 清空 `{project}/data/backend/` 目录。
-- 将 `backend/` 目录中的文件复制到 `{project}/data/backend/` 目录中。
- 如果产物包含 `frontend`：
-- 将 `{project}/www/` 目录打包为 `www.bak.{datetime}.zip`，并备份在 `{project}/bak/` 目录下。
-- 清空 `{project}/www/` 目录。
-- 将 `frontend/` 目录中的文件复制到 `{project}/www/` 目录中。
- 如果产物包含 `conf`：
-- 将 `{project}/conf` 目录打包为 `conf.bak.{datetime}.zip`，并备份在 `{project}/bak/` 目录下。
-- 清空 `{project}/conf` 目录。
-- 将 `conf/compose/docker-compose.yml` 复制到 `{project}/` 目录中。
-- 将 `conf/nginx/` 中的文件复制到 `{project}/conf/nginx/` 目录中。
-- 将 `conf/backend/` 中的文件复制到 `{project}/conf/backend/` 目录中。

## 3. 产物

本次任务包括以下产物：

- `/script/build.bat`: 打包脚本
- `/script/install.sh`: 部署脚本
- 相关的文档更新。包括 `/doc/部署说明.md` 和 `/doc/目录结构说明.md`。
