const path = require('path');
const puppeteer = require('puppeteer');
const { delay, loadCookies, saveCookies, waitForEnter, archiveVideo } = require('./upload_common');

// 检查登录状态
async function checkLogin(page) {
    await page.goto('https://cp.kuaishou.com/article/publish/video?tabType=1', {
        waitUntil: 'networkidle0'
    });

    try {
        // 如果发现上传按钮，则说明已登录
        await page.waitForSelector('input[type="file"]', { timeout: 5000 });
        return true;
    } catch (error) {
        return false;
    }
}

// 获取合集名称
function getCollectionName(options) {
    // 命令行参数优先
    if (options.collectionName) {
        return options.collectionName;
    }
    // 其次是环境变量
    if (process.env.KUAISHOU_COLLECTION_NAME) {
        return process.env.KUAISHOU_COLLECTION_NAME;
    }
    // 没有配置时返回空值
    return null;
}

// 上传视频到快手
async function uploadToKuaishou(browser, videoFiles, options) {
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
    const cookiesLoaded = await loadCookies(page, 'kuaishou');
    console.log('尝试加载已保存的 cookies...');

    // 检查登录状态
    const isLoggedIn = await checkLogin(page);
    console.log('登录状态检查结果:', isLoggedIn ? '已登录' : '未登录');

    // 如果未登录，让用户手动登录
    if (!isLoggedIn) {
        console.log('需要登录快手创作者平台，请在浏览器中完成登录...');
        await waitForEnter();

        // 再次检查登录状态
        const loggedIn = await checkLogin(page);
        if (loggedIn) {
            // 保存 cookies
            console.log('登录成功，保存 cookies...');
            await saveCookies(page, 'kuaishou');
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
        await loadCookies(page, 'kuaishou');
    }

    try {
        
        // 开始上传视频
        for (const videoFile of videoFiles) {
            console.log(`正在上传视频到快手: ${videoFile}`);
            
            await page.goto('https://cp.kuaishou.com/article/publish/video?tabType=1', {
                waitUntil: 'networkidle0'
            });

            // 选择视频文件
            // 等待上传按钮出现
            await page.waitForSelector('._upload-btn_hlszi_77', { timeout: 10000 });

            // 等待文件输入框出现
            await page.waitForSelector('input[type="file"][accept*="video"]', { timeout: 10000 });

            // 选择视频文件
            const [fileChooser] = await Promise.all([
                page.waitForFileChooser(),
                page.click('._upload-btn_hlszi_77')
            ]);
            await fileChooser.accept([videoFile]);

            // 等待视频上传完成（最多等待5分钟）
            console.log('等待视频上传完成...');
            await delay(20000);
            // await page.waitForSelector('.upload-progress', { visible: false, timeout: 30000 });

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

            // 没有标题需要填写
            // await page.type('input[name="title"]', videoTitle);

            // 填写描述
            await page.waitForSelector('._description_oei9t_59', { timeout: 10000 });
            await page.evaluate((text) => {
                const editor = document.querySelector('._description_oei9t_59');
                editor.textContent = text;
                editor.dispatchEvent(new Event('input', { bubbles: true }));
            }, description);

            // 等待封面图片加载完成
            console.log('等待封面图片加载...');
            await page.waitForSelector('._recommend-cover-item_y5cqm_157', { timeout: 30000 });

            // 选择第三张封面图片
            console.log('选择第三张封面图片...');
            const coverItems = await page.$$('._recommend-cover-item_y5cqm_157');
            if (coverItems.length >= 3) {
                await coverItems[2].click();
                // 等待5秒让封面设置生效
                await delay(5000);
            } else {
                console.log('警告：没有找到足够的封面选项');
            }

            /**
             * 选择合集处理逻辑
             * 1. 获取合集名称
             * 2. 等待并点击合集下拉框
             * 3. 等待合集选项出现
             * 4. 选择指定的合集
             */
            // 选择合集（如果有）
            const collectionName = getCollectionName(options);
            if (collectionName) {
                try {
                    console.log('开始选择合集:', collectionName);

                    // 1. 等待"选择要加入到的合集"下拉框出现
                    await page.waitForSelector('.ant-select-selection-placeholder', {
                        timeout: 10000,
                        visible: true
                    });

                    // 2. 点击下拉框并选择合集
                    const selected = await page.evaluate(async (collectionName) => {
                        console.log('Debug: Starting collection selection for:', collectionName);
                        try {
                            // 找到并点击下拉框
                            console.log('Debug: Searching for dropdown placeholders...');
                            const placeholders = document.querySelectorAll('.ant-select-selection-placeholder');
                            console.log('Debug: Found', placeholders.length, 'placeholders');
                            Array.from(placeholders).forEach((p, i) => {
                                console.log('Debug: Placeholder', i + 1, ':', p.textContent);
                            });
                            // 遍历placeholders，找到文本包含"选择要加入到的合集"的元素
                            console.log('Debug: Looking for collection dropdown...');
                            let placeholder = null;
                            for (const p of placeholders) {
                                console.log('Debug: Checking placeholder text:', p.textContent);
                                if (p.textContent.includes('选择要加入到的合集')) {
                                    placeholder = p;
                                    console.log('Debug: Found matching placeholder');
                                    break;
                                }
                            }

                            if (!placeholder) {
                                throw new Error('未找到合集下拉框');
                            }

                            console.log('Debug: Found dropdown with text:', placeholder.textContent);
                            console.log('Debug: Parent element class:', placeholder.parentElement?.className);
                            
                            // 尝试多种方式点击下拉框
                            console.log('Debug: 尝试多种方式点击下拉框...');
                            
                            // 1. 尝试点击父级选择器
                            const parentSelector = placeholder.closest('.ant-select-selector');
                            if (parentSelector) {
                                console.log('Debug: 找到父级选择器，尝试点击');
                                parentSelector.click();
                                // 使用 dispatchEvent 触发点击事件
                                parentSelector.dispatchEvent(new MouseEvent('mousedown', {
                                    bubbles: true,
                                    cancelable: true,
                                    view: window
                                }));
                            }

                            // 2. 尝试点击整个select容器
                            const selectContainer = placeholder.closest('.ant-select');
                            if (selectContainer) {
                                console.log('Debug: 找到select容器，尝试点击');
                                selectContainer.click();
                            }

                            // 3. 最后尝试点击placeholder本身
                            console.log('Debug: 尝试点击placeholder本身');
                            placeholder.click();

                            // 等待更长时间确保下拉列表完全展开
                            console.log('Debug: 等待下拉列表加载...');
                            await new Promise(resolve => setTimeout(resolve, 2000));

                            // 查找目标选项
                            console.log('Debug: 开始查找选项...');
                            // 先等待选项出现
                            let allOptions = document.querySelectorAll('.ant-select-item.ant-select-item-option');
                            let retries = 0;
                            while (allOptions.length === 0 && retries < 5) {
                                console.log('Debug: 等待选项出现，重试次数:', retries + 1);
                                await new Promise(resolve => setTimeout(resolve, 1000));
                                allOptions = document.querySelectorAll('.ant-select-item.ant-select-item-option');
                                retries++;
                            }
                            console.log('Debug: Found', allOptions.length, 'options');
                            Array.from(allOptions).forEach((opt, i) => {
                                const title = opt.querySelector('span._options-title_ggsh0_6')?.textContent;
                                const label = opt.getAttribute('label');
                                console.log('Debug: Option', i + 1, '- Label:', label, 'Title:', title);
                            });
                            console.log('Debug: Searching for target option:', collectionName);
                            const targetOption = Array.from(allOptions).find(option => {
                                const titleSpan = option.querySelector('span._options-title_ggsh0_6');
                                const matches = titleSpan && titleSpan.textContent === collectionName;
                                console.log('Debug: Checking option:', {
                                    title: titleSpan?.textContent,
                                    matches: matches
                                });
                                return matches;
                            });
                            
                            if (!targetOption) {
                                console.log('Debug: Available options:', Array.from(allOptions).map(opt => ({
                                    title: opt.querySelector('span._options-title_ggsh0_6')?.textContent,
                                    label: opt.getAttribute('label')
                                })));
                                throw new Error(`未找到合集: ${collectionName}`);
                            }

                            console.log('Debug: Found target option:', {
                                title: targetOption.querySelector('span._options-title_ggsh0_6')?.textContent,
                                label: targetOption.getAttribute('label'),
                                class: targetOption.className
                            });

                            console.log('Debug: Clicking option...');
                            targetOption.click();
                            console.log('Debug: Option clicked');
                            return true;

                        } catch (error) {
                            console.error('选择合集失败:', error.message);
                            return false;
                        }
                    }, collectionName);

                    // 3. 记录选择结果
                    if (selected) {
                        console.log('合集选择成功:', collectionName);
                    } else {
                        console.log('未找到指定的合集:', collectionName);
                    }

                    await delay(1000); // 等待选择生效
                } catch (error) {
                    console.error('选择合集过程出错:', error.message);
                }
            }

            // 提交视频
            console.log('点击发布按钮...');
            // 等待发布按钮出现
            await page.waitForSelector('div._button_si04s_1._button-primary_si04s_60', { 
                timeout: 10000,
                visible: true
            });
            
            // 点击发布按钮
            const publishResult = await page.evaluate(() => {
                try {
                    // 找到发布按钮
                    const publishBtn = document.querySelector('div._button_si04s_1._button-primary_si04s_60');
                    if (!publishBtn) {
                        console.log('未找到发布按钮');
                        return false;
                    }
                    
                    // 检查按钮文本
                    const btnText = publishBtn.textContent?.trim();
                    console.log('找到按钮:', btnText);
                    
                    if (btnText !== '发布') {
                        console.log('按钮文本不匹配:', btnText);
                        return false;
                    }
                    
                    // 点击按钮
                    publishBtn.click();
                    console.log('已点击发布按钮');
                    return true;
                } catch (error) {
                    console.error('点击发布按钮失败:', error);
                    return false;
                }
            });
            
            if (!publishResult) {
                throw new Error('点击发布按钮失败');    
            }

            // 等待提交完成
            await page.waitForNavigation({ waitUntil: 'networkidle0' });

            // 归档视频文件
            const videoDir = path.dirname(videoFile);
            await archiveVideo(videoFile, videoDir);
        }
    } catch (error) {
        console.error('上传过程中发生错误:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

module.exports = {
    checkLogin,
    uploadToKuaishou,
    getCollectionName
};
