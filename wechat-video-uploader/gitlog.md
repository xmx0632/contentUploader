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

- fix(ci): 修复 GitHub Actions 构建错误
  - 将 `npm ci` 替换为 `npm install`，解决依赖不同步问题
  - 使用 `npx pkg` 替代全局安装的 pkg，提高兼容性
  - 在每个构建步骤中添加 `npm install --no-package-lock`，确保依赖安装成功
  - 更新 package.json 中的 pkg 配置，正确指定脚本和资源文件

- fix(ci): 修复 Windows 平台构建错误
  - 使用 PowerShell 命令替代 bash 命令，解决 Windows 上不支持 `rm` 命令的问题
  - 根据运行环境动态选择命令，提高跨平台兼容性
  - 使用 `Test-Path` 和 `Remove-Item` 处理文件删除
  - 使用 `New-Item` 创建目录，替代 `mkdir -p`

- chore(release): 升级版本至 0.0.7.4
  - 将版本号从 0.0.7.2 升级至 0.0.7.4
  - 优化 pkg 打包配置，添加必要的依赖模块
  - 添加 node_modules 下的关键依赖到 assets 列表
  - 确保打包后的可执行文件包含所有必要模块

- chore(release): 升级版本至 0.0.7.5
  - 将版本号从 0.0.7.4 升级至 0.0.7.5
  - 禁用 ai_util.js 中的测试函数，避免在生产环境中自动运行测试
  - 将测试函数调用行注释掉，保留测试函数代码便于开发调试
