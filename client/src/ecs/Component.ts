/**
 * ECS 架构 - 组件定义
 * 定义游戏中常用的组件类型
 */

/**
 * 位置组件
 */
export interface PositionComponent {
  x: number;
  y: number;
}

/**
 * 速度组件
 */
export interface VelocityComponent {
  vx: number;
  vy: number;
}

/**
 * 渲染组件
 */
export interface RenderComponent {
  sprite?: string[];
  colors?: Record<string, string>;
  radius: number;
  color?: string;
  visible: boolean;
}

/**
 * 生命值组件
 */
export interface HealthComponent {
  current: number;
  max: number;
}

/**
 * 碰撞组件
 */
export interface ColliderComponent {
  radius: number;
  layer: string; // 碰撞层: 'player' | 'enemy' | 'bullet' | 'tree'
  mask: string[]; // 可碰撞的层
}

/**
 * 玩家控制组件
 */
export interface PlayerControlComponent {
  moveSpeed: number;
  attackSpeed: number;
  attackDamage: number;
  attackRange: number;
}

/**
 * AI组件
 */
export interface AIComponent {
  type: 'chase' | 'shooter' | 'patrol';
  targetEntityId?: number;
  lastActionTime: number;
}

/**
 * 子弹组件
 */
export interface BulletComponent {
  damage: number;
  pierce: boolean;
  pierceCount: number;
  currentPierceCount: number;
  hitEntities: Set<number>;
  isEnemyBullet: boolean;
}

/**
 * 生命周期组件
 */
export interface LifetimeComponent {
  createdAt: number;
  duration: number; // 毫秒，-1 表示永久
}

/**
 * 组件名称常量
 */
export const ComponentNames = {
  POSITION: 'position',
  VELOCITY: 'velocity',
  RENDER: 'render',
  HEALTH: 'health',
  COLLIDER: 'collider',
  PLAYER_CONTROL: 'playerControl',
  AI: 'ai',
  BULLET: 'bullet',
  LIFETIME: 'lifetime',
} as const;
