## 新环境运行记录

需要安装依赖包

    npx puppeteer browsers install chrome


启动脚本上指定 chrome 路径

    export PUPPETEER_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


# 打包依赖

本项目使用 [pkg](https://github.com/vercel/pkg) 进行跨平台打包，如未安装请先执行：

- 全局安装（适合本地开发环境）：

    npm install -g pkg

- 或本地依赖（推荐写入 devDependencies，便于团队协作/CI）：

    npm install --save-dev pkg

安装后可直接运行打包脚本，如遇 `pkg: command not found` 错误请检查依赖是否安装。

