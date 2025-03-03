#!/bin/bash

# 确保 temp 目录存在
mkdir -p temp

# 清理 cookies 文件
rm -rf temp/cookies*.json

# 构建可执行文件
pkg . --public

# 显示构建完成信息
echo "构建完成，可执行文件位于 dist 目录"