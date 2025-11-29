# 🚀 Vercel快速部署清单

## ⚡ 5分钟快速部署（GitHub集成方式）

### 1️⃣ 访问Vercel
- 打开 `https://vercel.com/new`
- 确保已登录你的Vercel账号

### 2️⃣ 导入GitHub项目
- 点击 "Continue with GitHub"
- 找到 `alien-survivor` 仓库
- 点击 "Import"

### 3️⃣ 配置项目（自动检测）
- Framework: **Vite** (自动检测)
- Build Command: `npm run build` (自动设置)
- Output Directory: `dist/public` (自动设置)
- Root Directory: `./` (默认)
- ✅ 所有配置已预设，直接点击Deploy即可

### 4️⃣ 部署
- 点击 "Deploy" 按钮
- 等待2-3分钟构建完成
- 获得 `https://alien-survivor.vercel.app`

---

## ✅ 部署后检查清单

### 🎮 游戏功能测试
- [ ] 游戏正常启动
- [ ] 键盘/鼠标控制正常
- [ ] 移动端触摸控制正常
- [ ] 技能升级系统工作
- [ ] Boss战斗功能
- [ ] 音效播放正常

### 📱 跨设备测试
- [ ] PC端浏览器测试
- [ ] 手机浏览器测试
- [ ] 平板浏览器测试
- [ ] 不同屏幕尺寸适配

---

## 🔄 如何更新项目

### 自动更新（推荐）
```bash
git add .
git commit -m "更新内容"
git push origin main
# Vercel会自动重新部署
```

### 手动更新
1. 进入Vercel控制台
2. 找到 `alien-survivor` 项目
3. 点击 "Redeploy" 按钮

---

## 🆘 常见问题速查

| 问题 | 解决方案 |
|------|----------|
| 部署失败 | 本地运行 `npm run build` 检查 |
| 白屏 | 检查浏览器控制台错误信息 |
| 资源加载失败 | 确认静态文件在 `public/` 目录 |
| 移动端问题 | 检查触摸事件监听 |

---

## 📞 需要帮助？

如果遇到问题，可以：
1. 查看详细的 `VERCEL_DEPLOYMENT_GUIDE.md`
2. 检查Vercel部署日志
3. 本地测试 `npm run build && npm run preview`

**预计部署时间：2-5分钟** 🎯