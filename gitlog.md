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

refactor(ai_util): 清理ai_util.js中未使用的代码
- 移除未使用的callAIAPI函数
- 删除注释掉的API调用代码
- 移除测试代码和测试函数
- 保留所有必要的功能代码

test(ai_util): 将测试代码移到单独的测试文件
- 创建新的test_ai_util.js测试文件
- 重构测试代码，分离成不同的测试函数
- 增强测试功能，增加测试多词描述生成功能
- 添加模块导出，便于其他测试文件使用

ci(build): 修复GitHub Actions工作流程中的打包和发布问题
- 修改build.sh脚本，使用显式目标参数打包每个平台
- 增强工作流程中的日志输出，方便调试
- 改进发布文件准备步骤，确保所有平台的构建产物都能正确复制
- 添加构建产物检查步骤，便于排查问题

fix(build): 修复构建脚本与实际生成文件名不匹配的问题
- 修改build.sh脚本中的输出文件名，使其与GitHub Actions日志中显示的文件名一致
- 更新工作流程文件中的文件名引用，确保所有平台的构建产物都能被正确复制
- 解决只有macOS ARM64版本被上传到GitHub的问题

fix(ci): 修复GitHub Actions工作流程中的发布任务不执行问题
- 将release任务的条件从 `if: always()` 改为 `if: success()`，确保只有在build任务成功时才执行发布
- 简化工作流程，移除了不必要的脚本修改步骤
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

fix(build): 修复 GitHub Action 构建程序中的序列化问题
- 修改 main.js 中的函数传递方式，避免直接传递函数对象
- 更新 upload_weixin.js 中的描述生成逻辑，使用本地导入方式
- 更新 build.sh 脚本，确保构建过程正确
- 版本号升级到 0.0.7.7

fix(build): 对其他上传模块进行序列化问题修复
- 修改 upload_rednote.js、upload_kuaishou.js 和 upload_douyin.js 文件
- 与 upload_weixin.js 采用相同的解决方案，使用本地导入方式代替直接传递函数
- 确保所有上传模块在打包后能正常运行
- 版本号升级到 0.0.7.8

fix(build): 对 ai_util.js 进行深度优化，解决序列化问题
- 重构 generateMultiWordDescription 函数，减少外部依赖
- 使用同步文件读取替代异步函数调用
- 增强错误处理机制，提高程序稳定性
- 版本号升级到 0.0.7.9

fix(build): 完全重写 ai_util.js 模块以彻底解决序列化问题
- 简化模块结构，移除所有非必要的依赖
- 使用纯函数编程方式，避免外部作用域引用
- 优化错误处理和日志输出
- 版本号升级到 0.0.8.0

ci(build): 优化 GitHub Actions 构建流程

fix(upload_kuaishou): 优化页面加载和元素识别时间
- 增加页面加载等待时间从 5 秒到 8 秒
- 增加选择器超时时间从 5 秒到 10 秒
- 保持多级选择器机制，确保元素识别的可靠性
- 修改为在单一 macOS 环境中一次性构建所有平台的可执行文件
- 更新本地构建脚本 build.sh，使用 pkg . --public 命令打包所有平台
- 在 GitHub Actions 中全局安装 pkg 命令
- 简化构建产物上传和发布流程
- 增强构建日志输出，方便调试

fix(csv): 修复无法读取特定格式 CSV 文件的问题

style(css): 修复快手上传页面的 CSS 兼容性问题
- 添加标准浏览器前缀
- 修复 appearance、transform-style、backface-visibility、transition、line-clamp 等属性兼容性
- 优化页面样式在不同浏览器下的一致性

fix(upload): 修复快手上传按钮不可点击的问题
- 使用 button 元素选择器替代 div 选择器
- 添加动态类名识别机制
- 优化按钮可见性检测

fix(puppeteer): 修复 waitForXPath 不可用的问题
- 使用 waitForSelector 替代 waitForXPath
- 优化按钮文本内容检测
- 使用父元素进行点击操作

fix(kuaishou): 强化发布按钮点击逻辑
- 实现三种不同的点击方法尝试
- 使用 page.click 直接点击
- 使用 evaluate 在浏览器上下文中执行点击
- 使用文本内容查找并点击按钮
- 增强错误处理和日志输出

fix(kuaishou): 修复发布按钮选择器问题
- 使用确切的选择器 ._button_3a3lq_1._button-primary_3a3lq_60
- 移除全局变量存储选择器的方式
- 增加按文本内容查找按钮的备用方法
- 修复点击后等待时间

fix(kuaishou): 简化发布按钮点击逻辑
- 移除重复的点击操作
- 仅保留一种点击方式，使用 page.click 直接点击
- 增强错误处理和日志输出
- 修改 ai_util.js 中的正则表达式，支持以 poem- 开头的 CSV 文件名
- 在 upload_douyin.js 中增加对 csvPath 参数的处理，确保正确设置 CSV 文件路径
- 增强日志输出，方便追踪 CSV 文件加载过程
- 改进错误处理，当 CSV 行缺少 word 或 description 字段时会输出警告

fix(csv): 统一所有上传模块的 CSV 文件处理
- 在 upload_weixin.js、upload_rednote.js 和 upload_kuaishou.js 中添加 setCsvFilePath 函数的导入和使用
- 为所有上传模块添加 options.csvPath 参数处理逻辑
- 确保所有上传模块都能正确读取指定的 CSV 文件
- 统一日志输出格式，便于调试和问题排查
