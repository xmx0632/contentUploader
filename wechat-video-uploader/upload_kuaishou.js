const { delay, loadCookies, saveCookies } = require('./upload_common');

// 检查登录状态
async function checkLogin(page) {
    await page.goto('https://cp.kuaishou.com/article/publish/video', {
        waitUntil: 'networkidle0'
    });
    
    try {
        // 如果发现上传视频按钮，则说明已登录
        await page.waitForSelector('.upload-btn', { timeout: 5000 });
        return true;
    } catch (error) {
        return false;
    }
}

// 上传视频到快手
async function uploadToKuaishou(browser, videoFiles, options) {
    const page = await browser.newPage();
    
    // 尝试加载 cookies
    const cookiesLoaded = await loadCookies(page);
    
    // 检查登录状态
    const isLoggedIn = await checkLogin(page);
    
    if (!isLoggedIn) {
        console.log('需要登录快手创作者平台，请在浏览器中完成登录...');
        await waitForEnter();
        
        // 再次检查登录状态
        const loggedIn = await checkLogin(page);
        if (!loggedIn) {
            throw new Error('登录失败');
        }
        
        // 保存新的 cookies
        await saveCookies(page);
    }

    // 开始上传视频
    for (const videoFile of videoFiles) {
        console.log(`正在上传视频到快手: ${videoFile}`);
        
        // 进入发布页面
        await page.goto('https://cp.kuaishou.com/article/publish/video', {
            waitUntil: 'networkidle0'
        });
        
        // 等待上传按钮出现
        const uploadButton = await page.waitForSelector('input[type="file"]');
        
        // 上传视频文件
        await uploadButton.uploadFile(videoFile);
        
        // 等待视频上传完成
        await page.waitForFunction(
            () => {
                const progressBar = document.querySelector('.upload-progress-bar');
                return progressBar && progressBar.style.width === '100%';
            },
            { timeout: 300000 } // 5分钟超时
        );
        
        // 等待视频处理完成
        await page.waitForFunction(
            () => !document.querySelector('.processing-status'),
            { timeout: 300000 }
        );
        
        // 点击发布按钮
        await page.click('.publish-btn');
        
        // 等待发布成功
        await page.waitForFunction(
            () => document.querySelector('.success-message'),
            { timeout: 30000 }
        );
        
        console.log(`视频 ${videoFile} 上传到快手成功`);
        
        // 等待一下再继续下一个
        await delay(2000);
    }

    await page.close();
}

module.exports = {
    checkLogin,
    uploadToKuaishou
};
