const path = require('path');
const fs = require('fs');
const mockFs = require('mock-fs');
const { archiveVideo } = require('../upload_common');

// 模拟日期
const mockDate = new Date('2023-05-15');
const realDate = Date;

describe('archiveVideo 函数测试', () => {
    beforeEach(() => {
        // 模拟文件系统
        mockFs({
            'test/videos': {
                'test-video.mp4': Buffer.from('测试视频内容'),
                '20230510': {
                    'old-video1.mp4': Buffer.from('旧视频1内容'),
                    'old-video2.mp4': Buffer.from('旧视频2内容')
                },
                '20230512': {
                    'old-video3.mp4': Buffer.from('旧视频3内容')
                }
            }
        });

        // 模拟日期
        global.Date = class extends Date {
            constructor() {
                return mockDate;
            }
        };
        global.Date.now = () => mockDate.getTime();
    });

    afterEach(() => {
        // 恢复文件系统
        mockFs.restore();
        // 恢复日期
        global.Date = realDate;
    });

    test('应该将视频文件移动到日期目录并创建CSV记录', async () => {
        const videoFile = 'test/videos/test-video.mp4';
        const baseDir = 'test/videos';

        // 执行归档函数
        const result = await archiveVideo(videoFile, baseDir);

        // 验证文件是否被移动到正确的日期目录
        const expectedPath = 'test/videos/20230515/test-video.mp4';
        expect(result).toBe(expectedPath);
        expect(fs.existsSync(expectedPath)).toBe(true);
        expect(fs.existsSync(videoFile)).toBe(false);

        // 验证CSV文件是否被创建并包含正确的内容
        const csvPath = 'test/videos/0-released.csv';
        expect(fs.existsSync(csvPath)).toBe(true);

        const csvContent = fs.readFileSync(csvPath, 'utf8');
        expect(csvContent).toContain('20230510/old-video1.mp4');
        expect(csvContent).toContain('20230510/old-video2.mp4');
        expect(csvContent).toContain('20230512/old-video3.mp4');
        expect(csvContent).toContain('20230515/test-video.mp4');
    });

    test('应该在CSV文件已存在时追加记录', async () => {
        // 先创建CSV文件
        const csvPath = 'test/videos/0-released.csv';
        fs.writeFileSync(csvPath, '已有记录1\n已有记录2\n');

        const videoFile = 'test/videos/test-video.mp4';
        const baseDir = 'test/videos';

        // 执行归档函数
        await archiveVideo(videoFile, baseDir);

        // 验证CSV文件是否被正确追加
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        expect(csvContent).toBe('已有记录1\n已有记录2\n20230515/test-video.mp4\n');
    });

    test('应该处理文件系统错误', async () => {
        // 模拟一个只读目录
        mockFs.restore();
        mockFs({
            'test/readonly': mockFs.directory({
                mode: 0o444,  // 只读权限
                items: {
                    'test-video.mp4': Buffer.from('测试视频内容')
                }
            })
        });

        const videoFile = 'test/readonly/test-video.mp4';
        const baseDir = 'tests/readonly';

        // 执行归档函数应该抛出错误
        await expect(archiveVideo(videoFile, baseDir)).rejects.toThrow();
    });
});