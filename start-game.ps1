# ========================================
# 🎮 Alien Survivor 一键启动脚本 (PowerShell)
# ========================================

# 设置控制台编码为UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "异星幸存者 - 游戏启动器"

Clear-Host
Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "    🎮 异星幸存者 - Alien Survivor" -ForegroundColor Green
Write-Host "         一键启动脚本 v2.1" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# 1. 检查Node.js环境
Write-Host "[1/4] 检查环境..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js 版本: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 错误: 未检测到 Node.js" -ForegroundColor Red
    Write-Host "   下载地址: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "按回车键退出"
    exit 1
}

# 2. 检查并安装依赖
Write-Host ""
Write-Host "[2/4] 检查项目依赖..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "⚙️  首次运行，正在安装依赖..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ 依赖安装失败" -ForegroundColor Red
        Read-Host "按回车键退出"
        exit 1
    }
    Write-Host "✓ 依赖安装完成" -ForegroundColor Green
} else {
    Write-Host "✓ 依赖已安装" -ForegroundColor Green
}

# 3. 启动开发服务器
Write-Host ""
Write-Host "[3/4] 启动开发服务器..." -ForegroundColor Yellow
Write-Host "⚙️  正在启动 Vite 开发服务器..." -ForegroundColor Cyan

# 启动服务器进程
$serverJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    npm run dev 2>&1
}

# 等待服务器启动
Write-Host "等待服务器启动..." -ForegroundColor Gray
Start-Sleep -Seconds 3

# 4. 检测服务器端口
$port = $null
$possiblePorts = @(5173, 5174, 5175, 5176)

foreach ($testPort in $possiblePorts) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$testPort" -TimeoutSec 1 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 304) {
            $port = $testPort
            break
        }
    } catch {
        # 继续尝试下一个端口
    }
}

# 如果还没检测到，再等待2秒尝试
if (-not $port) {
    Write-Host "服务器启动中，请稍候..." -ForegroundColor Gray
    Start-Sleep -Seconds 2
    
    foreach ($testPort in $possiblePorts) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$testPort" -TimeoutSec 1 -UseBasicParsing -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 304) {
                $port = $testPort
                break
            }
        } catch {
            # 继续尝试
        }
    }
}

# 使用默认端口5173
if (-not $port) {
    Write-Host "⚠️  无法自动检测端口，使用默认端口 5173" -ForegroundColor Yellow
    $port = 5173
}

$url = "http://localhost:$port"
Write-Host "✓ 开发服务器已启动" -ForegroundColor Green

# 5. 打开浏览器
Write-Host ""
Write-Host "[4/4] 打开浏览器..." -ForegroundColor Yellow
Write-Host "🌐 正在打开浏览器: $url" -ForegroundColor Cyan
Start-Process $url

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "✅ 游戏启动成功！" -ForegroundColor Green
Write-Host ""
Write-Host "📌 游戏地址: $url" -ForegroundColor White
Write-Host "📌 按 Ctrl+C 可停止服务器" -ForegroundColor Gray
Write-Host "📌 关闭此窗口将停止游戏服务器" -ForegroundColor Gray
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# 显示服务器日志
Write-Host "🔄 服务器运行中..." -ForegroundColor Green
Write-Host ""

try {
    # 持续接收并显示服务器输出
    while ($true) {
        $output = Receive-Job -Job $serverJob
        if ($output) {
            Write-Host $output
        }
        
        # 检查服务器进程是否还在运行
        if ($serverJob.State -eq "Completed" -or $serverJob.State -eq "Failed") {
            Write-Host ""
            Write-Host "⚠️  服务器进程已停止" -ForegroundColor Yellow
            break
        }
        
        Start-Sleep -Milliseconds 500
    }
} finally {
    # 清理：停止服务器进程
    Write-Host ""
    Write-Host "正在停止服务器..." -ForegroundColor Yellow
    Stop-Job -Job $serverJob -ErrorAction SilentlyContinue
    Remove-Job -Job $serverJob -ErrorAction SilentlyContinue
    Write-Host "✓ 服务器已停止" -ForegroundColor Green
}

