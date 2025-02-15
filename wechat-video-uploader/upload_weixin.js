const { delay, loadCookies, saveCookies } = require('./upload_common');

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
        
        // 如果有合集名称，选择合集
        if (collectionName) {
            await page.click('.collection-select');
            await page.type('.collection-select-input', collectionName);
            await page.click(`[title="${collectionName}"]`);
        }
        
        // 点击发布按钮
        await page.click('.publish-btn');
        
        // 等待发布成功
        await page.waitForFunction(
            () => document.querySelector('.success-page'),
            { timeout: 30000 }
        );
        
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
