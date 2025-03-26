#!/usr/bin/env python3
# publish-stat.py
# 用于统计发布数据,/Users/xmx0632/aivideo/dist/videos 下所有视频的发布数据，使用表格形式输出

import os
import re
import glob
import pandas as pd
from datetime import datetime
import matplotlib.pyplot as plt
from collections import defaultdict, Counter
import argparse

# 基础目录
BASE_DIR = "/Users/xmx0632/aivideo/dist/videos"

# 平台列表
PLATFORMS = ["weixin", "weixin_188", "douyin", "kuaishou", "rednote"]

# 语言组合
LANGUAGE_PAIRS = ["en-ja", "en-zh", "ko-en", "zh-zh", "hk-en", "hk-hk"]


def parse_release_date(filename):
    """
    从发布文件名中提取日期
    格式示例: 20250302/video.mp4
    """
    match = re.match(r"(\d{8})/", filename)
    if match:
        date_str = match.group(1)
        try:
            return datetime.strptime(date_str, "%Y%m%d").date()
        except ValueError:
            return None
    return None


def count_videos_in_directory(directory):
    """
    统计目录中的视频文件数量
    当前目录下的mp4文件数量加上 0-released.csv 中的视频数量,不包含子目录下的视频数量
    """
    if not os.path.exists(directory):
        return 0
    
    video_files = glob.glob(os.path.join(directory, "*.mp4"))
    released_csv = os.path.join(directory, "0-released.csv")
    released_videos = get_released_videos(released_csv)
    return len(video_files) + len(released_videos)


def get_released_videos(csv_path):
    """
    从发布CSV文件中获取已发布的视频列表
    """
    if not os.path.exists(csv_path):
        return []
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        return [line.strip() for line in f if line.strip()]


def analyze_platform(platform):
    """
    分析特定平台的视频发布数据
    """
    platform_dir = os.path.join(BASE_DIR, platform)
    if not os.path.exists(platform_dir):
        return {}
    
    results = {}
    
    # 遍历所有语言组合目录
    for lang_pair in LANGUAGE_PAIRS:
        fixed_dir = os.path.join(platform_dir, f"fixed-{lang_pair}")
        if not os.path.exists(fixed_dir):
            continue
        
        # 统计总视频数
        total_videos = count_videos_in_directory(fixed_dir)
        
        # 获取已发布视频列表
        released_csv = os.path.join(fixed_dir, "0-released.csv")
        released_videos = get_released_videos(released_csv)
        
        # 统计发布日期分布
        release_dates = [parse_release_date(video) for video in released_videos]
        release_dates = [d for d in release_dates if d is not None]
        date_counts = Counter(release_dates)
        
        # 提取视频名称（不含日期目录和扩展名）
        video_names = []
        for video in released_videos:
            parts = video.split('/')
            if len(parts) > 1:
                name = parts[1].replace('.mp4', '')
                video_names.append(name)
        
        # 确保已发布数不超过总视频数
        released_count = len(released_videos)
        if released_count > total_videos:
            # 如果已发布数大于总视频数，则将总视频数调整为已发布数
            total_videos = released_count
        
        results[lang_pair] = {
            "总视频数": total_videos,
            "已发布数": released_count,
            "未发布数": total_videos - released_count,
            "发布率": round(released_count / total_videos * 100, 2) if total_videos > 0 else 0,
            "日期分布": date_counts,
            "视频列表": video_names
        }
    
    return results


def generate_summary_table(all_data):
    """
    生成汇总表格
    """
    summary_data = []
    
    for platform in PLATFORMS:
        if platform not in all_data:
            continue
            
        platform_data = all_data[platform]
        
        for lang_pair, stats in platform_data.items():
            summary_data.append({
                "平台": platform,
                "语言": lang_pair,
                "总视频数": stats["总视频数"],
                "已发布数": stats["已发布数"],
                "未发布数": stats["未发布数"],
                "发布率(%)": stats["发布率"]
            })
    
    # 创建DataFrame
    if summary_data:
        df = pd.DataFrame(summary_data)
        return df
    else:
        return pd.DataFrame()


def generate_daily_stats(all_data):
    """
    生成每日发布统计
    """
    daily_counts = defaultdict(int)
    
    for platform in all_data:
        for lang_pair in all_data[platform]:
            date_counts = all_data[platform][lang_pair]["日期分布"]
            for date, count in date_counts.items():
                daily_counts[date] += count
    
    # 按日期排序
    sorted_dates = sorted(daily_counts.keys())
    daily_stats = [(date, daily_counts[date]) for date in sorted_dates]
    
    return daily_stats


def plot_release_trend(daily_stats, output_file=None):
    """
    绘制发布趋势图
    """
    if not daily_stats:
        print("没有足够的数据来绘制趋势图")
        return
    
    # 导入字体管理模块
    import matplotlib.font_manager as fm
    
    # 设置支持中文显示的字体
    try:
        # 尝试使用系统中可能存在的中文字体
        chinese_fonts = ['Arial Unicode MS', 'SimHei', 'STHeiti', 'Microsoft YaHei', 'PingFang SC', 'Heiti SC']
        font_path = None
        
        for font in chinese_fonts:
            try:
                font_path = fm.findfont(fm.FontProperties(family=font))
                if font_path and 'ttf' in font_path.lower() and not font_path.endswith('DejaVuSans.ttf'):
                    break
            except:
                continue
        
        if font_path and not font_path.endswith('DejaVuSans.ttf'):
            plt.rcParams['font.family'] = fm.FontProperties(fname=font_path).get_name()
        else:
            # 如果找不到中文字体，使用英文标签
            print("警告: 未找到支持中文的字体，将使用英文标签")
            plt.rcParams['font.family'] = 'sans-serif'
    except Exception as e:
        print(f"设置字体时出错: {e}")
        plt.rcParams['font.family'] = 'sans-serif'
    
    # 按日期排序
    sorted_stats = sorted(daily_stats)
    
    # 只取最近30天的数据，减少图片大小
    if len(sorted_stats) > 30:
        sorted_stats = sorted_stats[-30:]
    
    # 如果数据点太多，可能会导致图片过大
    # 将数据转换为日期对象和计数列表
    date_strs = [date for date, _ in sorted_stats]
    counts = [count for _, count in sorted_stats]
    
    # 使用更小的图像尺寸
    plt.figure(figsize=(10, 6), dpi=100)
    plt.bar(range(len(date_strs)), counts, color='skyblue', width=0.7)
    
    # 设置 x 轴刻度为日期文本
    plt.xticks(range(len(date_strs)), date_strs, rotation=45, fontsize=8)
    
    # 添加数据标签，但只对较大的值显示数字
    for i, count in enumerate(counts):
        if count > 5:  # 只对大于5的值显示标签
            plt.text(i, count + 1, str(count), ha='center', va='bottom', fontsize=8)
    
    # 设置图表样式 - 如果字体问题未解决，使用英文标签
    if plt.rcParams['font.family'] == 'sans-serif':
        plt.xlabel('Release Date', fontsize=12)
        plt.ylabel('Number of Videos', fontsize=12)
        plt.title('Daily Video Release Trend', fontsize=16)
    else:
        plt.xlabel('发布日期', fontsize=12)
        plt.ylabel('发布视频数量', fontsize=12)
        plt.title('每日视频发布数量趋势', fontsize=16)
    
    plt.xticks(rotation=45)
    plt.grid(axis='y', linestyle='--', alpha=0.7)
    
    # 设置边距
    plt.tight_layout()
    
    if output_file:
        try:
            # 确保输出目录存在
            output_dir = os.path.dirname(output_file)
            if output_dir and not os.path.exists(output_dir):
                os.makedirs(output_dir)
            
            # 使用更小的DPI和压缩级别保存图片
            plt.savefig(output_file, format='png', dpi=100, bbox_inches='tight', 
                       transparent=False, pad_inches=0.1, 
                       facecolor='white', edgecolor='none')
            print(f"趋势图已保存至: {output_file}")
            
            # 关闭图表以释放内存
            plt.close()
        except Exception as e:
            print(f"保存趋势图时出错: {e}")
            # 尝试保存到当前目录且使用不同文件名
            alt_output = "trend_chart.png"
            try:
                plt.savefig(alt_output, format='png', dpi=72, bbox_inches='tight',
                          transparent=False, facecolor='white')
                print(f"趋势图已保存至当前目录: {alt_output}")
            except Exception as e2:
                print(f"保存图片失败: {e2}")
            finally:
                plt.close()
    else:
        plt.show()
        plt.close()


def main():
    # 解析命令行参数
    parser = argparse.ArgumentParser(description='统计视频发布数据')
    parser.add_argument('--plot', action='store_true', help='生成发布趋势图')
    parser.add_argument('--output', type=str, help='输出Excel文件路径')
    parser.add_argument('--plot-output', type=str, help='趋势图输出路径')
    parser.add_argument('--platform', type=str, help='只显示指定平台的数据')
    args = parser.parse_args()
    
    # 收集平台数据
    all_data = {}
    if args.platform and args.platform in PLATFORMS:
        # 如果指定了平台，只分析该平台
        platform_data = analyze_platform(args.platform)
        if platform_data:
            all_data[args.platform] = platform_data
    else:
        # 否则分析所有平台
        for platform in PLATFORMS:
            platform_data = analyze_platform(platform)
            if platform_data:
                all_data[platform] = platform_data
    
    # 生成汇总表格
    summary_df = generate_summary_table(all_data)
    
    if not summary_df.empty:
        # 设置显示选项，使表格对齐
        pd.set_option('display.unicode.ambiguous_as_wide', True)
        pd.set_option('display.unicode.east_asian_width', True)
        pd.set_option('display.width', 120)
        pd.set_option('display.colheader_justify', 'center')
        pd.set_option('display.precision', 2)
        
        # 排序表格，先按平台再按语言
        summary_df = summary_df.sort_values(by=["平台", "语言"])
        
        # 打印汇总表格
        print("\n" + "="*80)
        print("发布数据汇总".center(80))
        print("="*80)
        print(summary_df.to_string(index=False))
        print("-"*80)
        
        # 计算总体统计
        total_videos = summary_df["总视频数"].sum()
        total_released = summary_df["已发布数"].sum()
        total_unreleased = summary_df["未发布数"].sum()
        overall_rate = round(total_released / total_videos * 100, 2) if total_videos > 0 else 0
        
        print(f"\n总体统计:")
        print(f"总视频数: {total_videos:,}")
        print(f"已发布数: {total_released:,}")
        print(f"未发布数: {total_unreleased:,}")
        print(f"总体发布率: {overall_rate:.2f}%")
        
        # 生成每日统计
        daily_stats = generate_daily_stats(all_data)
        
        if daily_stats:
            print("\n" + "="*80)
            print("最近发布日期统计".center(80))
            print("="*80)
            for date, count in sorted(daily_stats, reverse=True)[:10]:  # 显示最近10天
                print(f"{date}: {count:,} 个视频")
            print("-"*80)
        
        # 保存到Excel
        if args.output:
            try:
                # 确保输出目录存在
                output_dir = os.path.dirname(args.output)
                if output_dir and not os.path.exists(output_dir):
                    os.makedirs(output_dir)
                
                with pd.ExcelWriter(args.output, engine='openpyxl') as writer:
                    summary_df.to_excel(writer, sheet_name='汇总', index=False)
                    
                    # 创建每日发布统计表
                    if daily_stats:
                        daily_df = pd.DataFrame(daily_stats, columns=['日期', '发布数量'])
                        daily_df.to_excel(writer, sheet_name='每日统计', index=False)
                    
                    # 为每个平台创建详细表格
                    for platform in all_data:
                        platform_details = []
                        for lang_pair in all_data[platform]:
                            stats = all_data[platform][lang_pair]
                            platform_details.append({
                                "语言": lang_pair,
                                "总视频数": stats["总视频数"],
                                "已发布数": stats["已发布数"],
                                "未发布数": stats["未发布数"],
                                "发布率(%)": stats["发布率"]
                            })
                        
                        if platform_details:
                            platform_df = pd.DataFrame(platform_details)
                            # 确保工作表名称不超过31个字符(Excel限制)
                            sheet_name = platform[:31] if len(platform) > 31 else platform
                            platform_df.to_excel(writer, sheet_name=sheet_name, index=False)
                
                print(f"\n数据已保存至: {args.output}")
            except Exception as e:
                print(f"保存Excel文件时出错: {e}")
                # 尝试保存到当前目录
                alt_output = os.path.basename(args.output) if args.output else "video_stats.xlsx"
                try:
                    with pd.ExcelWriter(alt_output, engine='openpyxl') as writer:
                        summary_df.to_excel(writer, sheet_name='汇总', index=False)
                        if daily_stats:
                            daily_df = pd.DataFrame(daily_stats, columns=['日期', '发布数量'])
                            daily_df.to_excel(writer, sheet_name='每日统计', index=False)
                    print(f"数据已保存至当前目录: {alt_output}")
                except Exception as e2:
                    print(f"保存到当前目录也失败: {e2}")
        
        # 绘制趋势图
        if args.plot:
            plot_release_trend(daily_stats, args.plot_output)
    else:
        print("未找到任何发布数据")


if __name__ == "__main__":
    main()
