# 项目每日改动摘要

> 日期：2025-11-11

## 今日要点
- 新增玩家命数系统（3条命），支持扣命复活。
- 完成心形 ❤ HUD/UI 展示，页面与引擎一致。
- 敌人血量增长曲线整体下调，时间与击杀驱动更平滑。
- 打开本地预览验证：复活流程与❤显示正确，血量曲线生效。

## 详细改动
- 玩家命数与复活逻辑
  - 在玩家初始对象与引擎 `createInitialPlayer` 注入 `lives` 与 `maxLives`（默认3）。
  - 死亡判定修改：`health <= 0` 时若 `lives > 0`，扣命并满血复活，赋予短暂无敌；`lives == 0` 才结束游戏。
  - 无敌通过 `DAMAGE_COOLDOWN` 的受伤冷却实现，避免复活瞬间被秒杀。
- ❤ 心形显示（HUD/UI）
  - 引擎 HUD 与各页面显示 3 颗❤，按剩余命数着色（红色=剩余、灰色=已耗尽）。
  - 页面：`GameOptimized.tsx`、`Game.original.tsx`、`Game.backup.tsx`。
  - 引擎：`GameEngine.ts` HUD 绘制。
- 敌人血量曲线下调
  - 击杀驱动：`HEALTH_INCREMENT_PER_10_KILLS` 从 `5` 降至 `2`。
  - 时间驱动：新增 `HEALTH_GROWTH_PER_SECOND = 0.01`，替代原硬编码 `0.02`。
  - 全局乘数：`GLOBAL_HEALTH_MULTIPLIER` 从 `1.3` 降至 `1.1`。

## 影响范围（文件）
- 配置与类型
  - `client/src/gameConfig.ts`：新增 `PLAYER.INITIAL_LIVES/MAX_LIVES`；调整敌人血量相关参数；新增 `ENEMY.HEALTH_GROWTH_PER_SECOND`。
  - `client/src/gameTypes.ts`：`Player` 接口扩展 `lives/maxLives`。
- 引擎与页面
  - `client/src/core/GameEngine.ts`：初始化命数、复活与❤HUD渲染、死亡判定替换。
  - `client/src/pages/GameOptimized.tsx`：初始化命数、页面❤显示、死亡改为扣命复活。
  - `client/src/pages/Game.original.tsx`：Canvas HUD 增加❤、死亡改为扣命复活。
  - `client/src/pages/Game.backup.tsx`：本地 `Player` 接口与初始化加命数、页面❤显示、死亡改为扣命复活。
- 敌人管理
  - `client/src/utils/EnemyManager.ts`：时间驱动血量增长比例改为配置值 `HEALTH_GROWTH_PER_SECOND`。

## 验证与预览
- 本地预览：`http://127.0.0.1:5173/`、`http://127.0.0.1:5174/`、`http://127.0.0.1:5175/`。
- 验证流程：
  - 受伤至 0 HP：应扣命并满血复活；❤ 减少；短暂无敌生效。
  - 连续击杀：每 10 杀的血量跳增由 +5 降为 +2。
  - 静置观察：随时间的血量增长从 2%/秒降至 1%/秒。

## 可调参数建议（按需微调）
- 开局更轻松：`HEALTH_GROWTH_PER_SECOND` 可降至 `0.006–0.008`。
- 后期更平滑：`HEALTH_INCREMENT_PER_10_KILLS` 可进一步降至 `1`。
- 视觉对比：开启 `RENDERING.SHOW_HEALTH_BARS` 便于观察血量变化。

## 相关文档
- `GAME_BALANCE_CHANGELOG.md`：记录平衡参数变更与验证建议。
