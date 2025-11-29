/**
 * ECS 架构单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Entity, World, ComponentNames, System } from '../ecs';
import type { PositionComponent } from '../ecs';

describe('Entity', () => {
  it('should create entity with unique id', () => {
    const entity1 = new Entity();
    const entity2 = new Entity();
    expect(entity1.id).not.toBe(entity2.id);
  });

  it('should add and get components', () => {
    const entity = new Entity();
    const position: PositionComponent = { x: 100, y: 200 };
    
    entity.addComponent(ComponentNames.POSITION, position);
    
    const retrieved = entity.getComponent<PositionComponent>(ComponentNames.POSITION);
    expect(retrieved).toEqual(position);
  });

  it('should check component existence', () => {
    const entity = new Entity();
    expect(entity.hasComponent(ComponentNames.POSITION)).toBe(false);
    
    entity.addComponent(ComponentNames.POSITION, { x: 0, y: 0 });
    expect(entity.hasComponent(ComponentNames.POSITION)).toBe(true);
  });

  it('should remove components', () => {
    const entity = new Entity();
    entity.addComponent(ComponentNames.POSITION, { x: 0, y: 0 });
    
    expect(entity.hasComponent(ComponentNames.POSITION)).toBe(true);
    entity.removeComponent(ComponentNames.POSITION);
    expect(entity.hasComponent(ComponentNames.POSITION)).toBe(false);
  });

  it('should manage tags', () => {
    const entity = new Entity();
    
    entity.addTag('player');
    expect(entity.hasTag('player')).toBe(true);
    expect(entity.hasTag('enemy')).toBe(false);
    
    entity.removeTag('player');
    expect(entity.hasTag('player')).toBe(false);
  });
});

describe('World', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  it('should create and manage entities', () => {
    const entity = world.createEntity();
    expect(entity).toBeInstanceOf(Entity);
    
    world.update(16); // 触发实体添加
    expect(world.getEntityCount()).toBe(1);
  });

  it('should remove entities', () => {
    const entity = world.createEntity();
    world.update(16);
    
    expect(world.getEntityCount()).toBe(1);
    
    world.removeEntity(entity.id);
    world.update(16);
    
    expect(world.getEntityCount()).toBe(0);
  });

  it('should find entities by tag', () => {
    const player = world.createEntity().addTag('player');
    const enemy1 = world.createEntity().addTag('enemy');
    const enemy2 = world.createEntity().addTag('enemy');
    
    world.update(16);
    
    const enemies = world.getEntitiesByTag('enemy');
    expect(enemies.length).toBe(2);
    expect(enemies).toContain(enemy1);
    expect(enemies).toContain(enemy2);
    
    const players = world.getEntitiesByTag('player');
    expect(players.length).toBe(1);
    expect(players).toContain(player);
  });

  it('should find entities with specific components', () => {
    const entity1 = world.createEntity()
      .addComponent(ComponentNames.POSITION, { x: 0, y: 0 })
      .addComponent(ComponentNames.HEALTH, { current: 100, max: 100 });
    
    const entity2 = world.createEntity()
      .addComponent(ComponentNames.POSITION, { x: 10, y: 10 });
    
    world.update(16);
    
    const withHealth = world.getEntitiesWithComponents(ComponentNames.POSITION, ComponentNames.HEALTH);
    expect(withHealth.length).toBe(1);
    expect(withHealth).toContain(entity1);
    expect(withHealth).not.toContain(entity2);
  });

  it('should clear all entities', () => {
    world.createEntity();
    world.createEntity();
    world.createEntity();
    world.update(16);
    
    expect(world.getEntityCount()).toBe(3);
    
    world.clear();
    expect(world.getEntityCount()).toBe(0);
  });
});

describe('System', () => {
  class TestMovementSystem extends System {
    protected requiredComponents = [ComponentNames.POSITION];
    public updateCount = 0;
    
    public update(entities: Entity[], _deltaTime: number): void {
      this.updateCount += entities.length;
    }
  }

  it('should match entities with required components', () => {
    const system = new TestMovementSystem();
    
    const entityWithPosition = new Entity()
      .addComponent(ComponentNames.POSITION, { x: 0, y: 0 });
    
    const entityWithoutPosition = new Entity()
      .addComponent(ComponentNames.HEALTH, { current: 100, max: 100 });
    
    expect(system.matchesEntity(entityWithPosition)).toBe(true);
    expect(system.matchesEntity(entityWithoutPosition)).toBe(false);
  });

  it('should be called with matching entities', () => {
    const world = new World();
    const system = new TestMovementSystem();
    
    world.addSystem(system);
    
    world.createEntity().addComponent(ComponentNames.POSITION, { x: 0, y: 0 });
    world.createEntity().addComponent(ComponentNames.POSITION, { x: 10, y: 10 });
    world.createEntity().addComponent(ComponentNames.HEALTH, { current: 100, max: 100 });
    
    world.update(16);
    
    // 系统应该处理2个有 position 组件的实体
    expect(system.updateCount).toBe(2);
  });
});
