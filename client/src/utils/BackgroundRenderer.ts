import { GAME_CONFIG } from "../gameConfig";

/**
 * 背景渲染器 - 使用离屏Canvas优化背景绘制性能
 */
export class BackgroundRenderer {
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.offscreenCanvas = document.createElement("canvas");
    this.offscreenCanvas.width = width;
    this.offscreenCanvas.height = height;
    this.offscreenCtx = this.offscreenCanvas.getContext("2d")!;
    this.renderBackground();
  }

  /**
   * 渲染背景到离屏Canvas（只执行一次）
   */
  private renderBackground(): void {
    const ctx = this.offscreenCtx;
    const { GRID_SIZE } = GAME_CONFIG.CANVAS;
    const { BACKGROUND, GRID } = GAME_CONFIG.COLORS;

    // 填充背景色
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, this.width, this.height);

    // 绘制网格
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;

    // 垂直线
    for (let x = 0; x < this.width; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }

    // 水平线
    for (let y = 0; y < this.height; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }
  }

  /**
   * 将背景绘制到目标Canvas
   */
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.drawImage(this.offscreenCanvas, 0, 0);
  }

  /**
   * 调整背景尺寸（窗口大小改变时）
   */
  resize(width: number, height: number): void {
    if (this.width === width && this.height === height) return;

    this.width = width;
    this.height = height;
    this.offscreenCanvas.width = width;
    this.offscreenCanvas.height = height;
    this.renderBackground();
  }
}

