const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { generateMultiWordDescription } = require('./ai_util');

// 获取命令行参数
const args = process.argv.slice(2);

// 处理命令行参数
let videoDir = 'F:\dev\workspace\contentUploader\video';
let isHeadless = false;

// 解析参数
for (let i = 0; i < args.length; i++) {
    if (args[i] === '--headless') {
        isHeadless = true;
    } else if (args[i] === '--dir' && args[i + 1]) {
        videoDir = args[i + 1];
        i++; // 跳过下一个参数
    }
}

// 检查目录是否存在
if (!fs.existsSync(videoDir)) {
    console.error(`Error: Directory not found: ${videoDir}`);
    console.error('Usage: node upload_weichat.js [--dir <video_directory_path>] [--headless]');
    console.error('Options:');
    console.error('  --dir      指定视频文件夹路径');
    console.error('  --headless 无界面模式运行');
    process.exit(1);
}

console.log(`Using video directory: ${videoDir}`);
console.log(`Headless mode: ${isHeadless}`);

// 将 videoDir 赋值给 VIDEO_DIR 保持与原有代码兼容
const VIDEO_DIR = videoDir;

// 添加延时函数
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitForEnter() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise(resolve => {
        rl.question('Login complete? Press Enter to continue...', () => {
            rl.close();
            resolve();
        });
    });
}

function getMP4Files() {
    return fs.readdirSync(VIDEO_DIR)
        .filter(file => file.toLowerCase().endsWith('.mp4'))
        .map(file => path.join(VIDEO_DIR, file));
}

async function saveCookies(page) {
    const cookies = await page.cookies();
    await fs.promises.writeFile('temp/cookies.json', JSON.stringify(cookies, null, 2));
    console.log('Cookies saved successfully');
}

async function loadCookies(page) {
    try {
        const cookiesString = await fs.promises.readFile('temp/cookies.json', 'utf8');
        const cookies = JSON.parse(cookiesString);
        await page.setCookie(...cookies);
        console.log('Cookies loaded successfully');
        return true;
    } catch (error) {
        console.log('No saved cookies found or error loading cookies');
        return false;
    }
}

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

async function uploadVideo() {
    let browser;
    
    // 如果是 headless 模式，先检查是否有保存的 cookies
    if (isHeadless) {
        // 先用有界面模式打开进行登录
        browser = await puppeteer.launch({
            headless: false,
            args: ['--start-maximized'],
            defaultViewport: null
        });
        
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
        
        // 重新以 headless 模式启动
        browser = await puppeteer.launch({
            headless: true,
            defaultViewport: null
        });
    } else {
        // 非 headless 模式直接启动
        browser = await puppeteer.launch({
            headless: false,
            args: ['--start-maximized'],
            defaultViewport: null
        });
    }

    try {
        const page = await browser.newPage();
        
        // 如果是 headless 模式，尝试加载 cookies
        if (isHeadless) {
            await loadCookies(page);
        }
        
        await page.goto('https://channels.weixin.qq.com/platform/post/list?tab=post', {
            waitUntil: 'networkidle0'
        });
        
        // 如果不是 headless 模式，等待用户登录
        if (!isHeadless) {
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

        const videoFiles = getMP4Files();
        console.log(`Found ${videoFiles.length} videos to upload`);

        for (const videoFile of videoFiles) {
            try {
                console.log(`Uploading: ${videoFile}`);
                
                // 等待页面加载完成
                await delay(8000);

                // 调试信息：打印所有按钮的文本
                const buttonTexts = await page.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('button'));
                    return buttons.map(button => ({
                        text: button.textContent.trim(),
                        class: button.className,
                        isVisible: button.offsetParent !== null
                    }));
                });
                // console.log('Found buttons:', buttonTexts);

                // 直接点击发表视频按钮
                try {
                    // 使用page.click直接点击按钮
                    await page.click('button.weui-desktop-btn.weui-desktop-btn_primary:not(.weui-desktop-btn_mini)');
                    console.log('Clicked publish button using page.click()');
                } catch (clickError) {
                    console.log('Failed to click using page.click(), trying alternative method...');
                    
                    // 如果直接点击失败，尝试使用evaluate方法
                    const clicked = await page.evaluate(() => {
                        const buttons = Array.from(document.querySelectorAll('button'));
                        for (const button of buttons) {
                            if (button.textContent.trim() === '发表视频' && 
                                button.offsetParent !== null && 
                                button.classList.contains('weui-desktop-btn_primary') &&
                                !button.classList.contains('weui-desktop-btn_mini')) {
                                    
                                // console.log('Found button:', {
                                //     text: button.textContent,
                                //     class: button.className,
                                //     visible: button.offsetParent !== null
                                // });
                                
                                const rect = button.getBoundingClientRect();
                                // console.log('Button position:', rect);
                                
                                button.click();
                                return true;
                            }
                        }
                        return false;
                    });
                    
                    console.log('Alternative click result:', clicked);
                    
                    if (!clicked) {
                        throw new Error('Could not find or click the publish button');
                    }
                }

                // Wait for the page to stabilize
                await delay(8000);
                
                // Handle file upload - wait longer for the file input to appear
                const inputElement = await page.waitForSelector('input[type=file]', {
                    visible: false,
                    timeout: 60000
                });
                await inputElement.uploadFile(videoFile);
                console.log('File uploaded, waiting for processing...');
                
                // Wait for video processing
                await delay(15000);

                // Get video filename as description
                const videoFileName = path.basename(videoFile, path.extname(videoFile));
                console.log('Video filename:', videoFileName);

                // Get description from AI
                let description;
                try {
                    // 将文件名按照 - 分割成单词
                    const words = videoFileName
                        .split('-')
                        .map(word => word.trim().toLowerCase())
                        .filter(word => word);
                    
                    if (words.length > 0) {
                        description = await generateMultiWordDescription(words.join('-'));
                        console.log('Generated AI description:', description);
                    }
                } catch (error) {
                    console.error('Error generating description:', error);
                }

                // 如果生成失败，使用原文件名
                if (!description) {
                    description = videoFileName;
                    console.log('Using original filename as description:', description);
                }
                
                // Fill in video description
                await page.evaluate((description) => {
                    const editor = document.querySelector('div[contenteditable][data-placeholder="添加描述"]');
                    if (editor) {
                        // 清空当前内容
                        editor.textContent = '';
                        
                        // 聚焦到编辑器
                        editor.focus();
                        
                        // 插入新内容
                        document.execCommand('insertText', false, description);
                        
                        // 触发多个事件确保内容更新
                        ['input', 'change', 'blur'].forEach(eventType => {
                            editor.dispatchEvent(new Event(eventType, { bubbles: true }));
                        });
                        
                        // 在内容外点击以失去焦点
                        document.body.click();
                    }
                }, description);
                
                // 等待一段时间让系统处理内容更新
                await delay(5000);

                // Click collection dropdown
                await page.evaluate(() => {
                    const albumDisplay = document.querySelector('.post-album-display');
                    if (albumDisplay) {
                        albumDisplay.click();
                    }
                });

                await delay(3000);

                // Select target collection
                const selected = await page.evaluate(() => {
                    const items = Array.from(document.querySelectorAll('.option-item'));
                    const targetItem = items.find(item => {
                        const nameDiv = item.querySelector('.name');
                        return nameDiv && nameDiv.textContent.trim() === '日语英语对照学';
                    });
                    
                    if (targetItem) {
                        targetItem.click();
                        return true;
                    }
                    return false;
                });

                if (!selected) {
                    console.log('Warning: Could not find or select the target collection');
                }

                await delay(3000);
                
                // 详细记录页面上所有按钮的状态
                const buttonDetails = await page.evaluate(() => {
                    const allButtons = document.querySelectorAll('button');
                    // console.log(`Found ${allButtons.length} buttons on page`);
                    
                    return Array.from(allButtons).map(button => {
                        const rect = button.getBoundingClientRect();
                        const styles = window.getComputedStyle(button);
                        return {
                            text: button.textContent.trim(),
                            innerText: button.innerText.trim(),
                            class: button.className,
                            id: button.id,
                            disabled: button.disabled,
                            visible: rect.width > 0 && rect.height > 0 && styles.display !== 'none' && styles.visibility !== 'hidden',
                            position: {
                                top: rect.top,
                                left: rect.left,
                                width: rect.width,
                                height: rect.height
                            },
                            style: {
                                display: styles.display,
                                visibility: styles.visibility,
                                opacity: styles.opacity
                            }
                        };
                    });
                });
                
                // console.log('Detailed button information:', JSON.stringify(buttonDetails, null, 2));
                
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

                // console.log('Publish button click attempt result:', JSON.stringify(publishResult, null, 2));

                if (!publishResult.success) {
                    // 处理失败的情况
                    console.log('Failed to find or click the publish button');
                    throw new Error('Could not find or click the publish button');
                }

                console.log('Publish button clicked, waiting for completion...');
                await delay(8000);  // 等待更长时间

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

                console.log('Confirm dialog check result:', JSON.stringify(confirmResult, null, 2));
                await delay(5000);

                // 等待发表按钮消失或页面变化
                try {
                    await page.waitForFunction(
                        () => {
                            const publishButton = document.querySelector('button.weui-desktop-btn.weui-desktop-btn_primary');
                            return !publishButton || publishButton.textContent.trim() !== '发表';
                        },
                        { timeout: 30000 }
                    );
                    console.log('Publish button state changed successfully');
                } catch (error) {
                    console.log('Warning: Timeout waiting for button state change');
                }

                console.log('Publication process completed');
                console.log(`Successfully uploaded: ${videoFile}`);
                
                // Add a small delay between uploads
                await delay(5000);
            } catch (error) {
                console.error(`Failed to upload ${videoFile}:`, error);
                // Try to navigate back to the list page if there's an error
                try {
                    await page.goto('https://channels.weixin.qq.com/platform/post/list?tab=post', {
                        waitUntil: 'networkidle0'
                    });
                } catch (navError) {
                    console.error('Failed to navigate back to list page:', navError);
                }
            }
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

uploadVideo().catch(console.error);