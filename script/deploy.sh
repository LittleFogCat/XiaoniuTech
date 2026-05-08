#!/bin/bash

# 放在 /usr/local/compose 目录下
# 上传 build.tar.gz 到 /usr/local/tmp/deploy 目录下，执行 ./deploy.sh 即可完成重新部署

set -e

DEPLOY_DIR="/usr/local/tmp/deploy"
TAR_FILE="build.tar.gz"

cd "$DEPLOY_DIR" || { echo "错误：目录 $DEPLOY_DIR 不存在"; exit 1; }

# 清理（保留 build.tar.gz）
find . -maxdepth 1 ! -name "$TAR_FILE" ! -name "." ! -name ".." -exec rm -rf {} + 2>/dev/null || true
echo "清理完成。"

# 解压
if [ -f "$TAR_FILE" ]; then
    tar -xzf "$TAR_FILE"
    echo "解压完成。"
else
    echo "错误：找不到 $TAR_FILE"
    exit 1
fi

# 执行 install.sh
if [ -f "install.sh" ]; then
    chmod +x install.sh
    ./install.sh
else
    echo "错误：未找到 install.sh"
    exit 1
fi

# 切换到 docker-compose 所在的目录
cd /usr/local/compose

# 重启 docker compose
echo "正在重启 docker compose ..."
docker compose down
docker compose up -d --build

echo "所有步骤执行完毕。"