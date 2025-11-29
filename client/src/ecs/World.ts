/**
 * ECS 架构 - 世界管理器
 * World 负责管理所有实体和系统
 */

import { Entity, EntityId, resetEntityIdCounter } from './Entity';
import { System, RenderSystem } from './System';

/**
 * ECS 世界管理器
 */
export class World {
  private entities: Map<EntityId, Entity> = new Map();
  private systems: System[] = [];
  private renderSystems: RenderSystem[] = [];
  private entitiesToAdd: Entity[] = [];
  private entitiesToRemove: EntityId[] = [];

  /**
   * 创建新实体
   */
  public createEntity(): Entity {
    const entity = new Entity();
    this.entitiesToAdd.push(entity);
    return entity;
  }

  /**
   * 添加已存在的实体
   */
  public addEntity(entity: Entity): void {
    this.entitiesToAdd.push(entity);
  }

  /**
   * 标记实体待删除
   */
  public removeEntity(entityId: EntityId): void {
    this.entitiesToRemove.push(entityId);
  }

  /**
   * 获取实体
   */
  public getEntity(entityId: EntityId): Entity | undefined {
    return this.entities.get(entityId);
  }

  /**
   * 获取所有实体
   */
  public getAllEntities(): Entity[] {
    return Array.from(this.entities.values());
  }

  /**
   * 根据标签获取实体
   */
  public getEntitiesByTag(tag: string): Entity[] {
    return this.getAllEntities().filter(e => e.hasTag(tag));
  }

  /**
   * 根据组件获取实体
   */
  public getEntitiesWithComponents(...componentNames: string[]): Entity[] {
    return this.getAllEntities().filter(entity =>
      componentNames.every(name => entity.hasComponent(name))
    );
  }

  /**
   * 添加系统
   */
  public addSystem(system: System): void {
    system.init();
    if (system instanceof RenderSystem) {
      this.renderSystems.push(system);
      this.renderSystems.sort((a, b) => a.priority - b.priority);
    } else {
      this.systems.push(system);
      this.systems.sort((a, b) => a.priority - b.priority);
    }
  }

  /**
   * 移除系统
   */
  public removeSystem(system: System): void {
    const index = this.systems.indexOf(system);
    if (index !== -1) {
      system.destroy();
      this.systems.splice(index, 1);
    }

    const renderIndex = this.renderSystems.indexOf(system as RenderSystem);
    if (renderIndex !== -1) {
      system.destroy();
      this.renderSystems.splice(renderIndex, 1);
    }
  }

  /**
   * 更新所有系统
   */
  public update(deltaTime: number): void {
    // 处理待添加的实体
    for (const entity of this.entitiesToAdd) {
      this.entities.set(entity.id, entity);
    }
    this.entitiesToAdd = [];

    // 处理待删除的实体
    for (const entityId of this.entitiesToRemove) {
      this.entities.delete(entityId);
    }
    this.entitiesToRemove = [];

    // 更新所有系统
    const allEntities = this.getAllEntities();
    for (const system of this.systems) {
      if (system.enabled) {
        const matchingEntities = allEntities.filter(e => system.matchesEntity(e));
        system.update(matchingEntities, deltaTime);
      }
    }
  }

  /**
   * 渲染所有渲染系统
   */
  public render(): void {
    const allEntities = this.getAllEntities();
    for (const system of this.renderSystems) {
      if (system.enabled) {
        const matchingEntities = allEntities.filter(e => system.matchesEntity(e));
        system.render(matchingEntities);
      }
    }
  }

  /**
   * 清空世界
   */
  public clear(): void {
    for (const system of [...this.systems, ...this.renderSystems]) {
      system.destroy();
    }
    this.entities.clear();
    this.systems = [];
    this.renderSystems = [];
    this.entitiesToAdd = [];
    this.entitiesToRemove = [];
    resetEntityIdCounter();
  }

  /**
   * 获取实体数量
   */
  public getEntityCount(): number {
    return this.entities.size;
  }
}

/**
 * 导出单例世界实例
 */
export const world = new World();
