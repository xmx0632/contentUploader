### 功能描述

使用 puppeteer 自动化脚本 upload_weichat.js 自动上传视频到微信视频号。

#### 主要功能

1. 自动上传视频文件到微信视频号、抖音、快手、小红书和 YouTube
2. 从视频文件名自动生成 AI 单词卡片描述
3. 支持多个单词组合（使用短横线分隔，如 word1-word2）
4. 自动生成英语和日语对照单词卡片
5. 支持限制每次上传的文件数量（默认最多5个）
6. 上传成功后自动归档到日期子目录（格式：YYYYMMDD）
7. 支持单词描述本地缓存，避免重复调用 API
8. 支持从 CSV 文件读取视频标题和描述
9. 支持 YouTube Shorts 视频上传，自动添加 #Shorts 标签


### 步骤

1. 进入微信视频号管理页面，查看视频列表:  https://channels.weixin.qq.com/platform/post/list?tab=post, 页面代码在 pages/list.html 中
2. 如果需要登录，由用户手动登录，登录完成后按回车继续
3. 点击“发表视频”按钮，对应的按钮代码如下:
    ```html
    <div data-v-4d8841a8="" class="weui-desktop-btn_wrp"><button
        type="button"
        class="weui-desktop-btn weui-desktop-btn_primary">发表视频
    </button></div>
    ```
4. 点击“发表视频”按钮，进入发布视频页面: https://channels.weixin.qq.com/platform/post/create, 页面代码在 pages/create.html 中
5. 上传视频文件，文件存放在/Users/xmx0632/aivideo/my1/test1/wechat-video-uploader/uploadtest 下的mp4文件，等待上传完成。上传文件代码在 pages/create.html 中，对应代码如下
    ```html
    <input
        type="file"
        accept="video/mp4,video/x-m4v,video/*"
        multiple="multiple" style="display: none;">
    ```
6. 文件上传完成后，“发表”按钮从禁用变为可用
7. 点击“发表”按钮，页面跳转到 https://channels.weixin.qq.com/platform/post/list?tab=post, 页面代码在 pages/list.html 中
8. 如果还有未上传的文件，继续执行步骤3到7，直到目录下的文件都上传完毕结束

### 环境设置

#### NPM 源设置

```bash
# 使用 nrm 管理多个源
npm install -g nrm

# 查看可用的镜像源
nrm ls

# 验证是否切换成功
nrm use taobao

# 验证是否切换成功
nrm current

#切换回官方源
nrm use npm
```

#### 延迟时间配置

程序中的各个等待时间可以通过 `.env` 文件配置，所有时间单位为毫秒：

```ini
# 单词描述缓存文件路径
CSV_PATH=/path/to/custom/content-msg.csv

# 每次上传文件的最大数量
MAX_UPLOAD_COUNT=5

# 页面加载后的等待时间
DELAY_PAGE_LOAD=8000

# 视频上传后的处理等待时间
DELAY_VIDEO_PROCESS=15000

# 内容更新后的等待时间
DELAY_CONTENT_UPDATE=5000
```

#### 协议超时设置（protocolTimeout）

若上传过程中出现 `ProtocolError: Runtime.callFunctionOn timed out` 错误，可通过 `.env` 文件增加如下配置，提升 puppeteer 协议层的超时时间（单位：毫秒，推荐 120000 及以上）：

```ini
# Puppeteer 协议超时时间（单位：毫秒）
PROTOCOL_TIMEOUT=120000
```

程序会自动读取该环境变量并设置 puppeteer 的 `protocolTimeout` 参数。

# 点击操作后的等待时间
DELAY_AFTER_CLICK=3000

# 发布按钮点击后的等待时间
DELAY_AFTER_PUBLISH=8000

# 上传间隔时间
DELAY_BETWEEN_UPLOADS=5000

# YouTube相关配置
# YouTube频道ID
YOUTUBE_CHANNEL_ID=UC1234567890

# YouTube播放列表ID
YOUTUBE_PLAYLIST_ID=PL1234567890

# YouTube视频隐私状态
YOUTUBE_PRIVACY=unlisted
```

如果某个配置项未设置，程序会使用默认值。在网络较慢或系统响应较慢的情况下，可以适当增加这些等待时间。


### 运行命令

```bash
# 安装依赖
npm install dotenv axios puppeteer

# 测试生成单词卡片
node ai_util.js

# 使用统一入口上传视频
node main.js --platform <平台名称> --dir <视频目录路径> [--collection <合集名称>] [--headless]

# 上传到微信视频号
node main.js --platform weixin --dir /path/to/videos

# 上传到抖音
node main.js --platform douyin --dir /path/to/videos

## 抖音登录检测机制说明

新版 checkLogin 会自动检测多个典型已登录元素（如上传按钮、用户头像、昵称等），任意存在即视为已登录。

- 登录检测失败时，会自动截图（login_check_fail.png）并输出页面部分 HTML，方便排查页面结构变化。
- 如果遇到“登录失败，请重试”，请先确认 Puppeteer 弹出的浏览器窗口已完成登录。
- 如多次失败，请将 login_check_fail.png 和 HTML 片段反馈给开发者协助定位。

# 上传到快手
node main.js --platform kuaishou --dir /path/to/videos

# 上传到小红书
node main.js --platform rednote --dir /path/to/videos

# 上传到 YouTube
node main.js --platform youtube --dir /path/to/videos

# 查看帮助信息
node main.js --help
```

### 命令行参数

- `--platform <平台>`: 指定上传平台，必选
  - 支持的平台：`weixin`, `rednote`, `kuaishou`, `douyin`, `youtube`
  - 示例：`--platform youtube`

- `--dir <目录>`: 指定视频文件目录，必选
  - 默认值：`F:\dev\workspace\contentUploader\video`
  - 示例：`--dir /path/to/videos`

- `--headless`: 使用无界面模式运行浏览器
  - 默认：关闭
  - 使用：直接添加 `--headless` 参数
  - 说明：首次使用需要先用非 headless 模式登录，登录信息会被保存供后续 headless 模式使用

- `--collection <名称>`: 指定微信视频号合集名称
  - 示例：`--collection 日语英语对照学`

- `--csv <文件路径>`: 指定自定义CSV文件路径
  - 示例：`--csv /path/to/content-msg.csv`
  - 说明：CSV文件格式为：文件名,标题,描述

- `--channel-id <ID>`: 指定YouTube频道ID
  - 示例：`--channel-id UC1234567890`

- `--playlist <ID>`: 指定YouTube播放列表ID
  - 示例：`--playlist PL1234567890`

- `--privacy <状态>`: 指定YouTube视频隐私状态
  - 支持的值：`public`, `unlisted`, `private`
  - 默认值：`unlisted`
  - 示例：`--privacy unlisted`

- `--title <标题>`: 指定视频标题
  - 示例：`--title "我的视频标题"`

- `--description <描述>`: 指定视频描述
  - 示例：`--description "这是视频描述"`

- `--tags <标签>`: 指定视频标签，多个标签用逗号分隔
  - 示例：`--tags "Shorts,测试,API"`

- `--help`: 显示帮助信息

## 目录结构

```plaintext
├── video/                      # 视频存放位置
├── wechat-video-uploader/
│   ├── .env.example           # 参数配置模板
│   ├── main.js                # 主入口文件
│   ├── upload_weixin.js       # 微信视频号上传脚本
│   ├── upload_douyin.js       # 抖音上传脚本
│   ├── upload_kuaishou.js     # 快手上传脚本
│   ├── upload_rednote.js      # 小红书上传脚本
│   ├── upload_youtube.js     # YouTube上传脚本
│   ├── ai_util.js            # AI 描述生成工具
│   ├── upload_common.js       # 通用上传功能
│   ├── gitlog.md             # 代码变更记录
│   └── package.json          # 项目依赖配置
├── pages/                     # 平台页面结构参考
├── README.md                 # 项目说明文档
└── LICENSE                   # 开源许可证
```

### 打包

#### 安装打包工具

```bash
# 全局安装 pkg
npm install -g pkg
```

#### 打包命令

```bash
# 打包所有平台
pkg . --public

# 或者只打包特定平台
pkg . --targets node18-macos-arm64,node18-macos-x64,node18-win-x64,node18-linux-x64 --public
```

打包后的文件会生成在 `dist` 目录下，包括：
- Windows: `wechat-video-uploader-win-x64.exe`
- Linux: `wechat-video-uploader-linux-x64`
- macOS Intel: `wechat-video-uploader-macos-x64`
- macOS Apple Silicon: `wechat-video-uploader-macos-arm64`

#### 使用 GitHub Actions 自动构建

本项目已配置 GitHub Actions 工作流，可以自动构建多平台可执行程序并发布 Release。

**注意：** GitHub Actions 配置文件位于仓库根目录的 `.github/workflows/build-and-release.yml`，而非当前目录下。

触发方式：
1. 推送标签：当推送以 `v` 开头的标签（如 `v1.0.0`）时，自动触发构建和发布
2. 手动触发：在 GitHub 仓库的 Actions 页面手动触发工作流，需要指定版本号

构建产物：
- Windows (x64): `wechat-video-uploader-windows-x64.exe`
- Linux (x64): `wechat-video-uploader-linux-x64`
- macOS Intel (x64): `wechat-video-uploader-macos-x64`
- macOS Apple Silicon (ARM64): `wechat-video-uploader-macos-arm64`

使用方法：

1. 使用 `release.sh` 脚本发布新版本（推荐）：
```bash
# 发布正式版本
./release.sh 1.0.0

# 发布预发布版本
./release.sh 1.0.0-beta 1
```

2. 手动创建并推送标签：
```bash
# 创建并推送标签
git tag v1.0.0
git push origin v1.0.0
```

3. 在 GitHub 界面手动触发工作流，指定版本号和是否为预发布版本。

#### 运行打包后的程序

1. 创建一个新目录用于运行程序
2. 复制以下文件到该目录：
   - 对应平台的可执行文件
   - `.env` 文件（包含配置信息）

示例（以 macOS 为例）：
```bash
# 创建运行目录
mkdir -p ~/wechat-uploader
cd ~/wechat-uploader

# 复制必要文件
cp /path/to/dist/wechat-video-uploader-macos-arm64 .
cp /path/to/.env .

# 运行程序
./wechat-video-uploader-macos-arm64
```

**注意事项：**
1. 确保 `.env` 文件中的配置正确
2. 首次运行需要手动登录，登录信息会被保存
3. 建议先使用非 headless 模式测试，确保一切正常后再使用 headless 模式

### 登录机制

1. 首次使用：
   - 使用普通模式（不带 --headless）运行程序
   - 手动在浏览器中完成登录
   - 程序会自动保存登录信息（cookies）

2. 后续使用：
   - 可以使用 headless 模式运行
   - 程序会自动使用保存的登录信息
   - 如果登录失效，需要重新用普通模式登录
   - 上传成功的文件会自动移动到以当天日期命名的子目录中（如：20250212）
   - 每次运行最多上传 MAX_UPLOAD_COUNT 指定数量的文件（默认为5个）

3. 登录状态：
   - 登录信息保存在 `cookies.json` 文件中
   - 如果登录失效，删除 `cookies.json` 文件后重新登录

### 命令行参数

程序支持以下命令行参数：

1. `--platform`：指定上传平台（必选）
   - 示例：`--platform weixin`

2. `--dir`：指定视频文件目录（必选）
   - 示例：`--dir /path/to/videos`

3. `--headless`：使用无头模式（可选）
   - 示例：`--headless`

4. `--collection`：指定视频合集名称（可选）
   - 示例：`--collection mycollection`

5. `--csv`：指定单词描述缓存文件路径（可选）
   - 默认路径：`./content-msg.csv`
   - 示例：`--csv /path/to/custom/content-msg.csv`

示例命令：
```bash
# 基本使用
./wechat-video-uploader --platform weixin --dir /path/to/videos

# 使用自定义CSV文件路径
./wechat-video-uploader --platform weixin --dir /path/to/videos --csv /path/to/custom/content-msg.csv

# 使用所有参数
./wechat-video-uploader --platform weixin --dir /path/to/videos --csv /path/to/cache.csv --headless --collection mycollection
```

### 视频文件命名规范

为了最佳的单词卡片生成效果，请按以下规范命名视频文件：

1. 单个单词：`word.mp4`
2. 多个单词：`word1-word2.mp4`

示例：
- `ranunculus.mp4`
- `ranunculus-relay.mp4`

### 单词描述缓存

程序会自动缓存生成的单词描述，以避免重复调用 API。缓存机制如下：

1. 默认情况下，缓存文件位于程序所在目录的 `content-msg.csv`
2. 可以通过 `--csv` 参数指定自定义缓存文件路径
3. 缓存文件会自动创建和维护
4. 如果单词已在缓存中，将直接使用缓存的描述
5. 如果单词不在缓存中，将调用 API 生成描述并保存到缓存


### 视频备份工具

`backup-all-video.js` 是一个自动化工具，用于备份所有视频文件到指定目录。

#### 功能说明

1. 自动扫描 `/Users/xmx0632/aivideo/dist/videos/[模块名]/[视频种类]` 目录下的所有视频文件
2. 将视频文件复制到备份目录，保持原有的目录结构
3. 支持增量备份，避免重复复制已备份的文件
4. 自动创建必要的目录结构

#### 使用方法

```bash
# 运行备份工具
node backup-all-video.js
```

### 视频归档工具

`archive-uploaded-video.js` 是一个自动化工具，用于归档已上传的视频文件并生成上传记录。

#### 功能说明

1. 自动扫描 `/Users/xmx0632/aivideo/dist/videos/[模块名]/[视频种类]` 目录下的日期格式子目录
2. 将视频文件复制到 `/Users/xmx0632/aivideo/dist/[视频种类]` 目录
3. 生成或更新上传记录文件 `0-released.csv`，记录已上传的视频文件
4. 自动删除源文件以释放存储空间
5. 避免重复记录已归档的视频文件

#### 使用方法

```bash
# 运行归档工具
node archive-uploaded-video.js
```


