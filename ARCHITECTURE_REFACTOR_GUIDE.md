# 架构重构实施指南
**配套文档：ARCHITECTURE_ANALYSIS_REPORT.md**

本指南提供具体的代码示例和重构步骤，帮助解决架构分析报告中识别的问题。

---

## 🎯 重构目标

将当前的单体 GameEngine (1097行) 重构为清晰的系统化架构。

---

## 📁 推荐的新目录结构

```
client/src/
├── core/
│   ├── Engine.ts              # 核心引擎（轻量级编排器）
│   ├── EventBus.ts            # 事件总线
│   └── GameLoop.ts            # 游戏循环（固定时间步长）
├── systems/
│   ├── InputSystem.ts         # 输入处理
│   ├── PhysicsSystem.ts       # 物理更新
│   ├── CollisionSystem.ts     # 碰撞检测
│   ├── RenderSystem.ts        # 渲染
│   ├── EntitySystem.ts        # 实体管理
│   └── WeaponSystem.ts        # 武器系统
├── entities/
│   ├── EntityManager.ts       # 实体管理器
│   ├── Player.ts              # 玩家实体
│   ├── Enemy.ts               # 敌人实体
│   └── Bullet.ts              # 子弹实体
├── components/              # ECS 组件
│   ├── Transform.ts
│   ├── Physics.ts
│   ├── Health.ts
│   └── Weapon.ts
├── pools/
│   ├── ObjectPool.ts          # 通用对象池
│   ├── BulletPool.ts          # 子弹池
│   └── EnemyPool.ts           # 敌人池
└── config/
    ├── ConfigManager.ts       # 配置管理器
    └── gameConfig.json        # 外部配置
```

---

## 🔧 重构步骤 1: 创建轻量级引擎

### 新的 Engine.ts

```typescript
// client/src/core/Engine.ts
import { EventBus } from './EventBus';
import { GameLoop } from './GameLoop';
import { System } from './System';

export class Engine {
  private eventBus: EventBus;
  private gameLoop: GameLoop;
  private systems: System[] = [];
  private isRunning = false;

  constructor(canvas: HTMLCanvasElement) {
    this.eventBus = new EventBus();
    this.gameLoop = new GameLoop(
      this.update.bind(this),
      this.render.bind(this)
    );
  }

  addSystem(system: System): void {
    system.setEventBus(this.eventBus);
    this.systems.push(system);
  }

  start(): void {
    if (this.isRunning) return;
    
    this.systems.forEach(s => s.onStart?.());
    this.isRunning = true;
    this.gameLoop.start();
  }

  stop(): void {
    if (!this.isRunning) return;
    
    this.gameLoop.stop();
    this.systems.forEach(s => s.onStop?.());
    this.isRunning = false;
  }

  private update(deltaTime: number): void {
    // 按顺序更新所有系统
    for (const system of this.systems) {
      if (system.enabled) {
        system.update(deltaTime);
      }
    }
  }

  private render(interpolation: number): void {
    // 渲染系统
    const renderSystems = this.systems.filter(s => s.render);
    for (const system of renderSystems) {
      system.render?.(interpolation);
    }
  }

  destroy(): void {
    this.stop();
    this.systems.forEach(s => s.destroy?.());
    this.systems = [];
    this.eventBus.clear();
  }
}
```

---

## 🔧 重构步骤 2: 实现事件总线

### EventBus.ts

```typescript
// client/src/core/EventBus.ts
type EventHandler<T = any> = (data: T) => void;
type Unsubscribe = () => void;

export enum GameEvent {
  // 玩家事件
  PLAYER_DAMAGE = 'PLAYER_DAMAGE',
  PLAYER_HEAL = 'PLAYER_HEAL',
  PLAYER_LEVEL_UP = 'PLAYER_LEVEL_UP',
  PLAYER_DEATH = 'PLAYER_DEATH',
  
  // 敌人事件
  ENEMY_SPAWN = 'ENEMY_SPAWN',
  ENEMY_DAMAGE = 'ENEMY_DAMAGE',
  ENEMY_DEATH = 'ENEMY_DEATH',
  
  // 碰撞事件
  COLLISION_BULLET_ENEMY = 'COLLISION_BULLET_ENEMY',
  COLLISION_PLAYER_ENEMY = 'COLLISION_PLAYER_ENEMY',
  
  // 游戏事件
  GAME_START = 'GAME_START',
  GAME_OVER = 'GAME_OVER',
  GAME_PAUSE = 'GAME_PAUSE',
}

export class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private eventHistory: Array<{ event: string; data: any; timestamp: number }> = [];
  private maxHistorySize = 100;

  on<T = any>(event: GameEvent | string, handler: EventHandler<T>): Unsubscribe {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    
    this.handlers.get(event)!.add(handler);
    
    // 返回取消订阅函数
    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  once<T = any>(event: GameEvent | string, handler: EventHandler<T>): Unsubscribe {
    const wrappedHandler = (data: T) => {
      handler(data);
      unsubscribe();
    };
    
    const unsubscribe = this.on(event, wrappedHandler);
    return unsubscribe;
  }

  emit<T = any>(event: GameEvent | string, data?: T): void {
    // 记录事件历史（用于调试）
    if (this.eventHistory.length >= this.maxHistorySize) {
      this.eventHistory.shift();
    }
    this.eventHistory.push({
      event,
      data,
      timestamp: Date.now()
    });

    // 触发所有处理器
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  clear(): void {
    this.handlers.clear();
    this.eventHistory = [];
  }

  getEventHistory(): readonly typeof this.eventHistory {
    return this.eventHistory;
  }
}
```

---

## 🔧 重构步骤 3: 改进游戏循环

### GameLoop.ts

```typescript
// client/src/core/GameLoop.ts
export class GameLoop {
  private readonly FIXED_TIMESTEP = 1000 / 60; // 16.67ms
  private readonly MAX_FRAME_TIME = 250; // 最大帧时间
  
  private lastTime = 0;
  private accumulator = 0;
  private animationId: number | null = null;
  private isRunning = false;
  
  private updateFn: (deltaTime: number) => void;
  private renderFn: (interpolation: number) => void;

  constructor(
    updateFn: (deltaTime: number) => void,
    renderFn: (interpolation: number) => void
  ) {
    this.updateFn = updateFn;
    this.renderFn = renderFn;
  }

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.tick(this.lastTime);
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private tick = (currentTime: number): void => {
    if (!this.isRunning) return;

    // 计算帧时间（限制最大值以防止螺旋死亡）
    let frameTime = currentTime - this.lastTime;
    if (frameTime > this.MAX_FRAME_TIME) {
      frameTime = this.MAX_FRAME_TIME;
    }
    
    this.lastTime = currentTime;
    this.accumulator += frameTime;

    // 固定时间步长更新（可能多次）
    while (this.accumulator >= this.FIXED_TIMESTEP) {
      this.updateFn(this.FIXED_TIMESTEP);
      this.accumulator -= this.FIXED_TIMESTEP;
    }

    // 计算插值并渲染
    const interpolation = this.accumulator / this.FIXED_TIMESTEP;
    this.renderFn(interpolation);

    this.animationId = requestAnimationFrame(this.tick);
  };
}
```

---

## 🔧 重构步骤 4: 创建系统基类

### System.ts

```typescript
// client/src/core/System.ts
import { EventBus } from './EventBus';

export interface SystemConfig {
  priority?: number;
  enabled?: boolean;
}

export abstract class System {
  protected eventBus!: EventBus;
  public enabled = true;
  public priority = 0;

  constructor(config?: SystemConfig) {
    if (config) {
      this.enabled = config.enabled ?? true;
      this.priority = config.priority ?? 0;
    }
  }

  setEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  // 生命周期钩子
  onStart?(): void;
  onStop?(): void;
  destroy?(): void;

  // 核心方法
  abstract update(deltaTime: number): void;
  render?(interpolation: number): void;
}
```

---

## 🔧 重构步骤 5: 实现碰撞系统（示例）

### CollisionSystem.ts

```typescript
// client/src/systems/CollisionSystem.ts
import { System } from '../core/System';
import { GameEvent } from '../core/EventBus';
import { EntityManager } from '../entities/EntityManager';
import { SpatialGrid } from '../utils/SpatialGrid';

export class CollisionSystem extends System {
  private entityManager: EntityManager;
  private spatialGrid: SpatialGrid;

  constructor(entityManager: EntityManager, width: number, height: number) {
    super({ priority: 3 }); // 在物理系统之后
    this.entityManager = entityManager;
    this.spatialGrid = new SpatialGrid(width, height);
  }

  update(deltaTime: number): void {
    this.spatialGrid.clear();
    
    // 1. 构建空间索引
    const enemies = this.entityManager.query(['enemy', 'transform']);
    enemies.forEach(entity => {
      this.spatialGrid.insert(entity);
    });

    // 2. 检测子弹-敌人碰撞
    this.checkBulletCollisions();

    // 3. 检测玩家-敌人碰撞
    this.checkPlayerCollisions();
  }

  private checkBulletCollisions(): void {
    const bullets = this.entityManager.query(['bullet', 'transform']);
    
    for (const bullet of bullets) {
      const nearbyEnemies = this.spatialGrid.getNearby(
        bullet.transform.x,
        bullet.transform.y,
        bullet.transform.radius + 30
      );

      for (const enemy of nearbyEnemies) {
        if (this.checkCircleCollision(bullet, enemy)) {
          // 发送碰撞事件，不直接处理伤害
          this.eventBus.emit(GameEvent.COLLISION_BULLET_ENEMY, {
            bullet,
            enemy,
            timestamp: Date.now()
          });
        }
      }
    }
  }

  private checkPlayerCollisions(): void {
    const players = this.entityManager.query(['player', 'transform']);
    
    for (const player of players) {
      const nearbyEnemies = this.spatialGrid.getNearby(
        player.transform.x,
        player.transform.y,
        player.transform.radius + 50
      );

      for (const enemy of nearbyEnemies) {
        if (this.checkCircleCollision(player, enemy)) {
          this.eventBus.emit(GameEvent.COLLISION_PLAYER_ENEMY, {
            player,
            enemy,
            timestamp: Date.now()
          });
        }
      }
    }
  }

  private checkCircleCollision(a: any, b: any): boolean {
    const dx = a.transform.x - b.transform.x;
    const dy = a.transform.y - b.transform.y;
    const distSq = dx * dx + dy * dy;
    const radiusSum = a.transform.radius + b.transform.radius;
    return distSq <= radiusSum * radiusSum;
  }
}
```

---

## 🔧 重构步骤 6: 实体管理器

### EntityManager.ts

```typescript
// client/src/entities/EntityManager.ts
export type EntityId = string;
export type ComponentType = string;

export interface Entity {
  id: EntityId;
  components: Map<ComponentType, any>;
}

export class EntityManager {
  private entities: Map<EntityId, Entity> = new Map();
  private nextId = 0;

  create(components: Record<string, any>): EntityId {
    const id = `entity_${this.nextId++}`;
    const componentMap = new Map(Object.entries(components));
    
    this.entities.set(id, {
      id,
      components: componentMap
    });

    return id;
  }

  destroy(id: EntityId): void {
    this.entities.delete(id);
  }

  get(id: EntityId): Entity | undefined {
    return this.entities.get(id);
  }

  addComponent(id: EntityId, type: ComponentType, component: any): void {
    const entity = this.entities.get(id);
    if (entity) {
      entity.components.set(type, component);
    }
  }

  removeComponent(id: EntityId, type: ComponentType): void {
    const entity = this.entities.get(id);
    if (entity) {
      entity.components.delete(type);
    }
  }

  query(componentTypes: ComponentType[]): Entity[] {
    const results: Entity[] = [];
    
    for (const entity of this.entities.values()) {
      const hasAll = componentTypes.every(type => 
        entity.components.has(type)
      );
      
      if (hasAll) {
        results.push(entity);
      }
    }

    return results;
  }

  clear(): void {
    this.entities.clear();
    this.nextId = 0;
  }
}
```

---

## 🔧 重构步骤 7: 通用对象池

### ObjectPool.ts

```typescript
// client/src/pools/ObjectPool.ts
export interface Poolable {
  reset(): void;
}

export class ObjectPool<T extends Poolable> {
  private pool: T[] = [];
  private active = new Set<T>();
  private factory: () => T;
  private maxSize: number;

  constructor(factory: () => T, preload = 0, maxSize = 1000) {
    this.factory = factory;
    this.maxSize = maxSize;
    
    // 预热对象池
    for (let i = 0; i < preload; i++) {
      this.pool.push(factory());
    }
  }

  acquire(): T {
    let obj: T;
    
    if (this.pool.length > 0) {
      obj = this.pool.pop()!;
    } else {
      obj = this.factory();
    }
    
    this.active.add(obj);
    return obj;
  }

  release(obj: T): void {
    if (!this.active.has(obj)) {
      console.warn('Trying to release object not from this pool');
      return;
    }
    
    this.active.delete(obj);
    obj.reset();
    
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj);
    }
  }

  releaseAll(): void {
    this.active.forEach(obj => {
      obj.reset();
      if (this.pool.length < this.maxSize) {
        this.pool.push(obj);
      }
    });
    this.active.clear();
  }

  getStats() {
    return {
      pooled: this.pool.length,
      active: this.active.size,
      total: this.pool.length + this.active.size
    };
  }

  clear(): void {
    this.pool = [];
    this.active.clear();
  }
}

// 使用示例
class Bullet implements Poolable {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  
  reset(): void {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
  }
}

const bulletPool = new ObjectPool(
  () => new Bullet(),
  100, // 预创建100个
  500  // 最多缓存500个
);
```

---

## 🔧 重构步骤 8: 配置管理器

### ConfigManager.ts

```typescript
// client/src/config/ConfigManager.ts
import { EventBus, GameEvent } from '../core/EventBus';

export class ConfigManager {
  private config: any = {};
  private eventBus: EventBus;

  constructor(eventBus: EventBus, defaults: any) {
    this.eventBus = eventBus;
    this.config = { ...defaults };
  }

  async loadFromURL(url: string): Promise<void> {
    try {
      const response = await fetch(url);
      const external = await response.json();
      this.merge(external);
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  }

  merge(newConfig: any): void {
    this.config = this.deepMerge(this.config, newConfig);
    this.eventBus.emit('CONFIG_CHANGED', this.config);
  }

  get<T = any>(path: string, defaultValue?: T): T {
    const keys = path.split('.');
    let value: any = this.config;
    
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) {
        return defaultValue as T;
      }
    }
    
    return value as T;
  }

  set(path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let target: any = this.config;
    
    for (const key of keys) {
      if (!(key in target)) {
        target[key] = {};
      }
      target = target[key];
    }
    
    target[lastKey] = value;
    this.eventBus.emit('CONFIG_CHANGED', { path, value });
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] instanceof Object && key in target) {
        result[key] = this.deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
}
```

---

## 🔧 重构步骤 9: 使用新架构

### 新的初始化代码

```typescript
// client/src/pages/Game.tsx (重构后)
import { Engine } from '../core/Engine';
import { EntityManager } from '../entities/EntityManager';
import { InputSystem } from '../systems/InputSystem';
import { PhysicsSystem } from '../systems/PhysicsSystem';
import { CollisionSystem } from '../systems/CollisionSystem';
import { RenderSystem } from '../systems/RenderSystem';
import { ConfigManager } from '../config/ConfigManager';
import { GAME_CONFIG } from '../gameConfig';

function initGame(canvas: HTMLCanvasElement): Engine {
  // 创建引擎
  const engine = new Engine(canvas);
  const eventBus = engine.getEventBus();
  
  // 配置管理
  const config = new ConfigManager(eventBus, GAME_CONFIG);
  
  // 实体管理
  const entityManager = new EntityManager();
  
  // 添加系统（按优先级）
  engine.addSystem(new InputSystem(canvas));           // 优先级 1
  engine.addSystem(new PhysicsSystem(entityManager));   // 优先级 2
  engine.addSystem(new CollisionSystem(               // 优先级 3
    entityManager,
    canvas.width,
    canvas.height
  ));
  engine.addSystem(new RenderSystem(canvas, entityManager)); // 优先级 4
  
  // 监听事件
  eventBus.on(GameEvent.PLAYER_DEATH, () => {
    console.log('Player died!');
    engine.stop();
  });
  
  eventBus.on(GameEvent.COLLISION_BULLET_ENEMY, (data) => {
    // 处理碰撞
    applyDamage(data.enemy, data.bullet.damage);
  });
  
  return engine;
}
```

---

## 📊 重构前后对比

### 代码复杂度

| 指标 | 重构前 | 重构后 | 改善 |
|------|--------|--------|------|
| GameEngine.ts 行数 | 1097 | ~150 | 86% ↓ |
| 最大函数行数 | 200+ | <50 | 75% ↓ |
| 循环复杂度 | 25+ | <10 | 60% ↓ |
| 类职责数 | 10+ | 1-2 | 80% ↓ |

### 可测试性

```typescript
// 重构前：无法测试
// GameEngine 依赖 Canvas, 所有系统耦合在一起

// 重构后：轻松测试
describe('CollisionSystem', () => {
  it('should detect circle collision', () => {
    const entityManager = new EntityManager();
    const system = new CollisionSystem(entityManager, 800, 600);
    
    const bullet = entityManager.create({
      bullet: true,
      transform: { x: 10, y: 10, radius: 5 }
    });
    
    const enemy = entityManager.create({
      enemy: true,
      transform: { x: 12, y: 12, radius: 5 }
    });
    
    system.update(16);
    
    // 验证碰撞事件被触发
    expect(collisionEvents).toHaveLength(1);
  });
});
```

---

## ✅ 检查清单

### 重构完成后应该能够：

- [ ] 在 <5秒内理解每个文件的职责
- [ ] 修改一个系统不影响其他系统
- [ ] 为每个系统编写单元测试
- [ ] 添加新系统只需实现 System 接口
- [ ] 通过配置文件调整游戏参数
- [ ] 追踪所有事件的历史记录
- [ ] 暂停/恢复任意系统
- [ ] 添加新实体类型不修改核心代码
- [ ] 对象池化所有频繁创建的对象
- [ ] 游戏在不同帧率下表现一致

---

## 🎓 最佳实践建议

### 1. 保持系统独立
```typescript
// ❌ 错误：系统直接依赖其他系统
class PhysicsSystem {
  constructor(private collisionSystem: CollisionSystem) {}
}

// ✅ 正确：通过事件通信
class PhysicsSystem {
  constructor(private eventBus: EventBus) {
    this.eventBus.on(GameEvent.COLLISION, this.handleCollision);
  }
}
```

### 2. 使用类型安全的事件
```typescript
// 定义事件数据类型
interface PlayerDamageEvent {
  playerId: EntityId;
  damage: number;
  source: EntityId;
  timestamp: number;
}

// 类型安全的发送和接收
eventBus.emit<PlayerDamageEvent>(GameEvent.PLAYER_DAMAGE, {
  playerId: 'player_1',
  damage: 10,
  source: 'enemy_5',
  timestamp: Date.now()
});
```

### 3. 渐进式重构
不要一次性重写所有代码，而是：
1. 先创建新架构的骨架
2. 逐个迁移系统（从最独立的开始）
3. 保持旧代码和新代码并存
4. 使用功能开关切换新旧实现
5. 充分测试后删除旧代码

---

## 📚 参考资源

- [Game Programming Patterns](https://gameprogrammingpatterns.com/)
- [Entity Component System](https://en.wikipedia.org/wiki/Entity_component_system)
- [Fix Your Timestep](https://gafferongames.com/post/fix_your_timestep/)
- [Object Pool Pattern](https://sourcemaking.com/design_patterns/object_pool)

---

**文档版本**: 1.0  
**最后更新**: 2025-11-08  
**适用项目**: super-warrior-game

