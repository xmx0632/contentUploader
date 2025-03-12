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
        console.log(`CSV文件不存在: ${csvFilePath}`);
        return cache;
    }

    console.log(`正在从CSV文件加载数据: ${csvFilePath}`);
    return new Promise((resolve, reject) => {
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (row) => {
                if (row.word && row.description) {
                    cache.set(row.word.toLowerCase(), row.description);
                    console.log(`已加载单词: ${row.word}`);
                } else {
                    console.log(`警告: CSV行缺少word或description字段: ${JSON.stringify(row)}`);
                }
            })
            .on('end', () => {
                console.log(`CSV文件加载完成，共加载 ${cache.size} 个单词`);
                resolve(cache);
            })
            .on('error', (err) => {
                console.error(`CSV文件加载错误: ${err.message}`);
                reject(err);
            });
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
        console.log(`生成描述，输入: ${words}，使用CSV文件: ${csvFilePath}`);

        // 检查是否是 1-poem- 开头的文件
        const isPoemFile = words.startsWith('1-poem-');

        // 如果是 1-poem- 开头的文件，直接使用整个字符串作为 key
        const searchKey = isPoemFile ? words : words.split('-').map(w => w.trim()).filter(w => w).join('-');

        // 加载缓存
        const cache = await loadWordCache();
        console.log(`缓存加载完成，包含 ${cache.size} 个单词`);

        // 查找描述
        if (cache.has(searchKey.toLowerCase())) {
            console.log(`找到单词 "${searchKey}" 的缓存描述`);
            const description = cache.get(searchKey.toLowerCase());
            // 如果是诗词文件，添加额外的标签
            if (isPoemFile) {
                return description + '\r\n\r\n#古诗词 #粤语';
            }
            return description;
        }

        // 如果是 1-poem 文件但未找到描述，直接返回空
        if (isPoemFile) {
            console.log(`警告: 未找到诗词文件 "${searchKey}" 的描述`);
            return '';
        }

        // 对于非 1-poem 文件，保持原有逻辑
        const wordList = words.split('-').map(w => w.trim()).filter(w => w);
        const results = await Promise.all(wordList.map(async word => {
            const lowerWord = word.toLowerCase();
            if (cache.has(lowerWord)) {
                return cache.get(lowerWord);
            }
            return '';
        }));

        // 合并结果，添加分隔线和底部标签
        const combinedContent = results.join('\r\n\r\n');

        // 从CSV文件路径中提取语言信息
        let lang1 = '英语';
        let lang2 = '日语';
        const csvFileName = path.basename(csvFilePath);
        const langMatch = csvFileName.match(/(?:poem-)?content-msg-([a-z]+)2([a-z]+)\.csv/);

        if (langMatch && langMatch.length === 3) {
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
