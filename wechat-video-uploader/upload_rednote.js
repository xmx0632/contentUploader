// const { delay, loadCookies, saveCookies } = require('./upload_common');
const path = require('path');
const puppeteer = require('puppeteer');
const { delay, loadCookies, saveCookies, waitForEnter, archiveVideo } = require('./upload_common');

// 检查登录状态
async function checkLogin(page) {
    await page.goto('https://creator.xiaohongshu.com/publish/publish', {
        waitUntil: 'networkidle0'
    });
    
    try {
        // 如果发现上传视频按钮，则说明已登录
        await page.waitForSelector('input[type="file"]', { timeout: 5000 });
        return true;
    } catch (error) {
        return false;
    }
}

// 上传视频到小红书
async function uploadToRednote(browser, videoFiles, options) {
    let page;
    
    // 如果是 headless 模式，先检查是否有保存的 cookies
    if (options.isHeadless) {
        browser = await puppeteer.launch({
            headless: false,
            args: ['--start-maximized'],
            defaultViewport: null
        });
        
        page = await browser.newPage();
        
        // 尝试加载 cookies
        const cookiesLoaded = await loadCookies(page);
        
        // 检查登录状态
        const isLoggedIn = await checkLogin(page);
        
        if (!isLoggedIn) {
            console.log('需要登录小红书创作者平台，请在浏览器中完成登录...');
            await waitForEnter();
            
            // 再次检查登录状态
            const loggedIn = await checkLogin(page);
            if (loggedIn) {
                // 保存 cookies
                await saveCookies(page);
            } else {
                console.error('登录失败，请重试');
                await browser.close();
                process.exit(1);
            }
        }
        
        await browser.close();
        browser = await puppeteer.launch({
            headless: true,
            defaultViewport: null
        });
    }

    try {
        page = await browser.newPage();
        
        // 如果是 headless 模式，尝试加载 cookies
        if (options.isHeadless) {
            await loadCookies(page);
        }
        
        await page.goto('https://creator.xiaohongshu.com/publish/publish', {
            waitUntil: 'networkidle0'
        });
        
        // 如果不是 headless 模式，等待用户登录
        if (!options.isHeadless) {
            await waitForEnter();
            // 保存 cookies 供下次使用
            await saveCookies(page);
        } else {
            // 在 headless 模式下检查登录状态
            const isLoggedIn = await checkLogin(page);
            if (!isLoggedIn) {
                console.error('登录失效，请先使用非 headless 模式登录');
                await browser.close();
                process.exit(1);
            }
        }

        // 开始上传视频
        for (const videoFile of videoFiles) {
            console.log(`正在上传视频到小红书: ${videoFile}`);

            // 进入发布页面
            await page.goto('https://creator.xiaohongshu.com/publish/publish', {
                waitUntil: 'networkidle0',
                timeout: 60000
            });

            // 等待页面加载
            await delay(parseInt(process.env.DELAY_PAGE_LOAD || '8000'));

            // 等待上传按钮出现并上传
            const uploadButton = await page.waitForSelector('input[type="file"]', {
                visible: false,
                timeout: 30000
            });

            // 上传视频文件
            await uploadButton.uploadFile(videoFile);
            console.log('视频文件已上传，等待处理...');

            // 等待视频处理完成（等待进度条消失）
            await page.waitForFunction(
                () => !document.querySelector('.upload-progress'),
                { timeout: 300000 } // 5分钟超时
            );

            // 获取视频标题（使用文件名，去掉扩展名）
            const videoTitle = path.basename(videoFile, path.extname(videoFile));
            console.log('视频标题：', videoTitle);

            // 使用AI生成描述
            let description;
            try {
                const words = videoTitle
                    .split('-')
                    .map(word => word.trim().toLowerCase())
                    .filter(word => word);
                
                if (words.length > 0) {
                    description = await options.generateMultiWordDescription(words.join('-'));
                    console.log('生成的描述：', description);
                }
            } catch (error) {
                console.error('生成描述时出错：', error);
            }

            // 如果生成失败，使用原文件名
            if (!description) {
                description = videoTitle;
                console.log('使用原文件名作为描述：', description);
            }

            // 填写标题
            await page.waitForSelector('input.d-text[type="text"]');
            await page.evaluate((title) => {
                const titleInput = document.querySelector('input.d-text[type="text"]');
                titleInput.value = title;
                titleInput.dispatchEvent(new Event('input', { bubbles: true }));
            }, videoTitle);

            // 填写描述
            await page.waitForSelector('.ql-editor');
            await page.evaluate((text) => {
                const editor = document.querySelector('.ql-editor');
                editor.innerHTML = `<p>${text}</p>`;
                editor.dispatchEvent(new Event('input', { bubbles: true }));
            }, description);

            // 等待内容更新
            await delay(parseInt(process.env.DELAY_CONTENT_UPDATE || '5000'));

            // 点击发布按钮
            await page.evaluate(() => {
                const publishButton = document.querySelector('.d-button-content');
                if (publishButton) {
                    publishButton.click();
                }
            });

            // 等待发布完成（等待成功页面出现）
            await page.waitForFunction(
                () => window.location.href.includes('publish-success'),
                { timeout: 60000 }
            );

            console.log(`视频 ${videoFile} 上传成功`);

            // 归档视频文件
            const videoDir = path.dirname(videoFile);
            await archiveVideo(videoFile, videoDir);

            // 等待一下再继续下一个
            await delay(parseInt(process.env.DELAY_BETWEEN_UPLOADS || '5000'));
        }

        await browser.close();
    } catch (error) {
        console.error('上传过程中发生错误:', error);
        if (browser) {
            await browser.close();
        }
        throw error;
    }
}

module.exports = {
    checkLogin,
    uploadToRednote
};
