const fs = require('fs');
const path = require('path');
const { archiveVideo } = require('../upload_common');

// 创建临时测试目录
const TEST_DIR = path.join(__dirname, 'test_temp');
const SOURCE_DIR = path.join(TEST_DIR, 'source');
const TARGET_DIR = path.join(TEST_DIR, 'target');

// 测试辅助函数
function setupTestEnvironment() {
    // 创建测试目录
    if (!fs.existsSync(TEST_DIR)) {
        fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    if (!fs.existsSync(SOURCE_DIR)) {
        fs.mkdirSync(SOURCE_DIR, { recursive: true });
    }
    if (!fs.existsSync(TARGET_DIR)) {
        fs.mkdirSync(TARGET_DIR, { recursive: true });
    }

    // 创建测试视频文件
    const testVideoPath = path.join(SOURCE_DIR, 'test_video.mp4');
    fs.writeFileSync(testVideoPath, 'test video content');

    return testVideoPath;
}

function cleanupTestEnvironment() {
    // 递归删除目录
    if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
}

// 测试：创建新的CSV文件
async function testCreateNewCsv() {
    console.log('测试：创建新的CSV文件');
    const testVideoPath = setupTestEnvironment();
    
    try {
        await archiveVideo(testVideoPath, TARGET_DIR);
        
        // 检查CSV文件是否创建
        const csvPath = path.join(SOURCE_DIR, '0-released.csv');
        if (!fs.existsSync(csvPath)) {
            throw new Error('CSV文件未创建');
        }
        
        // 检查CSV内容
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        const lines = csvContent.trim().split('\n');
        
        // 验证格式：应该包含文件路径和时间戳
        for (const line of lines) {
            const parts = line.split(',');
            if (parts.length !== 2) {
                throw new Error(`CSV行格式不正确: ${line}`);
            }
            
            // 检查第二列是否为时间戳（如果有）
            if (parts[1] && !/^\d{14}$/.test(parts[1])) {
                throw new Error(`时间戳格式不正确: ${parts[1]}`);
            }
        }
        
        console.log('测试通过：成功创建新的CSV文件');
    } catch (error) {
        console.error('测试失败:', error);
        throw error;
    } finally {
        cleanupTestEnvironment();
    }
}

// 测试：更新现有的CSV文件（无时间戳列）
async function testUpdateExistingCsvWithoutTimestamp() {
    console.log('测试：更新现有的CSV文件（无时间戳列）');
    const testVideoPath = setupTestEnvironment();
    
    try {
        // 创建一个没有时间戳列的CSV文件
        const csvPath = path.join(SOURCE_DIR, '0-released.csv');
        fs.writeFileSync(csvPath, '20230101/old_video.mp4\n');
        
        await archiveVideo(testVideoPath, TARGET_DIR);
        
        // 检查CSV内容
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        const lines = csvContent.trim().split('\n');
        
        // 验证格式：第一行应该被更新为包含默认时间戳，第二行应该包含实际时间戳
        if (lines.length !== 2) {
            throw new Error(`CSV行数不正确: ${lines.length}`);
        }
        
        const firstLineParts = lines[0].split(',');
        if (firstLineParts.length !== 2) {
            throw new Error(`第一行格式不正确: ${lines[0]}`);
        }
        
        if (firstLineParts[1] !== '20250101010101') {
            throw new Error(`第一行默认时间戳不正确: ${firstLineParts[1]}`);
        }
        
        const secondLineParts = lines[1].split(',');
        if (secondLineParts.length !== 2) {
            throw new Error(`第二行格式不正确: ${lines[1]}`);
        }
        
        if (!/^\d{14}$/.test(secondLineParts[1])) {
            throw new Error(`第二行时间戳格式不正确: ${secondLineParts[1]}`);
        }
        
        console.log('测试通过：成功更新现有的CSV文件');
    } catch (error) {
        console.error('测试失败:', error);
        throw error;
    } finally {
        cleanupTestEnvironment();
    }
}

// 测试：创建新的CSV文件
async function testCreateNewCsv() {
    console.log('测试：创建新的CSV文件');
    const testVideoPath = setupTestEnvironment();
    
    // 创建一个日期目录和测试文件，模拟已有上传
    const dateDir = path.join(TARGET_DIR, '20230101');
    if (!fs.existsSync(dateDir)) {
        fs.mkdirSync(dateDir, { recursive: true });
    }
    fs.writeFileSync(path.join(dateDir, 'existing_video.mp4'), 'test content');
    
    try {
        await archiveVideo(testVideoPath, TARGET_DIR);
        
        // 检查CSV文件是否创建
        const csvPath = path.join(SOURCE_DIR, '0-released.csv');
        if (!fs.existsSync(csvPath)) {
            throw new Error('CSV文件未创建');
        }
        
        // 检查CSV内容
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        const lines = csvContent.trim().split('\n');
        
        // 验证格式：应该包含文件路径和时间戳
        for (const line of lines) {
            const parts = line.split(',');
            if (parts.length !== 2) {
                throw new Error(`CSV行格式不正确: ${line}`);
            }
            
            // 检查第二列是否为时间戳
            if (!/^\d{14}$/.test(parts[1])) {
                throw new Error(`时间戳格式不正确: ${parts[1]}`);
            }
            
            // 检查已有文件是否使用默认时间戳
            if (parts[0].includes('existing_video.mp4') && parts[1] !== '20250101010101') {
                throw new Error(`已有文件未使用默认时间戳: ${parts[1]}`);
            }
        }
        
        console.log('测试通过：成功创建新的CSV文件');
    } catch (error) {
        console.error('测试失败:', error);
        throw error;
    } finally {
        cleanupTestEnvironment();
    }
}

// 测试：更新现有的CSV文件（已有时间戳列）
async function testUpdateExistingCsvWithTimestamp() {
    console.log('测试：更新现有的CSV文件（已有时间戳列）');
    const testVideoPath = setupTestEnvironment();
    
    try {
        // 创建一个已有时间戳列的CSV文件
        const csvPath = path.join(SOURCE_DIR, '0-released.csv');
        fs.writeFileSync(csvPath, '20230101/old_video.mp4,20230101120000\n');
        
        await archiveVideo(testVideoPath, TARGET_DIR);
        
        // 检查CSV内容
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        const lines = csvContent.trim().split('\n');
        
        // 验证格式：应该有两行，都包含时间戳
        if (lines.length !== 2) {
            throw new Error(`CSV行数不正确: ${lines.length}`);
        }
        
        for (const line of lines) {
            const parts = line.split(',');
            if (parts.length !== 2) {
                throw new Error(`CSV行格式不正确: ${line}`);
            }
            
            if (parts[1] && !/^\d{14}$/.test(parts[1]) && parts[1] !== '') {
                throw new Error(`时间戳格式不正确: ${parts[1]}`);
            }
        }
        
        console.log('测试通过：成功更新已有时间戳的CSV文件');
    } catch (error) {
        console.error('测试失败:', error);
        throw error;
    } finally {
        cleanupTestEnvironment();
    }
}

// 运行所有测试
async function runTests() {
    try {
        await testCreateNewCsv();
        await testUpdateExistingCsvWithoutTimestamp();
        await testUpdateExistingCsvWithTimestamp();
        console.log('所有测试通过！');
    } catch (error) {
        console.error('测试失败:', error);
        process.exit(1);
    }
}

// 执行测试
runTests();