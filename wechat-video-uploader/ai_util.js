const axios = require('axios');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// 默认的CSV文件路径
let csvFilePath = path.join(__dirname, 'content-msg.csv');
// content-msg-en2zh.csv

/**
 * 设置CSV文件路径
 * @param {string} filePath - CSV文件的完整路径
 */
function setCsvFilePath(filePath) {
    csvFilePath = filePath;
    // 确保目录存在
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    // 如果文件不存在，创建文件并写入表头
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, 'word,description\n');
    }
}

// Configuration
const API_WAIT_TIME = 15;  // API wait time in seconds
const MAX_RETRIES = 3;    // Maximum retry attempts
const RETRY_WAIT_TIME = 20;  // Retry wait time in seconds

/**
 * 调用 AI API 的基础函数
 * @param {string} prompt - 提示词
 * @returns {Promise<string>} - AI 响应内容
 */
async function callAIAPI(prompt) {
    let retries = 0;
    while (retries < MAX_RETRIES) {
        try {
            const apiKey = process.env.SILICONFLOW_API_KEY;
            if (!apiKey) {
                throw new Error('API key not found in environment variables');
            }

            const payload = {
                model: "deepseek-ai/DeepSeek-V2.5",
                messages: [{ role: "user", content: prompt }],
                stream: false,
                max_tokens: 512,
                stop: ["null"],
                temperature: 0.7,
                top_p: 0.7,
                top_k: 50,
                frequency_penalty: 0.5,
                n: 1,
                response_format: { type: "text" }
            };

            const headers = {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            };

            const response = await axios.post(
                process.env.SILICONFLOW_CHAT_API_URL,
                payload,
                { headers }
            );

            const result = response.data;
            const content = result.choices?.[0]?.message?.content?.trim();

            await new Promise(resolve => setTimeout(resolve, API_WAIT_TIME * 1000));

            if (!content) {
                throw new Error('No content generated');
            }

            return content;

        } catch (error) {
            retries++;
            if (retries < MAX_RETRIES) {
                console.warn(`API call failed (attempt ${retries}/${MAX_RETRIES}): ${error.message}`);
                console.log(`Waiting ${RETRY_WAIT_TIME} seconds before retrying...`);
                await new Promise(resolve => setTimeout(resolve, RETRY_WAIT_TIME * 1000));
            } else {
                throw error;
            }
        }
    }
}

/**
 * 生成多个单词的翻译卡片
 * @param {string} words - 要翻译的单词，使用短横线(-)分隔
 * @returns {Promise<string>} - 合并后的卡片内容
 */
/**
 * 从CSV文件中读取单词描述缓存
 * @returns {Promise<Map<string, string>>} 单词到描述的映射
 */
async function loadWordCache() {
    const cache = new Map();

    if (!fs.existsSync(csvFilePath)) {
        return cache;
    }

    return new Promise((resolve, reject) => {
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (row) => {
                if (row.word && row.description) {
                    cache.set(row.word.toLowerCase(), row.description);
                }
            })
            .on('end', () => resolve(cache))
            .on('error', reject);
    });
}

/**
 * 将新的单词描述保存到CSV文件
 * @param {string} word - 单词
 * @param {string} description - 描述信息
 */
async function saveWordToCache(word, description) {
    const csvWriter = createCsvWriter({
        path: csvFilePath,
        header: [
            {id: 'word', title: 'word'},
            {id: 'description', title: 'description'}
        ],
        append: true
    });

    await csvWriter.writeRecords([{
        word: word.toLowerCase(),
        description: description
    }]);
}

async function generateMultiWordDescription(words) {
    try {
        // 分割单词
        const wordList = words.split('-').map(w => w.trim()).filter(w => w);

        if (wordList.length === 0) {
            throw new Error('没有提供有效的单词');
        }

        // 加载缓存
        const cache = await loadWordCache();

        // 并行处理所有单词
        const results = await Promise.all(wordList.map(async word => {
            const lowerWord = word.toLowerCase();
            // 检查缓存
            if (cache.has(lowerWord)) {
                console.log(`Using cached description for word: ${word}`);
                return cache.get(lowerWord);
            }

            return '';

            // // 如果缓存中没有，调用API生成描述
            // const prompt = `
            // 你是精通中文、日语、英语的老师。
            // 根据输入的英语单词，给出英语单词的音标和日本单词音标和日语翻译，给出中文意思。
            // 不要额外增加其他单词的内容。
            // 返回格式：

            // ✨ ${word}
            // 🍑: /英文音标/  
            // 🌸: 日语平假名
            // 🀄️:  中文
            // `;

            // const description = await callAIAPI(prompt);
            
            // // 保存到缓存
            // await saveWordToCache(word, description);
            
            // return description;
        }));

        // 合并结果，添加分隔线和底部标签
        const combinedContent = results.join('\r\n\r\n');
        
        // 从CSV文件路径中提取语言信息
        let lang1 = '英语';
        let lang2 = '日语';
        
        // 检查文件名是否符合 content-msg-[语言1]2[语言2].csv 格式
        const csvFileName = path.basename(csvFilePath);
        const langMatch = csvFileName.match(/content-msg-([a-z]+)2([a-z]+)\.csv/);
        
        if (langMatch && langMatch.length === 3) {
            // 根据文件名中的语言代码设置语言标签
            const langMap = {
                'en': '英语',
                'zh': '中文',
                'jp': '日语',
                'fr': '法语',
                'de': '德语',
                'es': '西班牙语',
                'it': '意大利语',
                'ru': '俄语',
                'ko': '韩语'
                // 可以根据需要添加更多语言映射
            };
            
            lang1 = langMap[langMatch[1]] || langMatch[1];
            lang2 = langMap[langMatch[2]] || langMatch[2];
        }
        
        const tags = `#${lang1} #${lang2} ${wordList.map(w => `#${w}`).join(' ')}`;

        return combinedContent + '\r\n\r\n' + tags;

    } catch (error) {
        console.error(`Error generating multiple word descriptions: ${error.message}`);
        return `错误: 无法生成单词卡片 - ${error.message}`;
    }
}

module.exports = {
    generateMultiWordDescription,
    setCsvFilePath
};

// 测试代码
async function test() {
    try {
        console.log('\n' + '='.repeat(50));

        // 测试不同的CSV文件名称
        const testCases = [
            'content-msg.csv',            // 默认文件名
            'content-msg-en2zh.csv',      // 英语到中文
            'content-msg-jp2en.csv',      // 日语到英语
            'content-msg-fr2de.csv',      // 法语到德语
            'content-msg-abc2xyz.csv'     // 未知语言代码
        ];
        
        // 测试标签生成函数
        function testTagGeneration(csvFileName, wordList) {
            // 从CSV文件路径中提取语言信息
            let lang1 = '英语';
            let lang2 = '日语';
            
            // 检查文件名是否符合 content-msg-[语言1]2[语言2].csv 格式
            const langMatch = csvFileName.match(/content-msg-([a-z]+)2([a-z]+)\.csv/);
            
            if (langMatch && langMatch.length === 3) {
                // 根据文件名中的语言代码设置语言标签
                const langMap = {
                    'en': '英语',
                    'zh': '中文',
                    'jp': '日语',
                    'fr': '法语',
                    'de': '德语',
                    'es': '西班牙语',
                    'it': '意大利语',
                    'ru': '俄语',
                    'ko': '韩语'
                };
                
                lang1 = langMap[langMatch[1]] || langMatch[1];
                lang2 = langMap[langMatch[2]] || langMatch[2];
            }
            
            return `#${lang1} #${lang2} ${wordList.map(w => `#${w}`).join(' ')}`;
        }
        
        const wordList = ['apple', 'banana'];
        
        for (const testCase of testCases) {
            console.log('\n' + '='.repeat(50));
            console.log(`\n=== 测试文件名: ${testCase} ===`);
            
            // 生成标签
            const tags = testTagGeneration(testCase, wordList);
            console.log('\n生成的标签:');
            console.log(tags);
        }
    } catch (error) {
        console.error('\n错误:', error.message);
    }
}

// 运行测试
// test();