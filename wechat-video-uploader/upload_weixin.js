const path = require('path');
const { delay, loadCookies, saveCookies, waitForEnter } = require('./upload_common');

// 检查登录状态
async function checkLogin(page) {
    await page.goto('https://channels.weixin.qq.com/platform/post/list?tab=post', {
        waitUntil: 'networkidle0'
    });
    
    // 检查是否需要登录
    const needLogin = await page.evaluate(() => {
        // 如果发现“发表视频”按钮，则说明已登录
        const buttons = Array.from(document.querySelectorAll('button'));
        return !buttons.some(button => 
            button.textContent.trim() === '发表视频' && 
            button.offsetParent !== null
        );
    });
    
    return !needLogin;
}

// 获取合集名称
function getCollectionName(options) {
    // 命令行参数优先
    if (options.collectionName) {
        return options.collectionName;
    }
    // 其次是环境变量
    if (process.env.WECHAT_COLLECTION_NAME) {
        return process.env.WECHAT_COLLECTION_NAME;
    }
    // 没有配置时返回空值
    return null;
}

// 上传视频到微信视频号
async function uploadToWeixin(browser, videoFiles, options) {
    const page = await browser.newPage();
    
    // 尝试加载 cookies
    const cookiesLoaded = await loadCookies(page);
    
    // 检查登录状态
    const isLoggedIn = await checkLogin(page);
    
    if (!isLoggedIn) {
        console.log('需要登录，请在浏览器中完成登录...');
        await waitForEnter();
        
        // 再次检查登录状态
        const loggedIn = await checkLogin(page);
        if (!loggedIn) {
            throw new Error('登录失败');
        }
        
        // 保存新的 cookies
        await saveCookies(page);
    }

    // 获取合集名称
    const collectionName = getCollectionName(options);

    // 开始上传视频
    for (const videoFile of videoFiles) {
        console.log(`正在上传视频: ${videoFile}`);
        
        // 进入发布页面
        await page.goto('https://channels.weixin.qq.com/platform/post/create', {
            waitUntil: 'networkidle0'
        });
        
        // 等待上传按钮出现
        const uploadButton = await page.waitForSelector('input[type="file"]');
        
        // 上传视频文件
        await uploadButton.uploadFile(videoFile);
        
        // 等待视频上传完成
        await page.waitForFunction(
            () => {
                const progressBar = document.querySelector('.weui-progress__inner-bar');
                return progressBar && progressBar.style.width === '100%';
            },
            { timeout: 300000 } // 5分钟超时
        );
        
        // 获取视频标题（使用文件名，去掉扩展名）
        const videoTitle = path.basename(videoFile, path.extname(videoFile));
        console.log('视频标题：', videoTitle);

        // 使用AI生成多个描述
        const description = await options.generateMultiWordDescription(videoTitle);
        console.log('生成的描述：', description);

        // 填写标题
        await page.type('.weui-desktop-form__input', videoTitle);

        // 填写描述
        const textareas = await page.$$('textarea');
        if (textareas.length > 0) {
            await textareas[0].type(description);
        }

        // 如果有合集名称，选择合集
        if (collectionName) {
            // 点击合集按钮
            const collectionButton = await page.waitForSelector('.weui-desktop-form__collection-add');
            await collectionButton.click();

            // 等待合集输入框出现
            await page.waitForSelector('.weui-desktop-form__input');
            await page.type('.weui-desktop-form__input', collectionName);

            // 等待并点击第一个合集建议
            await page.waitForSelector('.weui-desktop-form__collection-item');
            const suggestions = await page.$$('.weui-desktop-form__collection-item');
            if (suggestions.length > 0) {
                await suggestions[0].click();
            } else {
                // 如果没有找到现有合集，创建新合集
                const createButton = await page.waitForSelector('.weui-desktop-dialog__ft .weui-desktop-btn_primary');
                await createButton.click();
            }

            console.log('已添加到合集：', collectionName);
        }

        // 点击发布按钮
        const publishButton = await page.waitForSelector('.weui-desktop-dialog__ft .weui-desktop-btn_primary');
        await publishButton.click();

        // 等待发布完成
        await page.waitForSelector('.weui-desktop-card__title', { timeout: 60000 });
        console.log(`视频 ${videoFile} 上传成功`);

        // 等待一下再继续下一个
        await delay(2000);
    }

    await page.close();
}

module.exports = {
    checkLogin,
    uploadToWeixin
};
