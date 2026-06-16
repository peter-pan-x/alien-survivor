/**
 * 经验球系统
 * 管理经验球的生成、移动和拾取
 */

// 经验球系统配置

export interface ExpOrb {
  x: number;
  y: number;
  value: number;       // 经验值
  radius: number;      // 碰撞半径
  createdAt: number;   // 创建时间
  magnetized: boolean; // 是否被磁吸
  vx: number;          // 速度X
  vy: number;          // 速度Y
}

/**
 * 经验球系统配置
 */
export const EXP_ORB_CONFIG = {
  // 基础配置
  BASE_RADIUS: 3,              // 经验球基础半径（小颗粒）
  BASE_PICKUP_RANGE: 100,      // 基础拾取范围（翻倍：50→100）
  MAGNET_SPEED: 8,             // 磁吸速度
  LIFETIME: 30000,             // 经验球存在时间（30秒）
  
  // 视觉效果
  GLOW_RADIUS: 6,              // 发光半径（缩小）
  PULSE_SPEED: 0.008,          // 脉冲速度（加快）
  
  // 经验球大小等级（根据经验值）
  SIZE_THRESHOLDS: {
    SMALL: 1,    // 1-2 经验
    MEDIUM: 3,   // 3-5 经验
    LARGE: 6,    // 6+ 经验
  },
  
  // 颜色配置
  COLORS: {
    SMALL: "#84cc16",
    MEDIUM: "#65a30d",
    LARGE: "#bef264",
    CORE: "#ecfccb",
    GLOW: "rgba(132, 204, 22, 0.34)",
  },
};

/**
 * 经验球管理系统
 */
export class ExpOrbSystem {
  private orbs: ExpOrb[] = [];
  private pickupRange: number = EXP_ORB_CONFIG.BASE_PICKUP_RANGE;

  constructor() {
    this.reset();
  }

  /**
   * 重置系统
   */
  public reset(): void {
    this.orbs = [];
    this.pickupRange = EXP_ORB_CONFIG.BASE_PICKUP_RANGE;
  }

  /**
   * 设置拾取范围
   */
  public setPickupRange(range: number): void {
    this.pickupRange = range;
  }

  /**
   * 获取当前拾取范围
   */
  public getPickupRange(): number {
    return this.pickupRange;
  }

  /**
   * 增加拾取范围
   */
  public increasePickupRange(amount: number): void {
    this.pickupRange += amount;
  }

  /**
   * 生成经验球
   */
  public spawnOrb(x: number, y: number, expValue: number): void {
    // 根据经验值确定大小
    let radius = EXP_ORB_CONFIG.BASE_RADIUS;
    if (expValue >= EXP_ORB_CONFIG.SIZE_THRESHOLDS.LARGE) {
      radius = EXP_ORB_CONFIG.BASE_RADIUS * 1.5;
    } else if (expValue >= EXP_ORB_CONFIG.SIZE_THRESHOLDS.MEDIUM) {
      radius = EXP_ORB_CONFIG.BASE_RADIUS * 1.2;
    }

    // 添加随机偏移，避免重叠
    const offsetX = (Math.random() - 0.5) * 20;
    const offsetY = (Math.random() - 0.5) * 20;

    const orb: ExpOrb = {
      x: x + offsetX,
      y: y + offsetY,
      value: expValue,
      radius,
      createdAt: Date.now(),
      magnetized: false,
      vx: 0,
      vy: 0,
    };

    this.orbs.push(orb);
  }

  /**
   * 更新经验球状态
   */
  public update(
    playerX: number,
    playerY: number,
    deltaTime: number
  ): number {
    const now = Date.now();
    let totalExpCollected = 0;
    const collectedIndices: number[] = [];

    for (let i = 0; i < this.orbs.length; i++) {
      const orb = this.orbs[i];

      // 检查是否过期
      if (now - orb.createdAt > EXP_ORB_CONFIG.LIFETIME) {
        collectedIndices.push(i);
        continue;
      }

      // 计算与玩家的距离
      const dx = playerX - orb.x;
      const dy = playerY - orb.y;
      const distanceSq = dx * dx + dy * dy;
      const distance = Math.sqrt(distanceSq);

      // 检查是否在拾取范围内
      if (distance <= this.pickupRange) {
        orb.magnetized = true;
      }

      // 磁吸移动
      if (orb.magnetized) {
        if (distance > 5) {
          // 向玩家移动
          const speed = EXP_ORB_CONFIG.MAGNET_SPEED * deltaTime;
          orb.vx = (dx / distance) * speed;
          orb.vy = (dy / distance) * speed;
          orb.x += orb.vx;
          orb.y += orb.vy;
        } else {
          // 足够近，收集经验
          totalExpCollected += orb.value;
          collectedIndices.push(i);
        }
      }
    }

    // 移除已收集的经验球（从后向前删除）
    for (let i = collectedIndices.length - 1; i >= 0; i--) {
      this.orbs.splice(collectedIndices[i], 1);
    }

    return totalExpCollected;
  }

  /**
   * 渲染经验球
   */
  public render(ctx: CanvasRenderingContext2D): void {
    const now = Date.now();

    for (const orb of this.orbs) {
      ctx.save();

      // 计算脉冲效果
      const pulsePhase = (now - orb.createdAt) * EXP_ORB_CONFIG.PULSE_SPEED;
      const pulseFactor = 1 + Math.sin(pulsePhase) * 0.2;
      const displayRadius = orb.radius * pulseFactor;

      const color = orb.value >= EXP_ORB_CONFIG.SIZE_THRESHOLDS.LARGE
        ? EXP_ORB_CONFIG.COLORS.LARGE
        : orb.value >= EXP_ORB_CONFIG.SIZE_THRESHOLDS.MEDIUM
          ? EXP_ORB_CONFIG.COLORS.MEDIUM
          : EXP_ORB_CONFIG.COLORS.SMALL;

      ctx.fillStyle = "rgba(0, 0, 0, 0.34)";
      ctx.beginPath();
      ctx.ellipse(orb.x + 2, orb.y + displayRadius * 1.1, displayRadius * 1.8, displayRadius * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();

      // 绘制发光效果（统一绿色）
      const gradient = ctx.createRadialGradient(
        orb.x, orb.y, 0,
        orb.x, orb.y, displayRadius * 1.5
      );
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.6, color + "60");
      gradient.addColorStop(1, "transparent");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, displayRadius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // 绘制 45 度鸟瞰晶核：菱形主体 + 高光像素
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(orb.x, orb.y - displayRadius * 1.3);
      ctx.lineTo(orb.x + displayRadius * 1.15, orb.y);
      ctx.lineTo(orb.x, orb.y + displayRadius * 1.3);
      ctx.lineTo(orb.x - displayRadius * 1.15, orb.y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = EXP_ORB_CONFIG.COLORS.CORE;
      ctx.fillRect(
        Math.floor(orb.x - displayRadius * 0.25),
        Math.floor(orb.y - displayRadius * 0.85),
        Math.max(2, Math.floor(displayRadius * 0.45)),
        Math.max(2, Math.floor(displayRadius * 0.45))
      );

      ctx.restore();
    }
  }

  /**
   * 获取所有经验球
   */
  public getOrbs(): ExpOrb[] {
    return this.orbs;
  }

  /**
   * 获取经验球数量
   */
  public getOrbCount(): number {
    return this.orbs.length;
  }

  /**
   * 磁吸所有经验球（技能效果）
   */
  public magnetizeAll(): void {
    for (const orb of this.orbs) {
      orb.magnetized = true;
    }
  }
}
