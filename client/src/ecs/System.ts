/**
 * ECS 架构 - 系统基类
 * System 负责处理具有特定组件组合的实体
 */

import { Entity } from './Entity';

/**
 * 系统基类
 */
export abstract class System {
  /** 系统优先级，数字越小越先执行 */
  public priority: number = 0;
  
  /** 系统是否启用 */
  public enabled: boolean = true;

  /** 系统所需的组件名称列表 */
  protected abstract requiredComponents: string[];

  /**
   * 检查实体是否满足系统要求
   */
  public matchesEntity(entity: Entity): boolean {
    return this.requiredComponents.every(comp => entity.hasComponent(comp));
  }

  /**
   * 系统初始化
   */
  public init(): void {
    // 子类可重写
  }

  /**
   * 系统更新（每帧调用）
   */
  public abstract update(entities: Entity[], deltaTime: number): void;

  /**
   * 系统销毁
   */
  public destroy(): void {
    // 子类可重写
  }
}

/**
 * 渲染系统基类
 */
export abstract class RenderSystem extends System {
  protected ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    super();
    this.ctx = ctx;
  }

  /**
   * 渲染方法（每帧调用）
   */
  public abstract render(entities: Entity[]): void;

  /**
   * 默认 update 实现为空
   */
  public update(_entities: Entity[], _deltaTime: number): void {
    // 渲染系统通常在 render 方法中处理
  }
}
