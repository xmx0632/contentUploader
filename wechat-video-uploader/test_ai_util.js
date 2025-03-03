/**
 * ai_util.js 的测试文件
 * 用于测试 ai_util.js 中的功能
 */

const { generateMultiWordDescription, setCsvFilePath } = require('./ai_util.js');
const path = require('path');

/**
 * 测试标签生成功能
 */
async function testTagGeneration() {
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
        function extractLanguageTags(csvFileName, wordList) {
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
            
            // 设置测试CSV文件路径
            const testCsvPath = path.join(__dirname, testCase);
            setCsvFilePath(testCsvPath);
            
            // 生成标签
            const tags = extractLanguageTags(testCase, wordList);
            console.log('\n生成的标签:');
            console.log(tags);
        }
    } catch (error) {
        console.error('\n错误:', error.message);
    }
}

/**
 * 测试多词描述生成功能
 */
async function testMultiWordDescription() {
    try {
        console.log('\n' + '='.repeat(50));
        console.log('\n=== 测试多词描述生成 ===');
        
        // 设置测试CSV文件路径
        const testCsvPath = path.join(__dirname, 'test-content-msg.csv');
        setCsvFilePath(testCsvPath);
        
        // 测试单词
        const testWords = 'apple-banana';
        
        // 生成描述
        const description = await generateMultiWordDescription(testWords);
        console.log('\n生成的描述:');
        console.log(description);
    } catch (error) {
        console.error('\n错误:', error.message);
    }
}

/**
 * 运行所有测试
 */
async function runAllTests() {
    console.log('\n=== 开始运行测试 ===\n');
    
    await testTagGeneration();
    await testMultiWordDescription();
    
    console.log('\n=== 测试完成 ===\n');
}

// 运行所有测试
if (require.main === module) {
    runAllTests();
}

// 导出测试函数，以便其他测试文件可以使用
module.exports = {
    testTagGeneration,
    testMultiWordDescription,
    runAllTests
};
