const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const puppeteer = require('puppeteer');
const readline = require('readline');

// 应用根目录确定
const isPackaged = process.pkg !== undefined;
const appRoot = isPackaged ? path.dirname(process.execPath) : __dirname;

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
async function initBrowser(isHeadless = false) {
    const options = {
        headless: isHeadless ? true : false,
        args: ['--start-maximized'],
        defaultViewport: null
    };
    return await puppeteer.launch(options);
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
        const recordLine = `${dateFormat}/${videoFileName}.mp4\n`;

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
                        csvContent += `${dirName}/${file}\n`;
                    }
                }
            }

            // 写入已有文件记录和当前文件记录
            fs.writeFileSync(csvPath, csvContent);
            console.log(`创建记录文件并写入已有记录: ${csvPath}`);
            console.log(`追加当前文件记录: ${recordLine.trim()}`);
        } else {
            // 如果文件存在，则追加记录
            fs.appendFileSync(csvPath, recordLine);
            console.log(`更新记录文件: ${csvPath}`);
        }

        return targetPath;
    } catch (error) {
        console.error('归档视频文件时出错:', error);
        throw error;
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
    archiveVideo
};
