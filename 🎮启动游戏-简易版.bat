@echo off
chcp 65001 >nul
title 异星幸存者 - 启动中...

echo.
echo ========================================
echo     🎮 异星幸存者 - Alien Survivor
echo ========================================
echo.
echo 正在启动游戏...
echo.

:: 检查并安装依赖
if not exist "node_modules\" (
    echo 正在安装依赖，请稍候...
    call npm install >nul 2>&1
)

:: 关闭可能占用端口的进程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173"') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: 3 秒后打开浏览器
start /B timeout /t 3 >nul && start http://localhost:5173

:: 启动开发服务器
npm run dev
