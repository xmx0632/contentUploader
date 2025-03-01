# Git Commit Log

docs(git): 初始化git commit log追踪文件
- 添加gitlog.md文件用于追踪代码变更记录
- 遵循commit message规范：type(scope): subject

feat(cache): 为单词描述生成添加本地缓存
- 在ai_util.js中添加本地缓存支持
- 创建content-msg.csv文件用于存储单词描述缓存
- 修改generateMultiWordDescription函数，实现缓存读写
- 添加loadWordCache和saveWordToCache函数

feat(config): 支持自定义CSV文件路径
- 添加setCsvFilePath函数用于设置CSV文件路径
- 在main.js中支持--csv参数指定CSV文件路径
- 修改parseCommandLineArgs函数以支持新参数

docs(readme): 更新文档以支持新功能
- 添加单词描述缓存功能说明
- 添加命令行参数详细说明
- 添加缓存机制的完整文档
- 更新主要功能列表

build(deps): 添加CSV相关依赖
- 添加csv-parser@3.0.0用于读取CSV文件
- 添加csv-writer@1.6.0用于写入CSV文件
- 更新pkg.assets以包含新依赖

feat(config): 支持从.env文件读取CSV路径
- 添加CSV_PATH环境变量支持
- 实现三级配置优先级：命令行 > 环境变量 > 默认路径
- 添加配置路径来源的日志输出

fix(main): 修复缺少path模块导入的问题
- 在main.js中添加path模块的导入
- 修复使用path.resolve时的报错

fix(kuaishou): 优化快手封面选择器识别方式
- 修改upload_kuaishou.js中的封面选择逻辑，使用动态识别方式
- 添加自动识别以_recommend-cover-item_开头的选择器功能
- 增加选择器识别失败时的备用方案
- 创建kuaishou-update.md文档记录更新内容

feat(tags): 从 CSV 文件名中提取语言标签
- 修改 ai_util.js 中的 generateMultiWordDescription 函数
- 添加从文件名中提取语言信息的功能
- 支持 content-msg-[语言1]2[语言2].csv 格式的文件名
- 根据提取的语言信息生成相应的标签
