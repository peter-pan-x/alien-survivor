import { Bullet } from "../gameTypes";

/**
 * 子弹对象池 - 复用子弹对象以减少GC压力
 * 子弹频繁创建和销毁，使用对象池可以显著提升性能
 */
export class BulletPool {
  private pool: Bullet[] = [];
  private active: Bullet[] = [];
  private maxPoolSize: number;

  constructor(maxPoolSize: number = 500) {
    this.maxPoolSize = maxPoolSize;
  }

  /**
   * 从对象池获取子弹，如果池为空则创建新子弹
   */
  acquire(
    x: number,
    y: number,
    vx: number,
    vy: number,
    radius: number,
    damage: number,
    pierce?: boolean,
    pierceCount?: number,
    pierceDamageReduction?: number,
    isEnemyBullet?: boolean,
    startX?: number,
    startY?: number,
    maxDistance?: number
  ): Bullet {
    let bullet: Bullet;

    if (this.pool.length > 0) {
      // 从池中复用
      bullet = this.pool.pop()!;
      bullet.x = x;
      bullet.y = y;
      bullet.vx = vx;
      bullet.vy = vy;
      bullet.radius = radius;
      bullet.damage = damage;
      bullet.pierce = pierce;
      bullet.pierceCount = pierceCount;
      bullet.currentPierceCount = 0;
      bullet.pierceDamageReduction = pierceDamageReduction;
      bullet.hitEnemies = pierce ? new Set() : undefined;
      bullet.originalDamage = damage;
      bullet.isEnemyBullet = isEnemyBullet;
      bullet.startX = startX;
      bullet.startY = startY;
      bullet.maxDistance = maxDistance;
    } else {
      // 创建新子弹
      bullet = {
        x,
        y,
        vx,
        vy,
        radius,
        damage,
        pierce,
        pierceCount,
        currentPierceCount: 0,
        pierceDamageReduction,
        hitEnemies: pierce ? new Set() : undefined,
        originalDamage: damage,
        isEnemyBullet,
        startX,
        startY,
        maxDistance,
      };
    }

    this.active.push(bullet);
    return bullet;
  }

  /**
   * 释放子弹回对象池
   */
  release(bullet: Bullet): void {
    // 清理引用，防止内存泄漏
    if (bullet.hitEnemies) {
      bullet.hitEnemies.clear();
    }
    
    if (this.pool.length < this.maxPoolSize) {
      this.pool.push(bullet);
    }
  }

  /**
   * 获取所有活跃子弹
   */
  getActive(): Bullet[] {
    return this.active;
  }

  /**
   * 移除超出边界或应该被删除的子弹
   * @param shouldRemove 判断函数，返回true表示应该移除
   */
  removeIf(shouldRemove: (bullet: Bullet) => boolean): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      if (shouldRemove(this.active[i])) {
        this.release(this.active[i]);
        this.active.splice(i, 1);
      }
    }
  }

  /**
   * 移除指定子弹
   */
  remove(bullet: Bullet): void {
    const index = this.active.indexOf(bullet);
    if (index !== -1) {
      this.release(bullet);
      this.active.splice(index, 1);
    }
  }

  /**
   * 获取活跃子弹数量
   */
  getActiveCount(): number {
    return this.active.length;
  }

  /**
   * 清空所有子弹
   */
  clear(): void {
    // 将所有活跃子弹释放回池中
    for (const bullet of this.active) {
      this.release(bullet);
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

