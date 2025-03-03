# 函数序列化问题修复说明

## 问题描述

在 GitHub Actions 中打包的程序 `wechat-video-uploader-macos-arm64` 运行时报错：

```
上传过程中发生错误: Passed function cannot be serialized!
```

但在本地使用 `build.sh` 打包生成的程序执行是正常的。

## 问题原因

问题出在函数序列化上。在 Node.js 应用打包成可执行文件时，某些函数无法正确序列化，特别是当函数作为参数传递给其他函数时。

具体来说，在 `main.js` 中，我们将 `generateMultiWordDescription` 函数添加到 `uploadOptions` 对象中，然后传递给 `uploadFunction`：

```javascript
// 添加 generateMultiWordDescription 到 options
const uploadOptions = {
    ...options,
    generateMultiWordDescription
};

// 执行上传
await uploadFunction(browser, videoFiles, uploadOptions);
```

在 Puppeteer 中，当函数需要在浏览器上下文中执行时（例如通过 page.evaluate），这些函数需要被序列化。在使用 pkg 打包时，这种序列化可能会失败，特别是当函数引用了外部作用域的变量或其他函数时。

## 修复方法

我们修改了代码，避免直接传递函数对象，而是通过标志位指示是否有可用的函数，然后在需要的地方重新导入：

1. 在 `main.js` 中：
```javascript
// 不直接传递函数，而是传递函数的字符串标识
const uploadOptions = {
    ...options,
    hasAIDescriptionGenerator: typeof generateMultiWordDescription === 'function'
};
```

2. 在 `upload_weixin.js` 中：
```javascript
if (words.length > 0 && options.hasAIDescriptionGenerator) {
    // 使用本地导入的 AI 工具生成描述
    const { generateMultiWordDescription } = require('./ai_util.js');
    description = await generateMultiWordDescription(words.join('-'));
    console.log('生成的描述：', description);
}
```

## 其他改进

1. 更新了 `build.sh` 脚本，确保构建过程正确
2. 版本号升级到 0.0.7.9
3. 对其他上传模块进行了同样的修复：
   - `upload_rednote.js`
   - `upload_kuaishou.js`
   - `upload_douyin.js`

这些文件中也存在相同的函数序列化问题，所有文件都采用了相同的解决方案，使用本地导入方式代替直接传递函数。

4. 对 `ai_util.js` 进行了深度优化：
   - 重构 `generateMultiWordDescription` 函数，减少外部依赖
   - 使用同步文件读取替代异步函数调用
   - 增强错误处理机制，提高程序稳定性

这些优化是必要的，因为即使使用了本地导入方式，如果函数本身存在序列化问题（如引用外部作用域的变量或函数），仍然会在打包过程中出现问题。

## 如何验证修复

重新在 GitHub Actions 中构建程序，然后下载并运行。程序应该能够正常运行，不再出现 "Passed function cannot be serialized!" 错误。

## 注意事项

在使用 pkg 打包 Node.js 应用时，应避免直接传递函数对象，特别是当这些函数可能需要在不同的上下文中执行时。可以考虑以下替代方案：

1. 使用字符串标识符，然后在需要的地方重新导入函数
2. 将函数转换为字符串，然后在需要的地方重新解析（不推荐，有安全风险）
3. 使用消息传递模式而不是直接函数调用
