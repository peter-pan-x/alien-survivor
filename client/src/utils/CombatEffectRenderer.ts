import { ParticlePool } from "./ParticlePool";

export type ProjectileElement = "normal" | "frost" | "flame";

/**
 * Draws combat-only visual effects. Keeping these routines outside GameEngine
 * makes it easier to iterate on projectile and status-effect art.
 */
export class CombatEffectRenderer {
  static drawEnergyShard(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    vx: number,
    vy: number,
    coreColor: string,
    edgeColor: string,
    element: ProjectileElement = "normal"
  ): void {
    const angle = Math.atan2(vy, vx);
    const length = Math.max(12, radius * 5.4);
    const thickness = Math.max(4, radius * 1.45);
    const pixel = 2;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = "rgba(2, 6, 23, 0.34)";
    ctx.fillRect(-length * 0.38, thickness * 0.95, length * 0.72, pixel);

    ctx.fillStyle = edgeColor;
    ctx.fillRect(-length * 0.52, -pixel, length * 0.72, pixel * 2);
    ctx.fillRect(length * 0.1, -thickness * 0.5, length * 0.42, thickness);

    ctx.fillStyle = coreColor;
    ctx.fillRect(-length * 0.12, -pixel * 2, length * 0.42, pixel * 4);
    ctx.fillRect(length * 0.38, -pixel, pixel * 3, pixel * 2);

    ctx.fillStyle = "#e0f2fe";
    ctx.fillRect(-length * 0.02, -pixel, pixel * 2, pixel);

    if (element === "frost") {
      this.drawFrostShardTrail(ctx, length, thickness, pixel);
    } else if (element === "flame") {
      ctx.fillStyle = "rgba(251, 146, 60, 0.62)";
      ctx.fillRect(-length * 0.76, -pixel, length * 0.24, pixel * 2);
      ctx.fillStyle = "rgba(254, 202, 202, 0.75)";
      ctx.fillRect(-length * 0.54, pixel, pixel * 2, pixel);
    }

    ctx.restore();
  }

  static createFrostImpact(
    particlePool: ParticlePool,
    x: number,
    y: number,
    radius: number
  ): void {
    const shardCount = Math.max(8, Math.min(18, Math.round(radius * 0.8)));

    particlePool.createExplosion(x, y, "#7dd3fc", shardCount, 2.2, 38, 2.4);
    particlePool.createExplosion(x, y, "#e0f2fe", Math.ceil(shardCount * 0.45), 1.2, 28, 1.6);

    for (let i = 0; i < 4; i++) {
      const angle = -Math.PI / 2 + (i - 1.5) * 0.42 + (Math.random() - 0.5) * 0.16;
      const speed = 1.3 + Math.random() * 1.1;
      particlePool.acquire(
        x + Math.cos(angle) * radius * 0.2,
        y + Math.sin(angle) * radius * 0.2,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 0.7,
        "#f8fafc",
        42,
        2
      );
    }
  }

  static drawFrozenEnemyOverlay(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    frozenUntil: number
  ): void {
    const now = Date.now();
    const remaining = Math.max(0, frozenUntil - now);
    const flicker = Math.floor(now / 96) % 2;
    const r = radius;
    const shellAlpha = 0.24 + flicker * 0.05;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = `rgba(56, 189, 248, ${shellAlpha})`;
    ctx.beginPath();
    ctx.ellipse(x, y - r * 0.05, r * 0.9, r * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(191, 219, 254, 0.86)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y - r * 0.05, r * 0.96, r * 0.78, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(14, 165, 233, 0.62)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.52, r * 1.04, r * 0.24, 0, 0, Math.PI * 2);
    ctx.stroke();

    const crackAlpha = remaining < 450 ? 0.95 : 0.72;
    ctx.strokeStyle = `rgba(240, 249, 255, ${crackAlpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.28, y - r * 0.58);
    ctx.lineTo(x - r * 0.08, y - r * 0.26);
    ctx.lineTo(x - r * 0.18, y + r * 0.02);
    ctx.moveTo(x + r * 0.24, y - r * 0.42);
    ctx.lineTo(x + r * 0.04, y - r * 0.12);
    ctx.lineTo(x + r * 0.22, y + r * 0.16);
    ctx.stroke();

    for (let i = 0; i < 5; i++) {
      const phase = (now * 0.0012 + i * 0.23) % 1;
      const side = i % 2 === 0 ? -1 : 1;
      const px = x + side * r * (0.22 + i * 0.07) + Math.sin(now * 0.002 + i) * 3;
      const py = y - r * 0.72 + phase * r * 1.24;
      const size = i % 3 === 0 ? 3 : 2;
      ctx.fillStyle = `rgba(240, 249, 255, ${0.82 - phase * 0.38})`;
      ctx.fillRect(Math.round(px - size / 2), Math.round(py - size / 2), size, size);
    }

    ctx.restore();
  }

  static drawEnemySporeBullet(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    vx: number,
    vy: number
  ): void {
    const angle = Math.atan2(vy, vx);
    const size = Math.max(8, radius * 3.2);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
    ctx.fillRect(-size * 0.5, size * 0.45, size, 2);

    ctx.fillStyle = "#4c0519";
    ctx.fillRect(-size * 0.45, -size * 0.35, size * 0.85, size * 0.7);
    ctx.fillStyle = "#e11d48";
    ctx.fillRect(-size * 0.28, -size * 0.22, size * 0.56, size * 0.44);
    ctx.fillStyle = "#fb7185";
    ctx.fillRect(size * 0.04, -size * 0.22, 3, 3);
    ctx.restore();
  }

  private static drawFrostShardTrail(
    ctx: CanvasRenderingContext2D,
    length: number,
    thickness: number,
    pixel: number
  ): void {
    ctx.fillStyle = "rgba(14, 165, 233, 0.58)";
    ctx.fillRect(-length * 0.82, -pixel, length * 0.32, pixel * 2);
    ctx.fillStyle = "rgba(186, 230, 253, 0.78)";
    ctx.fillRect(-length * 0.62, -thickness * 0.78, pixel * 2, pixel * 2);
    ctx.fillRect(-length * 0.42, thickness * 0.42, pixel * 2, pixel * 2);
    ctx.fillStyle = "#f0f9ff";
    ctx.fillRect(length * 0.52, -pixel * 2, pixel, pixel);
    ctx.fillRect(length * 0.54, pixel, pixel, pixel);
  }
}
