import { Enemy, Bullet } from "../gameTypes";
import { GAME_CONFIG } from "../gameConfig";

/**
 * 空间网格 - 优化碰撞检测性能
 * 将游戏空间划分为网格，只检测相邻网格中的对象
 */
export class SpatialGrid {
  private cellSize: number;
  private width: number;
  private height: number;
  private cols: number;
  private rows: number;
  private grid: Map<string, Enemy[]>;

  constructor(width: number, height: number, cellSize: number = 100) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.cols = Math.ceil(width / cellSize);
    this.rows = Math.ceil(height / cellSize);
    this.grid = new Map();
  }

  /**
   * 清空网格
   */
  clear(): void {
    this.grid.clear();
  }

  /**
   * 获取网格键
   */
  private getKey(x: number, y: number): string {
    const col = Math.floor(x / this.cellSize);
    const row = Math.floor(y / this.cellSize);
    return `${col},${row}`;
  }

  /**
   * 添加敌人到网格
   */
  insert(enemy: Enemy): void {
    const key = this.getKey(enemy.x, enemy.y);
    if (!this.grid.has(key)) {
      this.grid.set(key, []);
    }
    this.grid.get(key)!.push(enemy);
  }

  /**
   * 获取指定位置附近的所有敌人
   */
  getNearby(x: number, y: number, radius: number = 0): Enemy[] {
    const nearby: Enemy[] = [];
    const col = Math.floor(x / this.cellSize);
    const row = Math.floor(y / this.cellSize);

    // 检查当前格子及周围8个格子
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${col + dx},${row + dy}`;
        const enemies = this.grid.get(key);
        if (enemies) {
          nearby.push(...enemies);
        }
      }
    }

    return nearby;
  }

  /**
   * 检测子弹与敌人的碰撞
   */
  checkBulletCollisions(
    bullet: Bullet,
    onCollision: (enemy: Enemy) => void
  ): void {
    const nearby = this.getNearby(bullet.x, bullet.y, bullet.radius);

    for (const enemy of nearby) {
      const dx = bullet.x - enemy.x;
      const dy = bullet.y - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < bullet.radius + enemy.radius) {
        onCollision(enemy);
      }
    }
  }

  /**
   * 检测玩家与敌人的碰撞
   */
  checkPlayerCollisions(
    playerX: number,
    playerY: number,
    playerRadius: number,
    onCollision: (enemy: Enemy) => void
  ): void {
    const nearby = this.getNearby(playerX, playerY, playerRadius);

    for (const enemy of nearby) {
      const dx = playerX - enemy.x;
      const dy = playerY - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const enemyEffectiveRadius = enemy.radius * (GAME_CONFIG.COLLISION?.ENEMY_VS_PLAYER_ENEMY_RADIUS_MULTIPLIER ?? 0.85);
      if (distance < playerRadius + enemyEffectiveRadius) {
        onCollision(enemy);
      }
    }
  }

  /**
   * 调试：绘制网格
   */
  debugDraw(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = "rgba(255, 0, 0, 0.2)";
    ctx.lineWidth = 1;

    for (let x = 0; x <= this.width; x += this.cellSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }

    for (let y = 0; y <= this.height; y += this.cellSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    // 显示每个格子中的敌人数量
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.font = "10px monospace";
    this.grid.forEach((enemies, key) => {
      const [col, row] = key.split(",").map(Number);
      const x = col * this.cellSize + 5;
      const y = row * this.cellSize + 15;
      ctx.fillText(`${enemies.length}`, x, y);
    });
  }
}
