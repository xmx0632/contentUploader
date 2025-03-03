#!/bin/bash
# 发布新版本的脚本

# 检查是否提供了版本号
if [ -z "$1" ]; then
  echo "错误: 请提供版本号"
  echo "用法: ./release.sh 1.0.0 [是否预发布]"
  echo "示例: ./release.sh 1.0.0        # 正式发布"
  echo "示例: ./release.sh 1.0.0-beta 1 # 预发布"
  exit 1
fi

VERSION="v$1"
PRERELEASE=0

# 检查是否为预发布版本
if [ ! -z "$2" ]; then
  PRERELEASE=1
fi

# 确保工作目录干净
if [ -n "$(git status --porcelain)" ]; then
  echo "错误: 工作目录不干净，请先提交或暂存所有更改"
  git status
  echo "是否继续? (y/n)"
  read answer
  if [ "$answer" != "y" ]; then
    exit 1
  fi
fi

# 更新 package.json 中的版本号
VERSION_NO_V="${VERSION#v}"
echo "更新 package.json 中的版本号为 $VERSION_NO_V..."
sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION_NO_V\"/" package.json

# 提交版本更新
echo "提交版本更新..."
git add package.json
git commit -m "chore(release): 更新版本号为 $VERSION_NO_V"

# 创建标签
echo "创建标签 $VERSION..."
git tag -a "$VERSION" -m "发布版本 $VERSION"

# 推送提交和标签到远程仓库
echo "推送提交和标签到远程仓库..."
git push origin main
git push origin "$VERSION"

echo "标签 $VERSION 已创建并推送到远程仓库"
echo "GitHub Actions 将自动构建并发布此版本"

# 如果是预发布版本，输出提示信息
if [ "$PRERELEASE" -eq 1 ]; then
  echo "注意: 此版本被标记为预发布版本"
fi

echo "请访问 GitHub 仓库的 Actions 页面查看构建进度"
echo "构建完成后，可以在 Releases 页面下载构建产物"
