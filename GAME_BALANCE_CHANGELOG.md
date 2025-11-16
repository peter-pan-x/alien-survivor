# 游戏平衡变更记录

> 更新日期：2025-11-11

## 敌人血量曲线下调（更平滑的成长）
- 击杀驱动增量：`ENEMY.HEALTH_INCREMENT_PER_10_KILLS` 从 `5` 降为 `2`。
- 时间驱动增长：新增 `ENEMY.HEALTH_GROWTH_PER_SECOND: 0.01`，敌人血量每秒约 +1%，替换原硬编码的 +2%。
- 全局血量乘数：`ENEMY.GLOBAL_HEALTH_MULTIPLIER` 从 `1.3` 降为 `1.1`。

**涉及代码**
- `client/src/gameConfig.ts`
  - `HEALTH_INCREMENT_PER_10_KILLS: 2`
  - `HEALTH_GROWTH_PER_SECOND: 0.01`
  - `GLOBAL_HEALTH_MULTIPLIER: 1.1`
- `client/src/utils/EnemyManager.ts`
  - `timeMultiplier = 1 + survivalTime * GAME_CONFIG.ENEMY.HEALTH_GROWTH_PER_SECOND`

**验证建议**
- 开局静置或少量击杀，观察随时间的血量涨幅：更缓慢。
- 达到 10/20/30 击杀时，血量跳增幅由每 10 杀 +5 改为 +2。

## 玩家多命与心形 UI（可复活机制）
- 配置新增：`PLAYER.INITIAL_LIVES = 3`，`PLAYER.MAX_LIVES = 3`。
- 类型扩展：`Player` 增加 `lives`、`maxLives` 字段。
- 死亡逻辑：生命值归零若有剩余命数则扣命复活（恢复满生命并短暂无敌），命数为 0 才结束游戏。
- UI 展示：HUD/页面显示三颗 ❤，红色为剩余命，灰色为耗尽。

**涉及代码**
- `client/src/gameConfig.ts`：新增 `INITIAL_LIVES`、`MAX_LIVES`。
- `client/src/gameTypes.ts`：`Player` 增加 `lives`、`maxLives`。
- `client/src/core/GameEngine.ts`：初始化命数、复活逻辑、HUD ❤ 渲染。
- `client/src/pages/GameOptimized.tsx`、`Game.original.tsx`、`Game.backup.tsx`：初始化命数、页面 ❤ 渲染、死亡改为扣命复活。

**验证建议**
- 受伤至 0 HP 时，命数减 1 并满血复活，❤ 减少；命数耗尽后结束游戏。
- 预览地址：`http://127.0.0.1:5173/`、`http://127.0.0.1:5174/`、`http://127.0.0.1:5175/`。

## 可调整参数（按需微调）
- 若前 1–2 分钟希望更低增长，可将 `HEALTH_GROWTH_PER_SECOND` 调至 `0.006–0.008`。
- 若需要更慢的击杀驱动，可将 `HEALTH_INCREMENT_PER_10_KILLS` 再降至 `1`。
- 可按页面需要在 UI 上同时显示❤与数值血条（开启 `RENDERING.SHOW_HEALTH_BARS`）。

