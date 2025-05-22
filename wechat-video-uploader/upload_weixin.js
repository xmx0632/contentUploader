const path = require('path');
const puppeteer = require('puppeteer');
const { delay, loadCookies, saveCookies, waitForEnter, archiveVideo, BROWSER_ARGS, BROWSER_FINGERPRINT, setupBrowserFingerprint } = require('./upload_common');

/**
 * 检查微信视频号登录状态，增强鲁棒性。
 * 检查多个典型已登录元素（发表视频按钮、用户头像、昵称等），任意存在即视为已登录。
 * 检查失败时自动截图并输出页面部分 HTML，便于调试。
 * @param {import('puppeteer').Page} page Puppeteer 页面对象
 * @param {number} maxWait 最大等待时间（毫秒），默认 60000ms
 * @returns {Promise<boolean>} 是否已登录
 */
async function checkLogin(page, maxWait = 180000) {
  // 典型已登录元素选择器
  const loginSelectors = [
    // 发表视频按钮
    'button.weui-desktop-btn_primary',
    'button[data-type="publish"]',
    // 用户头像
    '.avatar', '.profile-avatar', '.weui-desktop-avatar',
    // 用户昵称
    '.nickname', '.profile-nickname', '.weui-desktop-user__nickname'
  ];
  const checkInterval = 1000; // ms
  const startTime = Date.now();
  let isLoggedIn = false;
  let lastError = null;
  let isLoginPage = false;

  while (Date.now() - startTime < maxWait) {
    try {
      // 检查是否在登录页面
      const currentUrl = page.url();
      if (currentUrl.includes('login.html')) {
        isLoginPage = true;
        console.log('[checkLogin] 检测到登录页面，需要扫码登录');
        
        // 检查二维码是否存在
        const qrCode = await page.$("#app > div > div.login-qrcode-wrap.qrcode-iframe-wrap.dark.dark > div > div.qrcode-wrap > img");
        if (qrCode) {
          console.log('[checkLogin] 找到登录二维码，请扫码登录');
          
          // 获取二维码图片地址
          const qrCodeSrc = await page.evaluate(el => el.src, qrCode);
          console.log(`[checkLogin] 二维码图片地址: ${qrCodeSrc}`);
          
          // 提示用户扫码登录 - 使用更明显的提示
          console.log('\n\n==================================================');
          console.log('请使用微信扫描浏览器中的二维码登录');
          console.log('==================================================');
          console.log('==================================================');
          console.log('重要提示: 请先完成扫码并确认登录成功后再继续');
          console.log('==================================================\n\n');
          
          // 等待用户扫码登录完成
          await waitForEnter('\n扫码登录完成后请按回车键继续...');
          
          // 等待页面跳转 - 增加等待时间，确保登录成功后页面完全加载
          console.log('[checkLogin] 等待页面跳转和加载...');
          await delay(15000); // 增加到15秒等待时间
          
          // 再次检查URL，确认是否已经离开登录页面
          const newUrl = page.url();
          if (newUrl.includes('login.html')) {
            console.log('[checkLogin] 仍在登录页面，可能需要更多时间...');
            await delay(10000); // 再等10秒
          } else {
            console.log(`[checkLogin] 已离开登录页面，当前页面: ${newUrl}`);
          }
          
          continue; // 继续检查登录状态
        }
      }
      
      // 检查所有典型 selector，只要有一个存在即视为已登录
      for (const selector of loginSelectors) {
        const found = await page.$(selector);
        if (found) {
          isLoggedIn = true;
          console.log(`[checkLogin] 已检测到已登录元素: ${selector}`);
          break;
        }
      }
      if (isLoggedIn) {
        break;
      }
      // 兼容检查“发表视频”按钮文本（部分页面结构无 class）
      const hasPublishBtn = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.some(btn => btn.textContent && btn.textContent.trim() === '发表视频' && btn.offsetParent !== null);
      });
      if (hasPublishBtn) {
        isLoggedIn = true;
        console.log('[checkLogin] 已检测到已登录按钮文本: 发表视频');
        break;
      }
      console.log('[checkLogin] 未检测到已登录元素，继续重试...');
    } catch (err) {
      lastError = err;
      console.warn('[checkLogin] 检查登录状态异常:', err.message);
    }
    await delay(checkInterval);
  }

  if (!isLoggedIn) {
    // 检查失败时，自动截图和输出页面部分 HTML，便于调试
    try {
      const screenshotPath = path.join(process.cwd(), 'login_check_fail.png');
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
    if (lastError) {
      console.warn('[checkLogin] 最后一次异常:', lastError.message);
    }
  }
  return isLoggedIn;
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
    // 读取协议超时时间，优先使用环境变量
    const protocolTimeout = parseInt(process.env.PROTOCOL_TIMEOUT, 10) || 120000;
    /**
     * 启动 Puppeteer 浏览器，增加 protocolTimeout 参数，防止协议调用超时
     * @see https://pptr.dev/api/puppeteer.launchoptions
     */
    browser = await puppeteer.launch({
        headless: initialHeadless,
        args: BROWSER_ARGS,
        defaultViewport: null,
        protocolTimeout: protocolTimeout
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

    // 先跳转到视频号页面，统一使用 domcontentloaded 和 120秒超时
    console.log('跳转到视频号页面准备检查登录状态...');
    await page.goto('https://channels.weixin.qq.com/platform/post/list?tab=post', {
        waitUntil: 'domcontentloaded',
        timeout: 120000
    });
    
    // 如果被重定向到登录页面，则切换到有界面模式
    const currentUrl = page.url();
    if (currentUrl.includes('login.html')) {
        console.log('检测到登录页面，切换到有界面模式进行扫码登录...');
        
        // 无论当前是什么模式，都关闭并重新以有界面模式启动
        // 这样可以确保用户能看到二维码进行扫码登录
        await browser.close();
        console.log('关闭浏览器，重新以有界面模式启动...');
        browser = await puppeteer.launch({
            headless: false,
            args: BROWSER_ARGS,
            defaultViewport: null,
            protocolTimeout: protocolTimeout
        });
        page = await browser.newPage();
        await setupBrowserFingerprint(page);
        
        // 重新跳转到登录页面
        console.log('跳转到微信视频号登录页面...');
        await page.goto('https://channels.weixin.qq.com/login.html', {
            waitUntil: 'domcontentloaded',
            timeout: 120000
        });
        
        // 使用更明显的提示，确保用户注意到需要扫码登录
        console.log('\n\n==================================================');
        console.log('请使用微信扫描浏览器中的二维码进行登录');
        console.log('==================================================');
        console.log('==================================================');
        console.log('重要提示: 请先完成扫码并确认登录成功后再继续');
        console.log('==================================================\n\n');
        
        // 等待用户确认已完成扫码
        await waitForEnter('\n扫码登录完成后请按回车键继续...');
        
        // 增加等待时间，确保登录成功后页面完全加载和跳转
        console.log('等待页面加载和跳转...');
        await delay(30000); // 增加到30秒，给足够时间完成登录跳转
        
        // 检查是否仍在登录页面
        const newUrl = page.url();
        if (newUrl.includes('login.html')) {
            console.log('仍在登录页面，可能需要更多时间或登录未成功，再等待30秒...');
            await delay(30000); // 再等30秒
            
            // 再次检查URL
            const finalUrl = page.url();
            if (finalUrl.includes('login.html')) {
                console.log('登录可能失败，请重新运行程序并确保成功扫码登录');
                await browser.close();
                process.exit(1);
            } else {
                console.log(`已离开登录页面，当前页面: ${finalUrl}`);
            }
        } else {
            console.log(`已离开登录页面，当前页面: ${newUrl}`);
        }
    }
    
    // 检查登录状态，这个函数会处理扫码登录的情况
    let isLoggedIn = await checkLogin(page, 180000); // 增加等待时间到3分钟，给用户更多时间扫码
    console.log('7.登录状态检查结果:', isLoggedIn ? '已登录' : '未登录');
    
    // 如果第一次检查未登录，等待并多次重试
    if (!isLoggedIn) {
        console.log('首次登录检查未通过，等待20秒后再次检查...');
        await delay(20000);
        isLoggedIn = await checkLogin(page, 120000);
        console.log('二次登录检查结果:', isLoggedIn ? '已登录' : '未登录');
        
        // 如果二次检查仍未登录，再次尝试
        if (!isLoggedIn) {
            console.log('二次登录检查未通过，等待30秒后第三次检查...');
            await delay(30000);
            isLoggedIn = await checkLogin(page, 120000);
            console.log('三次登录检查结果:', isLoggedIn ? '已登录' : '未登录');
            
            if (!isLoggedIn) {
                console.error('多次登录检查均未通过，请确保已成功登录');
                await browser.close();
                process.exit(1);
            }
        }
    }
    
    // 如果已经登录成功，并且用户要求无头模式，则关闭当前浏览器并重新以无头模式启动
    // 这样可以确保在登录成功后始终切换回无头模式
    if (isLoggedIn && options.isHeadless === true) {
        // 保存 cookies
        console.log('登录成功，保存 cookies...');
        await saveCookies(page, 'weixin');
        
        // 关闭有界面浏览器，切换回无头模式
        console.log('登录成功，关闭浏览器并切换回无头模式...');
        await browser.close();
        
        // 重新以无头模式启动浏览器
        browser = await puppeteer.launch({
            headless: true,
            args: BROWSER_ARGS,
            defaultViewport: null,
            protocolTimeout: protocolTimeout
        });
        page = await browser.newPage();
        await setupBrowserFingerprint(page);
        
        // 加载保存的cookies
        const cookiesLoaded = await loadCookies(page, 'weixin');
        console.log('加载已保存的 cookies 结果:', cookiesLoaded ? '成功' : '失败');
        
        // 重新跳转到视频号页面
        await page.goto('https://channels.weixin.qq.com/platform/post/list?tab=post', {
            waitUntil: 'domcontentloaded',
            timeout: 120000
        });
        
        // 验证cookie是否有效
        const cookieValid = await checkLogin(page, 30000); // 等待30秒检查登录状态
        if (!cookieValid) {
            console.error('使用无头模式加载cookie后登录状态失效，请重试');
            await browser.close();
            process.exit(1);
        } else {
            console.log('无头模式下cookie验证成功，继续执行...');
        }
    }

    // 如果仍然未登录，尝试再次登录
    if (!isLoggedIn) {
        console.log('Cookie无效或扫码登录失败，尝试再次登录...');
        
        // 确保使用有界面模式
        if (initialHeadless) {
            await browser.close();
            browser = await puppeteer.launch({
                headless: false,
                args: BROWSER_ARGS,
                defaultViewport: null,
                protocolTimeout: protocolTimeout
            });
            page = await browser.newPage();
            await setupBrowserFingerprint(page);
        }
        
        // 直接跳转到登录页面
        console.log('跳转到微信视频号登录页面...');
        await page.goto('https://channels.weixin.qq.com/login.html', {
            waitUntil: 'domcontentloaded',
            timeout: 120000
        });
        
        console.log('需要登录微信视频号，请扫描浏览器中的二维码完成登录...');
        
        // 再次检查登录状态，给更多时间扫码
        const loggedIn = await checkLogin(page, 180000); // 3分钟超时
        if (loggedIn) {
            // 保存 cookies
            console.log('登录成功，保存 cookies...');
            await saveCookies(page, 'weixin');
            
            // 登录成功后关闭浏览器，无论用户是否要求无头模式
            console.log('关闭浏览器，并使用无头模式重新获取cookie...');
            await browser.close();
            
            // 重新以无头模式启动浏览器
            browser = await puppeteer.launch({
                headless: true, // 始终使用无头模式
                args: BROWSER_ARGS,
                defaultViewport: null,
                protocolTimeout: protocolTimeout
            });
            page = await browser.newPage();
            await setupBrowserFingerprint(page);
            
            // 加载保存的cookies
            const cookiesLoaded = await loadCookies(page, 'weixin');
            console.log('加载已保存的 cookies 结果:', cookiesLoaded ? '成功' : '失败');
            
            // 重新跳转到视频号页面
            await page.goto('https://channels.weixin.qq.com/platform/post/list?tab=post', {
                waitUntil: 'domcontentloaded',
                timeout: 120000
            });
            
            // 验证cookie是否有效
            const cookieValid = await checkLogin(page, 30000); // 等待30秒检查登录状态
            if (!cookieValid) {
                console.error('使用无头模式加载cookie后登录状态失效，请重试');
                await browser.close();
                process.exit(1);
            } else {
                console.log('无头模式下cookie验证成功，继续执行...');
            }
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

            // 再次检查登录状态，确保在跳转到上传页面前已登录
            console.log('在跳转到上传页面前再次检查登录状态...');
            const preUploadLoginCheck = await checkLogin(page, 60000);
            if (!preUploadLoginCheck) {
                console.error('上传前登录检查失败，请确保已登录');
                throw new Error('未检测到登录状态，无法继续上传视频');
            }
            console.log('登录状态确认，继续上传流程');
            
            // 等待页面加载
            console.log('等待页面加载...');
            await delay(parseInt(process.env.DELAY_PAGE_LOAD || '12000')); // 增加默认等待时间到12秒

            // 直接跳转到发布页面，无需检测"发表视频"按钮
            const publishUrl = 'https://channels.weixin.qq.com/platform/post/create';
            console.log(`[uploadToWeixin] 跳转到发布页面: ${publishUrl}`);
            await page.goto(publishUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
            
            // 等待页面加载 - 增加等待时间
            console.log('等待发布页面完全加载...');
            await delay(parseInt(process.env.DELAY_PAGE_LOAD || '15000')); // 增加到至少15秒
            
            // 使用Shadow DOM选择器定位上传控件
            console.log('[uploadToWeixin] 使用Shadow DOM选择器定位上传控件...');
            try {
                let uploadInput = await page.evaluateHandle(() => {
                    try {
                        // 获取wujie-app的shadowRoot
                        const wujieApp = document.querySelector("#container-wrap > div.container-center > div > wujie-app");
                        if (wujieApp && wujieApp.shadowRoot) {
                            // 在shadowRoot中查找上传控件
                            const fileInput = wujieApp.shadowRoot.querySelector("#container-wrap > div.container-center > div > div > div.main-body-wrap.post-create > div.main-body > div > div.post-edit-wrap.material-edit-wrap > div.material > div > div > div > span > div > span > input[type=file]");
                            if (fileInput) {
                                console.log('在Shadow DOM中找到上传控件');
                                return fileInput;
                            }
                        }
                        return null;
                    } catch (err) {
                        console.error('Shadow DOM选择器错误:', err);
                        return null;
                    }
                });
                    
                const isShadowInputValid = await page.evaluate(input => input !== null, uploadInput);
                if (!isShadowInputValid) {
                    throw new Error('无法使用Shadow DOM选择器找到上传控件');
                }
                
                console.log('[uploadToWeixin] 成功使用Shadow DOM选择器找到上传控件');
                    
                // 如果上传控件无效，抛出错误
                if (!uploadInput) {
                    throw new Error('无法找到上传控件');
                }
                
                // 上传视频文件
                console.log('[uploadToWeixin] 开始上传视频文件:', videoFile);
                await uploadInput.uploadFile(videoFile);
                console.log('[uploadToWeixin] 视频文件已上传，等待处理...');
                
            } catch (backupErr) {
                // 所有方法均失败，截图并输出页面 HTML 以便调试
                await page.screenshot({ path: `debug-upload-failure-${Date.now()}.png` });
                const html = await page.content();
                console.error('[uploadToWeixin] 所有上传方法均失败，页面 HTML:', html.substring(0, 1000) + '...');
                throw new Error(`无法上传视频文件: ${backupErr.message}`);
            }

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
            console.log('尝试填写视频描述...');
            const descriptionResult = await page.evaluate((desc) => {
                try {
                    // 使用Shadow DOM选择器定位描述输入框
                    const editor = document.querySelector("#container-wrap > div.container-center > div > wujie-app").shadowRoot.querySelector("#container-wrap > div.container-center > div > div > div.main-body-wrap.post-create > div.main-body > div > div.post-edit-wrap.material-edit-wrap > div.form > div:nth-child(2) > div.form-item-body > div > div.input-editor");
                    
                    if (editor) {
                        console.log('找到描述输入框');
                        // 清空内容
                        editor.textContent = '';
                        // 设置描述文本
                        editor.textContent = desc;
                        // 触发输入事件
                        editor.dispatchEvent(new Event('input', { bubbles: true }));
                        editor.dispatchEvent(new Event('change', { bubbles: true }));
                        return { success: true, message: '成功填写视频描述' };
                    }
                    return { success: false, message: '未找到描述输入框' };
                } catch (error) {
                    return { success: false, message: `填写描述时出错: ${error.message}` };
                }
            }, description);
            
            console.log('描述填写结果:', descriptionResult.message);

            // 等待内容更新
            await delay(parseInt(process.env.DELAY_CONTENT_UPDATE || '5000'));

            // 如果有合集名称，选择合集
            if (collectionName) {
                console.log('尝试添加到合集:', collectionName);
                
                // 点击“添加到合集”
                const addToCollectionResult = await page.evaluate(() => {
                    try {
                        // 使用Shadow DOM选择器定位“添加到合集”按钮
                        const addToCollectionBtn = document.querySelector("#container-wrap > div.container-center > div > wujie-app").shadowRoot.querySelector("#container-wrap > div.container-center > div > div > div.main-body-wrap.post-create > div.main-body > div > div.post-edit-wrap.material-edit-wrap > div.form > div:nth-child(4) > div.form-item-body > div > div.post-album-display > div > div.tip > span");
                        
                        if (addToCollectionBtn) {
                            console.log('找到“添加到合集”按钮');
                            addToCollectionBtn.click();
                            return { success: true, message: '已点击“添加到合集”按钮' };
                        }
                        return { success: false, message: '未找到“添加到合集”按钮' };
                    } catch (error) {
                        return { success: false, message: `点击“添加到合集”按钮时出错: ${error.message}` };
                    }
                });
                
                console.log('点击“添加到合集”结果:', addToCollectionResult.message);
                
                // 等待下拉框出现
                await delay(parseInt(process.env.DELAY_AFTER_CLICK || '3000'));
                
                // 选择目标合集
                const selectCollectionResult = await page.evaluate((name) => {
                    try {
                        // 使用Shadow DOM选择器定位合集选项
                        // 注意：这里的nth-child可能需要根据实际情况调整
                        const collectionOptions = document.querySelector("#container-wrap > div.container-center > div > wujie-app").shadowRoot.querySelectorAll("#container-wrap > div.container-center > div > div > div.main-body-wrap.post-create > div.main-body > div > div.post-edit-wrap.material-edit-wrap > div.form > div:nth-child(4) > div.form-item-body > div > div.filter-wrap > div.common-option-list-wrap.option-list-wrap > div");
                        
                        console.log(`找到 ${collectionOptions.length} 个合集选项`);
                        
                        // 遍历所有选项并查找目标合集
                        for (const option of collectionOptions) {
                            const nameDiv = option.querySelector('div > div.name');
                            if (nameDiv && nameDiv.textContent.trim() === name) {
                                console.log(`找到目标合集: ${name}`);
                                nameDiv.click();
                                return { success: true, message: `已选择合集: ${name}` };
                            }
                        }
                        
                        return { success: false, message: `未找到目标合集: ${name}` };
                    } catch (error) {
                        return { success: false, message: `选择合集时出错: ${error.message}` };
                    }
                }, collectionName);
                
                console.log('选择合集结果:', selectCollectionResult.message);
                
                // 等待选择完成
                await delay(parseInt(process.env.DELAY_AFTER_CLICK || '3000'));
            }

            // 勾选"声明原创"复选框
            console.log('尝试勾选"声明原创"复选框...');
            const declareOriginalResult = await page.evaluate(() => {
                try {
                    // 使用Shadow DOM选择器定位"声明原创"复选框
                    const originalCheckbox = document.querySelector("#container-wrap > div.container-center > div > wujie-app").shadowRoot.querySelector("#container-wrap > div.container-center > div > div > div.main-body-wrap.post-create > div.main-body > div > div.post-edit-wrap.material-edit-wrap > div.form > div:nth-child(9) > div.form-item-body > div > label > span.ant-checkbox > input");
                    
                    if (originalCheckbox) {
                        console.log('找到"声明原创"复选框');
                        // 检查复选框状态
                        if (!originalCheckbox.checked) {
                            // 尝试点击复选框
                            originalCheckbox.click();
                            // 直接设置checked属性
                            originalCheckbox.checked = true;
                            // 触发change事件
                            originalCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
                            return { success: true, message: '已勾选"声明原创"复选框' };
                        } else {
                            return { success: true, message: '"声明原创"复选框已经被勾选' };
                        }
                    }
                    
                    return { success: false, message: '未找到"声明原创"复选框' };
                } catch (error) {
                    return { success: false, message: `勾选"声明原创"复选框时出错: ${error.message}` };
                }
            });

            console.log('声明原创复选框操作结果:', declareOriginalResult.message);
            
            if (declareOriginalResult.success) {
                // 等待原创权益对话框出现
                console.log('等待原创权益对话框出现...');
                await delay(parseInt(process.env.DELAY_AFTER_CLICK || '3000'));
                
                // 处理原创权益对话框
                console.log('处理原创权益对话框...');
                const handleOriginalDialogResult = await page.evaluate(() => {
                    try {
                        // 使用Shadow DOM选择器定位对话框中的复选框
                        const dialogCheckbox = document.querySelector("#container-wrap > div.container-center > div > wujie-app").shadowRoot.querySelector("#container-wrap > div.container-center > div > div > div.main-body-wrap.post-create > div.main-body > div > div.post-edit-wrap.material-edit-wrap > div.form > div:nth-child(9) > div.declare-original-dialog > div.weui-desktop-dialog__wrp > div > div.weui-desktop-dialog__bd > div > div.original-proto-wrapper > label > span > input");
                        
                        if (dialogCheckbox) {
                            console.log('找到原创权益对话框中的复选框');
                            
                            // 检查复选框状态
                            if (!dialogCheckbox.checked) {
                                // 尝试点击复选框
                                dialogCheckbox.click();
                                // 直接设置checked属性
                                dialogCheckbox.checked = true;
                                // 触发change事件
                                dialogCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
                                
                                console.log('已勾选原创权益对话框中的复选框');
                                
                                // 点击"声明原创"按钮
                                setTimeout(() => {
                                    try {
                                        const declareButton = document.querySelector("#container-wrap > div.container-center > div > wujie-app").shadowRoot.querySelector("#container-wrap > div.container-center > div > div > div.main-body-wrap.post-create > div.main-body > div > div.post-edit-wrap.material-edit-wrap > div.form > div:nth-child(9) > div.declare-original-dialog > div.weui-desktop-dialog__wrp > div > div.weui-desktop-dialog__ft > div:nth-child(2) > button");
                                        
                                        if (declareButton) {
                                            console.log('找到"声明原创"按钮');
                                            declareButton.click();
                                            console.log('已点击"声明原创"按钮');
                                        } else {
                                            console.log('未找到"声明原创"按钮');
                                        }
                                    } catch (buttonError) {
                                        console.error('点击"声明原创"按钮时出错:', buttonError);
                                    }
                                }, 500);
                                
                                return { success: true, message: '已勾选原创权益对话框中的复选框并点击声明原创按钮' };
                            } else {
                                // 如果复选框已经被勾选，直接点击"声明原创"按钮
                                const declareButton = document.querySelector("#container-wrap > div.container-center > div > wujie-app").shadowRoot.querySelector("#container-wrap > div.container-center > div > div > div.main-body-wrap.post-create > div.main-body > div > div.post-edit-wrap.material-edit-wrap > div.form > div:nth-child(9) > div.declare-original-dialog > div.weui-desktop-dialog__wrp > div > div.weui-desktop-dialog__ft > div:nth-child(2) > button");
                                
                                if (declareButton) {
                                    console.log('找到"声明原创"按钮');
                                    declareButton.click();
                                    console.log('已点击"声明原创"按钮');
                                    return { success: true, message: '复选框已经被勾选，已点击"声明原创"按钮' };
                                } else {
                                    return { success: true, message: '复选框已经被勾选，但未找到"声明原创"按钮' };
                                }
                            }
                        }
                        
                        return { success: false, message: '未找到原创权益对话框中的复选框' };
                    } catch (error) {
                        return { success: false, message: `处理原创权益对话框时出错: ${error.message}` };
                    }
                });
                
                console.log('原创权益对话框处理结果:', handleOriginalDialogResult.message);
                
                // 等待按钮状态更新（从禁用变为可点击状态）
                await delay(parseInt(process.env.DELAY_AFTER_CLICK || '2000'));
                
                // 尝试勾选"声明原创"复选框
                console.log('尝试勾选"声明原创"复选框...');
                const originalCheckboxResult = await page.evaluate(() => {
                    // 使用提供的Shadow DOM选择器定位"声明原创"复选框
                    const originalCheckbox = document.querySelector("#container-wrap > div.container-center > div > wujie-app").shadowRoot.querySelector("#container-wrap > div.container-center > div > div > div.main-body-wrap.post-create > div.main-body > div > div.post-edit-wrap.material-edit-wrap > div.form > div:nth-child(9) > div.form-item-body > div > label > span.ant-checkbox > input");
                    
                    if (originalCheckbox) {
                        console.log('找到"声明原创"复选框');
                        // 检查复选框状态
                        if (!originalCheckbox.checked) {
                            // 尝试点击复选框
                            originalCheckbox.click();
                            // 直接设置checked属性
                            originalCheckbox.checked = true;
                            // 触发change事件
                            originalCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
                            return { success: true, message: '已勾选"声明原创"复选框' };
                        } else {
                            return { success: true, message: '"声明原创"复选框已经被勾选' };
                        }
                    }
                    
                    return { success: false, message: '未找到"声明原创"复选框' };
                });
                
                console.log('声明原创复选框操作结果:', originalCheckboxResult.message);
                
                // 等待对话框关闭和页面更新
                await delay(parseInt(process.env.DELAY_AFTER_CLICK || '3000'));
            }

            // 尝试点击发表按钮
            console.log('尝试点击发表按钮...');
            const publishResult = await page.evaluate(() => {
                // 使用提供的Shadow DOM选择器找到发表按钮
                const publishButton = document.querySelector("#container-wrap > div.container-center > div > wujie-app").shadowRoot.querySelector("#container-wrap > div.container-center > div > div > div.main-body-wrap.post-create > div.main-body > div > div.post-edit-wrap.material-edit-wrap > div.form > div.form-btns > div:nth-child(5) > span > div > button");
                
                if (publishButton) {
                    console.log('找到发表按钮:', publishButton.textContent.trim());
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
