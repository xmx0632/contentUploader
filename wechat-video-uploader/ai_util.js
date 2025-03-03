const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// 默认的CSV文件路径
let csvFilePath = path.join(__dirname, 'content-msg.csv');

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
