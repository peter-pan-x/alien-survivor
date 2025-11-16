/**
 * 相机系统 - 实现无尽地图的视角跟随
 * 简单高效的实现：玩家始终在屏幕中心，世界随玩家移动
 */
export class Camera {
  public x: number = 0;
  public y: number = 0;
  private width: number;
  private height: number;
  
  // 可选：相机平滑移动参数
  private smoothing: number = 0.1; // 0 = 不平滑，1 = 立即跟随
  private targetX: number = 0;
  private targetY: number = 0;

  constructor(width: number, height: number, enableSmoothing = false) {
    this.width = width;
    this.height = height;
    this.smoothing = enableSmoothing ? 0.1 : 1.0;
  }

  /**
   * 让相机跟随目标（通常是玩家）
   */
  follow(targetX: number, targetY: number): void {
    this.targetX = targetX;
    this.targetY = targetY;
    
    if (this.smoothing >= 1.0) {
      // 立即跟随（推荐用于手机游戏）
      this.x = targetX;
      this.y = targetY;
    } else {
      // 平滑跟随
      this.x += (this.targetX - this.x) * this.smoothing;
      this.y += (this.targetY - this.y) * this.smoothing;
    }
  }

  /**
   * 将世界坐标转换为屏幕坐标
   */
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX - this.x + this.width / 2,
      y: worldY - this.y + this.height / 2,
    };
  }

  /**
   * 将屏幕坐标转换为世界坐标
   */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: screenX + this.x - this.width / 2,
      y: screenY + this.y - this.height / 2,
    };
  }

  /**
   * 检查世界坐标是否在视野内（用于剔除不可见物体）
   */
  isInView(worldX: number, worldY: number, margin = 50): boolean {
    const screen = this.worldToScreen(worldX, worldY);
    return (
      screen.x >= -margin &&
      screen.x <= this.width + margin &&
      screen.y >= -margin &&
      screen.y <= this.height + margin
    );
  }

  /**
   * 获取当前视野的世界坐标边界
   */
  getViewBounds(): { left: number; right: number; top: number; bottom: number } {
    return {
      left: this.x - this.width / 2,
      right: this.x + this.width / 2,
      top: this.y - this.height / 2,
      bottom: this.y + this.height / 2,
    };
  }

  /**
   * 调整相机尺寸（窗口大小改变时）
   */
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  /**
   * 应用相机变换到Canvas上下文
   */
  applyTransform(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(-this.x + this.width / 2, -this.y + this.height / 2);
  }

  /**
   * 恢复Canvas上下文
   */
  restoreTransform(ctx: CanvasRenderingContext2D): void {
    ctx.restore();
  }
}

