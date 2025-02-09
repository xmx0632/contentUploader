#!/bin/bash

# 定义路径变量
VIDEO_DIR="/path/to/your/video" # 替换为实际路径，例如：/home/user/contentUploader/video

# 检查是否传入了参数 debug
if [ "$1" == "debug" ]; then
    echo "Running in DEBUG mode (without --headless)..."
    node upload_weichat.js --dir "$VIDEO_DIR"
else
    echo "Running in HEADLESS mode (with --headless)..."
    node upload_weichat.js --dir "$VIDEO_DIR" --headless
fi

# 暂停（可选）
read -p "Press any key to continue..."