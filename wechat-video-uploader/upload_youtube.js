// Copyright 2016 Google LLC
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

/**
 * Usage: node upload.js PATH_TO_VIDEO_FILE
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { google } = require('googleapis');
const { delay, archiveVideo, loadYoutubeCredentials } = require('./upload_common');
// 应用根目录确定
const isPackaged = process.pkg !== undefined;
const appRoot = isPackaged ? path.dirname(process.execPath) : __dirname;

// 创建命令行接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// initialize the Youtube API library
const youtube = google.youtube('v3');

/**
 * 获取 OAuth2 客户端
 * @returns {Promise<any>} OAuth2 客户端
 */
async function getAuthClient() {
  console.log('正在读取凭证文件...');
  try {
    const { credentials, token } = await loadYoutubeCredentials();

    if (!credentials) {
      throw new Error('未找到YouTube凭证文件');
    }

    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // 如果存在令牌，设置令牌
    if (token) {
      console.log('发现现有令牌，正在加载...');
      oAuth2Client.setCredentials(token);
      return oAuth2Client;
    }

    // 如果没有令牌，获取新的令牌
    return getNewToken(oAuth2Client);
  } catch (error) {
    console.error('读取凭证文件失败:', error.message);
    throw error;
  }
}

/**
 * 获取新的访问令牌
 * @param {OAuth2Client} oAuth2Client OAuth2 客户端
 * @param {string} tokenPath 令牌文件路径
 * @returns {Promise<any>} OAuth2 客户端
 */
async function getNewToken(oAuth2Client) {
  // 设置授权范围 - 添加了更多权限以支持播放列表操作
  const SCOPES = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/youtubepartner',
  ];

  // 生成授权URL
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('请在浏览器中打开以下链接并授权应用：');
  console.log(authUrl);

  // 获取授权码
  const code = await new Promise((resolve) => {
    rl.question('请输入浏览器中获取的授权码: ', (code) => {
      resolve(code);
    });
  });

  console.log('获取的授权码:', code);

  try {
    // 使用授权码获取令牌
    const { tokens } = await oAuth2Client.getToken(code);
    console.log('获取到令牌');

    // 保存令牌到temp目录
    const tempDir = path.join(appRoot, 'temp');
    if (!fs.existsSync(tempDir)) {
      await fs.promises.mkdir(tempDir);
    }
    const cookieFileName = 'youtube-tokens.json';
    await fs.promises.writeFile(path.join(tempDir, cookieFileName), JSON.stringify(tokens, null, 2));
    console.log('令牌已保存');

    // 设置令牌
    oAuth2Client.setCredentials(tokens);

    return oAuth2Client;
  } catch (error) {
    console.error('获取令牌失败:', error.message);
    throw error;
  }
}

/**
 * 检查播放列表是否存在并可访问
 * @param {Object} auth 授权对象
 * @param {string} playlistId 播放列表ID
 * @returns {Promise<boolean>} 播放列表是否可访问
 */
async function checkPlaylistAccess(auth, playlistId) {
  try {
    // 初始化 YouTube API
    const youtube = google.youtube({ version: 'v3', auth });

    // 尝试获取播放列表信息
    const response = await youtube.playlists.list({
      auth: auth,
      part: 'snippet',
      id: playlistId,
      maxResults: 1
    });

    // 检查是否有返回结果
    if (response.data.items && response.data.items.length > 0) {
      console.log(`播放列表存在: ${response.data.items[0].snippet.title}`);
      return true;
    } else {
      console.log(`播放列表 ${playlistId} 不存在或无权访问`);
      return false;
    }
  } catch (error) {
    console.error(`检查播放列表访问权限时出错: ${error.message}`);
    return false;
  }
}

/**
 * 将视频添加到指定的播放列表
 * @param {Object} auth 授权对象
 * @param {string} videoId 视频ID
 * @param {string} playlistId 播放列表ID
 * @returns {Promise<Object>} 添加结果
 */
async function addVideoToPlaylist(auth, videoId, playlistId) {
  console.log(`正在将视频 ${videoId} 添加到播放列表 ${playlistId}...`);

  // 首先检查播放列表是否可访问
  const canAccess = await checkPlaylistAccess(auth, playlistId);
  if (!canAccess) {
    throw new Error(`无法访问播放列表 ${playlistId}，请确认ID正确并且您有权限访问`);
  }

  try {
    // 初始化 YouTube API
    const youtube = google.youtube({ version: 'v3', auth });

    // 添加视频到播放列表
    const playlistItemInsertResponse = await youtube.playlistItems.insert({
      auth: auth,
      part: 'snippet',
      requestBody: {
        snippet: {
          playlistId: playlistId,
          resourceId: {
            kind: 'youtube#video',
            videoId: videoId,
          }
          // 移除position参数，因为有些播放列表不支持手动排序
        },
      },
    });

    console.log('视频已成功添加到播放列表!');
    return playlistItemInsertResponse.data;
  } catch (error) {
    console.error('添加视频到播放列表时出错:', error.message);
    throw error;
  }
}

// very basic example of uploading a video to youtube
async function uploadOneYoutubeVideo(fileName, options = {}) {
  console.log('开始上传视频:', fileName);

  try {
    // 获取授权客户端
    const auth = await getAuthClient();
    console.log('授权成功，准备上传...');

    // 初始化 YouTube API
    const youtube = google.youtube({ version: 'v3', auth });

    const fileSize = fs.statSync(fileName).size;
    const res = await youtube.videos.insert(
      {
        part: 'id,snippet,status',
        notifySubscribers: false,
        requestBody: {
          snippet: {
            title: options.title || `测试视频 ${new Date().toLocaleString()}`,
            description: options.description || 'Testing YouTube upload via Google APIs Node.js Client\n#Shorts',
            tags: options.tags || ['nodejs', 'youtube', 'api', 'Shorts'],
            categoryId: options.categoryId || '22', // 视频类别ID

          },
          status: {
            privacyStatus: options.privacyStatus || 'public',  // 或 'public', 'private'
            selfDeclaredMadeForKids: false,

          },
        },
        media: {
          body: fs.createReadStream(fileName),
        },
      },
      {
        // Use the `onUploadProgress` event from Axios to track the
        // number of bytes uploaded to this point.
        onUploadProgress: evt => {
          const progress = (evt.bytesRead / fileSize) * 100;
          readline.clearLine(process.stdout, 0);
          readline.cursorTo(process.stdout, 0, null);
          process.stdout.write(`${Math.round(progress)}% complete`);
        },
      }
    );
    console.log('\n\n');
    console.log('视频上传成功!');

    // 如果指定了播放列表ID，将视频添加到播放列表
    if (options.playlistId) {
      try {
        await addVideoToPlaylist(auth, res.data.id, options.playlistId);
      } catch (playlistError) {
        console.error('添加到播放列表失败，但视频上传成功:', playlistError.message);
        // 如果是权限问题，提供更详细的提示
        if (playlistError.message.includes('Permission') || playlistError.message.includes('权限')) {
          console.log('提示: 请确保您的OAuth授权包含了管理播放列表的权限，或者您拥有该播放列表的操作权限');
          console.log('如需重新授权，请删除 temp/youtube-token.json 文件并重新运行脚本');
        }
        // 不抛出异常，允许程序继续执行
      }
    }

    return res.data;
  } catch (error) {
    console.error('上传过程中出错:', error.message);

    // 检查是否为授权错误
    if (error.message === 'invalid_grant' ||
      error.message.includes('auth') ||
      error.message.includes('认证') ||
      error.message.includes('授权') ||
      error.message.includes('token') ||
      error.message.includes('令牌')) {
      console.error('检测到授权错误，请删除以下文件后重试:');
      const { credentials } = await loadYoutubeCredentials();
      if (!credentials) {
        console.error('YouTube凭证文件不存在');
      }
      console.error(`- ${path.join(__dirname, 'temp', 'youtube-token.json')}`);
    }

    throw error;
  }
}

/**
 * 解析命令行参数
 * @returns {Object} 解析后的参数对象
 */
function parseCommandLineArgs() {
  const args = process.argv.slice(2);
  const result = {
    fileName: null,
    options: {
      title: `测试视频 ${new Date().toLocaleString()}`,
      description: '这是通过 YouTube API 上传的测试视频\n#Shorts',
      tags: ['Shorts', '测试', 'API上传'],
      privacyStatus: 'unlisted',
      playlistId: 'PLF3-N8-3XPFbMVSIJ57tctwjK1HN_37F8' // 默认播放列表ID
    }
  };

  // 处理参数
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      // 处理命名参数
      const paramName = arg.substring(2);
      const paramValue = args[i + 1];

      if (paramValue && !paramValue.startsWith('--')) {
        i++; // 跳过下一个参数，因为它是当前参数的值

        switch (paramName) {
          case 'title':
            result.options.title = paramValue;
            break;
          case 'description':
            result.options.description = paramValue;
            break;
          case 'tags':
            result.options.tags = paramValue.split(',');
            break;
          case 'privacy':
            if (['public', 'private', 'unlisted'].includes(paramValue)) {
              result.options.privacyStatus = paramValue;
            }
            break;
          case 'playlist':
            result.options.playlistId = paramValue;
            break;
          case 'category':
            result.options.categoryId = paramValue;
            break;
        }
      }
    } else if (!result.fileName) {
      // 第一个非命名参数视为文件名
      result.fileName = arg;
    }
  }

  return result;
}

/**
 * 显示使用帮助
 */
function showUsage() {
  console.log('用法: node upload_youtube.js <视频文件路径> [选项]');
  console.log('选项:');
  console.log('  --title <标题>            设置视频标题');
  console.log('  --description <描述>      设置视频描述');
  console.log('  --tags <标签1,标签2,...>  设置视频标签，以逗号分隔');
  console.log('  --privacy <状态>          设置视频隐私状态（public/private/unlisted）');
  console.log('  --playlist <播放列表ID>   指定要添加到的播放列表ID');
  console.log('  --category <类别ID>       设置视频类别，默认为22（人物和博客）');
  console.log('示例:');
  console.log('  node upload_youtube.js video.mp4 --title "我的视频" --privacy unlisted --playlist PLF3-N8-3XPFbMVSIJ57tctwjK1HN_37F8');
}

if (module === require.main) {
  // 解析命令行参数
  const { fileName, options } = parseCommandLineArgs();

  if (!fileName) {
    console.error('错误: 请提供视频文件路径');
    showUsage();
    process.exit(1);
  }

  if (!fs.existsSync(fileName)) {
    console.error(`错误: 视频文件不存在: ${fileName}`);
    process.exit(1);
  }

  console.log(`准备上传视频: ${fileName}`);
  console.log('上传选项:');
  console.log(`  标题: ${options.title}`);
  console.log(`  描述: ${options.description}`);
  console.log(`  标签: ${options.tags.join(', ')}`);
  console.log(`  隐私状态: ${options.privacyStatus}`);

  if (options.playlistId) {
    console.log(`  目标播放列表ID: ${options.playlistId}`);
  }

  uploadOneYoutubeVideo(fileName, options)
    .then(data => {
      console.log('全部操作完成!');
      console.log('视频ID:', data.id);
      console.log('视频标题:', data.snippet.title);
      console.log('视频链接:', `https://youtube.com/shorts/${data.id}`);
      if (options.playlistId) {
        console.log('播放列表链接:', `https://www.youtube.com/playlist?list=${options.playlistId}`);
      }
      rl.close();
    })
    .catch(error => {
      console.error('操作失败:', error.message);
      if (error.stack) console.error(error.stack);
      rl.close();
      process.exit(1);
    });
}

/**
 * 上传多个视频到YouTube
 * @param {Array<string>} videoFiles - 视频文件路径数组
 * @param {Object} options - 上传选项
 * @param {string} options.csvPath - CSV文件路径，用于读取视频标题和描述
 * @param {string} options.title - 视频标题
 * @param {string} options.description - 视频描述
 * @param {string} options.tags - 视频标签，逗号分隔
 * @param {string} options.privacy - 视频隐私状态
 * @param {string} options.playlistId - 播放列表ID
 * @returns {Promise<void>}
 */
async function uploadYoutubeVideos(browser, videoFiles, options = {}) {
  console.log('使用YouTube API上传视频...');

  // 读取CSV文件中的标题和描述信息
  const fs = require('fs');
  const path = require('path');
  const csvPath = options.csvPath || process.env.CSV_PATH;
  if (!csvPath) {
    throw new Error('CSV文件路径未提供');
  }

  try {
    for (const videoFile of videoFiles) {
      try {
        console.log(`正在上传视频: ${videoFile}`);

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
        // 解析csv文件中的标题和描述信息


        // 构建YouTube上传选项
        const youtubeOptions = {
          title: videoTitle || options.title || path.basename(videoFile, path.extname(videoFile)),
          description: description || options.description || '这是通过 YouTube API 上传的测试视频\n#Shorts',
          tags: options.tags ? (typeof options.tags === 'string' ? options.tags.split(',') : options.tags) : ['Shorts', 'Learn English', '中文'],
          privacyStatus: options.privacy || 'unlisted',
          playlistId: options.playlistId || process.env.YOUTUBE_PLAYLIST_ID
        };

        // 确保描述中包含 #Shorts 标签
        // if (!youtubeOptions.description.includes('#Shorts')) {
        //   youtubeOptions.description += '\n#Shorts';
        // }

        console.log('上传选项:', youtubeOptions);

        await uploadOneYoutubeVideo(videoFile, youtubeOptions);
        console.log(`视频 ${videoFile} 上传成功!`);

        // 归档视频文件
        const videoDir = path.dirname(videoFile);
        await archiveVideo(videoFile, videoDir);

        // 等待一下再继续下一个
        await delay(parseInt(process.env.DELAY_BETWEEN_UPLOADS || '5000'));

      } catch (error) {
        console.error(`视频 ${videoFile} 上传失败:`, error.message);

        // 检查是否为授权错误，如果是则立即退出程序
        if (error.message === 'invalid_grant' ||
          error.message.includes('auth') ||
          error.message.includes('认证') ||
          error.message.includes('授权') ||
          error.message.includes('token') ||
          error.message.includes('令牌')) {
          console.error('检测到授权错误，程序将立即退出');
          console.error('请删除 temp/youtube-token.json 文件后重试');
          if (rl) {
            rl.close();
          }
          process.exit(1);
        }
      }
    }

    // 正常执行完成时关闭 readline 接口
    if (rl) {
      rl.close();
      console.log('已关闭readline接口');
    }
  } catch (error) {
    console.error('上传过程中发生错误:', error);

    // 发生错误时也关闭 readline 接口
    if (rl) {
      rl.close();
      console.log('已关闭readline接口(错误处理)');
    }

    throw error;
  }
}

// 导出函数
module.exports = {
  uploadOneYoutubeVideo,
  addVideoToPlaylist,
  getAuthClient,
  checkPlaylistAccess,
  parseCommandLineArgs,
  uploadYoutubeVideos
};