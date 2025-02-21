// const { delay, loadCookies, saveCookies } = require('./upload_common');
const path = require('path');
const puppeteer = require('puppeteer');
const { delay, loadCookies, saveCookies, waitForEnter, archiveVideo } = require('./upload_common');

// 获取合集名称
function getCollectionName(options) {
    // 命令行参数优先
    if (options.collectionName) {
        return options.collectionName;
    }
    // 首先是环境变量
    if (process.env.DOUYIN_COLLECTION_NAME) {
        return process.env.DOUYIN_COLLECTION_NAME;
    }
    // 没有配置时返回空值
    return null;
}

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
        
        // 在 headless 模式下再次检查登录状态
        const isStillLoggedIn = await checkLogin(page);
        if (!isStillLoggedIn) {
            console.error('登录失效，请先使用非 headless 模式登录');
            await browser.close();
            process.exit(1);
        }
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
            console.log('开始填写标题和描述...');

            // 填写标题
            const titleSelector = 'input.semi-input.semi-input-default[placeholder="填写作品标题，为作品获得更多流量"]';
            await page.waitForSelector(titleSelector);
            
            // 先点击标题输入框以获取焦点
            await page.click(titleSelector);
            // 清空现有内容
            await page.keyboard.down('Control');
            await page.keyboard.press('A');
            await page.keyboard.up('Control');
            await page.keyboard.press('Backspace');
            // 模拟用户输入标题
            await page.type(titleSelector, videoTitle, {delay: 100}); // 设置100ms的输入延迟，模拟真实输入
            
            // 等待一小段时间确保标题输入完成
            await delay(1000);

            // 填写描述
            const editorSelector = '.editor-kit-container';
            await page.waitForSelector(editorSelector);
            
            // 点击编辑器获取焦点
            await page.click(editorSelector);
            // 清空现有内容
            await page.keyboard.down('Control');
            await page.keyboard.press('A');
            await page.keyboard.up('Control');
            await page.keyboard.press('Backspace');
            // 模拟用户输入描述
            await page.keyboard.type(description, {delay: 50}); // 设置50ms的输入延迟，模拟真实输入
            await delay(500); // 等待输入完成
            await page.keyboard.press('Enter'); // 模拟按下回车键

            // 等待内容更新
            await delay(parseInt(process.env.DELAY_CONTENT_UPDATE || '5000'));
            
            console.log('等待 15s 封面选项加载...');
            await delay('15000');

            // 选择封面（第三张）
            try {
                console.log('等待封面选项加载...');
                const coverSelected = await page.evaluate(() => {
                    const covers = document.querySelectorAll('.recommendCover-vWWsHB');
                    console.log('找到封面选项数量:', covers.length);

                    // 打印每个封面的详细信息
                    covers.forEach((cover, index) => {
                        console.log(`封面${index + 1}信息:`, {
                            className: cover.className,
                            style: cover.getAttribute('style'),
                            visible: cover.offsetParent !== null
                        });
                    });

                    if (covers && covers.length >= 3) {
                        covers[2].click();
                        return true;
                    }
                    return false;
                });
                // 等待5s
                console.log('等待5秒...');
                await delay(5000);

                if (coverSelected) {
                    console.log('封面选择成功，等待5秒...');
                    await delay(5000);
                    // 等待确认按钮出现并点击
                    //  semi-modal-confirm 
                    //  semi-button semi-button-primary
                    // 等待并点击弹窗中的确定按钮
                    const confirmButtonSelector = '.semi-modal-confirm .semi-modal-footer .semi-button.semi-button-primary';
                    console.log('等待确定按钮出现...');
                    await page.waitForSelector(confirmButtonSelector, { visible: true, timeout: 10000 });
                    
                    // 检查按钮是否可点击
                    const buttonText = await page.$eval(confirmButtonSelector, button => {
                        const span = button.querySelector('.semi-button-content');
                        return span ? span.textContent : '';
                    });
                    console.log('找到按钮文本:', buttonText);
                    
                    if (buttonText === '确定') {
                        console.log('点击确定按钮...');
                        await page.click(confirmButtonSelector);
                        console.log('已点击确认按钮');
                    } else {
                        console.log('警告: 找到的按钮文本不是“确定”');
                    }
                }
                console.log('确认封面后，等待5秒...');
                await delay(5000);
            } catch (error) {
                console.log('选择封面时出错:', error.message);
            }

            // 获取合集名称
            const collectionName = getCollectionName(options);

            // 如果有合集名称，选择合集
            if (collectionName) {
                try {
                    console.log(`准备选择合集: ${options.collectionName}`);
                    // 点击下拉箭头按钮
                    const arrowClicked = await page.evaluate(() => {
                        // 使用更通用的选择器，不依赖于随机生成的类名
                        const selectButton = document.querySelector('div[class*="semi-select"][class*="select-collection"]');
                        if (selectButton) {
                            // 检查是否是合集选择框
                            const selectionText = selectButton.querySelector('.semi-select-selection-text div');
                            if (selectionText && selectionText.textContent === '请选择合集') {
                                selectButton.click();
                                return true;
                            }
                        }
                        return false;
                    });

                    if (!arrowClicked) {
                        console.log('警告: 未找到合集选择框');
                        return;
                    }

                    // 等待下拉选项出现
                    await delay(1000);

                    // 选择指定的合集
                    const collectionSelected = await page.evaluate((targetName) => {
                        // 查找所有合集选项
                        const options = Array.from(document.querySelectorAll('.semi-select-option.collection-option'));
                        
                        for (const option of options) {
                            // 查找合集标题元素（使用通用属性）
                            const titleSpan = option.querySelector('span[class*="option-title"]');
                            if (titleSpan && titleSpan.textContent === targetName) {
                                option.click();
                                return true;
                            }
                        }
                        return false;
                    }, collectionName);

                    if (collectionSelected) {
                        console.log(`已选择合集: ${collectionName}`);
                        await delay(2000); // 等待选择生效
                    } else {
                        console.log(`警告: 未找到合集 ${collectionName}`);
                    }
                } catch (error) {
                    console.error('选择合集时出错:', error);
                }
            }

            // 点击发布按钮
            // TODO 模拟
            await page.click('.button-dhlUZE.primary-cECiOJ.fixed-J9O8Yw');
            console.log(' 发布按钮已点击，等待完成...');

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
    uploadToDouyin,
    getCollectionName
};
