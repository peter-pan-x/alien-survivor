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
    const r = radius;
    const pulse = (Math.sin(now * 0.009) + 1) * 0.5;
    const thawing = remaining < 450;
    const halfWidth = r * (1.04 + pulse * 0.025);
    const top = y - r * (1.08 + pulse * 0.02);
    const bottom = y + r * 0.92;
    const centerY = y - r * 0.04;

    const diamondPath = (scale: number = 1): void => {
      ctx.beginPath();
      ctx.moveTo(x, centerY + (top - centerY) * scale);
      ctx.lineTo(x + halfWidth * scale, centerY);
      ctx.lineTo(x, centerY + (bottom - centerY) * scale);
      ctx.lineTo(x - halfWidth * scale, centerY);
      ctx.closePath();
    };

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.lineJoin = "miter";

    // Dark cyan back plate separates the ice silhouette from bright enemies.
    ctx.fillStyle = "rgba(3, 30, 48, 0.46)";
    diamondPath(1.08);
    ctx.fill();

    // Four translucent facets make the shell read as a cut crystal.
    ctx.fillStyle = `rgba(56, 189, 248, ${0.2 + pulse * 0.04})`;
    diamondPath();
    ctx.fill();

    ctx.fillStyle = "rgba(186, 230, 253, 0.2)";
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x + halfWidth, centerY);
    ctx.lineTo(x + r * 0.08, centerY + r * 0.12);
    ctx.lineTo(x - r * 0.08, centerY - r * 0.08);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(14, 165, 233, 0.17)";
    ctx.beginPath();
    ctx.moveTo(x - halfWidth, centerY);
    ctx.lineTo(x, bottom);
    ctx.lineTo(x + r * 0.06, centerY + r * 0.12);
    ctx.lineTo(x - r * 0.08, centerY - r * 0.08);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = `rgba(224, 242, 254, ${0.82 + pulse * 0.12})`;
    ctx.lineWidth = Math.max(2, Math.round(r * 0.08));
    diamondPath();
    ctx.stroke();

    ctx.strokeStyle = "rgba(14, 165, 233, 0.72)";
    ctx.lineWidth = Math.max(1, Math.round(r * 0.045));
    diamondPath(0.82);
    ctx.stroke();

    // Crystal seams converge off-center so the shell does not look like a flat icon.
    const coreX = x - r * 0.08;
    const coreY = centerY + r * 0.08;
    ctx.strokeStyle = "rgba(186, 230, 253, 0.54)";
    ctx.beginPath();
    ctx.moveTo(coreX, coreY);
    ctx.lineTo(x, top);
    ctx.moveTo(coreX, coreY);
    ctx.lineTo(x + halfWidth, centerY);
    ctx.moveTo(coreX, coreY);
    ctx.lineTo(x, bottom);
    ctx.moveTo(coreX, coreY);
    ctx.lineTo(x - halfWidth, centerY);
    ctx.stroke();

    // The final moments brighten the angular cracks before the shell breaks.
    ctx.strokeStyle = thawing ? "rgba(255, 255, 255, 0.96)" : "rgba(240, 249, 255, 0.62)";
    ctx.lineWidth = thawing ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.16, top + r * 0.28);
    ctx.lineTo(x + r * 0.02, centerY - r * 0.28);
    ctx.lineTo(x - r * 0.12, centerY - r * 0.02);
    ctx.lineTo(x + r * 0.08, centerY + r * 0.18);
    ctx.moveTo(x + halfWidth * 0.72, centerY);
    ctx.lineTo(x + r * 0.34, centerY + r * 0.08);
    ctx.lineTo(x + r * 0.18, centerY + r * 0.42);
    ctx.stroke();

    // Two asymmetric chips add life without repeating a screen-door pattern.
    ctx.fillStyle = "rgba(125, 211, 252, 0.78)";
    ctx.beginPath();
    ctx.moveTo(x - halfWidth * 0.88, centerY + r * 0.1);
    ctx.lineTo(x - halfWidth * 1.12, centerY + r * 0.28);
    ctx.lineTo(x - halfWidth * 0.78, centerY + r * 0.36);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(224, 242, 254, 0.86)";
    ctx.beginPath();
    ctx.moveTo(x + halfWidth * 0.5, centerY - r * 0.5);
    ctx.lineTo(x + halfWidth * 0.68, centerY - r * 0.68);
    ctx.lineTo(x + halfWidth * 0.74, centerY - r * 0.36);
    ctx.closePath();
    ctx.fill();

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
