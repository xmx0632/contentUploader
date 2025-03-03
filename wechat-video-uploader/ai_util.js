/**
 * ai_util.js - 简化版本，专门解决序列化问题
 * 该文件不依赖于外部函数和变量，只包含必要的功能
 */

const fs = require('fs');
const path = require('path');

// 全局变量定义
let _csvFilePath = '';

/**
 * 设置 CSV 文件路径
 * @param {string} filePath - CSV 文件的完整路径
 */
function setCsvFilePath(filePath) {
    _csvFilePath = filePath;
    try {
        // 确保目录存在
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        // 如果文件不存在，创建文件并写入表头
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, 'word,description\n');
        }
        console.log(`CSV 文件路径设置为: ${filePath}`);
    } catch (error) {
        console.error(`设置 CSV 文件路径出错: ${error.message}`);
    }
}

/**
 * 生成多个单词的翻译卡片
 * 该函数的简化版本，不依赖外部函数和变量
 * @param {string} words - 要翻译的单词，使用短横线(-)分隔
 * @returns {Promise<string>} - 合并后的卡片内容
 */
async function generateMultiWordDescription(words) {
    try {
        console.log('开始生成单词描述:', words);
        // 分割单词
        const wordList = words.split('-').map(w => w.trim()).filter(w => w);

        if (wordList.length === 0) {
            throw new Error('没有提供有效的单词');
        }

        // 加载缓存
        let cache = new Map();
        try {
            if (_csvFilePath && fs.existsSync(_csvFilePath)) {
                const data = fs.readFileSync(_csvFilePath, 'utf8');
                const lines = data.split('\n').slice(1); // 跳过标题行
                
                for (const line of lines) {
                    if (line.includes(',')) {
                        const [word, ...descParts] = line.split(',');
                        const description = descParts.join(','); // 重新组合可能包含逗号的描述
                        if (word && description) {
                            cache.set(word.toLowerCase(), description);
                        }
                    }
                }
            }
        } catch (e) {
            console.error('加载缓存出错:', e.message);
            // 出错时继续使用空缓存
        }

        // 处理所有单词
        const results = [];
        for (const word of wordList) {
            const lowerWord = word.toLowerCase();
            // 检查缓存
            if (cache.has(lowerWord)) {
                console.log(`Using cached description for word: ${word}`);
                results.push(cache.get(lowerWord));
            } else {
                results.push('');
            }
        }

        // 合并结果，添加分隔线和底部标签
        const combinedContent = results.join('\r\n\r\n');
        
        // 从 CSV 文件路径中提取语言信息
        let lang1 = '英语';
        let lang2 = '日语';
        
        // 检查文件名是否符合 content-msg-[语言1]2[语言2].csv 格式
        try {
            if (_csvFilePath) {
                const csvFileName = path.basename(_csvFilePath);
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
            }
        } catch (e) {
            console.error('解析文件名出错:', e.message);
            // 出错时使用默认语言
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