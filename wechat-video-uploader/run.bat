@echo off

:: 定义路径变量
set "VIDEO_DIR=F:\dev\workspace\contentUploader\video"

:: 检查是否传入了参数 debug
if "%1"=="debug" (
    echo "Running in DEBUG mode (without --headless)..."
    node upload_weichat.js --dir %VIDEO_DIR%
) else (
    echo "Running in HEADLESS mode (with --headless)..."
    node upload_weichat.js --dir %VIDEO_DIR% --headless
)

pause