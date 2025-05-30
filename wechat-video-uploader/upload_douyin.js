const path = require('path');
const puppeteer = require('puppeteer');
const { delay, loadCookies, saveCookies, waitForEnter, archiveVideo, BROWSER_ARGS, BROWSER_FINGERPRINT, setupBrowserFingerprint } = require('./upload_common');

// 抖音上传流程相关配置常量（支持环境变量覆盖）
const NAVIGATION_TIMEOUT = parseInt(process.env.NAVIGATION_TIMEOUT || '120000'); // 页面导航超时时间，默认120秒
const MAX_RETRY_COUNT = parseInt(process.env.MAX_RETRY_COUNT || '3'); // 重试次数，默认3次
const PROTOCOL_TIMEOUT = parseInt(process.env.PROTOCOL_TIMEOUT || '120000'); // Puppeteer协议操作超时，默认120秒
const SELECTOR_TIMEOUT = parseInt(process.env.SELECTOR_TIMEOUT || '30000'); // 元素等待超时，默认30秒

// 更新waitForSelector的默认超时时间
puppeteer.defaultSelectorTimeout = SELECTOR_TIMEOUT;


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

/**
 * 检查抖音创作者平台登录状态，增强鲁棒性。
 * 检查多个典型已登录元素（上传按钮、用户头像、昵称等），任意存在即视为已登录。
 * 检查失败时自动截图并输出页面部分 HTML，便于调试。
 * @param {import('puppeteer').Page} page Puppeteer 页面对象
 * @returns {Promise<boolean>} 是否已登录
 */
async function checkLogin(page) {
    // 重试机制
    for (let attempt = 1; attempt <= MAX_RETRY_COUNT; attempt++) {
        try {
            console.log(`尝试导航到抖音创作者平台 (尝试 ${attempt}/${MAX_RETRY_COUNT})...`);
            await page.goto('https://creator.douyin.com/creator-micro/content/upload', {
                waitUntil: 'networkidle0',
                timeout: NAVIGATION_TIMEOUT
            });
            break; // 成功导航，跳出循环
        } catch (error) {
            console.error(`导航失败 (尝试 ${attempt}/${MAX_RETRY_COUNT}):`, error.message);
            if (attempt === MAX_RETRY_COUNT) {
                throw new Error(`导航到抖音创作者平台失败，已重试 ${MAX_RETRY_COUNT} 次: ${error.message}`);
            }
            // 等待一段时间后重试
            console.log('等待 5 秒后重试...');
            await delay(5000);
        }
    }

    // 多 selector 检查，任意一个存在即视为已登录
    const SELECTORS = [
        'input[type="file"]', // 上传按钮
        '.container-drag-info-Tl0RGH', // 上传区域
        '.header-user-avatar', // 用户头像
        '.header-user-nickname', // 用户昵称
        '.creator-header-avatar', // 新版头像
        '.creator-header-nickname' // 新版昵称
    ];

    try {
        // 检查多个 selector
        for (const selector of SELECTORS) {
            try {
                const el = await page.waitForSelector(selector, { timeout: 4000 });
                if (el) {
                    console.log(`[checkLogin] 检测到已登录元素: ${selector}`);
                    return true;
                }
            } catch (e) {
                // 忽略单个 selector 检查失败
            }
        }
        // 全部未检测到，说明未登录
        throw new Error('未检测到任何已登录元素');
    } catch (error) {
        // 登录检测失败，自动截图并输出部分 HTML，便于调试
        try {
            const screenshotPath = path.join(__dirname, 'login_check_fail.png');
            await page.screenshot({ path: screenshotPath });
            console.warn(`[checkLogin] 登录检测失败，已自动截图: ${screenshotPath}`);
        } catch (e) {
            console.warn('[checkLogin] 截图失败:', e.message);
        }
        try {
            const html = await page.content();
            console.warn('[checkLogin] 页面 HTML 片段:', html.substring(0, 800));
        } catch (e) {
            console.warn('[checkLogin] 获取页面 HTML 失败:', e.message);
        }
        return false;
    }
}


// 上传视频到抖音
async function uploadToDouyin(browser, videoFiles, options) {
    console.log('传入的参数:', {
        headless: options.headless,
        isHeadless: options.isHeadless,
        videoFiles: videoFiles.length,
        csvPath: options.csvPath || '未指定'
    });
    let page;

    // 启动浏览器
    // 读取协议超时时间，优先使用环境变量
    const protocolTimeout = parseInt(process.env.PROTOCOL_TIMEOUT, 10) || 120000;
    /**
     * 启动 Puppeteer 浏览器，增加 protocolTimeout 参数，防止协议调用超时
     * @see https://pptr.dev/api/puppeteer.launchoptions
     */
    browser = await puppeteer.launch({
        headless: false, // 先用有界面模式启动
        args: BROWSER_ARGS,
        defaultViewport: null,
        protocolTimeout: protocolTimeout
    });

    page = await browser.newPage();

    // 设置浏览器指纹
    await setupBrowserFingerprint(page);

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

            // 进入上传页面，添加重试逻辑
            let navigationSuccess = false;
            for (let attempt = 1; attempt <= MAX_RETRY_COUNT; attempt++) {
                try {
                    console.log(`尝试导航到抖音上传页面 (尝试 ${attempt}/${MAX_RETRY_COUNT})...`);
                    await page.goto('https://creator.douyin.com/creator-micro/content/upload', {
                        waitUntil: 'networkidle0',
                        timeout: NAVIGATION_TIMEOUT
                    });
                    navigationSuccess = true;
                    break; // 成功导航，跳出循环
                } catch (error) {
                    console.error(`导航到上传页面失败 (尝试 ${attempt}/${MAX_RETRY_COUNT}):`, error.message);
                    if (attempt === MAX_RETRY_COUNT) {
                        throw new Error(`导航到抖音上传页面失败，已重试 ${MAX_RETRY_COUNT} 次: ${error.message}`);
                    }
                    // 等待一段时间后重试
                    console.log(`等待 10 秒后重试...`);
                    await delay(10000);
                }
            }

            if (!navigationSuccess) {
                throw new Error('无法导航到抖音上传页面，跳过当前视频');
            }

            // 等待页面加载
            await delay(parseInt(process.env.DELAY_PAGE_LOAD || '8000'));

            // 等待上传按钮出现并上传，添加重试逻辑
            let uploadButton;
            for (let attempt = 1; attempt <= MAX_RETRY_COUNT; attempt++) {
                try {
                    console.log(`等待上传按钮出现 (尝试 ${attempt}/${MAX_RETRY_COUNT})...`);
                    uploadButton = await page.waitForSelector('input[type="file"]', {
                        visible: false,
                        timeout: 30000
                    });
                    break; // 成功找到上传按钮，跳出循环
                } catch (error) {
                    console.error(`等待上传按钮失败 (尝试 ${attempt}/${MAX_RETRY_COUNT}):`, error.message);
                    if (attempt === MAX_RETRY_COUNT) {
                        throw new Error(`等待上传按钮失败，已重试 ${MAX_RETRY_COUNT} 次: ${error.message}`);
                    }
                    // 尝试刷新页面
                    console.log('尝试刷新页面...');
                    await page.reload({ waitUntil: 'networkidle0', timeout: NAVIGATION_TIMEOUT });
                    await delay(5000);
                }
            }

            // 上传视频文件
            await uploadButton.uploadFile(videoFile);
            console.log('视频文件已上传，等待处理...');

            // 等待跳转到发布页面，添加重试逻辑
            let navigationToPublishSuccess = false;
            for (let attempt = 1; attempt <= MAX_RETRY_COUNT; attempt++) {
                try {
                    console.log(`等待跳转到发布页面 (尝试 ${attempt}/${MAX_RETRY_COUNT})...`);
                    await page.waitForNavigation({
                        waitUntil: 'networkidle0',
                        timeout: NAVIGATION_TIMEOUT
                    });
                    navigationToPublishSuccess = true;
                    break; // 成功导航，跳出循环
                } catch (error) {
                    console.error(`跳转到发布页面失败 (尝试 ${attempt}/${MAX_RETRY_COUNT}):`, error.message);
                    // 检查是否已经在发布页面
                    const isOnPublishPage = await page.evaluate(() => {
                        return window.location.href.includes('creator.douyin.com/creator-micro/content/publish');
                    });

                    if (isOnPublishPage) {
                        console.log('检测到已经在发布页面，继续处理...');
                        navigationToPublishSuccess = true;
                        break;
                    }

                    if (attempt === MAX_RETRY_COUNT) {
                        throw new Error(`等待跳转到发布页面失败，已重试 ${MAX_RETRY_COUNT} 次: ${error.message}`);
                    }
                    // 等待一段时间后重试
                    console.log(`等待 10 秒后重试...`);
                    await delay(10000);
                }
            }

            if (!navigationToPublishSuccess) {
                throw new Error('无法跳转到发布页面，跳过当前视频');
            }

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

                if (words.length > 0 && options.hasAIDescriptionGenerator) {
                    // 使用本地导入的 AI 工具生成描述
                    const { generateMultiWordDescription, setCsvFilePath } = require('./ai_util.js');

                    // 如果指定了 CSV 文件路径，则设置它
                    if (options.csvPath) {
                        console.log(`设置 CSV 文件路径: ${options.csvPath}`);
                        setCsvFilePath(options.csvPath);
                    } else {
                        console.log('未指定 CSV 文件路径，使用默认路径');
                    }

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
            await page.type(titleSelector, videoTitle, { delay: 100 }); // 设置100ms的输入延迟，模拟真实输入

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
            await page.keyboard.type(description, { delay: 50 }); // 设置50ms的输入延迟，模拟真实输入
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
        // 尝试截图记录错误状态
        try {
            if (page) {
                const screenshotPath = path.join(__dirname, `douyin_error_${Date.now()}.png`);
                await page.screenshot({ path: screenshotPath, fullPage: true });
                console.log(`错误截图已保存至: ${screenshotPath}`);
            }
        } catch (screenshotError) {
            console.error('保存错误截图失败:', screenshotError);
        }

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
