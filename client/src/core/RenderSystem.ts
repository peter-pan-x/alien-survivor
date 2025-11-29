/**
 * 渲染系统
 * 负责所有游戏实体的渲染
 */

import { Player, Enemy, Boss } from "../gameTypes";
import { GAME_CONFIG } from "../gameConfig";
import { PixelRenderer, PixelSprites, PixelColors } from "../utils/PixelRenderer";
import { Camera } from "../utils/Camera";
import { BackgroundRenderer } from "../utils/BackgroundRenderer";
import { ParticlePool } from "../utils/ParticlePool";
import { DamageNumberSystem } from "../utils/DamageNumbers";
import { BulletPool } from "../utils/BulletPool";
import { WeaponSystem } from "../utils/WeaponSystem";
import { TreeSystem } from "../systems/TreeSystem";
import { BossSystem } from "../systems/BossSystem";
import { PerformanceMonitor } from "../utils/PerformanceMonitor";

export interface RenderContext {
  pixelRenderer: PixelRenderer;
  camera: Camera;
  backgroundRenderer: BackgroundRenderer;
  particlePool: ParticlePool;
  damageNumbers: DamageNumberSystem;
  bulletPool: BulletPool;
  enemyBulletPool: BulletPool;
  weaponSystem: WeaponSystem;
  treeSystem: TreeSystem;
  bossSystem: BossSystem;
  performanceMonitor: PerformanceMonitor;
}

/**
 * 渲染系统类
 */
export class RenderSystem {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  /**
   * 渲染整个游戏场景
   */
  public render(
    player: Player,
    enemies: Enemy[],
    boss: Boss | null,
    now: number,
    context: RenderContext
  ): void {
    // 绘制无限滚动背景
    context.backgroundRenderer.draw(this.ctx, context.camera.x, context.camera.y);

    // 应用相机变换
    context.camera.applyTransform(this.ctx);

    // 渲染世界空间的对象
    this.renderTrees(player, context);
    this.renderEnemies(enemies, context);
    if (boss) {
      this.renderBoss(boss, context);
    }
    this.renderBullets(context);
    this.renderPlayer(player, context);
    context.weaponSystem.renderWeapons(player, this.ctx, now);
    context.particlePool.render(this.ctx);
    context.damageNumbers.render(this.ctx);

    // 恢复变换
    context.camera.restoreTransform(this.ctx);

    // 渲染屏幕空间的UI
    context.performanceMonitor.render(this.ctx);
  }

  /**
   * 渲染树木
   */
  private renderTrees(player: Player, context: RenderContext): void {
    this.ctx.save();

    const trees = context.treeSystem.getTreesInArea(player.x, player.y, 900);
    for (const tree of trees) {
      let baseColor = "#1a5a2a";
      if (tree.type === "medium") baseColor = "#145020";
      if (tree.type === "large") baseColor = "#0d3818";

      const shade = tree.shade ?? 1;
      const color = this.adjustTreeColor(baseColor, shade);

      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(tree.x, tree.y, tree.radius, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      this.ctx.beginPath();
      this.ctx.arc(tree.x, tree.y, tree.radius * 0.7, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#3e2723';
      this.ctx.beginPath();
      this.ctx.arc(tree.x, tree.y, tree.radius * 0.15, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  /**
   * 调整树木颜色
   */
  private adjustTreeColor(baseColor: string, factor: number): string {
    const r = parseInt(baseColor.slice(1, 3), 16);
    const g = parseInt(baseColor.slice(3, 5), 16);
    const b = parseInt(baseColor.slice(5, 7), 16);

    const adjustedR = Math.min(255, Math.floor(r * factor));
    const adjustedG = Math.min(255, Math.floor(g * factor));
    const adjustedB = Math.min(255, Math.floor(b * factor));

    return `#${adjustedR.toString(16).padStart(2, '0')}${adjustedG.toString(16).padStart(2, '0')}${adjustedB.toString(16).padStart(2, '0')}`;
  }

  /**
   * 渲染敌人
   */
  private renderEnemies(enemies: Enemy[], context: RenderContext): void {
    for (const enemy of enemies) {
      this.ctx.save();

      let sprite: string[];
      let colors: Record<string, string>;

      switch (enemy.type) {
        case "swarm":
          sprite = PixelSprites.enemySwarm;
          colors = PixelColors.enemySwarm;
          break;
        case "rusher":
          sprite = PixelSprites.enemyRusher;
          colors = PixelColors.enemyRusher;
          break;
        case "shooter":
          sprite = PixelSprites.enemyShooter;
          colors = PixelColors.enemyShooter;
          break;
        case "elite":
          sprite = PixelSprites.enemyElite;
          colors = PixelColors.enemyElite;
          break;
        case "spider":
          sprite = PixelSprites.enemySpider;
          colors = PixelColors.enemySpider;
          break;
        case "crab":
          sprite = PixelSprites.enemyCrab;
          colors = PixelColors.enemyCrab;
          break;
        case "bigeye":
          sprite = PixelSprites.enemyBigEye;
          colors = PixelColors.enemyBigEye;
          break;
        case "frog":
          sprite = PixelSprites.enemyFrog;
          colors = PixelColors.enemyFrog;
          break;
        default:
          sprite = PixelSprites.enemySwarm;
          colors = PixelColors.enemySwarm;
      }

      context.pixelRenderer.drawSprite(enemy.x, enemy.y, sprite, colors);

      if (GAME_CONFIG.RENDERING.SHOW_HEALTH_BARS) {
        const barWidth = enemy.radius * 2.5;
        const barHeight = 4;
        const barY = enemy.y - enemy.radius - 10;
        context.pixelRenderer.drawPixelHealthBar(
          enemy.x, barY, barWidth, barHeight,
          enemy.health, enemy.maxHealth,
          "#1a1a1a", "#ef4444"
        );
      }

      this.ctx.restore();
    }
  }

  /**
   * 渲染Boss
   */
  private renderBoss(boss: Boss, context: RenderContext): void {
    this.ctx.save();

    const bossInfo = context.bossSystem.getBossInfo(boss.type);
    const bossColor = bossInfo?.color || "#ef4444";

    if (boss.isJumping) {
      this.ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.01) * 0.2;
      context.pixelRenderer.drawPixelCircle(
        boss.x, boss.y, boss.radius + 20,
        "transparent", bossColor
      );
      this.ctx.globalAlpha = 0.5;
      context.pixelRenderer.drawPixelCircle(
        boss.x, boss.y, boss.radius,
        "transparent", bossColor
      );
      this.ctx.globalAlpha = 1;
    }

    const bossSprite = [
      "   ███   ",
      "  █████  ",
      " ███████ ",
      "█████████",
      "█ █████ █",
      "█ █████ █",
      "  █████  ",
      " █ █ █ █ ",
    ];

    const bossColors: Record<string, string> = {
      "█": bossColor,
      " ": "transparent",
    };

    if (boss.isJumping) {
      const flash = Math.sin(Date.now() * 0.02) > 0;
      if (flash) this.ctx.globalAlpha = 0.7;
    }

    context.pixelRenderer.drawSprite(boss.x, boss.y, bossSprite, bossColors);
    this.ctx.globalAlpha = 1;

    if (GAME_CONFIG.RENDERING.SHOW_HEALTH_BARS) {
      const barWidth = boss.radius * 4;
      const barHeight = 6;
      const barY = boss.y - boss.radius - 15;
      context.pixelRenderer.drawPixelHealthBar(
        boss.x, barY, barWidth, barHeight,
        boss.health, boss.maxHealth,
        "#1a1a1a", bossColor
      );
    }

    this.ctx.restore();

    // Boss名称标签
    this.ctx.save();
    const barY = boss.y - boss.radius - 15;
    const screenPos = context.camera.worldToScreen(boss.x, barY - 20);
    this.ctx.fillStyle = bossColor;
    this.ctx.font = "bold 14px monospace";
    this.ctx.textAlign = "center";
    const bossName = boss.isJumping ? `${bossInfo?.name || "BOSS"} (跳跃中!)` : (bossInfo?.name || "BOSS");
    this.ctx.fillText(bossName, screenPos.x, screenPos.y);
    this.ctx.restore();
  }

  /**
   * 渲染子弹
   */
  private renderBullets(context: RenderContext): void {
    this.ctx.save();
    this.ctx.imageSmoothingEnabled = false;

    for (const bullet of context.bulletPool.getActive()) {
      context.pixelRenderer.drawPixelCircle(
        bullet.x, bullet.y, bullet.radius,
        GAME_CONFIG.COLORS.BULLET_GRADIENT_START,
        GAME_CONFIG.COLORS.BULLET_GRADIENT_END
      );
    }

    for (const bullet of context.enemyBulletPool.getActive()) {
      context.pixelRenderer.drawPixelCircle(
        bullet.x, bullet.y, bullet.radius,
        "#a855f7", "#7c3aed"
      );
    }

    this.ctx.restore();
  }

  /**
   * 渲染玩家
   */
  private renderPlayer(player: Player, context: RenderContext): void {
    this.ctx.save();

    context.pixelRenderer.drawSprite(
      player.x, player.y,
      PixelSprites.player,
      PixelColors.player
    );

    if (player.shield > 0) {
      context.pixelRenderer.drawPixelCircle(
        player.x, player.y,
        player.radius + GAME_CONFIG.RENDERING.SHIELD_RADIUS_OFFSET,
        "transparent",
        GAME_CONFIG.COLORS.SHIELD
      );
    }

    if (GAME_CONFIG.RENDERING.SHOW_HEALTH_BARS) {
      const barWidth = player.radius * GAME_CONFIG.RENDERING.HEALTH_BAR_WIDTH_MULTIPLIER;
      const barHeight = GAME_CONFIG.RENDERING.HEALTH_BAR_HEIGHT;
      const barY = player.y - player.radius - GAME_CONFIG.RENDERING.HEALTH_BAR_OFFSET;
      context.pixelRenderer.drawPixelHealthBar(
        player.x, barY, barWidth, barHeight,
        player.health, player.maxHealth,
        "#1a1a1a", "#10b981"
      );
    }

    this.ctx.restore();
  }
}
