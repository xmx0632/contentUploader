const axios = require('axios');
require('dotenv').config();

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
async function generateMultiWordDescription(words) {
    try {
        // 分割单词
        const wordList = words.split('-').map(w => w.trim()).filter(w => w);
        
        if (wordList.length === 0) {
            throw new Error('没有提供有效的单词');
        }

        // 并行处理所有单词
        const results = await Promise.all(wordList.map(async word => {
            const prompt = `
            你是一位中国人，而且是一个经验丰富的日语老师，负责教授美国同学日语。
            根据输入的英语单词，给出英语单词的音标和日本单词音标和日语翻译，给出中文意思。
            不要额外增加其他单词的内容。
            返回格式：

            ✨ ${word}
            🍑: /英文音标/  
            🌸: 日语平假名
            🀄️:  中文
            `;

            return await callAIAPI(prompt);
        }));

        // 合并结果，添加分隔线和底部标签
        const combinedContent = results.join('\n\n');
        const tags = `#英语 #日语 ${wordList.map(w => `#${w}`).join(' ')}`;

        return combinedContent + '\n\n' + tags;

    } catch (error) {
        console.error(`Error generating multiple word descriptions: ${error.message}`);
        return `错误: 无法生成单词卡片 - ${error.message}`;
    }
}

module.exports = {
    generateMultiWordDescription
};

// 测试代码
async function test() {
    try {

        console.log('\n' + '='.repeat(50));

        console.log('\n=== 测试多个单词 ===');
        const multiWords = 'apple-banana-cat-stone';
        console.log(`\n正在处理单词组: ${multiWords}`);
        const multiResult = await generateMultiWordDescription(multiWords);
        console.log('\n结果:');
        console.log(multiResult);
        

    } catch (error) {
        console.error('\n错误:', error.message);
    }
}

// 运行测试
// test();