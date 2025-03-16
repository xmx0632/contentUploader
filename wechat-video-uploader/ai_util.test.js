const { generateMultiWordDescription, setCsvFilePath } = require('./ai_util');
const path = require('path');
const fs = require('fs');

describe('ai_util 模块测试', () => {
    let testCsvPath;

    beforeEach(() => {
        // 设置测试CSV文件路径
        testCsvPath = path.join(__dirname, 'test-content-msg.csv');
        setCsvFilePath(testCsvPath);

        // 准备测试数据
        fs.writeFileSync(testCsvPath, 'word,description\n');
        fs.appendFileSync(testCsvPath, '1-poem-test,"测试诗词描述"\n');
        fs.appendFileSync(testCsvPath, 'internet,"✨ internet\n🍑: /ˈɪntərˌnɛt/\n🌸: 互联网\n🀄️: 互联网\n"\n');
    });

    afterEach(() => {
        // 清理测试文件
        if (fs.existsSync(testCsvPath)) {
            fs.unlinkSync(testCsvPath);
        }
    });

    test('普通单词应该生成正确的标签信息', async () => {
        // 测试用例1: 检查普通单词的tags信息
        const words1 = 'hello-world';
        const expectedTags1 = '#英语 #日语 #hello #world';
        const result1 = await generateMultiWordDescription(words1);
        expect(result1).toContain(expectedTags1);
    });

    test('诗词文件应该生成正确的标签信息', async () => {
        // 测试用例2: 检查诗词文件的tags信息
        const words2 = '1-poem-test';
        const expectedTags2 = '#古诗词 #粤语';
        const result2 = await generateMultiWordDescription(words2);
        expect(result2).toContain(expectedTags2);
    });

    test('从缓存文件读取单词应该生成正确的标签信息', async () => {
        // 测试用例3: 检查从缓存文件读取单词的tags信息
        const words3 = 'internet';
        const expectedTags3 = '#英语 #日语 #internet';
        const result3 = await generateMultiWordDescription(words3);
        expect(result3).toContain(expectedTags3);
    });
});