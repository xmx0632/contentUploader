const path = require('path');
const puppeteer = require('puppeteer');
const { delay, loadCookies, saveCookies, waitForEnter, archiveVideo } = require('./upload_common');

// 检查登录状态
async function checkLogin(page) {
    await page.goto('https://channels.weixin.qq.com/platform/post/list?tab=post', {
        waitUntil: 'networkidle0'
    });

    // 检查是否需要登录
    const needLogin = await page.evaluate(() => {
        // 如果发现"发表视频"按钮，则说明已登录
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
    // 首先是环境变量
    if (process.env.WECHAT_COLLECTION_NAME) {
        return process.env.WECHAT_COLLECTION_NAME;
    }
    // 没有配置时返回空值
    return null;
}

// 上传视频到微信视频号
async function uploadToWeixin(browser, videoFiles, options) {
    console.log('传入的参数:', {
        headless: options.headless,
        isHeadless: options.isHeadless,
        videoFiles: videoFiles.length
    });
    let page;

    // 先以 headless 模式尝试加载 cookies
    browser = await puppeteer.launch({
        headless: true,
        args: ['--start-maximized'],
        defaultViewport: null
    });

    page = await browser.newPage();

    // 尝试加载 cookies
    const cookiesLoaded = await loadCookies(page, 'weixin');
    console.log('尝试加载已保存的 cookies...');

    // 检查登录状态
    const isLoggedIn = await checkLogin(page);
    console.log('登录状态检查结果:', isLoggedIn ? '已登录' : '未登录');

    // 如果未登录，切换到有界面模式
    if (!isLoggedIn) {
        console.log('Cookie无效或未找到，切换到有界面模式进行登录...');
        await browser.close();

        // 重新以有界面模式启动浏览器
        browser = await puppeteer.launch({
            headless: false,
            args: ['--start-maximized'],
            defaultViewport: null
        });

        page = await browser.newPage();
        await page.goto('https://channels.weixin.qq.com/platform/post/list?tab=post', {
            waitUntil: 'networkidle0'
        });
        console.log('需要登录微信视频号，请在浏览器中完成登录...');
        await waitForEnter();

        // 再次检查登录状态
        const loggedIn = await checkLogin(page);
        if (loggedIn) {
            // 保存 cookies
            console.log('登录成功，保存 cookies...');
            await saveCookies(page, 'weixin');

            // 关闭有界面浏览器，重新以用户指定的模式启动
            await browser.close();
            browser = await puppeteer.launch({
                headless: options.headless !== false, // 尊重用户传入的headless参数
                defaultViewport: null
            });
            page = await browser.newPage();
            await loadCookies(page, 'weixin');
        } else {
            console.error('登录失败，请重试');
            await browser.close();
            process.exit(1);
        }
    }

    try {
        await page.goto('https://channels.weixin.qq.com/platform/post/list?tab=post', {
            waitUntil: 'networkidle0'
        });

        // 在 headless 模式下再次检查登录状态
        if (options.isHeadless) {
            const isStillLoggedIn = await checkLogin(page);
            if (!isStillLoggedIn) {
                console.error('登录失效，请先使用非 headless 模式登录');
                await browser.close();
                process.exit(1);
            }
        }

        // 保存新的 cookies
        await saveCookies(page, 'weixin');

        // 获取合集名称
        const collectionName = getCollectionName(options);

        // 开始上传视频
        for (const videoFile of videoFiles) {
            console.log(`正在上传视频: ${videoFile}`);

            // 进入视频列表页面
            console.log('尝试进入视频列表页面...');
            let retryCount = 0;
            const maxRetries = 3;
            
            while (retryCount < maxRetries) {
                try {
                    await page.goto('https://channels.weixin.qq.com/platform/post/list?tab=post', {
                        waitUntil: 'networkidle0',
                        timeout: 120000 // 增加超时时间至120秒
                    });
                    console.log('成功进入视频列表页面');
                    break; // 如果成功则跳出循环
                } catch (navError) {
                    retryCount++;
                    console.warn(`导航到视频列表页面失败 (尝试 ${retryCount}/${maxRetries}): ${navError.message}`);
                    
                    if (retryCount >= maxRetries) {
                        console.error('达到最大重试次数，无法进入视频列表页面');
                        throw navError; // 重试失败，抛出错误
                    }
                    
                    // 在重试前等待一段时间
                    const retryDelay = 10000 * retryCount; // 每次重试增加等待时间
                    console.log(`等待 ${retryDelay/1000} 秒后重试...`);
                    await delay(retryDelay);
                    
                    // 尝试刷新页面
                    try {
                        await page.reload({ waitUntil: 'networkidle0', timeout: 60000 });
                    } catch (reloadError) {
                        console.warn(`页面刷新失败: ${reloadError.message}`);
                    }
                }
            }

            // 等待页面加载
            console.log('等待页面加载...');
            await delay(parseInt(process.env.DELAY_PAGE_LOAD || '8000'));

            // 点击发表视频按钮
            console.log('尝试点击发表视频按钮...');
            try {
                await page.click('button.weui-desktop-btn.weui-desktop-btn_primary:not(.weui-desktop-btn_mini)');
                console.log('点击发表按钮成功');
            } catch (clickError) {
                console.log('直接点击失败，尝试其他方法...');

                const clicked = await page.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('button'));
                    for (const button of buttons) {
                        if (button.textContent.trim() === '发表视频' &&
                            button.offsetParent !== null &&
                            button.classList.contains('weui-desktop-btn_primary') &&
                            !button.classList.contains('weui-desktop-btn_mini')) {
                            button.click();
                            return true;
                        }
                    }
                    return false;
                });

                if (!clicked) {
                    throw new Error('找不到发表视频按钮或点击失败');
                }
            }

            // 等待跳转到发布页面
            await delay(parseInt(process.env.DELAY_PAGE_LOAD || '8000'));

            // 等待文件上传按钮
            console.log('等待上传按钮出现...');
            const uploadButton = await page.waitForSelector('input[type=file]', {
                visible: false,
                timeout: 30000
            });

            // 上传视频文件
            console.log('开始上传视频文件:', videoFile);
            await uploadButton.uploadFile(videoFile);
            console.log('视频文件已上传，等待处理...');

            // 等待视频处理
            await delay(parseInt(process.env.DELAY_VIDEO_PROCESS || '15000'));

            // 获取视频标题（使用文件名，去掉扩展名）
            const videoTitle = path.basename(videoFile, path.extname(videoFile));
            console.log('视频标题：', videoTitle);

            // 使用AI生成描述
            let description;
            try {
                // 将文件名按照 - 分割成单词
                const words = videoTitle
                    .split('-')
                    .map(word => word.trim().toLowerCase())
                    .filter(word => word);

                if (words.length > 0 && options.hasAIDescriptionGenerator) {
                    // 使用本地导入的 AI 工具生成描述
                    const { generateMultiWordDescription } = require('./ai_util.js');
                    description = await generateMultiWordDescription(words.join('-'));
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

            // 填写描述
            const editor = await page.$('div[contenteditable][data-placeholder="添加描述"]');
            if (editor) {
                await page.evaluate(() => {
                    const editor = document.querySelector('div[contenteditable][data-placeholder="添加描述"]');
                    editor.textContent = '';
                    editor.focus();
                });
                await page.keyboard.type(description);
                await page.evaluate(() => {
                    document.body.click();
                });
            }

            // 等待内容更新
            await delay(parseInt(process.env.DELAY_CONTENT_UPDATE || '5000'));

            // 如果有合集名称，选择合集
            if (collectionName) {
                // 点击合集下拉框
                const albumDisplay = await page.$('.post-album-display');
                if (albumDisplay) {
                    await albumDisplay.click();
                    await delay(parseInt(process.env.DELAY_AFTER_CLICK || '3000'));

                    // 选择目标合集
                    const selected = await page.evaluate(name => {
                        const items = document.querySelectorAll('.option-item');
                        for (const item of items) {
                            const nameDiv = item.querySelector('.name');
                            if (nameDiv && nameDiv.textContent.trim() === name) {
                                item.click();
                                return true;
                            }
                        }
                        return false;
                    }, collectionName);

                    if (!selected) {
                        console.log('警告：未找到或无法选择目标合集');
                    }

                    console.log('合集已选择，等待完成...');
                    await delay(parseInt(process.env.DELAY_AFTER_CLICK || '3000'));
                }
            }

            // 尝试点击发表按钮
            const publishResult = await page.evaluate(() => {
                // 使用精确的选择器找到发表按钮
                const publishButton = Array.from(document.querySelectorAll('button')).find(button =>
                    button.textContent.trim() === '发表' &&
                    button.className.includes('weui-desktop-btn_primary') &&
                    !button.disabled
                );

                if (publishButton) {
                    // 使用原生事件触发点击
                    const clickEvent = new MouseEvent('click', {
                        view: window,
                        bubbles: true,
                        cancelable: true
                    });
                    publishButton.dispatchEvent(clickEvent);
                    return { success: true, text: publishButton.textContent.trim() };
                }
                return { success: false };
            });

            if (!publishResult.success) {
                console.log('无法找到或点击发表按钮');
                throw new Error('无法找到或点击发表按钮');
            }

            console.log('发表按钮已点击，等待完成...');
            await delay(parseInt(process.env.DELAY_AFTER_PUBLISH || '8000'));

            // 检查是否有确认对话框并点击
            const confirmResult = await page.evaluate(() => {
                const confirmButtons = Array.from(document.querySelectorAll('button')).filter(button =>
                    (button.textContent.trim() === '确定' || button.textContent.trim() === '确认') &&
                    button.className.includes('weui-desktop-btn_primary'));

                if (confirmButtons.length > 0) {
                    const clickEvent = new MouseEvent('click', {
                        view: window,
                        bubbles: true,
                        cancelable: true
                    });
                    confirmButtons[0].dispatchEvent(clickEvent);
                    return { hasConfirm: true };
                }
                return { hasConfirm: false };
            });

            console.log('确认对话框检查结果:', JSON.stringify(confirmResult, null, 2));
            await delay(parseInt(process.env.DELAY_CONTENT_UPDATE || '5000'));

            // 等待发表按钮消失或页面变化
            try {
                await page.waitForFunction(
                    () => {
                        const publishButton = document.querySelector('button.weui-desktop-btn.weui-desktop-btn_primary');
                        return !publishButton || publishButton.textContent.trim() !== '发表';
                    },
                    { timeout: 30000 }
                );
                console.log('发表按钮已消失或状态已改变');
            } catch (error) {
                console.warn('等待发表按钮状态变化超时，继续执行...');
            }

            console.log(`视频 ${videoFile} 上传成功`);

            // 归档视频文件
            const videoDir = path.dirname(videoFile);
            await archiveVideo(videoFile, videoDir);

            // 等待更长时间再继续下一个视频的上传
            const delayBetweenVideos = parseInt(process.env.DELAY_BETWEEN_VIDEOS || '15000');
            console.log(`等待 ${delayBetweenVideos/1000} 秒后继续下一个视频的上传...`);
            await delay(delayBetweenVideos);
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
    uploadToWeixin
};
