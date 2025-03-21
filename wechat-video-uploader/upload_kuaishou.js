const path = require('path');
const puppeteer = require('puppeteer');
const { delay, loadCookies, saveCookies, waitForEnter, archiveVideo, BROWSER_ARGS, BROWSER_FINGERPRINT, setupBrowserFingerprint } = require('./upload_common');

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
        args: BROWSER_ARGS,
        defaultViewport: null
    });

    page = await browser.newPage();
    
    // 设置浏览器指纹
    await setupBrowserFingerprint(page);

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
            args: BROWSER_ARGS,
            defaultViewport: null
        });
        page = await browser.newPage();
        // 设置浏览器指纹
        await setupBrowserFingerprint(page);
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
            console.log('正在识别上传按钮选择器...');

            // 动态识别上传按钮选择器
            const uploadBtnSelector = await page.$$eval('button', buttons => {
                // 查找所有包含 _upload-btn_ 的类名
                const uploadBtn = buttons.find(btn => {
                    const className = btn.className || '';
                    return className.includes && className.includes('_upload-btn_');
                });

                return uploadBtn ? '.' + uploadBtn.className : null;
            });

            if (!uploadBtnSelector) {
                throw new Error('无法找到上传按钮，请检查页面是否加载完成');
            }

            console.log(`找到上传按钮选择器: ${uploadBtnSelector}`);

            // 等待上传按钮出现并可见
            await page.waitForSelector(uploadBtnSelector, {
                timeout: 10000,
                visible: true
            });

            // 等待文件输入框出现
            await page.waitForSelector('input[type="file"][accept*="video"]', { timeout: 10000 });

            // 选择视频文件
            const [fileChooser] = await Promise.all([
                page.waitForFileChooser(),
                page.click(uploadBtnSelector)
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

            // 没有标题需要填写
            // await page.type('input[name="title"]', videoTitle);

            // 填写描述
            console.log('正在识别描述输入框选择器...');
            // 动态识别以 _description_ 开头的选择器
            const descriptionSelector = await page.$$eval('div', divs => {
                // 查找所有包含 _description_ 的类名
                const descriptionDiv = divs.find(div => {
                    const className = div.className || '';
                    return className.includes && className.includes('_description_');
                });

                return descriptionDiv ? '.' + descriptionDiv.className : null;
            });

            if (!descriptionSelector) {
                console.log('警告：无法识别描述输入框选择器，将尝试使用默认选择器');
                await page.waitForSelector('div[class*="_description_"]', { timeout: 10000 });
            } else {
                console.log(`成功识别描述输入框选择器: ${descriptionSelector}`);
                await page.waitForSelector(descriptionSelector, { timeout: 10000 });
            }

            // 使用识别到的选择器或备用选择器填写描述
            const actualDescriptionSelector = descriptionSelector || 'div[class*="_description_"]';
            await page.evaluate((text, selector) => {
                const editor = document.querySelector(selector);
                if (editor) {
                    editor.textContent = text;
                    editor.dispatchEvent(new Event('input', { bubbles: true }));
                } else {
                    console.error('无法找到描述输入框元素');
                }
            }, description, actualDescriptionSelector);

            // 等待封面图片加载
            console.log('等待封面图片加载...');

            // // 动态识别以 _recommend-cover-item_ 开头的选择器
            // console.log('正在识别封面选择器...');
            // const coverSelector = await page.$$eval('div', divs => {
            //     // 查找所有包含 _recommend-cover-item_ 的类名
            //     const coverDiv = divs.find(div => {
            //         const className = div.className || '';
            //         return className.includes && className.includes('_recommend-cover-item_');
            //     });

            //     return coverDiv ? '.' + coverDiv.className : null;
            // });

            // if (!coverSelector) {
            //     console.log('警告：无法识别封面选择器，将尝试使用默认选择器');
            //     await page.waitForSelector('._recommend-cover-item_', { timeout: 30000 });
            // } else {
            //     console.log(`成功识别封面选择器: ${coverSelector}`);
            //     await page.waitForSelector(coverSelector, { timeout: 30000 });
            // }

            // // 选择第三张封面图片
            // console.log('选择第三张封面图片...');
            // const actualSelector = coverSelector || '._recommend-cover-item_';
            // console.log(`使用选择器: ${actualSelector}`);
            // const coverItems = await page.$$(actualSelector);
            // console.log(`找到封面选项数量： ${coverItems.length}`);
            // if (coverItems.length >= 3) {
            //     console.log('找到足够的封面选项，点击第三张');
            //     await coverItems[2].click();
            //     // 等待5秒让封面设置生效
            //     await delay(5000);
            // } else {
            //     console.log('警告：没有找到足够的封面选项');
            // }

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
            
            // 检查是否有"作品信息"对话框，如果有则关闭
            try {
                // 等待一段时间，确保对话框有足够时间显示
                await delay(2000);

                // 检查是否存在作品信息对话框
                const infoDialogExists = await page.evaluate(() => {
                    // 查找包含"作品信息"的元素
                    const infoTitleElement = Array.from(document.querySelectorAll('div')).find(div =>
                        div.className && div.className.includes('_tooltip-title_') &&
                        div.textContent === '作品信息'
                    );

                    if (infoTitleElement) {
                        // 找到关闭按钮并点击
                        const closeButton = infoTitleElement.parentElement.querySelector('div[class*="_close_"]');
                        if (closeButton) {
                            closeButton.click();
                            return true;
                        }

                        // 如果找不到关闭按钮，尝试找"下一步"按钮并点击
                        const nextButton = infoTitleElement.parentElement.querySelector('div[class*="_button-primary_"]');
                        if (nextButton) {
                            nextButton.click();
                            return true;
                        }
                    }
                    return false;
                });

                if (infoDialogExists) {
                    console.log('检测到作品信息对话框并已尝试关闭');
                    // 等待对话框消失
                    await delay(1000);
                }
            } catch (dialogError) {
                console.log('检查作品信息对话框时出错:', dialogError.message);
            }


            try {
                console.log('等待发布按钮出现...');
                // 动态识别发布按钮选择器
                const publishButtonSelector = await page.$$eval('div', divs => {
                    // 查找包含"发布"文本的按钮
                    const publishButton = Array.from(divs).find(div => {
                        // 检查是否有子元素包含"发布"文本
                        return div.querySelector('div') &&
                            div.querySelector('div').textContent === '发布' &&
                            div.className &&
                            div.className.includes('_button_') &&
                            div.className.includes('_button-primary_');
                    });

                    return publishButton ? '.' + publishButton.className.split(' ').join('.') : null;
                });

                if (!publishButtonSelector) {
                    console.log('警告：无法识别发布按钮选择器，将尝试使用备用方法');
                    await page.waitForSelector('div[class*="_button-primary_"] div:has-text("发布")', {
                        timeout: 10000,
                        visible: true
                    });
                } else {
                    console.log(`成功识别发布按钮选择器: ${publishButtonSelector}`);
                    await page.waitForSelector(publishButtonSelector, {
                        timeout: 10000,
                        visible: true
                    });

                    try {
                        // 点击发布按钮 - 使用Puppeteer的点击方法
                        publishButton = await page.$(publishButtonSelector);
                        await publishButton.click();
                        console.log('已点击发布按钮');
                    } catch (clickError) {
                        console.error('点击发布按钮失败:', clickError.message);
                        throw new Error('点击发布按钮失败');
                    }

                    // 多等一会儿，确保发布请求已经发送
                    await delay(5000);
                    
                    // 检查是否有发布成功的提示信息
                    const successMessage = await page.evaluate(() => {
                        // 查找可能包含成功信息的元素
                        const successElements = Array.from(document.querySelectorAll('div')).filter(div => 
                            div.textContent && (
                                div.textContent.includes('发布成功') || 
                                div.textContent.includes('提交成功')
                            )
                        );
                        return successElements.length > 0;
                    });
                    
                    if (successMessage) {
                        console.log('检测到发布成功提示');
                    } else {
                        console.log('未检测到明确的发布成功提示，但将继续执行');
                    }
                    
                    // 不等待导航完成，而是主动跳转到发布页面
                    console.log('正在跳转回发布页面...');
                    await page.goto('https://cp.kuaishou.com/article/publish/video?tabType=1', {
                        waitUntil: 'networkidle0'
                    });
                }
            } catch (error) {
                console.error('等待发布按钮出现失败:', error.message);
                throw new Error('未能找到发布按钮');
            }



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
