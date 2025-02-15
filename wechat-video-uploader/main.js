const {
    loadEnvFile,
    getMP4Files,
    initBrowser,
    parseCommandLineArgs
} = require('./upload_common');

const { uploadToWeixin } = require('./upload_weixin');
const { uploadToRednote } = require('./upload_rednote');
const { uploadToKuaishou } = require('./upload_kuaishou');

// 加载 AI 描述生成工具
let generateMultiWordDescription;
try {
    const aiUtil = require('./ai_util.js');
    generateMultiWordDescription = aiUtil.generateMultiWordDescription;
    console.log('Loaded ai_util.js');
} catch (error) {
    console.error('Error loading ai_util.js:', error);
    generateMultiWordDescription = async (text) => text;
}

// 支持的平台列表
const SUPPORTED_PLATFORMS = ['weixin', 'rednote', 'kuaishou'];

async function main() {
    console.log('视频上传工具启动...');
    
    // 加载环境变量
    loadEnvFile();

    // 解析命令行参数
    const options = parseCommandLineArgs();
    
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
            'kuaishou': uploadToKuaishou
        };

        const uploadFunction = platformUploadMap[options.platform];
        
        // 添加 generateMultiWordDescription 到 options
        const uploadOptions = {
            ...options,
            generateMultiWordDescription
        };
        
        // 执行上传
        console.log('开始上传视频...');
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
    }
}

main().catch(console.error);