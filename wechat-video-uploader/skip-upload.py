# -*- coding: utf-8 -*-
# 把指定目录下的所有 mp4 视频写入那个目录下的 0-released.csv 文件中，目录路径作为参数传入，如：
# python skip-upload.py --d /path/to/videos
# 内容为视频文件名加上固定的前缀 30000000/ ，格式如下：30000000/xxx.mp4
# 如果文件中已经有这个文件名，则跳过，不重复写入。

import os
import sys
import argparse
import glob
from pathlib import Path


def parse_args():
    """解析命令行参数"""
    parser = argparse.ArgumentParser(description='将MP4文件写入CSV记录')
    parser.add_argument('--d', '--dir', required=True, help='指定视频文件目录')
    
    return parser.parse_args()


def read_existing_records(csv_file):
    """读取已存在的CSV记录"""
    existing_records = set()
    
    if os.path.exists(csv_file):
        print(f"读取已有记录文件: {csv_file}")
        try:
            with open(csv_file, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line:
                        # 提取文件名部分（如果有路径分隔符）
                        if '/' in line:
                            filename = line.split('/')[-1]
                            existing_records.add(filename)
                        else:
                            existing_records.add(line)
            print(f"已读取 {len(existing_records)} 条记录")
        except Exception as e:
            print(f"读取CSV文件时出错: {e}")
    else:
        print(f"CSV文件不存在，将创建新文件: {csv_file}")
    
    return existing_records


def write_videos_to_csv(video_dir, csv_file, existing_records):
    """将视频文件写入CSV"""
    # 获取目录下所有MP4文件
    mp4_files = glob.glob(os.path.join(video_dir, "*.mp4"))
    
    if not mp4_files:
        print(f"目录 {video_dir} 中没有找到MP4文件")
        return
    
    # 记录新增和跳过的文件数
    added_count = 0
    skipped_count = 0
    
    # 打开CSV文件进行追加
    with open(csv_file, 'a', encoding='utf-8') as f:
        for video_path in mp4_files:
            # 获取文件名
            filename = os.path.basename(video_path)
            
            # 检查是否已存在
            if filename in existing_records:
                print(f"跳过: {filename} (已存在)")
                skipped_count += 1
                continue
            
            # 写入新记录
            record = f"30000000/{filename}"
            f.write(record + '\n')
            print(f"添加: {record}")
            added_count += 1
            
            # 将新添加的记录加入已存在集合，避免重复
            existing_records.add(filename)
    
    print(f"\n处理完成: 添加了 {added_count} 个新记录，跳过了 {skipped_count} 个已存在的记录")


def main():
    """主函数"""
    # 解析命令行参数
    args = parse_args()
    video_dir = args.d
    
    # 检查目录是否存在
    if not os.path.isdir(video_dir):
        print(f"错误: 目录 '{video_dir}' 不存在")
        sys.exit(1)
    
    print(f"处理目录: {video_dir}")
    
    # CSV文件路径
    csv_file = os.path.join(video_dir, "0-released.csv")
    
    # 读取已存在的记录
    existing_records = read_existing_records(csv_file)
    
    # 写入视频记录
    write_videos_to_csv(video_dir, csv_file, existing_records)


if __name__ == "__main__":
    main()
