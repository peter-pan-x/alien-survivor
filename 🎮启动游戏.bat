@echo off
:: 超简化启动脚本 - 双击即可运行
chcp 65001 >nul
title Alien Survivor

echo.
echo 🎮 正在启动 Alien Survivor...
echo.

:: 检查依赖
if not exist "node_modules\" (
    echo 首次运行，正在安装依赖...
    call npm install
)

:: 启动并打开浏览器
echo 启动游戏服务器...
start http://localhost:5173
npm run dev

