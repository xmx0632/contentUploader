const path = require('path');
const puppeteer = require('puppeteer');
const { delay, loadCookies, saveCookies, waitForEnter, archiveVideo, BROWSER_ARGS, BROWSER_FINGERPRINT, setupBrowserFingerprint } = require('./upload_common');

// 检查登录状态
async function checkLogin(page) {
    await page.goto('https://channels.weixin.qq.com/platform/post/list?tab=post', {
        waitUntil: 'networkidle0'
    });

    console.log('8.检查是否需要登录');
    // 检查是否需要登录
    const needLogin = await page.evaluate(() => {
        // 如果发现"发表视频"按钮，则说明已登录
        const buttons = Array.from(document.querySelectorAll('button'));
        return !buttons.some(button =>
            button.textContent.trim() === '发表视频' &&
            button.offsetParent !== null
        );
    });
    console.log('9.needLogin=',needLogin);

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

    // 使用用户指定的模式启动浏览器并尝试加载 cookies
    const initialHeadless = options.isHeadless === true; // 尊重用户传入的isHeadless参数
    console.log(`使用${initialHeadless ? '无头' : '有界面'}模式启动浏览器...`);
    browser = await puppeteer.launch({
        headless: initialHeadless,
        args: BROWSER_ARGS,
        defaultViewport: null
    });

    page = await browser.newPage();
    
    // 设置浏览器指纹
    await setupBrowserFingerprint(page);

    // 尝试加载 cookies
    const cookiesLoaded = await loadCookies(page, 'weixin');
    console.log('6.尝试加载已保存的 cookies...', cookiesLoaded);

    // 检查登录状态
    // console.info('没问题，请回车')
    // await waitForEnter();

    const isLoggedIn = await checkLogin(page);
    console.log('7.登录状态检查结果:', isLoggedIn ? '已登录' : '未登录');

    // 如果未登录，切换到有界面模式
    if (!isLoggedIn) {
        console.log('Cookie无效或未找到，切换到有界面模式进行登录...');
        await browser.close();

        // 重新以有界面模式启动浏览器
        browser = await puppeteer.launch({
            headless: false,
            args: BROWSER_ARGS,
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
                headless: options.isHeadless === true, // 尊重用户传入的isHeadless参数
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
        // 统一页面跳转/刷新逻辑，避免 navigation timeout
        const targetUrl = 'https://channels.weixin.qq.com/platform/post/list?tab=post';
        console.log('1. 当前页面:', page.url(), '目标页面:', targetUrl, '时间:', new Date().toLocaleTimeString());
        if (page.url().includes('/platform/post/list')) {
            console.log('2. 已在目标页面，刷新...');
            await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
        } else {
            console.log('2. 跳转到目标页面...');
            await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
        }
        console.log('3. 跳转/刷新完成，当前页面:', page.url(), '时间:', new Date().toLocaleTimeString());
        console.log('4. options.isHeadless=', options.isHeadless);
        // 在 headless 模式下再次检查登录状态
        if (options.isHeadless) {
            console.log('2.1 options.isHeadless=', options.isHeadless);
            const isStillLoggedIn = await checkLogin(page);
            if (!isStillLoggedIn) {
                console.error('登录失效，请先使用非 headless 模式登录');
                await browser.close();
                process.exit(1);
            }
        }

        // 保存新的 cookies
        console.log('3.saveCookies')
        await saveCookies(page, 'weixin');

        console.log('4.options:',options);

        // 获取合集名称
        const collectionName = getCollectionName(options);
        console.log('5.collectionName:',collectionName);

        // 开始上传视频
        for (const videoFile of videoFiles) {
            console.log(`正在上传视频: ${videoFile}`);

            // 进入视频列表页面
            console.log('尝试进入视频列表页面...');
            let retryCount = 0;
            const maxRetries = 3;
            
            while (retryCount < maxRetries) {
                try {
                    console.log(`进入页面: https://channels.weixin.qq.com/platform/post/list?tab=post`);

                    // 统一页面跳转/刷新逻辑，避免 navigation timeout
                    const targetUrl = 'https://channels.weixin.qq.com/platform/post/list?tab=post';
                    if (page.url().includes('/platform/post/list')) {
                        console.log('已在目标页面，刷新...');
                        await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
                    } else {
                        console.log('跳转到目标页面...');
                        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
                    }
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
                // await page.goto('https://channels.weixin.qq.com/platform/post/create');
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

            // 勾选"声明原创"复选框
            console.log('尝试勾选"声明原创"复选框...');
            const declareOriginalResult = await page.evaluate(() => {
                // 查找声明原创的复选框 - 使用多种方法尝试定位
                let declareOriginalCheckbox = null;
                
                // 方法1：通过文本内容查找
                const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
                declareOriginalCheckbox = checkboxes.find(checkbox => {
                    // 查找附近的文本节点或标签，包含"声明原创"文本
                    const parent = checkbox.parentElement;
                    if (parent && parent.textContent.includes('声明原创')) {
                        return true;
                    }
                    // 向上查找两层
                    const grandParent = parent?.parentElement;
                    if (grandParent && grandParent.textContent.includes('声明原创')) {
                        return true;
                    }
                    return false;
                });
                
                // 方法2：通过标签和属性查找
                if (!declareOriginalCheckbox) {
                    // 查找所有label元素，可能包含"声明原创"文本
                    const labels = Array.from(document.querySelectorAll('label'));
                    const originalLabel = labels.find(label => 
                        label.textContent.includes('声明原创') || 
                        label.textContent.includes('原创')
                    );
                    
                    if (originalLabel) {
                        // 如果label有for属性，通过id查找对应的复选框
                        const forId = originalLabel.getAttribute('for');
                        if (forId) {
                            declareOriginalCheckbox = document.getElementById(forId);
                        } else {
                            // 如果label内部有复选框
                            declareOriginalCheckbox = originalLabel.querySelector('input[type="checkbox"]');
                        }
                    }
                }
                
                // 方法3：通过周围元素的关系查找
                if (!declareOriginalCheckbox) {
                    // 查找所有包含"原创"文本的元素
                    const allElements = Array.from(document.querySelectorAll('*'));
                    const originalElements = allElements.filter(el => 
                        el.textContent.includes('原创') || 
                        el.textContent.includes('声明原创')
                    );
                    
                    // 对于每个找到的元素，查找其附近的复选框
                    for (const el of originalElements) {
                        // 查找父元素下的复选框
                        const parentCheckbox = el.parentElement?.querySelector('input[type="checkbox"]');
                        if (parentCheckbox) {
                            declareOriginalCheckbox = parentCheckbox;
                            break;
                        }
                        
                        // 查找相邻元素中的复选框
                        const siblings = Array.from(el.parentElement?.children || []);
                        for (const sibling of siblings) {
                            const siblingCheckbox = sibling.querySelector('input[type="checkbox"]');
                            if (siblingCheckbox) {
                                declareOriginalCheckbox = siblingCheckbox;
                                break;
                            }
                        }
                        
                        if (declareOriginalCheckbox) break;
                    }
                }

                // 如果找到了复选框
                if (declareOriginalCheckbox && !declareOriginalCheckbox.checked) {
                    // 勾选复选框
                    declareOriginalCheckbox.click();
                    return { success: true, message: '已勾选"声明原创"复选框' };
                } else if (declareOriginalCheckbox && declareOriginalCheckbox.checked) {
                    return { success: true, message: '"声明原创"复选框已经被勾选' };
                }
                
                // 如果所有方法都失败，记录页面中所有复选框的信息以便调试
                const allCheckboxInfo = checkboxes.map(cb => {
                    const parent = cb.parentElement;
                    return {
                        checked: cb.checked,
                        id: cb.id,
                        name: cb.name,
                        parentText: parent ? parent.textContent.substring(0, 50) : 'no parent'
                    };
                });
                
                console.log('页面中的所有复选框信息:', JSON.stringify(allCheckboxInfo));
                return { success: false, message: '未找到"声明原创"复选框', checkboxInfo: allCheckboxInfo };
            });

            console.log('声明原创复选框操作结果:', declareOriginalResult.message);
            
            if (declareOriginalResult.success) {
                // 等待原创权益对话框出现
                console.log('等待原创权益对话框出现...');
                await delay(parseInt(process.env.DELAY_AFTER_CLICK || '3000'));
                
                // 处理原创权益对话框
                const handleOriginalDialogResult = await page.evaluate(() => {
                    // 查找对话框中的复选框 - 使用多种方法尝试定位
                    let agreeCheckbox = null;
                    let dialogFound = false;
                    
                    // 首先确认对话框存在
                    const dialogs = Array.from(document.querySelectorAll('.weui-desktop-dialog'));
                    const originalDialog = dialogs.find(dialog => 
                        dialog.textContent.includes('原创') || 
                        dialog.textContent.includes('声明')
                    );
                    
                    if (originalDialog) {
                        dialogFound = true;
                        console.log('找到原创权益对话框');
                        
                        // 方法1：使用特定class查找
                        const dialogCheckboxes = originalDialog.querySelectorAll('input.ant-checkbox-input');
                        if (dialogCheckboxes.length > 0) {
                            agreeCheckbox = dialogCheckboxes[0];
                            console.log('方法1找到复选框');
                        }
                        
                        // 方法2：通过标准复选框类型查找
                        if (!agreeCheckbox) {
                            const standardCheckboxes = originalDialog.querySelectorAll('input[type="checkbox"]');
                            if (standardCheckboxes.length > 0) {
                                agreeCheckbox = standardCheckboxes[0];
                                console.log('方法2找到复选框');
                            }
                        }
                        
                        // 方法3：通过文本内容查找
                        if (!agreeCheckbox) {
                            const allCheckboxes = Array.from(originalDialog.querySelectorAll('input[type="checkbox"]'));
                            agreeCheckbox = allCheckboxes.find(checkbox => {
                                // 查找附近的文本节点或标签
                                const parent = checkbox.parentElement;
                                const grandParent = parent?.parentElement;
                                
                                return (parent && (parent.textContent.includes('我已阅读') || 
                                                parent.textContent.includes('原创声明') || 
                                                parent.textContent.includes('同意'))) ||
                                       (grandParent && (grandParent.textContent.includes('我已阅读') || 
                                                      grandParent.textContent.includes('原创声明') || 
                                                      grandParent.textContent.includes('同意')));
                            });
                            
                            if (agreeCheckbox) {
                                console.log('方法3找到复选框');
                            }
                        }
                        
                        // 方法4：使用模拟点击来勾选复选框的容器
                        if (!agreeCheckbox) {
                            // 查找可能包含复选框的容器
                            const checkboxContainers = Array.from(originalDialog.querySelectorAll('.ant-checkbox, .weui-desktop-checkbox'));
                            if (checkboxContainers.length > 0) {
                                // 直接点击容器而不是复选框本身
                                checkboxContainers[0].click();
                                console.log('方法4点击了复选框容器');
                                
                                // 再次检查是否有复选框被勾选
                                const allCheckboxes = Array.from(originalDialog.querySelectorAll('input[type="checkbox"]'));
                                agreeCheckbox = allCheckboxes.find(checkbox => checkbox.checked);
                                
                                if (agreeCheckbox) {
                                    return { success: true, message: '通过点击容器勾选了复选框' };
                                }
                            }
                        }
                    } else {
                        // 如果没有找到对话框，尝试在整个页面中查找
                        const allCheckboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
                        
                        // 记录所有复选框的信息以便调试
                        const checkboxInfo = allCheckboxes.map(cb => {
                            const parent = cb.parentElement;
                            return {
                                checked: cb.checked,
                                id: cb.id,
                                name: cb.name,
                                parentText: parent ? parent.textContent.substring(0, 50) : 'no parent'
                            };
                        });
                        
                        console.log('页面中的所有复选框信息:', JSON.stringify(checkboxInfo));
                        return { success: false, message: '未找到原创权益对话框', checkboxInfo };
                    }
                    
                    // 如果找到了复选框并且未勾选
                    if (agreeCheckbox && !agreeCheckbox.checked) {
                        try {
                            // 尝试使用原生事件触发点击
                            const clickEvent = new MouseEvent('click', {
                                view: window,
                                bubbles: true,
                                cancelable: true
                            });
                            agreeCheckbox.dispatchEvent(clickEvent);
                            
                            // 尝试直接设置 checked 属性
                            agreeCheckbox.checked = true;
                            
                            // 触发 change 事件
                            const changeEvent = new Event('change', {
                                bubbles: true
                            });
                            agreeCheckbox.dispatchEvent(changeEvent);
                            
                            console.log('已勾选同意复选框');
                            return { success: true, message: '已勾选同意复选框，等待按钮状态更新' };
                        } catch (error) {
                            console.error('勾选复选框时出错:', error);
                            return { success: false, message: '勾选复选框时出错: ' + error.message };
                        }
                    } else if (agreeCheckbox && agreeCheckbox.checked) {
                        return { success: true, message: '同意复选框已经被勾选' };
                    }
                    
                    // 如果找到了对话框但没有找到复选框
                    if (dialogFound) {
                        // 记录对话框的HTML结构以便调试
                        const dialogHTML = originalDialog.outerHTML.substring(0, 1000); // 限制长度
                        return { success: false, message: '找到对话框但未找到复选框', dialogHTML };
                    }
                    
                    return { success: false, message: '未找到原创权益对话框中的同意复选框' };
                });
                
                console.log('原创权益对话框处理结果:', handleOriginalDialogResult.message);
                
                // 等待按钮状态更新（从禁用变为可点击状态）
                await delay(parseInt(process.env.DELAY_AFTER_CLICK || '2000'));
                
                // 点击"声明原创"按钮
                const clickDeclareButtonResult = await page.evaluate(() => {
                    // 查找并点击"声明原创"按钮 - 使用更精确的选择器
                    // 根据weixin_readme.md中的HTML结构，按钮可能从weui-desktop-btn_disabled变为可点击状态
                    const declareButtons = Array.from(document.querySelectorAll('button.weui-desktop-btn.weui-desktop-btn_primary:not(.weui-desktop-btn_disabled)'));
                    const declareButton = declareButtons.find(button => button.textContent.trim() === '声明原创');
                    
                    if (declareButton) {
                        declareButton.click();
                        return { success: true, message: '已点击"声明原创"按钮' };
                    }
                    
                    // 如果没找到可点击的按钮，检查是否有禁用状态的按钮
                    const disabledButtons = Array.from(document.querySelectorAll('button.weui-desktop-btn.weui-desktop-btn_primary.weui-desktop-btn_disabled'));
                    const disabledDeclareButton = disabledButtons.find(button => button.textContent.trim() === '声明原创');
                    
                    if (disabledDeclareButton) {
                        return { success: false, message: '"声明原创"按钮仍处于禁用状态' };
                    }
                    
                    return { success: false, message: '未找到"声明原创"按钮' };
                });
                
                console.log('点击声明原创按钮结果:', clickDeclareButtonResult.message);
                
                // 如果按钮仍处于禁用状态，等待更长时间后再次尝试
                if (!clickDeclareButtonResult.success && clickDeclareButtonResult.message.includes('禁用状态')) {
                    console.log('按钮仍处于禁用状态，等待更长时间后再次尝试...');
                    await delay(parseInt(process.env.DELAY_AFTER_CLICK || '5000'));
                    
                    // 再次尝试点击按钮
                    const retryClickResult = await page.evaluate(() => {
                        const declareButtons = Array.from(document.querySelectorAll('button.weui-desktop-btn.weui-desktop-btn_primary:not(.weui-desktop-btn_disabled)'));
                        const declareButton = declareButtons.find(button => button.textContent.trim() === '声明原创');
                        
                        if (declareButton) {
                            declareButton.click();
                            return { success: true, message: '已点击"声明原创"按钮（重试成功）' };
                        }
                        return { success: false, message: '重试点击"声明原创"按钮失败' };
                    });
                    
                    console.log('重试点击声明原创按钮结果:', retryClickResult.message);
                }
                
                // 等待对话框关闭和页面更新
                await delay(parseInt(process.env.DELAY_AFTER_CLICK || '3000'));
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
        // 注意: 不在这里关闭浏览器，由 main.js 统一管理
    } catch (error) {
        console.error('上传过程中发生错误:', error);
        // 不在这里关闭浏览器，由 main.js 统一管理
        throw error;
    }
}

module.exports = {
    checkLogin,
    uploadToWeixin
};
