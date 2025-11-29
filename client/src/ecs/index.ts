/**
 * ECS 架构模块导出
 * Entity-Component-System 模式
 */

export { Entity, generateEntityId, resetEntityIdCounter } from './Entity';
export type { EntityId } from './Entity';

export {
  ComponentNames,
} from './Component';
export type {
  PositionComponent,
  VelocityComponent,
  RenderComponent,
  HealthComponent,
  ColliderComponent,
  PlayerControlComponent,
  AIComponent,
  BulletComponent,
  LifetimeComponent,
} from './Component';

export { System, RenderSystem } from './System';

export { World, world } from './World';
