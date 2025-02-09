### 功能描述

使用 puppeteer 自动化脚本 upload_weichat.js 自动上传视频到微信视频号。

#### 主要功能

1. 自动上传视频文件到微信视频号
2. 从视频文件名自动生成 AI 单词卡片描述
3. 支持多个单词组合（使用短横线分隔，如 word1-word2）
4. 自动生成英语和日语对照单词卡片


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


### 运行命令

    ```bash
    # 安装依赖
    npm install dotenv axios puppeteer

    # 测试生成单词卡片
    node ai_util.js

    # 上传视频 (使用默认设置)
    node upload_weichat.js

    # 指定视频目录
    node upload_weichat.js --dir /path/to/videos

    # 使用无界面模式
    node upload_weichat.js --headless

    # 同时指定目录和无界面模式
    node upload_weichat.js --dir /path/to/videos --headless
    ```

### 命令行参数

- `--dir <path>`: 指定视频文件夹路径
  - 默认值：`F:\dev\workspace\contentUploader\video`
  - 示例：`--dir /path/to/videos`

- `--headless`: 启用无界面模式
  - 默认：关闭
  - 使用：直接添加 `--headless` 参数
  - 说明：首次使用需要先用非 headless 模式登录，登录信息会被保存供后续 headless 模式使用

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

3. 登录状态：
   - 登录信息保存在 `cookies.json` 文件中
   - 如果登录失效，删除 `cookies.json` 文件后重新登录

### 视频文件命名规范

为了最佳的单词卡片生成效果，请按以下规范命名视频文件：

1. 单个单词：`word.mp4`
2. 多个单词：`word1-word2.mp4`

示例：
- `ranunculus.mp4`
- `ranunculus-relay.mp4`
