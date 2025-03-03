#!/bin/bash

# 确保 temp 目录存在
mkdir -p temp

# 清理 cookies 文件
rm -rf temp/cookies*.json

# 确保 dist 目录存在
mkdir -p dist

echo "=== 开始构建所有平台的可执行文件 ==="

# 使用 pkg 来打包指定平台
echo "\n=== 打包 Linux x64 版本 ==="
pkg . --target node18-linux-x64 --output dist/wechat-video-uploader-linux-x64 --public

echo "\n=== 打包 Windows x64 版本 ==="
pkg . --target node18-win-x64 --output dist/wechat-video-uploader-win-x64.exe --public

echo "\n=== 打包 macOS x64 版本 ==="
pkg . --target node18-macos-x64 --output dist/wechat-video-uploader-macos-x64 --public

echo "\n=== 打包 macOS ARM64 版本 ==="
pkg . --target node18-macos-arm64 --output dist/wechat-video-uploader-macos-arm64 --public

# 设置执行权限
echo "\n=== 设置执行权限 ==="
chmod +x dist/wechat-video-uploader-linux-x64
chmod +x dist/wechat-video-uploader-macos-x64
chmod +x dist/wechat-video-uploader-macos-arm64

echo "\n=== 构建完成，可执行文件位于 dist 目录 ==="
ls -la dist/