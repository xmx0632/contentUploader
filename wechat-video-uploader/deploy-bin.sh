#!/bin/bash
# 定义目标目录数组
targets=(
    "douyin"
    "kuaishou"
    "rednote"
    "weixin"
    "weixin_188"
    "youtube"
)

# 循环复制文件到各个目标目录
for target in "${targets[@]}"; do
    cp wechat-video-uploader-macos-arm64 "release/$target/wechat-video-uploader-macos-arm64"
done
