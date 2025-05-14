const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const puppeteer = require('puppeteer');
const readline = require('readline');

// 应用根目录确定
const isPackaged = process.pkg !== undefined;
const appRoot = isPackaged ? path.dirname(process.execPath) : __dirname;

// 浏览器反防爬虫配置
const BROWSER_ARGS = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-infobars',
    '--window-position=0,0',
    '--ignore-certifcate-errors',
    '--ignore-certifcate-errors-spki-list',
    '--user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"',
    '--start-maximized'
];

// 浏览器指纹配置
const BROWSER_FINGERPRINT = {
    webgl_vendor: 'Google Inc. (Apple)',
    webgl_renderer: 'ANGLE (Apple, Apple M1 Pro, OpenGL 4.1)',
    navigator_platform: 'MacIntel',
    navigator_vendor: 'Google Inc.',
    navigator_language: 'zh-CN',
    screen_resolution: { width: 1920, height: 1080 },
    color_depth: 24
};

// 加载环境变量
function loadEnvFile() {
    try {
        const envPath = path.join(appRoot, '.env');
        if (fs.existsSync(envPath)) {
            dotenv.config({ path: envPath });
            console.log('Loaded .env from:', envPath);
        } else {
            console.log('Warning: .env file not found at:', envPath);
        }
    } catch (error) {
        console.error('Error loading .env file:', error);
    }
}

// 延时函数
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// 等待用户输入
async function waitForEnter() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise(resolve => {
        rl.question('Login complete? Press Enter to continue...', () => {
            rl.close();
            resolve();
        });
    });
}

// 获取MP4文件
function getMP4Files(videoDir) {
    // 获取最大上传数量，默认为5
    const maxUploadCount = parseInt(process.env.MAX_UPLOAD_COUNT || '5');

    // 获取所有MP4文件
    const files = fs.readdirSync(videoDir)
        .filter(file => file.toLowerCase().endsWith('.mp4'))
        .map(file => path.join(videoDir, file));

    // 如果文件数量小于最大上传数量，返回所有文件
    if (files.length <= maxUploadCount) {
        return files;
    }
    // 只返回指定数量的文件
    return files.slice(0, maxUploadCount);
}

// Cookie 管理
async function saveCookies(page, platform = '') {
    const cookies = await page.cookies();
    const tempDir = path.join(appRoot, 'temp');
    if (!fs.existsSync(tempDir)) {
        await fs.promises.mkdir(tempDir);
    }
    const cookieFileName = platform ? `cookies-${platform}.json` : 'cookies.json';
    await fs.promises.writeFile(path.join(tempDir, cookieFileName), JSON.stringify(cookies, null, 2));
    console.log(`Cookies saved successfully for platform: ${platform || 'default'}`);
}

async function loadCookies(page, platform = '') {
    try {
        const tempDir = path.join(appRoot, 'temp');
        if (!fs.existsSync(tempDir)) {
            await fs.promises.mkdir(tempDir);
        }
        const cookieFileName = platform ? `cookies-${platform}.json` : 'cookies.json';
        const cookiesPath = path.join(tempDir, cookieFileName);
        if (fs.existsSync(cookiesPath)) {
            const cookiesString = await fs.promises.readFile(cookiesPath, 'utf8');
            const cookies = JSON.parse(cookiesString);
            await page.setCookie(...cookies);
            console.log(`Cookies loaded successfully for platform: ${platform || 'default'}`);
            return true;
        }
    } catch (err) {
        console.log(`No valid cookies found for platform: ${platform || 'default'}`);
    }
    return false;
}

// 初始化浏览器
// @param {boolean} isHeadless 是否无头模式
// @returns {Promise<import('puppeteer').Browser>} Puppeteer 浏览器实例
async function initBrowser(isHeadless = false) {
    // 读取协议超时时间，优先使用环境变量
    const protocolTimeout = parseInt(process.env.PROTOCOL_TIMEOUT, 10) || 120000;
    const options = {
        headless: isHeadless ? true : false,
        args: BROWSER_ARGS,
        defaultViewport: null,
        protocolTimeout: protocolTimeout
    };
    return await puppeteer.launch(options);
}

// 设置浏览器指纹
async function setupBrowserFingerprint(page) {
    await page.evaluateOnNewDocument((fingerprint) => {
        // 覆盖WebGL信息
        const getParameterProxyHandler = {
            apply: function (target, thisArg, args) {
                const param = args[0];
                if (param === 37445) { // UNMASKED_VENDOR_WEBGL
                    return fingerprint.webgl_vendor;
                } else if (param === 37446) { // UNMASKED_RENDERER_WEBGL
                    return fingerprint.webgl_renderer;
                }
                return Reflect.apply(target, thisArg, args);
            }
        };

        // 修改navigator对象
        Object.defineProperties(navigator, {
            platform: { value: fingerprint.navigator_platform },
            vendor: { value: fingerprint.navigator_vendor },
            language: { value: fingerprint.navigator_language },
            languages: { value: [fingerprint.navigator_language, 'en-US', 'en'] }
        });

        // 修改screen对象
        Object.defineProperties(screen, {
            width: { value: fingerprint.screen_resolution.width },
            height: { value: fingerprint.screen_resolution.height },
            colorDepth: { value: fingerprint.color_depth }
        });

        // 修改WebGL
        if (window.WebGLRenderingContext) {
            const getParameter = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = new Proxy(getParameter, getParameterProxyHandler);
        }
    }, BROWSER_FINGERPRINT);
}

// 解析命令行参数
function parseCommandLineArgs() {
    const args = process.argv.slice(2);
    const options = {
        videoDir: null,
        isHeadless: false,
        collectionName: null,
        platform: null,
        csvPath: null,
        channelId: null, // 添加对YouTube频道ID的支持
        help: false,     // 添加帮助参数
        playlistId: null, // YouTube播放列表ID
        privacy: null,    // 视频隐私状态
        tags: null,       // 视频标签
        title: null,      // 视频标题
        description: null  // 视频描述
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--headless':
                options.isHeadless = true;
                break;
            case '--dir':
                if (args[i + 1]) {
                    options.videoDir = args[i + 1].replace(/\\/g, '/');
                    i++;
                }
                break;
            case '--collection':
                if (args[i + 1]) {
                    options.collectionName = args[i + 1];
                    i++;
                }
                break;
            case '--platform':
                if (args[i + 1]) {
                    options.platform = args[i + 1].toLowerCase();
                    i++;
                }
                break;
            case '--csv':
                if (args[i + 1]) {
                    options.csvPath = args[i + 1].replace(/\\/g, '/');
                    i++;
                }
                break;
            case '--channel-id':
                if (args[i + 1]) {
                    options.channelId = args[i + 1];
                    i++;
                }
                break;
            case '--help':
                options.help = true;
                break;
            case '--playlist':
                if (args[i + 1]) {
                    options.playlistId = args[i + 1];
                    i++;
                }
                break;
            case '--privacy':
                if (args[i + 1]) {
                    options.privacy = args[i + 1];
                    i++;
                }
                break;
            case '--tags':
                if (args[i + 1]) {
                    options.tags = args[i + 1];
                    i++;
                }
                break;
            case '--title':
                if (args[i + 1]) {
                    options.title = args[i + 1];
                    i++;
                }
                break;
            case '--description':
                if (args[i + 1]) {
                    options.description = args[i + 1];
                    i++;
                }
                break;
        }
    }

    // 如果是帮助命令，不需要检查目录
    if (options.help) {
        return options;
    }

    // 如果没有指定目录，则使用环境变量或默认值
    if (!options.videoDir) {
        options.videoDir = process.env.VIDEO_DIR || 'F:\\dev\\workspace\\contentUploader\\video';
    }

    // 检查目录是否存在
    if (!fs.existsSync(options.videoDir)) {
        throw new Error(`Directory not found: ${options.videoDir}`);
    }

    return options;
}

// 归档视频文件
async function archiveVideo(videoFile, baseDir) {
    try {
        const today = new Date();
        const dateDir = path.join(baseDir, today.getFullYear().toString() +
            (today.getMonth() + 1).toString().padStart(2, '0') +
            today.getDate().toString().padStart(2, '0'));

        // 创建日期目录（如果不存在）
        if (!fs.existsSync(dateDir)) {
            fs.mkdirSync(dateDir, { recursive: true });
        }

        // 移动文件到日期目录
        const videoFileName = path.basename(videoFile, path.extname(videoFile));
        const targetPath = path.join(dateDir, videoFileName + ".mp4");
        console.log(`移动文件: ${videoFile} 到 ${targetPath}`);
        fs.renameSync(videoFile, targetPath);
        console.log(`完成: 文件已移动到: ${targetPath}`);

        // 记录已上传的视频文件到CSV
        const sourceDir = path.dirname(videoFile);
        const csvPath = path.join(sourceDir, '0-released.csv');
        const dateFormat = path.basename(dateDir);

        // 生成当前时间戳，格式：年月日时分秒
        const timestamp = today.getFullYear().toString() +
            (today.getMonth() + 1).toString().padStart(2, '0') +
            today.getDate().toString().padStart(2, '0') +
            today.getHours().toString().padStart(2, '0') +
            today.getMinutes().toString().padStart(2, '0') +
            today.getSeconds().toString().padStart(2, '0');

        // 新的记录行包含时间戳
        const recordLine = `${dateFormat}/${videoFileName}.mp4,${timestamp}\n`;

        // 如果CSV文件不存在，则创建它并扫描已有的日期目录
        if (!fs.existsSync(csvPath)) {
            console.log(`CSV文件不存在，扫描已上传文件目录...`);
            let csvContent = '';

            // 扫描baseDir下所有符合日期格式的目录（格式为YYYYMMDD）
            const dateDirs = fs.readdirSync(baseDir)
                .filter(dir => /^\d{8}$/.test(dir))
                .map(dir => path.join(baseDir, dir));

            // 遍历每个日期目录，记录其中的MP4文件
            for (const dir of dateDirs) {
                if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
                    const dirName = path.basename(dir);
                    const files = fs.readdirSync(dir)
                        .filter(file => file.toLowerCase().endsWith('.mp4'));

                    for (const file of files) {
                        // 对于已有文件，添加一个默认的时间戳，保持兼容性
                        csvContent += `${dirName}/${file},20250101010101\n`;
                    }
                }
            }

            // 写入已有文件记录和当前文件记录
            fs.writeFileSync(csvPath, csvContent);
            console.log(`创建记录文件并写入已有记录: ${csvPath}`);
            console.log(`追加当前文件记录: ${recordLine.trim()}`);
        } else {
            // 如果文件存在，则需要检查文件格式并追加记录
            const existingContent = fs.readFileSync(csvPath, 'utf8');

            // 检查是否已经包含时间戳列
            const hasTimestampColumn = existingContent.split('\n').some(line => line.includes(','));

            if (!hasTimestampColumn && existingContent.trim() !== '') {
                // 如果不包含时间戳列且文件不为空，需要更新文件格式
                const updatedContent = existingContent.split('\n')
                    .filter(line => line.trim() !== '')
                    .map(line => `${line},20250101010101`)
                    .join('\n') + '\n';

                fs.writeFileSync(csvPath, updatedContent);
                console.log(`更新CSV文件格式，添加时间戳列并设置默认时间戳: ${csvPath}`);
            }

            // 追加记录
            fs.appendFileSync(csvPath, recordLine);
            console.log(`更新记录文件: ${csvPath}`);
        }

        return targetPath;
    } catch (error) {
        console.error('归档视频文件时出错:', error);
        throw error;
    }
}

/**
 * 加载YouTube凭证文件
 * @returns {Promise<{credentials: Object, token: Object}|null>} 凭证和令牌对象，如果文件不存在则返回null
 */
async function loadYoutubeCredentials() {
    try {
        const tempDir = path.join(appRoot, 'temp');
        if (!fs.existsSync(tempDir)) {
            await fs.promises.mkdir(tempDir);
        }

        const credentialsPath = path.join(tempDir, 'youtube-credentials.json');
        const tokenPath = path.join(tempDir, 'youtube-token.json');

        let credentials = null;
        let token = null;

        // 尝试读取凭证文件
        if (fs.existsSync(credentialsPath)) {
            const credentialsString = await fs.promises.readFile(credentialsPath, 'utf8');
            credentials = JSON.parse(credentialsString);
            console.log('YouTube凭证文件加载成功');
        } else {
            console.log('YouTube凭证文件不存在:', credentialsPath);
        }

        // 尝试读取令牌文件
        if (fs.existsSync(tokenPath)) {
            const tokenString = await fs.promises.readFile(tokenPath, 'utf8');
            token = JSON.parse(tokenString);
            console.log('YouTube令牌文件加载成功');
        } else {
            console.log('YouTube令牌文件不存在:', tokenPath);
        }

        // 如果两个文件都不存在，返回null
        if (!credentials && !token) {
            return null;
        }

        return { credentials, token };
    } catch (err) {
        console.error('加载YouTube凭证文件时出错:', err);
        return null;
    }
}

/**
 * 加载YouTube凭证文件
 * @returns {Promise<{credentials: Object, token: Object}|null>} 凭证和令牌对象，如果文件不存在则返回null
 */
async function loadYoutubeCredentials() {
    try {
        const tempDir = path.join(appRoot, 'temp');
        if (!fs.existsSync(tempDir)) {
            await fs.promises.mkdir(tempDir);
        }

        const credentialsPath = path.join(tempDir, 'youtube-credentials.json');
        const tokenPath = path.join(tempDir, 'youtube-tokens.json');

        let credentials = null;
        let token = null;

        // 尝试读取凭证文件
        if (fs.existsSync(credentialsPath)) {
            const credentialsString = await fs.promises.readFile(credentialsPath, 'utf8');
            credentials = JSON.parse(credentialsString);
            console.log('YouTube凭证文件加载成功');
        } else {
            console.log('YouTube凭证文件不存在:', credentialsPath);
        }

        // 尝试读取令牌文件
        if (fs.existsSync(tokenPath)) {
            const tokenString = await fs.promises.readFile(tokenPath, 'utf8');
            token = JSON.parse(tokenString);
            console.log('YouTube令牌文件加载成功');
        } else {
            console.log('YouTube令牌文件不存在:', tokenPath);
        }

        // 如果两个文件都不存在，返回null
        if (!credentials && !token) {
            return null;
        }

        return { credentials, token };
    } catch (err) {
        console.error('加载YouTube凭证文件时出错:', err);
        return null;
    }
}

// 导出通用功能
module.exports = {
    appRoot,
    loadEnvFile,
    delay,
    waitForEnter,
    getMP4Files,
    saveCookies,
    loadCookies,
    initBrowser,
    parseCommandLineArgs,
    archiveVideo,
    BROWSER_ARGS,
    BROWSER_FINGERPRINT,
    setupBrowserFingerprint,
    loadYoutubeCredentials
};
