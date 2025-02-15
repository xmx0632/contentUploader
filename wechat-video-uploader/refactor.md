# 视频上传系统重构计划

## 1. 代码结构重组

### 1.1 通用功能模块 (`upload_common.js`)

将以下通用功能迁移到 `upload_common.js`：

1. 基础设置和工具函数：
   - 环境变量加载
   - 应用根目录确定
   - 延时函数
   - Cookie 管理（保存/加载）
   - MP4文件获取
   - 命令行参数处理

2. 通用浏览器操作：
   - 浏览器实例创建
   - 登录状态检查
   - 等待用户输入

### 1.2 平台特定模块

1. `upload_weixin.js`：
   - 微信视频号特定的上传流程
   - 平台特定的页面操作
   - 特定的登录检查逻辑

2. `upload_rednote.js`：
   - 小红书特定的上传流程
   - 平台特定的页面操作
   - 特定的登录检查逻辑

3. `upload_kuaishou.js`：
   - 快手特定的上传流程
   - 平台特定的页面操作
   - 特定的登录检查逻辑

### 1.3 主入口模块 (`upload_main.js`)

1. 命令行参数扩展：
   ```
   --platform <platform>  # 指定上传平台（weixin/rednote/kuaishou）
   --dir <directory>     # 视频目录
   --headless           # 无界面模式
   --collection <name>  # 合集名称
   ```

2. 根据平台参数调用对应的上传模块

## 2. 重构步骤

1. 创建 `upload_common.js`：
   - 提取现有 `upload_main.js` 中的通用功能
   - 确保所有平台都能复用这些功能

2. 重构 `upload_weixin.js`：
   - 将现有的微信视频号上传逻辑迁移到这个文件
   - 只保留平台特定的操作

3. 创建 `upload_rednote.js` 和 `upload_kuaishou.js`：
   - 参考微信视频号的实现
   - 实现各自平台的特定上传流程

4. 重构 `upload_main.js`：
   - 简化为平台选择和调用的入口
   - 统一的参数处理
   - 错误处理和日志记录

## 3. 注意事项

1. 保持现有功能完整性：
   - 确保微信视频号上传功能不受影响
   - 维持现有的配置项和环境变量

2. 代码质量：
   - 保持一致的错误处理方式
   - 添加必要的日志记录
   - 保持代码风格统一

3. 配置管理：
   - 各平台的配置项统一管理
   - 环境变量命名规范化

## 4. 后续扩展

1. 支持更多平台：
   - 代码结构便于添加新平台
   - 统一的接口约定

2. 功能增强：
   - 支持批量上传
   - 上传状态记录
   - 失败重试机制



---

改动说明：

导入模块：

从 upload_common.js 导入所需的通用函数。

导入各个平台的上传函数（uploadToWeixin、uploadToRednote、uploadToKuaishou）。

main 函数：

加载环境变量。

使用 parseCommandLineArgs 解析命令行参数，获取包含 platform、videoDir、isHeadless、collectionName 等属性的 options 对象。

使用 getMP4Files 获取要上传的视频文件列表。

使用 initBrowser 初始化浏览器实例。

平台选择逻辑： 使用 switch 语句，根据 options.platform 的值选择相应的上传函数。如果 platform 参数无效，则抛出错误。

调用上传函数： 调用选定的上传函数，并传入浏览器实例、视频文件列表和 options 对象。

错误处理： 使用 try...catch...finally 结构捕获错误，并在 finally 块中关闭浏览器。

程序入口：

调用 main() 函数并捕获可能发生的错误。

使用方法：

现在您可以通过以下方式运行脚本：

微信视频号：

node main.js --platform weixin --dir <视频目录> [--headless] [--collection <合集名称>]
Use code with caution.
Bash
小红书：

node main.js --platform rednote --dir <视频目录> [--headless]
Use code with caution.
Bash
快手：

node main.js --platform kuaishou --dir <视频目录> [--headless]
Use code with caution.
Bash
参数说明：

--platform: 必需，指定上传平台 (weixin, rednote, kuaishou)。

--dir: 可选，指定视频文件夹路径。如果不指定，将使用 .env 文件中的 VIDEO_DIR 变量，如果该变量也未设置，则使用默认值。

--headless: 可选，以无头模式运行浏览器（不显示界面）。

--collection: 可选, 指定微信视频号上传的合集名称.

注意事项：

.env 文件中与平台相关的配置参数，如微信视频号的 WECHAT_COLLECTION_NAME 依然有效。

默认上传文件数量依然由 .env 文件中的 MAX_UPLOAD_COUNT 控制。

确保已安装所有必需的依赖项 (puppeteer, dotenv, 等)。

现在，main.js 已经完全按照您的重构计划进行了重构，成为了一个统一的、可扩展的程序入口。
