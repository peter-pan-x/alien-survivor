@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title 异星幸存者 - 启动中...

cls
echo.
echo ===============================================
echo    🎮 异星幸存者 - Alien Survivor
echo         一键启动脚本 v2.1
echo ===============================================
echo.

:: 检查Node.js是否安装
echo [1/4] 检查环境...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 错误: 未检测到 Node.js，请先安装 Node.js
    echo    下载地址: https://nodejs.org/
    pause
    exit /b 1
)

node --version
echo ✓ Node.js 环境正常

:: 检查依赖是否安装
echo.
echo [2/4] 检查项目依赖...
if not exist "node_modules\" (
    echo ⚙️  首次运行，正在安装依赖...
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
    echo ✓ 依赖安装完成
) else (
    echo ✓ 依赖已安装
)

:: 启动开发服务器
echo.
echo [3/4] 启动开发服务器...
echo ⚙️  正在启动 Vite 开发服务器...
echo.

:: 在后台启动开发服务器，并将输出保存到临时文件
start /B cmd /c "npm run dev > .vite-server.log 2>&1"

:: 等待服务器启动并获取端口
echo 等待服务器启动...
timeout /t 3 /nobreak >nul

:: 尝试多个可能的端口
set PORT=5173
set URL=http://localhost:%PORT%

:: 检查端口5173
powershell -Command "$response = $null; try { $response = Invoke-WebRequest -Uri 'http://localhost:5173' -TimeoutSec 1 -UseBasicParsing 2>$null } catch {}; if ($response) { exit 0 } else { exit 1 }" >nul 2>nul
if %errorlevel% equ 0 (
    set PORT=5173
    goto :open_browser
)

:: 检查端口5174
powershell -Command "$response = $null; try { $response = Invoke-WebRequest -Uri 'http://localhost:5174' -TimeoutSec 1 -UseBasicParsing 2>$null } catch {}; if ($response) { exit 0 } else { exit 1 }" >nul 2>nul
if %errorlevel% equ 0 (
    set PORT=5174
    goto :open_browser
)

:: 检查端口5175
powershell -Command "$response = $null; try { $response = Invoke-WebRequest -Uri 'http://localhost:5175' -TimeoutSec 1 -UseBasicParsing 2>$null } catch {}; if ($response) { exit 0 } else { exit 1 }" >nul 2>nul
if %errorlevel% equ 0 (
    set PORT=5175
    goto :open_browser
)

:: 如果所有端口都失败，再等待一下
echo 服务器启动中，请稍候...
timeout /t 3 /nobreak >nul

:: 再次尝试5173
powershell -Command "$response = $null; try { $response = Invoke-WebRequest -Uri 'http://localhost:5173' -TimeoutSec 1 -UseBasicParsing 2>$null } catch {}; if ($response) { exit 0 } else { exit 1 }" >nul 2>nul
if %errorlevel% equ 0 (
    set PORT=5173
    goto :open_browser
)

:: 默认使用5173端口
echo ⚠️  无法自动检测端口，使用默认端口 5173
set PORT=5173

:open_browser
set URL=http://localhost:%PORT%
echo ✓ 开发服务器已启动

:: 打开浏览器
echo.
echo [4/4] 打开浏览器...
echo 🌐 正在打开浏览器: %URL%
start "" "%URL%"

echo.
echo ===============================================
echo ✅ 游戏启动成功！
echo.
echo 📌 游戏地址: %URL%
echo 📌 按 Ctrl+C 可停止服务器
echo 📌 关闭此窗口将停止游戏服务器
echo ===============================================
echo.

:: 保持窗口打开，显示服务器日志
timeout /t 2 /nobreak >nul
type .vite-server.log 2>nul
echo.
echo 正在运行中... (按 Ctrl+C 停止)
echo.

:: 持续显示日志
:log_loop
timeout /t 1 /nobreak >nul
type .vite-server.log 2>nul
cls
echo ===============================================
echo    🎮 Alien Survivor - 游戏运行中
echo ===============================================
echo.
echo 📌 游戏地址: %URL%
echo 📌 按 Ctrl+C 停止服务器
echo.
goto log_loop

