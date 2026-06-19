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
    const thawing = remaining < 450;
    const shimmer = (Math.sin(now * 0.008) + 1) * 0.5;
    const halfWidth = r * 0.68;
    const top = y - r * 0.6;
    const bottom = y + r * 0.64;
    const left = x - halfWidth;
    const right = x + halfWidth;
    const corner = r * 0.2;
    const pixel = Math.max(2, Math.round(r * 0.11));

    const iceShard = (cx: number, cy: number, width: number, height: number): void => {
      ctx.beginPath();
      ctx.moveTo(cx, cy - height);
      ctx.lineTo(cx + width, cy);
      ctx.lineTo(cx, cy + height * 0.36);
      ctx.lineTo(cx - width, cy);
      ctx.closePath();
    };

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.lineJoin = "miter";

    // A compact frost glaze sits on the creature instead of enclosing it.
    ctx.fillStyle = `rgba(125, 211, 252, ${0.16 + shimmer * 0.04})`;
    ctx.beginPath();
    ctx.moveTo(x - corner, top);
    ctx.lineTo(x + corner, top);
    ctx.lineTo(right, y - r * 0.18);
    ctx.lineTo(right - r * 0.04, y + r * 0.34);
    ctx.lineTo(x + corner, bottom);
    ctx.lineTo(x - corner, bottom);
    ctx.lineTo(left + r * 0.04, y + r * 0.34);
    ctx.lineTo(left, y - r * 0.18);
    ctx.closePath();
    ctx.fill();

    // One pale facet gives the glaze a glassy frozen surface.
    ctx.fillStyle = `rgba(224, 242, 254, ${0.16 + shimmer * 0.05})`;
    ctx.beginPath();
    ctx.moveTo(x - corner, top);
    ctx.lineTo(x + corner, top);
    ctx.lineTo(x + r * 0.08, y + r * 0.08);
    ctx.lineTo(x - r * 0.16, y - r * 0.02);
    ctx.closePath();
    ctx.fill();

    // Short cracks suggest ice while leaving the enemy sprite readable.
    ctx.strokeStyle = thawing ? "rgba(248, 250, 252, 0.9)" : "rgba(186, 230, 253, 0.62)";
    ctx.lineWidth = Math.max(1, Math.round(r * 0.055));
    ctx.beginPath();
    ctx.moveTo(x - r * 0.28, y - r * 0.3);
    ctx.lineTo(x - r * 0.06, y - r * 0.06);
    ctx.lineTo(x - r * 0.18, y + r * 0.18);
    ctx.moveTo(x + r * 0.34, y - r * 0.12);
    ctx.lineTo(x + r * 0.12, y + r * 0.08);
    ctx.lineTo(x + r * 0.24, y + r * 0.3);
    ctx.stroke();

    // Small asymmetric crystals match the game's chunky pixel language.
    ctx.fillStyle = "rgba(125, 211, 252, 0.78)";
    iceShard(x - r * 0.48, y + r * 0.34, r * 0.14, r * 0.3);
    ctx.fill();
    iceShard(x + r * 0.5, y + r * 0.26, r * 0.12, r * 0.24);
    ctx.fill();

    ctx.fillStyle = "rgba(240, 249, 255, 0.82)";
    ctx.fillRect(Math.round(x - r * 0.34), Math.round(y - r * 0.46), pixel, pixel);
    ctx.fillRect(Math.round(x + r * 0.28), Math.round(y + r * 0.38), pixel, pixel);

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
