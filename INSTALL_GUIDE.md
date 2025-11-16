# 安装指南

## 前置要求

在安装项目依赖之前，您需要先安装以下工具：

### 1. 安装 Node.js

请访问 [Node.js 官网](https://nodejs.org/) 下载并安装最新 LTS 版本（推荐 18.x 或更高版本）。

安装完成后，在 PowerShell 中验证安装：
```powershell
node --version
npm --version
```

### 2. 安装 pnpm

项目使用 pnpm 作为包管理器。安装 Node.js 后，使用以下命令安装 pnpm：

```powershell
npm install -g pnpm
```

或者使用独立安装脚本（推荐）：
```powershell
iwr https://get.pnpm.io/install.ps1 -useb | iex
```

验证安装：
```powershell
pnpm --version
```

### 3. 安装项目依赖

在项目根目录执行：
```powershell
pnpm install
```

### 4. 运行测试

项目包含以下可用的脚本：

- **类型检查**：`pnpm check` - 检查 TypeScript 类型错误
- **开发模式**：`pnpm dev` - 启动开发服务器
- **构建**：`pnpm build` - 构建生产版本
- **预览**：`pnpm preview` - 预览构建结果

## 快速开始

安装完 Node.js 和 pnpm 后，执行：

```powershell
# 1. 安装依赖
pnpm install

# 2. 运行类型检查
pnpm check

# 3. 启动开发服务器
pnpm dev
```

## 故障排除

如果遇到问题：

1. **pnpm 命令未找到**：确保 pnpm 已正确安装并添加到 PATH
2. **依赖安装失败**：尝试删除 `node_modules` 和 `pnpm-lock.yaml`，然后重新运行 `pnpm install`
3. **权限问题**：在 PowerShell 中以管理员身份运行

