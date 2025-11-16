# IDE 上下文快照

- 项目路径: `c:\Users\PETER\Desktop\super-warrior-game`

## 预览与终端
- 可见预览 URL:
  - `http://127.0.0.1:5173/`（pnpm dev）
  - `http://127.0.0.1:5174/`（npm dev）
  - `http://127.0.0.1:5175/`（npm dev）
- 活动终端与命令：
  - `pnpm dev`（ID: 74bc032f-b882-4bc3-a34f-757914bdbdb4，URL: `http://127.0.0.1:5173/`）
  - `npm run dev`（ID: cbc7998b-d344-489f-8826-97c40950c58c，URL: `http://127.0.0.1:5174/`）
  - `npm run dev`（ID: 61d1fc5c-b262-4034-aac3-663159b8a080，URL: `http://127.0.0.1:5175/`）
  - `npm run dev`（ID: 5526b599-af84-496c-a502-fa7574ad72f4，cwd: `client`，URL: `http://127.0.0.1:5174/`）

## 最近功能改动摘要
- 敌人数量与血量：
  - 12级之后的生成增长减少 30%（`SPAWN_GROWTH_MULTIPLIER_AFTER_12 = 0.7`）。
  - 敌人血量统一提升 30%（`GLOBAL_HEALTH_MULTIPLIER = 1.3`）。
- 技能概率：
  - “生命汲取”出现后，后续出现概率按 0.5 递减（`LIFE_STEAL_DECAY_ON_APPEAR = 0.5`）。
  - 稀有技能权重乘数：`RARE_WEIGHT_MULTIPLIER = 0.67`。
- 树木表现：
  - 密度上调、最小间距降低到 12、动态生成阈值提高到 25。
  - 半径加入 0.8x–1.4x 随机抖动。
  - 每棵树引入 `shade`（0.8–1.2）实现颜色深浅变化。

## 关键文件
- `client/src/gameConfig.ts`
- `client/src/utils/EnemyManager.ts`
- `client/src/systems/TreeSystem.ts`
- `client/src/gameTypes.ts`
- `client/src/core/GameEngine.ts`
- `client/src/systems/SkillSystem.ts`

## 验证状态
- 本地预览未发现错误；建议同时检查终端日志以确保无新错误。

## 快速恢复步骤
- 在项目根目录启动开发服务器：`pnpm dev` 或 `npm run dev`。
- 打开对应预览：`http://127.0.0.1:5173/` 或 `http://127.0.0.1:5175/`。