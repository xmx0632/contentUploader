const path = require('path');
const { delay, loadCookies, saveCookies, waitForEnter } = require('./upload_common');

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
        
        // 等待页面加载
        await delay(parseInt(process.env.DELAY_PAGE_LOAD || '8000'));
        
        // 等待文件上传按钮
        const uploadButton = await page.waitForSelector('input[type=file]', {
            visible: false,
            timeout: 60000
        });
        
        // 上传视频文件
        await uploadButton.uploadFile(videoFile);
        console.log('File uploaded, waiting for processing...');
        
        // 等待视频处理
        await delay(parseInt(process.env.DELAY_VIDEO_PROCESS || '15000'));
        
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

        // // 创建日期目录并移动文件
        // const today = new Date();
        // const dateDir = path.join(VIDEO_DIR, today.getFullYear().toString() +
        //     (today.getMonth() + 1).toString().padStart(2, '0') +
        //     today.getDate().toString().padStart(2, '0'));
        
        // // 创建日期目录（如果不存在）
        // if (!fs.existsSync(dateDir)) {
        //     fs.mkdirSync(dateDir, { recursive: true });
        // }
        
        // // 移动文件到日期目录
        // const targetPath = path.join(dateDir, videoFileName + ".mp4");
        // console.log(`Moving ${videoFile} to ${targetPath}`);
        // fs.renameSync(videoFile, targetPath);
        // console.log(`Completed: Moved file to: ${targetPath}`);

        // 等待一下再继续下一个
        await delay(parseInt(process.env.DELAY_BETWEEN_VIDEOS || '2000'));
    }

    await page.close();
}

module.exports = {
    checkLogin,
    uploadToWeixin
};
