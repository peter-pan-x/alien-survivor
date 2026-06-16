import { GAME_CONFIG } from "../gameConfig";

/**
 * 背景渲染器 - 支持无尽地图的平铺背景
 * 简单高效：只渲染可见区域，使用模运算实现无限重复
 */
export class BackgroundRenderer {
  private width: number;
  private height: number;
  private gridSize: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.gridSize = GAME_CONFIG.CANVAS.GRID_SIZE;
  }

  /**
   * 绘制无限滚动背景
   * @param ctx 画布上下文
   * @param cameraX 相机世界坐标X
   * @param cameraY 相机世界坐标Y
   */
  draw(ctx: CanvasRenderingContext2D, cameraX: number = 0, cameraY: number = 0): void {
    const { GRID } = GAME_CONFIG.COLORS;

    // 填充背景色
    ctx.fillStyle = "#07131c";
    ctx.fillRect(0, 0, this.width, this.height);

    // 计算相机偏移（用于无限平铺）
    const offsetX = cameraX % this.gridSize;
    const yScale = GAME_CONFIG.RENDERING.ISOMETRIC_Y_SCALE ?? 1;
    const offsetY = (cameraY * yScale) % this.gridSize;

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

    // 绘制 45 度鸟瞰地表网格，减少平面坐标纸感
    ctx.strokeStyle = "rgba(47, 96, 116, 0.22)";
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.55;

    const diagonalStep = this.gridSize * 2;
    const diagonalOffset = (cameraX + cameraY * yScale) % diagonalStep;
    for (let x = -this.width - diagonalOffset; x <= this.width * 2; x += diagonalStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + this.height * 1.15, this.height);
      ctx.stroke();
    }

    const reverseOffset = (cameraX - cameraY * yScale) % diagonalStep;
    for (let x = -this.width - reverseOffset; x <= this.width * 2; x += diagonalStep) {
      ctx.beginPath();
      ctx.moveTo(x + this.height * 1.15, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }

    // 低对比地形层：岩斑、裂缝和微光晶尘，跟随相机轻微滚动
    const patchSize = 72;
    const patchOffsetX = cameraX % patchSize;
    const patchOffsetY = (cameraY * yScale) % patchSize;
    for (let y = -patchOffsetY - patchSize; y < this.height + patchSize; y += patchSize) {
      for (let x = -patchOffsetX - patchSize; x < this.width + patchSize; x += patchSize) {
        const seed = Math.sin((x + cameraX) * 12.9898 + (y + cameraY) * 78.233) * 43758.5453;
        const n = seed - Math.floor(seed);
        if (n < 0.28) continue;

        const px = x + (n * 37) % 48;
        const py = y + (n * 53) % 42;
        const w = 12 + n * 28;
        const h = 4 + n * 9;
        ctx.fillStyle = n > 0.82 ? "rgba(56, 189, 248, 0.12)" : "rgba(15, 118, 110, 0.14)";
        ctx.fillRect(Math.floor(px), Math.floor(py), Math.floor(w), Math.floor(h));

        ctx.fillStyle = "rgba(2, 6, 14, 0.25)";
        ctx.fillRect(Math.floor(px + w * 0.3), Math.floor(py + h + 2), Math.floor(w * 0.7), 2);

        if (n > 0.76) {
          this.drawBackgroundCrystal(ctx, px + w * 0.58, py - h * 0.4, 2 + Math.floor(n * 3), n);
        } else if (n > 0.55) {
          this.drawBackgroundPebbles(ctx, px + w * 0.45, py + h * 0.2, n);
        }
      }
    }

    this.drawAlienMoss(ctx, cameraX, cameraY * yScale);
    this.drawMidgroundClusters(ctx, cameraX, cameraY * yScale);

    ctx.strokeStyle = GRID;
    ctx.globalAlpha = 0.12;
    for (let y = -offsetY; y <= this.height; y += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

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

    this.drawForegroundFrame(ctx, cameraX, cameraY);
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
    const count = 2 + Math.floor(seed * 4);
    ctx.save();
    ctx.fillStyle = "rgba(31, 58, 68, 0.72)";
    for (let i = 0; i < count; i++) {
      const px = Math.floor(x + Math.sin(seed * 19 + i) * 18);
      const py = Math.floor(y + Math.cos(seed * 23 + i) * 8);
      const w = 3 + Math.floor(seed * 5 + i) % 5;
      const h = 2 + Math.floor(seed * 7 + i) % 3;
      ctx.fillRect(px, py, w, h);
      ctx.fillStyle = "rgba(5, 14, 22, 0.55)";
      ctx.fillRect(px + 1, py + h, w, 1);
      ctx.fillStyle = "rgba(31, 58, 68, 0.72)";
    }
    ctx.restore();
  }

  private drawBackgroundCrystal(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    height: number,
    seed: number
  ): void {
    ctx.save();
    ctx.fillStyle = "rgba(34, 211, 238, 0.22)";
    ctx.fillRect(Math.floor(x - 1), Math.floor(y - height), 3, height + 2);
    ctx.fillStyle = seed > 0.9 ? "rgba(190, 242, 100, 0.3)" : "rgba(103, 232, 249, 0.32)";
    ctx.fillRect(Math.floor(x), Math.floor(y - height - 1), 2, Math.max(2, height));
    ctx.fillStyle = "rgba(2, 6, 14, 0.28)";
    ctx.fillRect(Math.floor(x - 3), Math.floor(y + 2), 8, 2);
    ctx.restore();
  }

  private drawAlienMoss(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    const cell = 144;
    const offsetX = cameraX % cell;
    const offsetY = cameraY % cell;

    ctx.save();
    for (let y = -offsetY - cell; y < this.height + cell; y += cell) {
      for (let x = -offsetX - cell; x < this.width + cell; x += cell) {
        const seed = Math.sin((x + cameraX) * 4.31 + (y + cameraY) * 9.73) * 9137.17;
        const n = seed - Math.floor(seed);
        if (n < 0.54) continue;

        const px = Math.floor(x + (n * 91) % 88);
        const py = Math.floor(y + (n * 47) % 64);
        ctx.fillStyle = n > 0.78 ? "rgba(132, 204, 22, 0.18)" : "rgba(20, 184, 166, 0.16)";
        ctx.fillRect(px, py, 18 + Math.floor(n * 24), 3);
        ctx.fillRect(px + 5, py - 4, 7, 2);
        ctx.fillStyle = "rgba(5, 46, 22, 0.22)";
        ctx.fillRect(px + 8, py + 4, 22, 2);
      }
    }
    ctx.restore();
  }

  private drawMidgroundClusters(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    const cell = 220;
    const offsetX = cameraX % cell;
    const offsetY = cameraY % cell;

    ctx.save();
    for (let y = -offsetY - cell; y < this.height + cell; y += cell) {
      for (let x = -offsetX - cell; x < this.width + cell; x += cell) {
        const seed = Math.sin((x + cameraX) * 5.83 + (y + cameraY) * 2.17) * 24634.6345;
        const n = seed - Math.floor(seed);
        if (n < 0.48) continue;

        const px = Math.floor(x + (n * 137) % 150);
        const py = Math.floor(y + (n * 89) % 130);
        const type = Math.floor(n * 10) % 3;

        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.beginPath();
        ctx.ellipse(px + 12, py + 15, 28, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        if (type === 0) {
          this.drawDistantCrystalCluster(ctx, px, py, n);
        } else if (type === 1) {
          this.drawDistantSporePods(ctx, px, py, n);
        } else {
          this.drawDistantRockCluster(ctx, px, py, n);
        }
      }
    }
    ctx.restore();
  }

  private drawDistantCrystalCluster(ctx: CanvasRenderingContext2D, x: number, y: number, seed: number): void {
    const count = 3 + Math.floor(seed * 4);
    for (let i = 0; i < count; i++) {
      const h = 12 + ((seed * 31 + i * 7) % 18);
      const px = Math.floor(x + i * 7 - count * 3);
      const py = Math.floor(y + (i % 2) * 4);
      ctx.fillStyle = "rgba(8, 47, 73, 0.92)";
      ctx.fillRect(px - 2, py - h + 2, 7, h);
      ctx.fillStyle = i % 2 === 0 ? "rgba(34, 211, 238, 0.72)" : "rgba(132, 204, 22, 0.62)";
      ctx.fillRect(px, py - h, 4, h);
      ctx.fillStyle = "rgba(236, 254, 255, 0.76)";
      ctx.fillRect(px + 1, py - h + 3, 2, 3);
    }
  }

  private drawDistantSporePods(ctx: CanvasRenderingContext2D, x: number, y: number, seed: number): void {
    const count = 2 + Math.floor(seed * 4);
    for (let i = 0; i < count; i++) {
      const px = Math.floor(x + i * 13 - count * 5);
      const py = Math.floor(y + (i % 2) * 7);
      ctx.fillStyle = "rgba(4, 47, 46, 0.95)";
      ctx.fillRect(px - 3, py + 4, 8, 8);
      ctx.fillStyle = "rgba(20, 184, 166, 0.72)";
      ctx.beginPath();
      ctx.ellipse(px, py, 13, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(204, 251, 241, 0.78)";
      ctx.fillRect(px - 2, py - 4, 5, 2);
    }
  }

  private drawDistantRockCluster(ctx: CanvasRenderingContext2D, x: number, y: number, seed: number): void {
    const count = 4 + Math.floor(seed * 5);
    for (let i = 0; i < count; i++) {
      const px = Math.floor(x + Math.sin(seed * 20 + i) * 22);
      const py = Math.floor(y + Math.cos(seed * 31 + i) * 12);
      const w = 8 + ((seed * 17 + i * 3) % 12);
      const h = 4 + ((seed * 11 + i * 2) % 7);
      ctx.fillStyle = "rgba(17, 38, 48, 0.9)";
      ctx.fillRect(px, py, w, h);
      ctx.fillStyle = "rgba(45, 212, 191, 0.18)";
      ctx.fillRect(px + 2, py - 1, Math.max(3, w * 0.45), 2);
    }
  }

  private drawForegroundFrame(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    const seedBase = Math.floor((cameraX + cameraY) * 0.01);
    const rand = (n: number) => {
      const seed = Math.sin((seedBase + n) * 91.731) * 43758.5453;
      return seed - Math.floor(seed);
    };

    ctx.save();
    ctx.fillStyle = "rgba(1, 7, 12, 0.62)";

    for (let i = 0; i < 18; i++) {
      const x = Math.floor((i / 17) * this.width + (rand(i) - 0.5) * 34);
      const baseY = this.height - Math.floor(rand(i + 40) * 52);
      const h = 34 + rand(i + 80) * 86;
      const w = 6 + rand(i + 120) * 14;
      ctx.fillRect(x, baseY - h, Math.max(3, w * 0.38), h);
      ctx.fillRect(x - w, baseY - h * 0.68, w * 1.8, Math.max(4, h * 0.12));
      if (rand(i + 160) > 0.45) {
        ctx.fillStyle = "rgba(20, 184, 166, 0.22)";
        ctx.fillRect(x + 2, baseY - h * 0.82, 3, 9);
        ctx.fillStyle = "rgba(1, 7, 12, 0.62)";
      }
    }

    for (let i = 0; i < 8; i++) {
      const side = i % 2 === 0 ? 0 : this.width;
      const x = side + (side === 0 ? rand(i + 200) * 32 : -rand(i + 200) * 32);
      const y = this.height * (0.22 + rand(i + 240) * 0.7);
      const length = 70 + rand(i + 280) * 90;
      const dir = side === 0 ? 1 : -1;
      ctx.fillRect(x, y, dir * length, 5 + rand(i + 300) * 7);
      ctx.fillRect(x + dir * length * 0.45, y - 18, dir * 9, 38);
    }

    ctx.restore();
  }
}
