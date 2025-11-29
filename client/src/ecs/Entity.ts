/**
 * ECS 架构 - 实体基类
 * Entity-Component-System 模式的核心实体定义
 */

export type EntityId = number;

let nextEntityId = 0;

/**
 * 生成唯一的实体ID
 */
export function generateEntityId(): EntityId {
  return nextEntityId++;
}

/**
 * 重置实体ID计数器（用于游戏重置）
 */
export function resetEntityIdCounter(): void {
  nextEntityId = 0;
}

/**
 * 实体类 - ECS 中的 E
 * 实体本身只是一个 ID 容器，所有数据存储在组件中
 */
export class Entity {
  public readonly id: EntityId;
  private components: Map<string, unknown> = new Map();
  private tags: Set<string> = new Set();

  constructor(id?: EntityId) {
    this.id = id ?? generateEntityId();
  }

  /**
   * 添加组件
   */
  public addComponent<T>(componentName: string, component: T): this {
    this.components.set(componentName, component);
    return this;
  }

  /**
   * 获取组件
   */
  public getComponent<T>(componentName: string): T | undefined {
    return this.components.get(componentName) as T | undefined;
  }

  /**
   * 检查是否有指定组件
   */
  public hasComponent(componentName: string): boolean {
    return this.components.has(componentName);
  }

  /**
   * 移除组件
   */
  public removeComponent(componentName: string): boolean {
    return this.components.delete(componentName);
  }

  /**
   * 添加标签
   */
  public addTag(tag: string): this {
    this.tags.add(tag);
    return this;
  }

  /**
   * 检查是否有指定标签
   */
  public hasTag(tag: string): boolean {
    return this.tags.has(tag);
  }

  /**
   * 移除标签
   */
  public removeTag(tag: string): boolean {
    return this.tags.delete(tag);
  }

  /**
   * 获取所有组件名称
   */
  public getComponentNames(): string[] {
    return Array.from(this.components.keys());
  }
}
