// 自动生成归档指定模块下文件上传记录，并归档已上传的视频到指定目录
// 需要把 "/Users/xmx0632/aivideo/dist/videos/[模块名]/[视频种类]" 目录下这种日期格式的子目录下的视频文件
// 比如： "/Users/xmx0632/aivideo/dist/videos/douyin/fixed-zh-zh" 
// 按照 #upload_common.js中 archiveVideo 函数的方式写入记录追加到归档文件 
// "/Users/xmx0632/aivideo/dist/videos/douyin/fixed-zh-zh/0-released.csv" 中，如果文件不存在则新建文件再写入，
// 然后把已上传的视频文件复制到 "/Users/xmx0632/aivideo/dist/fixed-zh-zh" 目录下，fixed-zh-zh是视频种类目录。
// 如果是  "/Users/xmx0632/aivideo/dist/videos/kuaishou/fixed-zh-zh",则写入记录追加到归档文件 
// "/Users/xmx0632/aivideo/dist/videos/kuaishou/fixed-zh-zh/0-released.csv" 中，
// 然后把已上传的视频文件复制到 "/Users/xmx0632/aivideo/dist/fixed-zh-zh" 目录下

const fs = require('fs');
const path = require('path');

// 基础目录
const BASE_DIR = '/Users/xmx0632/aivideo/dist';
const VIDEOS_DIR = path.join(BASE_DIR, 'videos');

/**
 * 检查字符串是否符合日期格式（YYYYMMDD）
 * @param {string} str - 要检查的字符串
 * @returns {boolean} - 是否符合日期格式
 */
function isDateFormat(str) {
    return /^\d{8}$/.test(str);
}

/**
 * 归档视频文件
 * @param {string} sourcePath - 源文件路径
 * @param {string} targetPath - 目标文件路径
 * @param {string} csvPath - CSV记录文件路径
 * @param {string} recordLine - 要添加的记录行
 */
function archiveVideo(sourcePath, targetPath, csvPath, recordLine) {
    try {
        // 确保目标目录存在
        const targetDir = path.dirname(targetPath);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        // 复制文件
        console.log(`复制文件: ${sourcePath} 到 ${targetPath}`);
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`完成: 文件已复制到: ${targetPath}`);

        // 更新CSV记录
        if (!fs.existsSync(csvPath)) {
            // 如果CSV文件不存在，创建它
            console.log(`CSV文件不存在，创建新文件: ${csvPath}`);
            fs.writeFileSync(csvPath, recordLine);
            console.log(`创建记录文件并写入记录: ${csvPath}`);
        } else {
            // 检查是否已存在相同的记录
            const existingContent = fs.readFileSync(csvPath, 'utf8');
            if (!existingContent.includes(recordLine.trim())) {
                // 如果文件存在且不包含相同记录，则追加记录
                fs.appendFileSync(csvPath, recordLine);
                console.log(`更新记录文件: ${csvPath}`);
            } else {
                console.log(`记录已存在，跳过写入: ${recordLine.trim()}`);
            }
        }
    } catch (error) {
        console.error(`归档视频文件时出错:`, error);
    }
}

/**
 * 处理指定模块和视频种类的归档
 * @param {string} moduleName - 模块名称（如douyin, kuaishou）
 * @param {string} videoType - 视频类型（如fixed-zh-zh）
 */
function processModuleArchive(moduleName, videoType) {
    const moduleDir = path.join(VIDEOS_DIR, moduleName, videoType);
    const targetBaseDir = path.join(BASE_DIR, videoType);
    const csvPath = path.join(moduleDir, '0-released.csv');

    console.log(`处理模块: ${moduleName}, 视频类型: ${videoType}`);
    console.log(`模块目录: ${moduleDir}`);
    console.log(`目标基础目录: ${targetBaseDir}`);
    console.log(`CSV记录文件: ${csvPath}`);

    // 确保目标目录存在
    if (!fs.existsSync(targetBaseDir)) {
        fs.mkdirSync(targetBaseDir, { recursive: true });
        console.log(`创建目标目录: ${targetBaseDir}`);
    }

    // 检查模块目录是否存在
    if (!fs.existsSync(moduleDir)) {
        console.log(`模块目录不存在: ${moduleDir}`);
        return;
    }

    // 读取模块目录下的所有子目录
    const subDirs = fs.readdirSync(moduleDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory() && isDateFormat(dirent.name))
        .map(dirent => dirent.name);

    console.log(`找到日期格式子目录: ${subDirs.join(', ') || '无'}`);

    // 如果没有找到日期格式的子目录，检查是否存在CSV文件，如果不存在则创建
    if (subDirs.length === 0) {
        console.log(`没有找到日期格式的子目录，检查CSV文件是否存在`);
        if (!fs.existsSync(csvPath)) {
            console.log(`CSV文件不存在，创建新文件: ${csvPath}`);
            fs.writeFileSync(csvPath, '\n');
            console.log(`创建空的记录文件: ${csvPath}`);
        } else {
            console.log(`CSV文件已存在: ${csvPath}`);
        }
    }

    // 处理每个日期子目录
    for (const dateDir of subDirs) {
        const dateDirPath = path.join(moduleDir, dateDir);
        console.log(`处理日期目录: ${dateDirPath}`);

        // 读取日期目录下的所有视频文件
        const videoFiles = fs.readdirSync(dateDirPath)
            .filter(file => ['.mp4', '.mov'].includes(path.extname(file).toLowerCase()));

        console.log(`找到视频文件: ${videoFiles.join(', ')}`);

        // 处理每个视频文件
        for (const videoFile of videoFiles) {
            const sourcePath = path.join(dateDirPath, videoFile);
            const targetPath = path.join(targetBaseDir, videoFile);
            const recordLine = `${dateDir}/${videoFile}\n`;

            console.log(`归档视频文件: ${sourcePath}`);
            archiveVideo(sourcePath, targetPath, csvPath, recordLine);
        }
    }
}

/**
 * 主函数
 */
function main() {
    // 检查videos目录是否存在
    if (!fs.existsSync(VIDEOS_DIR)) {
        console.error(`视频基础目录不存在: ${VIDEOS_DIR}`);
        return;
    }

    // 读取videos目录下的所有模块目录
    // 只处理douyin模块
    // const modules = ['douyin'];
    const modules = fs.readdirSync(VIDEOS_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    console.log(`找到模块: ${modules.join(', ')}`);

    // 处理每个模块
    for (const moduleName of modules) {
        const moduleDir = path.join(VIDEOS_DIR, moduleName);

        // 读取模块目录下的所有视频类型目录
        const videoTypes = fs.readdirSync(moduleDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        console.log(`模块 ${moduleName} 下找到视频类型: ${videoTypes.join(', ')}`);

        // 处理每个视频类型
        for (const videoType of videoTypes) {
            processModuleArchive(moduleName, videoType);
        }
    }

    console.log('归档处理完成');
}

// 执行主函数
main();




