#!/bin/bash

# 从 mode 参数读取模式为all时统计所有平台数据，默认为all，否则只统计指定平台数据
# platform: 平台: weixin, weixin_188, douyin, kuaishou, rednote
# mode: all or single

# 第一个参数为平台，第二个参数为模式,比如：sh stat.sh weixin all
platform=${1:-"weixin"}
mode=${2:-"all"}
# 统计单词数量
# python3 publish-stat.py --plot --output ./video_stats.xlsx --plot-output ./video_trend.png

if [ "$mode" = "all" ]; then
    echo "统计所有平台数据..."
    python3 publish-stat.py --platform all --plot --output ./video_stats.xlsx --plot-output ./video_trend.png
else
    echo "统计 $platform 平台数据..."
    python3 publish-stat.py --platform $platform --plot --output ./video_stats.xlsx --plot-output ./video_trend.png
fi