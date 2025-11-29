import { Enemy, EnemyType } from "../gameTypes";

/**
 * 敌人对象池 - 复用敌人对象以减少GC压力
 * 敌人频繁创建和销毁，使用对象池可以显著提升性能
 */
export class EnemyPool {
  private pool: Enemy[] = [];
  private active: Enemy[] = [];
  private maxPoolSize: number;

  constructor(maxPoolSize: number = 300) {
    this.maxPoolSize = maxPoolSize;
  }

  /**
   * 从对象池获取敌人，如果池为空则创建新敌人
   */
  acquire(
    x: number,
    y: number,
    radius: number,
    health: number,
    maxHealth: number,
    speed: number,
    angle: number,
    type: EnemyType,
    id?: number,
    shootCooldown?: number
  ): Enemy {
    let enemy: Enemy;

    if (this.pool.length > 0) {
      // 从池中复用
      enemy = this.pool.pop()!;
      enemy.x = x;
      enemy.y = y;
      enemy.radius = radius;
      enemy.health = health;
      enemy.maxHealth = maxHealth;
      enemy.speed = speed;
      enemy.angle = angle;
      enemy.type = type;
      enemy.id = id;
      enemy.shootCooldown = shootCooldown;
      enemy.lastShotTime = 0;
    } else {
      // 创建新敌人
      enemy = {
        x,
        y,
        radius,
        health,
        maxHealth,
        speed,
        angle,
        type,
        id,
        shootCooldown,
        lastShotTime: 0,
      };
    }

    this.active.push(enemy);
    return enemy;
  }

  /**
   * 释放敌人回对象池
   */
  release(enemy: Enemy): void {
    // 清理数据，防止内存泄漏
    enemy.lastShotTime = 0;
    enemy.id = undefined;
    
    if (this.pool.length < this.maxPoolSize) {
      this.pool.push(enemy);
    }
  }

  /**
   * 获取所有活跃敌人
   */
  getActive(): Enemy[] {
    return this.active;
  }

  /**
   * 设置活跃敌人列表（用于与现有代码兼容）
   */
  setActive(enemies: Enemy[]): void {
    // 将旧的活跃敌人释放回池
    for (const enemy of this.active) {
      if (!enemies.includes(enemy)) {
        this.release(enemy);
      }
    }
    this.active = enemies;
  }

  /**
   * 移除应该被删除的敌人
   * @param shouldRemove 判断函数，返回true表示应该移除
   */
  removeIf(shouldRemove: (enemy: Enemy) => boolean): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      if (shouldRemove(this.active[i])) {
        this.release(this.active[i]);
        this.active.splice(i, 1);
      }
    }
  }

  /**
   * 移除指定敌人
   */
  remove(enemy: Enemy): void {
    const index = this.active.indexOf(enemy);
    if (index !== -1) {
      this.release(enemy);
      this.active.splice(index, 1);
    }
  }

  /**
   * 移除所有死亡敌人
   * @returns 移除的敌人数量
   */
  removeDeadEnemies(): number {
    const initialCount = this.active.length;
    this.removeIf((enemy) => enemy.health <= 0);
    return initialCount - this.active.length;
  }

  /**
   * 获取活跃敌人数量
   */
  getActiveCount(): number {
    return this.active.length;
  }

  /**
   * 清空所有敌人
   */
  clear(): void {
    // 将所有活跃敌人释放回池中
    for (const enemy of this.active) {
      this.release(enemy);
    }
    this.active = [];
  }

  /**
   * 完全重置对象池（包括池中的对象）
   */
  reset(): void {
    this.active = [];
    this.pool = [];
  }
}

