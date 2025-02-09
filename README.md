# 微信视频号文件上传自动化脚本

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

这是一个自动化脚本，旨在帮助用户批量上传视频文件到微信视频号平台。通过该脚本，您可以轻松实现文件的自动上传、目录管理以及调试模式切换，从而提高工作效率。

---

## 功能特点

- **批量上传**：支持从指定目录中读取视频文件并自动上传。
- **灵活配置**：通过简单的命令行参数控制运行模式（如调试模式或无头模式）。
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

编辑 `run.bat` 或 `run.sh` 文件中的 `VIDEO_DIR` 变量，设置为您的视频文件所在目录。例如：

```bat
set "VIDEO_DIR=F:\dev\workspace\contentUploader\video"
```

或者在 Linux/macOS 中：

```bash
VIDEO_DIR="/path/to/your/video"
```

#### 4. 运行脚本

- **默认模式（带 `--headless` 参数）**
  ```bash
  ./run.sh
  ```
  或者在 Windows 上：
  ```cmd
  run.bat
  或者
  npm run start -- --dir "F:\dev\workspace\contentUploader\video"
  ```

- **调试模式（不带 `--headless` 参数）**
  ```bash
  ./run.sh debug
  ```
  或者在 Windows 上：
  ```cmd
  run.bat debug
  ```

---

## 脚本说明

### 主要文件

| 文件名            | 描述                                                                 |
|-------------------|----------------------------------------------------------------------|
| `upload_weichat.js` | 核心脚本，负责处理视频上传逻辑。                                     |
| `run.bat`         | Windows 批处理文件，用于运行脚本并传递参数。                         |
| `run.sh`          | Linux/macOS Shell 脚本，用于运行脚本并传递参数。                     |

### 参数说明

- **`debug` 参数**
  - 如果传入 `debug` 参数，脚本将以非无头模式运行（显示浏览器界面）。
  - 默认情况下，脚本以无头模式运行（隐藏浏览器界面）。

---

## 目录结构

```plaintext
├── video/                      # 视频存放位置
├── wechat-video-uploader/
├── ├── .env.example            # 参数配置模板
├── ├── upload_weichat.js       # 核心脚本
├── ├── run.bat                 # Windows 批处理文件
├── ├── run.sh                  # Linux/macOS Shell 脚本
├── ├── package.json            # 项目依赖配置
├── README.md               # 项目说明文档
└── LICENSE                 # 开源许可证
```

---

## 注意事项

1. **登录问题**
   - 第一次运行脚本时，可能需要手动完成微信视频号的登录操作。
   - 登录后，Puppeteer 会保持会话状态，无需重复登录。

2. **文件格式**
   - 确保视频文件符合微信视频号的上传要求（如分辨率、大小等）。

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