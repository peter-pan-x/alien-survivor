/**
 * 敌人ID生成器
 * 为每个敌人分配唯一ID，用于子弹穿透系统追踪
 */

export class EnemyIdGenerator {
  private nextId: number = 1;

  /**
   * 获取下一个敌人ID
   */
  public getNextId(): number {
    return this.nextId++;
  }

  /**
   * 重置ID生成器
   */
  public reset(): void {
    this.nextId = 1;
  }
}

// 创建全局实例
export const enemyIdGenerator = new EnemyIdGenerator();