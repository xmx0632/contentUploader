# Git Commit Log

## 2025-03-03
- feat(ci): 添加 GitHub Actions 自动构建脚本，支持多平台可执行程序构建
  - 新增 `.github/workflows/build-and-release.yml` 文件，配置多平台构建流程
  - 更新 `README.md`，添加关于 GitHub Actions 自动构建的说明
  - 支持 Windows、Linux、macOS (Intel/ARM64) 平台构建
  - 支持通过推送标签或手动触发方式发布新版本
  - 新增 `release.sh` 脚本，简化版本发布流程
  - 支持自动更新 package.json 中的版本号
  - 支持发布正式版本和预发布版本
  - 更新 `README.md`，添加关于 release.sh 脚本的使用说明

- fix(ci): 调整 GitHub Actions 工作流位置
  - 将 `.github` 目录移动到仓库根目录，以符合 GitHub Actions 的要求
  - 更新工作流配置，添加 `working-directory` 参数指定工作目录
  - 修改构建产物路径，适应新的目录结构
  - 更新 `release.sh` 脚本，添加目录切换逻辑
  - 更新 `README.md`，添加关于 GitHub Actions 位置变更的说明
