import { Particle } from "../gameTypes";

/**
 * 粒子对象池 - 复用粒子对象以提升性能
 */
export class ParticlePool {
  private pool: Particle[] = [];
  private active: Particle[] = [];
  private maxPoolSize: number;

  constructor(maxPoolSize: number = 200) {
    this.maxPoolSize = maxPoolSize;
  }

  /**
   * 从对象池获取粒子，如果池为空则创建新粒子
   */
  acquire(
    x: number,
    y: number,
    vx: number,
    vy: number,
    color: string,
    life: number,
    radius: number
  ): Particle {
    let particle: Particle;

    if (this.pool.length > 0) {
      particle = this.pool.pop()!;
      particle.x = x;
      particle.y = y;
      particle.vx = vx;
      particle.vy = vy;
      particle.color = color;
      particle.life = life;
      particle.maxLife = life;
      particle.radius = radius;
    } else {
      particle = {
        x,
        y,
        vx,
        vy,
        color,
        life,
        maxLife: life,
        radius,
      };
    }

    this.active.push(particle);
    return particle;
  }

  /**
   * 释放粒子回对象池
   */
  release(particle: Particle): void {
    if (this.pool.length < this.maxPoolSize) {
      this.pool.push(particle);
    }
  }

  /**
   * 更新所有活跃粒子
   */
  update(deltaTime: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.release(p);
        this.active.splice(i, 1);
      }
    }
  }

  /**
   * 渲染所有活跃粒子
   */
  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.active) {
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = p.color.replace(")", `, ${alpha})`).replace("rgb", "rgba");
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * 获取活跃粒子数量
   */
  getActiveCount(): number {
    return this.active.length;
  }

  /**
   * 清空所有粒子
   */
  clear(): void {
    this.active = [];
    this.pool = [];
  }

  /**
   * 创建粒子效果（使用配置默认值）
   */
  createParticles(
    x: number,
    y: number,
    color: string,
    count: number
  ): void {
    const baseSpeed = 2;
    const speedVariance = 2;
    const life = 30;
    const radius = 3;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = baseSpeed + Math.random() * speedVariance;
      this.acquire(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color,
        life,
        radius
      );
    }
  }

  /**
   * 创建粒子爆炸效果（完全自定义参数）
   */
  createExplosion(
    x: number,
    y: number,
    color: string,
    count: number,
    speed: number,
    life: number,
    radius: number
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const particleSpeed = speed + Math.random() * speed;
      this.acquire(
        x,
        y,
        Math.cos(angle) * particleSpeed,
        Math.sin(angle) * particleSpeed,
        color,
        life,
        radius
      );
    }
  }
}

