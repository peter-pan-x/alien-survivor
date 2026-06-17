import { GAME_CONFIG } from "../gameConfig";
import { BACKGROUND_ECOLOGY } from "./BackgroundEcologyConfig";

/**
 * 背景渲染器 - 支持无尽地图的平铺背景
 * 简单高效：只渲染可见区域，使用模运算实现无限重复
 */
export class BackgroundRenderer {
  private width: number;
  private height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  /**
   * 绘制无限滚动背景
   * @param ctx 画布上下文
   * @param cameraX 相机世界坐标X
   * @param cameraY 相机世界坐标Y
   */
  draw(ctx: CanvasRenderingContext2D, cameraX: number = 0, cameraY: number = 0): void {
    // 填充背景色
    ctx.fillStyle = "#07131c";
    ctx.fillRect(0, 0, this.width, this.height);

    // 计算相机偏移（用于无限平铺）
    const yScale = GAME_CONFIG.RENDERING.ISOMETRIC_Y_SCALE ?? 1;

    const glow = ctx.createRadialGradient(
      this.width * 0.46,
      this.height * 0.42,
      0,
      this.width * 0.46,
      this.height * 0.42,
      Math.max(this.width, this.height) * 0.7
    );
    glow.addColorStop(0, "rgba(12, 94, 105, 0.34)");
    glow.addColorStop(0.45, "rgba(7, 25, 38, 0.36)");
    glow.addColorStop(1, "rgba(2, 6, 14, 0.72)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, this.width, this.height);

    // 低对比地形层：碎石、裂缝和微光晶尘，跟随相机轻微滚动
    const patchSize = BACKGROUND_ECOLOGY.terrain.cell;
    const terrainStartCol = Math.floor(cameraX / patchSize) - BACKGROUND_ECOLOGY.terrain.paddingCells;
    const terrainEndCol = Math.floor((cameraX + this.width) / patchSize) + BACKGROUND_ECOLOGY.terrain.paddingCells;
    const cameraYScreen = cameraY * yScale;
    const terrainStartRow = Math.floor(cameraYScreen / patchSize) - BACKGROUND_ECOLOGY.terrain.paddingCells;
    const terrainEndRow = Math.floor((cameraYScreen + this.height) / patchSize) + BACKGROUND_ECOLOGY.terrain.paddingCells;
    for (let row = terrainStartRow; row <= terrainEndRow; row++) {
      for (let col = terrainStartCol; col <= terrainEndCol; col++) {
        const n = this.hash2(col, row, 3);
        if (n < BACKGROUND_ECOLOGY.terrain.activeThreshold) continue;

        const worldX = col * patchSize + Math.floor(this.hash2(col, row, 4) * patchSize);
        const worldY = row * patchSize + Math.floor(this.hash2(col, row, 5) * patchSize);
        const px = this.worldToScreenX(worldX, cameraX);
        const py = Math.floor(worldY - cameraYScreen);

        if (n > BACKGROUND_ECOLOGY.terrain.pebbleThreshold) {
          this.drawBackgroundPebbles(ctx, px, py, n);
        } else {
          this.drawTerrainScars(ctx, px, py, n);
        }
      }
    }

    this.drawAlienMoss(ctx, cameraX, cameraY);
    this.drawSparseMicroGrowth(ctx, cameraX, cameraY);
    this.drawMidgroundClusters(ctx, cameraX, cameraY);

    // 轻微边缘暗角，贴近参考图的战场聚焦感
    const vignette = ctx.createRadialGradient(
      this.width / 2,
      this.height / 2,
      Math.min(this.width, this.height) * 0.25,
      this.width / 2,
      this.height / 2,
      Math.max(this.width, this.height) * 0.68
    );
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.42)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, this.width, this.height);

    // 前景黑色剪影曾用于包边，但移动时容易被误读成黑色十字长条，暂时关闭。
  }

  private hash2(x: number, y: number, salt: number = 0): number {
    const seed = Math.sin(x * 127.1 + y * 311.7 + salt * 74.7) * 43758.5453123;
    return seed - Math.floor(seed);
  }

  private worldToScreenX(worldX: number, cameraX: number): number {
    return Math.floor(worldX - cameraX);
  }

  private worldToScreenY(worldY: number, cameraY: number): number {
    const yScale = GAME_CONFIG.RENDERING.ISOMETRIC_Y_SCALE ?? 1;
    return Math.floor(worldY - cameraY * yScale);
  }

  private pickInt(seed: number, min: number, max: number): number {
    return min + Math.floor(seed * (max - min + 1));
  }

  /**
   * 调整背景尺寸（窗口大小改变时）
   */
  resize(width: number, height: number): void {
    if (this.width === width && this.height === height) return;
    this.width = width;
    this.height = height;
  }

  private drawBackgroundPebbles(ctx: CanvasRenderingContext2D, x: number, y: number, seed: number): void {
    const count = 1 + Math.floor(seed * 2);
    ctx.save();
    for (let i = 0; i < count; i++) {
      const px = Math.floor(x + Math.sin(seed * 19 + i) * 12);
      const py = Math.floor(y + Math.cos(seed * 23 + i) * 6);
      const size = 2 + Math.floor(seed * 3 + i) % 3;
      ctx.fillStyle = i % 2 === 0 ? "rgba(31, 58, 68, 0.32)" : "rgba(11, 34, 45, 0.42)";
      ctx.fillRect(px, py, size, Math.max(2, size - 1));
      ctx.fillStyle = "rgba(3, 9, 15, 0.22)";
      ctx.fillRect(px + 1, py + size, Math.max(2, size - 1), 1);
    }
    ctx.restore();
  }

  private drawTerrainScars(ctx: CanvasRenderingContext2D, x: number, y: number, seed: number): void {
    ctx.save();
    ctx.strokeStyle = seed > 0.82 ? "rgba(19, 78, 74, 0.16)" : "rgba(30, 64, 75, 0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.floor(x), Math.floor(y));
    ctx.lineTo(Math.floor(x + 5 + seed * 8), Math.floor(y + 2 + seed * 3));
    ctx.lineTo(Math.floor(x + 9 + seed * 10), Math.floor(y + 1));
    ctx.stroke();

    if (seed > 0.88) {
      ctx.fillStyle = "rgba(45, 212, 191, 0.05)";
      ctx.fillRect(Math.floor(x + 2), Math.floor(y - 3), 2, 2);
    }
    ctx.restore();
  }

  private drawSparseMicroGrowth(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    const cfg = BACKGROUND_ECOLOGY.microGrowth;
    const cell = cfg.cell;
    const yScale = GAME_CONFIG.RENDERING.ISOMETRIC_Y_SCALE ?? 1;
    const cameraYScreen = cameraY * yScale;
    const startCol = Math.floor(cameraX / cell) - cfg.paddingCells;
    const endCol = Math.floor((cameraX + this.width) / cell) + cfg.paddingCells;
    const startRow = Math.floor(cameraYScreen / cell) - cfg.paddingCells;
    const endRow = Math.floor((cameraYScreen + this.height) / cell) + cfg.paddingCells;

    ctx.save();
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const clusterRoll = this.hash2(col, row, 300);
        if (clusterRoll < cfg.activeThreshold) continue;

        const worldX = col * cell + Math.floor(this.hash2(col, row, 301) * cell);
        const worldY = row * cell + Math.floor(this.hash2(col, row, 302) * cell);
        const anchorX = this.worldToScreenX(worldX, cameraX);
        const anchorY = this.worldToScreenY(worldY, cameraY);
        const sproutCount = this.pickInt(this.hash2(col, row, 303), cfg.minSprouts, cfg.maxSprouts);
        const spread = cfg.minSpread + this.hash2(col, row, 304) * (cfg.maxSpread - cfg.minSpread);

        for (let i = 0; i < sproutCount; i++) {
          const angle = this.hash2(col, row, 320 + i) * Math.PI * 2;
          const dist = Math.pow(this.hash2(col, row, 340 + i), cfg.distanceExponent) * spread;
          const x = Math.floor(anchorX + Math.cos(angle) * dist);
          const y = Math.floor(anchorY + Math.sin(angle) * dist * 0.42);
          const h = 3 + Math.floor(this.hash2(col, row, 360 + i) * 8);
          const tone = this.hash2(col, row, 380 + i);

          ctx.fillStyle = tone > 0.72 ? "rgba(132, 204, 22, 0.22)" : "rgba(34, 211, 238, 0.2)";
          ctx.fillRect(x, y - h, 1 + Math.floor(tone * 2), h);
          if (tone > 0.46) {
            ctx.fillStyle = "rgba(7, 89, 133, 0.18)";
            ctx.fillRect(x - 2, y + 2, 5, 1);
          }
        }
      }
    }
    ctx.restore();
  }

  private drawAlienMoss(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    const cfg = BACKGROUND_ECOLOGY.moss;
    const cell = cfg.cell;
    const yScale = GAME_CONFIG.RENDERING.ISOMETRIC_Y_SCALE ?? 1;
    const cameraYScreen = cameraY * yScale;
    const startCol = Math.floor(cameraX / cell) - cfg.paddingCells;
    const endCol = Math.floor((cameraX + this.width) / cell) + cfg.paddingCells;
    const startRow = Math.floor(cameraYScreen / cell) - cfg.paddingCells;
    const endRow = Math.floor((cameraYScreen + this.height) / cell) + cfg.paddingCells;

    ctx.save();
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const n = this.hash2(col, row, 11);
        if (n < cfg.activeThreshold) continue;

        const spread = cfg.minSpread + Math.floor(this.hash2(col, row, 12) * (cfg.maxSpread - cfg.minSpread));
        const worldX = col * cell + Math.floor(this.hash2(col, row, 13) * cell);
        const worldY = row * cell + Math.floor(this.hash2(col, row, 14) * cell);
        const px = this.worldToScreenX(worldX, cameraX);
        const py = this.worldToScreenY(worldY, cameraY);
        const clusterSize = this.pickInt(this.hash2(col, row, 15), cfg.minDots, cfg.maxDots);
        ctx.fillStyle = n > cfg.highlightThreshold ? "rgba(132, 204, 22, 0.18)" : "rgba(20, 184, 166, 0.13)";
        for (let i = 0; i < clusterSize; i++) {
          const angle = this.hash2(col, row, 20 + i) * Math.PI * 2;
          const dist = this.hash2(col, row, 40 + i) * spread;
          const dotX = px + Math.floor(Math.cos(angle) * dist);
          const dotY = py + Math.floor(Math.sin(angle) * dist * 0.42);
          const dotW = 2 + Math.floor(this.hash2(col, row, 60 + i) * 5);
          const dotH = 1 + Math.floor(this.hash2(col, row, 80 + i) * 3);
          ctx.fillRect(dotX, dotY, dotW, dotH);
        }
        ctx.fillStyle = "rgba(5, 46, 22, 0.12)";
        ctx.fillRect(px - 8, py + 5, 12 + Math.floor(n * 18), 1);
      }
    }
    ctx.restore();
  }

  private drawMidgroundClusters(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    const cfg = BACKGROUND_ECOLOGY.midground;
    const cell = cfg.cell;
    const yScale = GAME_CONFIG.RENDERING.ISOMETRIC_Y_SCALE ?? 1;
    const cameraYScreen = cameraY * yScale;
    const startCol = Math.floor(cameraX / cell) - cfg.paddingCells;
    const endCol = Math.floor((cameraX + this.width) / cell) + cfg.paddingCells;
    const startRow = Math.floor(cameraYScreen / cell) - cfg.paddingCells;
    const endRow = Math.floor((cameraYScreen + this.height) / cell) + cfg.paddingCells;

    ctx.save();
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const n = this.hash2(col, row, 101);
        if (n < cfg.activeThreshold) continue;

        const worldX = col * cell + Math.floor(this.hash2(col, row, 102) * cell);
        const worldY = row * cell + Math.floor(this.hash2(col, row, 103) * cell);
        const px = this.worldToScreenX(worldX, cameraX);
        const py = this.worldToScreenY(worldY, cameraY);
        const typeRoll = this.hash2(col, row, 104);
        const type = typeRoll > cfg.crystalThreshold ? 0 : typeRoll > cfg.sporeThreshold ? 1 : 2;
        const footprint = cfg.minFootprint + Math.floor(this.hash2(col, row, 105) * (cfg.maxFootprint - cfg.minFootprint));

        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.beginPath();
        ctx.ellipse(px + 12, py + 15, footprint, Math.max(5, footprint * 0.32), 0, 0, Math.PI * 2);
        ctx.fill();

        if (type === 0) {
          this.drawDistantCrystalCluster(ctx, px, py, col, row);
        } else if (type === 1) {
          this.drawDistantSporePods(ctx, px, py, col, row);
        } else {
          this.drawDistantRockCluster(ctx, px, py, col, row);
        }
      }
    }
    ctx.restore();
  }

  private drawDistantCrystalCluster(ctx: CanvasRenderingContext2D, x: number, y: number, col: number, row: number): void {
    const cfg = BACKGROUND_ECOLOGY.distantCrystals;
    const count = this.pickInt(this.hash2(col, row, 120), cfg.minCount, cfg.maxCount);
    const spread = cfg.minSpread + Math.floor(this.hash2(col, row, 121) * (cfg.maxSpread - cfg.minSpread));
    for (let i = 0; i < count; i++) {
      const h = cfg.minHeight + Math.floor(this.hash2(col, row, 130 + i) * (cfg.maxHeight - cfg.minHeight));
      const px = Math.floor(x + (this.hash2(col, row, 140 + i) - 0.5) * spread);
      const py = Math.floor(y + (this.hash2(col, row, 150 + i) - 0.35) * spread * 0.45);
      const width = 2 + Math.floor(this.hash2(col, row, 160 + i) * 5);
      ctx.fillStyle = "rgba(8, 47, 73, 0.92)";
      ctx.fillRect(px - 2, py - h + 2, width + 3, h);
      ctx.fillStyle = i % 2 === 0 ? "rgba(34, 211, 238, 0.58)" : "rgba(132, 204, 22, 0.5)";
      ctx.fillRect(px, py - h, width, h);
      if (this.hash2(col, row, 170 + i) > 0.5) {
        ctx.fillStyle = "rgba(236, 254, 255, 0.52)";
        ctx.fillRect(px + 1, py - h + 3, 1, 2);
      }
    }
  }

  private drawDistantSporePods(ctx: CanvasRenderingContext2D, x: number, y: number, col: number, row: number): void {
    const cfg = BACKGROUND_ECOLOGY.distantSpores;
    const count = this.pickInt(this.hash2(col, row, 180), cfg.minCount, cfg.maxCount);
    const spread = cfg.minSpread + Math.floor(this.hash2(col, row, 181) * (cfg.maxSpread - cfg.minSpread));
    for (let i = 0; i < count; i++) {
      const px = Math.floor(x + (this.hash2(col, row, 190 + i) - 0.5) * spread);
      const py = Math.floor(y + (this.hash2(col, row, 200 + i) - 0.35) * spread * 0.5);
      const rx = 7 + Math.floor(this.hash2(col, row, 210 + i) * 16);
      const ry = 4 + Math.floor(this.hash2(col, row, 220 + i) * 8);
      ctx.fillStyle = "rgba(4, 47, 46, 0.95)";
      ctx.fillRect(px - 3, py + ry - 1, 5 + Math.floor(rx * 0.42), 5 + Math.floor(ry * 0.55));
      ctx.fillStyle = "rgba(20, 184, 166, 0.72)";
      ctx.beginPath();
      ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      if (this.hash2(col, row, 230 + i) > 0.4) {
        ctx.fillStyle = "rgba(204, 251, 241, 0.48)";
        ctx.fillRect(px - 2, py - ry + 1, 3, 1);
      }
    }
  }

  private drawDistantRockCluster(ctx: CanvasRenderingContext2D, x: number, y: number, col: number, row: number): void {
    const cfg = BACKGROUND_ECOLOGY.distantRocks;
    const count = this.pickInt(this.hash2(col, row, 240), cfg.minCount, cfg.maxCount);
    const spread = cfg.minSpread + Math.floor(this.hash2(col, row, 241) * (cfg.maxSpread - cfg.minSpread));
    for (let i = 0; i < count; i++) {
      const px = Math.floor(x + (this.hash2(col, row, 250 + i) - 0.5) * spread);
      const py = Math.floor(y + (this.hash2(col, row, 260 + i) - 0.35) * spread * 0.45);
      const w = 4 + Math.floor(this.hash2(col, row, 270 + i) * 24);
      const h = 3 + Math.floor(this.hash2(col, row, 280 + i) * 14);
      ctx.fillStyle = "rgba(17, 38, 48, 0.9)";
      ctx.fillRect(px, py, w, h);
      if (this.hash2(col, row, 290 + i) > 0.5) {
        ctx.fillStyle = "rgba(45, 212, 191, 0.1)";
        ctx.fillRect(px + 2, py - 1, 2 + Math.floor(w * 0.16), 1);
      }
    }
  }
}
