#!/bin/bash

# ========================================
# 🎮 Alien Survivor 一键启动脚本 (Linux/Mac)
# ========================================

# 颜色定义
COLOR_RESET='\033[0m'
COLOR_GREEN='\033[32m'
COLOR_BLUE='\033[34m'
COLOR_YELLOW='\033[33m'
COLOR_RED='\033[31m'
COLOR_CYAN='\033[36m'

echo -e ""
echo -e "${COLOR_CYAN}========================================${COLOR_RESET}"
echo -e "${COLOR_CYAN}    🎮 异星幸存者 - Alien Survivor    ${COLOR_RESET}"
echo -e "${COLOR_CYAN}========================================${COLOR_RESET}"
echo -e ""

# 检测 Node.js
echo -e "${COLOR_BLUE}[1/5]${COLOR_RESET} 检测 Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${COLOR_RED}❌ 错误: 未找到 Node.js${COLOR_RESET}"
    echo ""
    echo "请先安装 Node.js: https://nodejs.org/"
    echo "推荐版本: v18 或更高"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${COLOR_GREEN}✓${COLOR_RESET} Node.js ${NODE_VERSION}"
echo ""

# 检测 npm
echo -e "${COLOR_BLUE}[2/5]${COLOR_RESET} 检测 npm..."
if ! command -v npm &> /dev/null; then
    echo -e "${COLOR_RED}❌ 错误: 未找到 npm${COLOR_RESET}"
    exit 1
fi

NPM_VERSION=$(npm -v)
echo -e "${COLOR_GREEN}✓${COLOR_RESET} npm ${NPM_VERSION}"
echo ""

# 检查 node_modules
echo -e "${COLOR_BLUE}[3/5]${COLOR_RESET} 检查依赖..."
if [ ! -d "node_modules" ]; then
    echo -e "${COLOR_YELLOW}⚠${COLOR_RESET} 依赖未安装，开始安装..."
    echo ""
    npm install
    if [ $? -ne 0 ]; then
        echo ""
        echo -e "${COLOR_RED}❌ 依赖安装失败${COLOR_RESET}"
        exit 1
    fi
    echo ""
    echo -e "${COLOR_GREEN}✓${COLOR_RESET} 依赖安装成功"
else
    echo -e "${COLOR_GREEN}✓${COLOR_RESET} 依赖已安装"
fi
echo ""

# 检测端口占用
echo -e "${COLOR_BLUE}[4/5]${COLOR_RESET} 检查端口 5173..."
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${COLOR_YELLOW}⚠${COLOR_RESET} 端口 5173 已被占用"
    echo ""
    echo "正在尝试关闭占用进程..."
    lsof -ti:5173 | xargs kill -9 2>/dev/null
    sleep 2
    echo -e "${COLOR_GREEN}✓${COLOR_RESET} 端口已释放"
else
    echo -e "${COLOR_GREEN}✓${COLOR_RESET} 端口可用"
fi
echo ""

# 启动开发服务器
echo -e "${COLOR_BLUE}[5/5]${COLOR_RESET} 启动游戏服务器..."
echo ""
echo -e "${COLOR_CYAN}========================================${COLOR_RESET}"
echo -e "${COLOR_GREEN}  🚀 服务器启动中...${COLOR_RESET}"
echo -e "${COLOR_CYAN}========================================${COLOR_RESET}"
echo ""

# 检测操作系统并打开浏览器
open_browser() {
    sleep 3
    URL="http://localhost:5173"

    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        open "$URL"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v xdg-open &> /dev/null; then
            xdg-open "$URL"
        elif command -v google-chrome &> /dev/null; then
            google-chrome "$URL"
        elif command -v firefox &> /dev/null; then
            firefox "$URL"
        fi
    fi
}

# 后台打开浏览器
open_browser &

# 启动 Vite 开发服务器
echo -e "${COLOR_YELLOW}提示：${COLOR_RESET} 按 Ctrl+C 停止服务器"
echo ""
npm run dev

# 如果服务器停止
echo ""
echo -e "${COLOR_YELLOW}服务器已停止${COLOR_RESET}"
