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
    const { BACKGROUND, GRID } = GAME_CONFIG.COLORS;

    // 填充背景色
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, this.width, this.height);

    // 计算相机偏移（用于无限平铺）
    const offsetX = cameraX % this.gridSize;
    const offsetY = cameraY % this.gridSize;

    // 绘制网格（只绘制可见范围）
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;

    // 垂直线
    for (let x = -offsetX; x <= this.width; x += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }

    // 水平线
    for (let y = -offsetY; y <= this.height; y += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    ctx.globalAlpha = 1.0;
  }

  /**
   * 调整背景尺寸（窗口大小改变时）
   */
  resize(width: number, height: number): void {
    if (this.width === width && this.height === height) return;
    this.width = width;
    this.height = height;
  }
}

