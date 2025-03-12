#!/bin/bash

# 定义路径变量
VIDEO_DIR="/Users/xmx0632/aivideo/dist/videos/weixin/fixed-hk-hk" # 替换为实际路径，例如：/home/user/contentUploader/video
CSV_PATH="/Users/xmx0632/aivideo/dist/poem-content-msg-hk2hk.csv" # 替换为实际路径，例如：/home/user/contentUploader/content-msg.csv


node main.js --platform weixin --dir "$VIDEO_DIR" --csv "$CSV_PATH" --collection "学点广东话" # --headless

# 暂停（可选）
read -p "Press any key to continue..."