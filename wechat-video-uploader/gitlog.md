# Git Commit Log

## 2025-03-09
- fix(upload): 修复微信视频号上传模块初始浏览器启动模式问题
  - 修复了初始启动浏览器时强制使用无头模式的问题
  - 在初始启动浏览器时就尊重用户传入的 headless 参数
  - 添加日志输出，显示当前使用的浏览器模式
  - 更新相关注释，使其更准确地描述实际行为

- fix(upload): 修复微信视频号上传模块中第二个视频超时问题
  - 增加页面导航的超时时间从60秒到120秒
  - 添加重试机制，最多重试三次导航操作
  - 每次重试前增加递增的等待时间
  - 在视频之间增加更长的等待时间，从2秒增加到15秒
  - 改进日志输出，提供更详细的导航和重试状态信息

- fix(upload): 修复微信视频号上传模块中浏览器模式切换问题
  - 修复了即使没有 `--headless` 参数，浏览器也会变成无头模式的问题
  - 在登录成功后重新启动浏览器时，尊重用户传入的 headless 参数设置
  - 更新相关注释，使其更准确地描述实际行为
  - 提高用户体验，允许用户选择是否使用有界面模式进行操作

## 2025-03-08
- fix(upload): 优化快手上传模块中描述输入框选择器的识别方式
  - 将硬编码的 `_description_oei9t_59` 选择器改为动态识别模式
  - 添加模糊匹配选择器 `div[class*="_description_"]` 作为备用方案
  - 增强错误处理，当找不到元素时提供明确的错误信息
  - 改进日志输出，提供更详细的选择器识别过程信息

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
