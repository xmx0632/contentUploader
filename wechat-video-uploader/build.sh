#!/bin/bash

# 确保 temp 目录存在
mkdir -p temp

# 清理 cookies 文件
rm -rf temp/cookies*.json

# 确保 dist 目录存在
mkdir -p dist

echo "=== 开始构建所有平台的可执行文件 ==="

# 使用 pkg . --public 来打包所有平台
echo "\n=== 使用 pkg . --public 打包所有平台 ==="
pkg . --public

# 设置执行权限
chmod +x dist/wechat-video-uploader-linux
chmod +x dist/wechat-video-uploader-macos
chmod +x dist/wechat-video-uploader-macos-arm64

echo "\n=== 构建完成，可执行文件位于 dist 目录 ==="
ls -la dist/