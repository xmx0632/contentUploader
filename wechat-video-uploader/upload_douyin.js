// const { delay, loadCookies, saveCookies } = require('./upload_common');
const path = require('path');
const puppeteer = require('puppeteer');
const { delay, loadCookies, saveCookies, waitForEnter, archiveVideo } = require('./upload_common');

// 检查登录状态
async function checkLogin(page) {
    await page.goto('https://creator.douyin.com/creator-micro/content/upload', {
        waitUntil: 'networkidle0'
    });

    try {
        // 如果发现上传区域，则说明已登录
        await page.waitForSelector('.container-drag-info-Tl0RGH', { timeout: 5000 });
        return true;
    } catch (error) {
        return false;
    }
}

// 上传视频到抖音
async function uploadToDouyin(browser, videoFiles, options) {
    console.log('传入的参数:', {
        headless: options.headless,
        isHeadless: options.isHeadless,
        videoFiles: videoFiles.length
    });
    let page;

    // 启动浏览器
    browser = await puppeteer.launch({
        headless: false, // 先用有界面模式启动
        args: ['--start-maximized'],
        defaultViewport: null
    });
    
    page = await browser.newPage();
    
    // 尝试加载 cookies
    const cookiesLoaded = await loadCookies(page, 'douyin');
    console.log('尝试加载已保存的 cookies...');
    
    // 检查登录状态
    const isLoggedIn = await checkLogin(page);
    console.log('登录状态检查结果:', isLoggedIn ? '已登录' : '未登录');
    
    // 如果未登录，让用户手动登录
    if (!isLoggedIn) {
        console.log('需要登录抖音创作者平台，请在浏览器中完成登录...');
        await waitForEnter();
        
        // 再次检查登录状态
        const loggedIn = await checkLogin(page);
        if (loggedIn) {
            // 保存 cookies
            console.log('登录成功，保存 cookies...');
            await saveCookies(page, 'douyin');
        } else {
            console.error('登录失败，请重试');
            await browser.close();
            process.exit(1);
        }
    } else {
        console.log('Cookie 有效，无需重新登录');
    }

    // 如果是 headless 模式，需要重新启动浏览器
    if (options.isHeadless) {
        await browser.close();
        browser = await puppeteer.launch({
            headless: true,
            defaultViewport: null
        });
        page = await browser.newPage();
        await loadCookies(page, 'douyin');
    }

    try {
        // 开始上传视频
        for (const videoFile of videoFiles) {
            console.log(`正在上传视频到抖音: ${videoFile}`);

            // 进入上传页面
            await page.goto('https://creator.douyin.com/creator-micro/content/upload', {
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

            // 等待跳转到发布页面
            await page.waitForNavigation({
                waitUntil: 'networkidle0',
                timeout: 60000
            });

            // 等待视频处理完成
            await delay(parseInt(process.env.DELAY_VIDEO_PROCESS || '15000'));

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

            // 填写标题和描述
            await page.evaluate((text) => {
                const textarea = document.querySelector('textarea');
                if (textarea) {
                    textarea.value = text;
                    textarea.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }, description);

            // 等待内容更新
            await delay(parseInt(process.env.DELAY_CONTENT_UPDATE || '5000'));

            // 选择封面（第三张）
            try {
                console.log('等待封面选项加载...');
                const coverSelected = await page.evaluate(() => {
                    const covers = document.querySelectorAll('.cover-image');
                    if (covers && covers.length >= 3) {
                        covers[2].click();
                        return true;
                    }
                    return false;
                });

                if (coverSelected) {
                    console.log('封面选择成功');
                    // 等待确认按钮出现并点击
                    await page.waitForSelector('button.confirm-button');
                    await page.click('button.confirm-button');
                    await delay(2000);
                }
            } catch (error) {
                console.log('选择封面时出错:', error.message);
            }

            // 如果有合集名称，选择合集
            if (options.collectionName) {
                try {
                    console.log(`准备选择合集: ${options.collectionName}`);
                    await page.click('.collection-selector');
                    await delay(2000);

                    // 选择指定的合集
                    const selected = await page.evaluate((name) => {
                        const items = document.querySelectorAll('.collection-item');
                        for (const item of items) {
                            if (item.textContent.includes(name)) {
                                item.click();
                                return true;
                            }
                        }
                        return false;
                    }, options.collectionName);

                    if (!selected) {
                        console.log('警告：未找到或无法选择目标合集');
                    }
                } catch (error) {
                    console.log('选择合集时出错:', error.message);
                }
            }

            // 点击发布按钮
            await page.click('.publish-button');
            console.log('发布按钮已点击，等待完成...');

            // 处理可能出现的短信验证码
            try {
                await page.waitForSelector('.sms-code-input', { timeout: 5000 });
                console.log('需要输入短信验证码，请在浏览器中完成验证...');
                await waitForEnter();
            } catch (error) {
                // 没有验证码，继续执行
            }

            // 等待发布完成
            await delay(parseInt(process.env.DELAY_AFTER_PUBLISH || '8000'));

            console.log(`视频 ${videoFile} 上传成功`);

            // 归档视频文件
            const videoDir = path.dirname(videoFile);
            await archiveVideo(videoFile, videoDir);

            // 等待一下再继续下一个
            await delay(parseInt(process.env.DELAY_BETWEEN_VIDEOS || '2000'));
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
    uploadToDouyin
};
