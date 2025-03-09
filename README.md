# 多平台视频上传自动化脚本

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

这是一个自动化脚本，旨在帮助用户批量上传视频文件到各大视频平台。通过该脚本，您可以轻松实现文件的自动上传、目录管理以及调试模式切换，从而提高工作效率。

---

## 功能特点

- **多平台支持**：支持微信视频号、抖音、快手、小红书等主流平台。
- **批量上传**：支持从指定目录中读取视频文件并自动上传。
- **AI 描述生成**：自动从视频文件名生成多语言（中英日）单词卡片描述。
- **自动归档**：上传成功后自动将文件归档到日期子目录。
- **灵活配置**：通过环境变量和命令行参数灵活控制运行模式。
- **跨平台支持**：支持 Windows、Linux 和 macOS 系统。
- **易于扩展**：代码结构清晰，方便根据需求进行二次开发。

---

## 安装与使用

### 前置条件

在运行脚本之前，请确保您的系统已安装以下依赖：

1. **Node.js**
   - 下载地址：[https://nodejs.org/](https://nodejs.org/)
   - 验证安装：
     ```bash
     node -v
     npm -v
     ```

2. **Puppeteer**
   - Puppeteer 是一个 Node.js 库，用于控制 Chrome 或 Chromium 浏览器。
   - 安装方法：
     ```bash
     npm install puppeteer
     ```

3. **其他依赖**
   - 根据项目需要安装其他依赖项：
     ```bash
     npm install
     ```

---

### 快速开始

#### 1. 克隆项目

```bash
git clone https://github.com/your-username/wechat-video-uploader.git
cd wechat-video-uploader
```

#### 2. 安装依赖

```bash
npm install
```

#### 3. 配置视频目录

编辑 `.env` 文件，设置视频文件所在目录和其他配置项：

```ini
# 视频目录路径
VIDEO_DIR=/path/to/your/video

# 每次上传文件的最大数量
MAX_UPLOAD_COUNT=5

# 页面加载后的等待时间（毫秒）
DELAY_PAGE_LOAD=8000

# 视频上传后的处理等待时间
DELAY_VIDEO_PROCESS=15000

# 内容更新后的等待时间
DELAY_CONTENT_UPDATE=5000

# 点击操作后的等待时间
DELAY_AFTER_CLICK=3000

# 发布按钮点击后的等待时间
DELAY_AFTER_PUBLISH=8000

# 上传间隔时间
DELAY_BETWEEN_UPLOADS=5000
```

#### 4. 运行脚本

使用 main.js 作为统一入口来上传视频，可以灵活地选择平台和配置参数：

```bash
node main.js --platform <平台名称> --dir <视频目录路径> [--collection <合集名称>] [--headless]
```

示例：

- **上传到微信视频号指定合集**
  ```bash
  node main.js --platform weixin --dir /Users/aivideo/dist/videos/weixin --csvPath /Users/xmx0632/aivideo/dist/content-msg-en2zh.csv --collection 日语英语对照学
  ```

- **上传到抖音**
  ```bash
  node main.js --platform douyin --dir /path/to/videos
  ```

- **上传到快手（无头模式）**
  ```bash
  node main.js --platform kuaishou --dir /path/to/videos --headless
  ```

- **上传到小红书**
  ```bash
  node main.js --platform rednote --dir /path/to/videos
  ```

---

## 目录结构

```plaintext
├── video/                      # 视频存放位置
├── wechat-video-uploader/
│   ├── .env.example           # 参数配置模板
│   ├── upload_weichat.js      # 微信视频号上传脚本
│   ├── upload_douyin.js       # 抖音上传脚本
│   ├── upload_kuaishou.js     # 快手上传脚本
│   ├── upload_rednote.js      # 小红书上传脚本
│   ├── ai_util.js            # AI 描述生成工具
│   ├── upload_common.js       # 通用上传功能
│   └── package.json          # 项目依赖配置
├── pages/                     # 平台页面结构参考
├── README.md                 # 项目说明文档
└── LICENSE                   # 开源许可证
```

---

## 注意事项

1. **登录问题**
   - 首次使用需要在非 headless 模式下手动登录各平台。
   - 登录信息会被保存在 cookies.json 文件中。
   - 如果登录失效，删除对应的 cookies 文件后重新登录。

2. **文件格式**
   - 确保视频文件符合各平台的上传要求。
   - 视频文件命名规范：
     - 单个单词：`word.mp4`
     - 多个单词：`word1-word2.mp4`

3. **网络环境**
   - 脚本运行期间需要稳定的网络连接，建议在良好的网络环境下使用。

---

## 贡献指南

欢迎贡献代码！如果您发现任何问题或希望添加新功能，请按照以下步骤操作：

1. Fork 本仓库。
2. 创建一个新的分支 (`git checkout -b feature/your-feature`)。
3. 提交更改 (`git commit -m 'Add some feature'`)。
4. 推送到分支 (`git push origin feature/your-feature`)。
5. 提交 Pull Request。

---

## 许可证

本项目采用 [MIT 许可证](LICENSE)。您可以自由使用、修改和分发本项目。

---

## 致谢

感谢以下工具和库的支持：

- [Node.js](https://nodejs.org/)
- [Puppeteer](https://pptr.dev/)
- [GitHub](https://github.com/)

---

如果有任何问题或建议，请随时在 Issues 页面提出！