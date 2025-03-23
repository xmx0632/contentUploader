const path = require('path');
const {
    loadEnvFile,
    getMP4Files,
    initBrowser,
    parseCommandLineArgs
} = require('./upload_common');

const { uploadToWeixin } = require('./upload_weixin');
const { uploadToRednote } = require('./upload_rednote');
const { uploadToKuaishou } = require('./upload_kuaishou');
const { uploadToDouyin } = require('./upload_douyin');
const { uploadYoutubeVideos } = require('./upload_youtube');

// 加载 AI 描述生成工具
let generateMultiWordDescription;
let setCsvFilePath;
try {
    const aiUtil = require('./ai_util.js');
    generateMultiWordDescription = aiUtil.generateMultiWordDescription;
    setCsvFilePath = aiUtil.setCsvFilePath;
    console.log('Loaded ai_util.js');
} catch (error) {
    console.error('Error loading ai_util.js:', error);
    generateMultiWordDescription = async (text) => text;
}

// 支持的平台列表
const SUPPORTED_PLATFORMS = ['weixin', 'rednote', 'kuaishou', 'douyin', 'youtube'];

async function main() {
    console.log('视频上传工具启动...');
    
    // 加载环境变量
    loadEnvFile();

    // 解析命令行参数
    const options = parseCommandLineArgs();
    
    // 如果有--help参数，显示帮助信息并退出
    if (options.help) {
        console.log(`
视频上传工具使用说明：

基本用法：
  node main.js --platform <平台名称> --dir <视频目录>

支持的平台：
  ${SUPPORTED_PLATFORMS.join(', ')}

参数说明：
  --platform <平台>     指定上传平台，必选
  --dir <目录>         指定视频文件目录，必选
  --headless           使用无界面模式运行浏览器
  --collection <名称>  指定微信视频号合集名称
  --csv <文件路径>    指定自定义CSV文件路径
  --channel-id <ID>    指定YouTube频道ID
  --playlist <ID>      指定YouTube播放列表ID
  --privacy <状态>     指定YouTube视频隐私状态(public/unlisted/private)
  --title <标题>       指定视频标题
  --description <描述>  指定视频描述
  --tags <标签>        指定视频标签，多个标签用逗号分隔
  --help               显示帮助信息
`);
        process.exit(0);
    }
    
    // 验证平台参数
    if (!options.platform) {
        throw new Error('请指定上传平台！使用 --platform 参数');
    }
    
    if (!SUPPORTED_PLATFORMS.includes(options.platform)) {
        throw new Error(`不支持的平台: ${options.platform}。支持的平台: ${SUPPORTED_PLATFORMS.join(', ')}`);
    }

    // 验证视频目录
    if (!options.videoDir) {
        throw new Error('请指定视频目录！使用 --dir 参数');
    }

    // 设置 CSV 文件路径
    // 1. 优先使用命令行参数
    // 2. 如果没有命令行参数，使用环境变量
    // 3. 如果都没有，使用默认路径
    let csvPath = options.csvPath || process.env.CSV_PATH;
    if (csvPath) {
        csvPath = path.resolve(csvPath);
        console.log(`使用自定义CSV文件路径: ${csvPath}`);
        setCsvFilePath(csvPath);
    } else {
        console.log('使用默认CSV文件路径');
    }

    console.log(`准备上传到 ${options.platform} 平台...`);
    
    // 获取视频文件列表
    const videoFiles = getMP4Files(options.videoDir);
    console.log(`找到 ${videoFiles.length} 个视频文件待上传`);

    // 初始化浏览器
    console.log('正在启动浏览器...');
    const browser = await initBrowser(options.isHeadless);

    try {
        // 根据平台选择上传函数
        const platformUploadMap = {
            'weixin': uploadToWeixin,
            'rednote': uploadToRednote,
            'kuaishou': uploadToKuaishou,
            'douyin': uploadToDouyin,
            'youtube': uploadYoutubeVideos  // 直接使用upload_youtube.js中的uploadYoutubeVideos函数
        };

        const uploadFunction = platformUploadMap[options.platform];
        
        // 执行上传
        console.log('开始上传视频...');
        // 不直接传递函数，而是传递函数的字符串标识，在各平台上传模块中再根据需要调用
        const uploadOptions = {
            ...options,
            hasAIDescriptionGenerator: typeof generateMultiWordDescription === 'function'
        };
        
        await uploadFunction(browser, videoFiles, uploadOptions);
        console.log('所有视频上传完成！');

    } catch (error) {
        console.error('上传过程中发生错误:', error.message);
        // 如果是已知错误类型，给出更具体的提示
        if (error.code === 'ENOENT') {
            console.error('文件或目录不存在，请检查路径是否正确');
        }
        process.exit(1);
    } finally {
        console.log('正在关闭浏览器...');
        await browser.close();
        process.exit(0);
    }
}

main().catch(console.error);