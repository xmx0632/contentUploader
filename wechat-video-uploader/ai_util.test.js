const { generateMultiWordDescription, setCsvFilePath } = require('./ai_util');
const path = require('path');
const fs = require('fs');

// 测试生成多个单词的描述信息
async function testGenerateMultiWordDescription() {
    // 设置测试CSV文件路径
    const testCsvPath = path.join(__dirname, 'test-content-msg.csv');
    setCsvFilePath(testCsvPath);

    // 准备测试数据
    fs.writeFileSync(testCsvPath, 'word,description\n');
    fs.appendFileSync(testCsvPath, '1-poem-test,"测试诗词描述"\n');
    fs.appendFileSync(testCsvPath, 'internet,"✨ internet\n🍑: /ˈɪntərˌnɛt/\n🌸: 互联网\n🀄️: 互联网\n"\n');

    try {
        // 测试用例1: 检查普通单词的tags信息
        const words1 = 'hello-world';
        const expectedTags1 = '#英语 #日语 #hello #world';
        const result1 = await generateMultiWordDescription(words1);
        if (!result1.includes(expectedTags1)) {
            console.error(`测试失败: 未找到预期的tags信息: ${expectedTags1}`);
        } else {
            console.log('测试通过: 普通单词的tags信息正确');
        }

        // 测试用例2: 检查诗词文件的tags信息
        const words2 = '1-poem-test';
        const expectedTags2 = '#古诗词 #粤语';
        const result2 = await generateMultiWordDescription(words2);
        if (!result2.includes(expectedTags2)) {
            console.error(`测试失败: 未找到预期的tags信息: ${expectedTags2}`);
        } else {
            console.log('测试通过: 诗词文件的tags信息正确');
        }

        // 测试用例3: 检查从缓存文件读取单词的tags信息
        const words3 = 'internet';
        const expectedTags3 = '#英语 #日语 #internet';
        const result3 = await generateMultiWordDescription(words3);
        if (!result3.includes(expectedTags3)) {
            console.error(`测试失败: 未找到预期的tags信息: ${expectedTags3}`);
        } else {
            console.log('测试通过: 缓存单词的tags信息正确');
        }
    } finally {
        // 清理测试文件
        fs.unlinkSync(testCsvPath);
    }
}

testGenerateMultiWordDescription();