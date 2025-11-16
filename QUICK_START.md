# 异星幸存者 - 重构版快速开始指南

本指南帮助您快速了解重构后的项目结构,并开始开发新功能。

---

## 🏗️ 新架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                        Game.tsx                             │
│                    (React UI 控制器)                         │
│  - 渲染 UI 组件 (菜单、升级界面等)                            │
│  - 捕获用户输入 (键盘、虚拟摇杆)                              │
│  - 管理游戏状态机 (menu, playing, levelup, gameover)        │
└─────────────────────────────────────────────────────────────┘
                              ↓ 输入同步
                              ↓ 状态查询
                              ↓ 回调通知
┌─────────────────────────────────────────────────────────────┐
│                      GameEngine.ts                          │
│                    (游戏核心引擎)                            │
│  - 管理游戏实体 (玩家、敌人、子弹)                            │
│  - 执行游戏循环 (更新 + 渲染)                                │
│  - 协调子系统 (EnemyManager, WeaponSystem, etc.)            │
│  - 处理碰撞检测                                              │
│  - 错误处理和性能监控                                         │
└─────────────────────────────────────────────────────────────┘
                              ↓ 管理
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                        游戏子系统                            │
│  - EnemyManager: 敌人生成和管理                             │
│  - WeaponSystem: 武器系统 (轨道无人机、闪电链等)              │
│  - ParticlePool: 粒子效果管理                               │
│  - SpatialGrid: 空间网格优化                                │
│  - DamageNumberSystem: 伤害数字显示                         │
│  - PerformanceMonitor: 性能监控                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📂 核心文件说明

### 1. `client/src/core/GameEngine.ts`

**职责**: 游戏核心引擎,管理所有游戏逻辑

**关键方法**:
```typescript
// 生命周期
constructor(canvas: HTMLCanvasElement)  // 初始化引擎
start(): void                           // 启动游戏循环
stop(): void                            // 停止游戏循环
reset(): void                           // 重置游戏状态
destroy(): void                         // 清理资源

// 状态访问
getPlayer(): Readonly<Player>           // 获取玩家状态
getStats(): Readonly<GameStats>         // 获取游戏统计

// 输入设置
setKeys(keys: Set<string>): void        // 设置键盘输入
setJoystickInput(x: number, y: number): void  // 设置摇杆输入

// 游戏操作
applySkill(skillId: string): void       // 应用技能效果

// 回调设置
setCallbacks(callbacks: {...}): void    // 设置事件回调
```

**何时修改此文件**:
- 添加新的游戏机制 (如 Boss 战、道具系统)
- 修改游戏规则 (如伤害计算、升级逻辑)
- 优化性能 (如碰撞检测算法)

### 2. `client/src/pages/Game.tsx`

**职责**: React UI 控制器,负责渲染和用户交互

**关键功能**:
- 渲染游戏菜单、升级界面、游戏结束界面
- 捕获键盘和虚拟摇杆输入
- 将输入同步到 `GameEngine`
- 从 `GameEngine` 获取状态并更新 UI
- 管理游戏状态机

**何时修改此文件**:
- 修改 UI 样式或布局
- 添加新的界面 (如设置页面、商店)
- 修改用户交互逻辑

### 3. `client/src/utils/PerformanceMonitor.ts`

**职责**: 性能监控工具

**功能**:
- 实时显示 FPS
- 记录更新和渲染耗时
- 性能警告 (低 FPS 提示)

**使用方式**:
```typescript
// 按 Ctrl+P 切换性能监控显示
```

---

## 🚀 常见开发任务

### 任务 1: 添加新技能

**步骤**:

1. 在 `gameConfig.ts` 中定义技能:
```typescript
export const SKILLS: Skill[] = [
  // ... 现有技能
  { 
    id: "new_skill", 
    name: "新技能", 
    description: "技能描述", 
    type: "special",
    icon: "🎯" 
  },
];
```

2. 在 `GameEngine.ts` 的 `applySkill` 方法中实现技能效果:
```typescript
public applySkill(skillId: string): void {
  try {
    switch (skillId) {
      // ... 现有技能
      case "new_skill":
        // 实现技能逻辑
        this.player.someProperty += 10;
        break;
    }
  } catch (error) {
    // 错误处理
  }
}
```

3. (可选) 如果技能需要持续效果,在 `update` 方法中添加逻辑

### 任务 2: 添加新敌人类型

**步骤**:

1. 在 `gameConfig.ts` 中定义敌人类型:
```typescript
TYPES: {
  // ... 现有类型
  newType: {
    radius: 15,
    healthMultiplier: 1.5,
    speedMultiplier: 1.2,
    damage: 15,
    spawnWeight: 10,
  },
}
```

2. 在 `gameConfig.ts` 中添加颜色:
```typescript
COLORS: {
  // ... 现有颜色
  ENEMY_NEWTYPE: "#ff00ff",
}
```

3. 在 `GameEngine.ts` 的 `renderEnemies` 方法中添加渲染逻辑:
```typescript
if (enemy.type === "newType") {
  // 绘制新敌人的形状
  this.ctx.beginPath();
  // ... 绘制代码
}
```

4. (可选) 在 `updateEnemies` 方法中添加特殊行为逻辑

### 任务 3: 添加新武器

**步骤**:

1. 在 `WeaponSystem.ts` 中实现新武器逻辑:
```typescript
private updateNewWeapon(weapon: Weapon, player: Player, enemies: Enemy[], now: number): void {
  // 武器更新逻辑
}

private renderNewWeapon(weapon: Weapon, player: Player, ctx: CanvasRenderingContext2D, now: number): void {
  // 武器渲染逻辑
}
```

2. 在 `updateWeapons` 和 `renderWeapons` 中调用:
```typescript
case "newWeapon":
  this.updateNewWeapon(weapon, player, enemies, now);
  break;
```

3. 在 `gameConfig.ts` 中添加武器技能

### 任务 4: 修改游戏难度

**步骤**:

1. 修改 `gameConfig.ts` 中的配置:
```typescript
ENEMY: {
  BASE_HEALTH: 15,              // 敌人基础生命值
  BASE_SPEED: 0.8,              // 敌人基础速度
  INITIAL_SPAWN_INTERVAL: 1500, // 初始生成间隔
  MIN_SPAWN_INTERVAL: 400,      // 最小生成间隔
  // ... 其他配置
}
```

2. 修改 `EnemyManager.ts` 中的难度曲线:
```typescript
private getSpawnInterval(survivalTime: number): number {
  // 自定义生成间隔计算逻辑
}

private getSpawnCount(survivalTime: number): number {
  // 自定义生成数量计算逻辑
}
```

---

## 🧪 测试和调试

### 启用性能监控

在开发模式下,性能监控默认启用。按 `Ctrl+P` 可以切换显示/隐藏。

性能监控显示:
- **FPS**: 当前帧率
- **Update**: 游戏逻辑更新平均耗时
- **Render**: 渲染平均耗时
- **性能状态**: Good (>50 FPS) / Medium (30-50 FPS) / Low (<30 FPS)

### 查看游戏状态

在浏览器控制台中,可以访问游戏引擎实例:

```javascript
// 在 Game.tsx 中将 gameEngineRef 暴露到 window (仅用于调试)
window.gameEngine = gameEngineRef.current;

// 然后在控制台中:
window.gameEngine.getPlayer();  // 查看玩家状态
window.gameEngine.getStats();   // 查看游戏统计
```

### 常见问题排查

**问题**: 游戏启动后黑屏

**排查步骤**:
1. 打开浏览器控制台,查看是否有错误信息
2. 检查 `GameEngine` 是否成功初始化
3. 检查 Canvas 上下文是否正确获取

**问题**: 碰撞检测不工作

**排查步骤**:
1. 检查 `SpatialGrid` 是否正确构建 (`spatialGrid.insert`)
2. 检查 `getNearby` 方法的参数是否正确
3. 在 `handleCollisions` 方法中添加 `console.log` 查看检测结果

**问题**: 性能下降

**排查步骤**:
1. 启用性能监控 (Ctrl+P)
2. 查看 FPS 和耗时统计
3. 检查是否有大量实体 (敌人、子弹、粒子)
4. 考虑优化渲染或更新逻辑

---

## 📚 推荐阅读

### 项目文档

- `README.md` - 项目概述和功能介绍
- `REFACTORING_SUMMARY.md` - 详细的重构报告
- `功能说明.md` - 游戏功能说明
- `开发总结.md` - 开发经验总结

### 代码文件

- `client/src/gameTypes.ts` - 所有类型定义
- `client/src/gameConfig.ts` - 游戏配置和常量
- `client/src/utils/` - 工具类和子系统

---

## 🎯 下一步

现在您已经了解了重构后的项目结构,可以开始:

1. **运行项目**: `pnpm dev`
2. **查看代码**: 从 `GameEngine.ts` 和 `Game.tsx` 开始
3. **尝试修改**: 添加一个新技能或修改游戏难度
4. **测试功能**: 确保修改没有引入 bug

如有任何问题,请参考 `REFACTORING_SUMMARY.md` 中的详细说明。

祝开发愉快! 🚀
