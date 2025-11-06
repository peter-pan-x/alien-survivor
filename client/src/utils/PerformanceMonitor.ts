/**
 * 性能监控工具
 * 用于监控游戏的 FPS 和性能指标
 */
export class PerformanceMonitor {
  private fps: number = 0;
  private frameCount: number = 0;
  private lastTime: number = Date.now();
  private enabled: boolean = false;

  // 性能统计
  private updateTime: number = 0;
  private renderTime: number = 0;
  private updateCount: number = 0;
  private renderCount: number = 0;

  constructor(enabled: boolean = false) {
    this.enabled = enabled;
  }

  /**
   * 启用/禁用监控
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 更新 FPS 计数
   */
  public update(): void {
    if (!this.enabled) return;

    this.frameCount++;
    const now = Date.now();
    if (now - this.lastTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastTime = now;
    }
  }

  /**
   * 记录更新时间
   */
  public recordUpdateTime(time: number): void {
    if (!this.enabled) return;
    this.updateTime += time;
    this.updateCount++;
  }

  /**
   * 记录渲染时间
   */
  public recordRenderTime(time: number): void {
    if (!this.enabled) return;
    this.renderTime += time;
    this.renderCount++;
  }

  /**
   * 获取 FPS
   */
  public getFPS(): number {
    return this.fps;
  }

  /**
   * 获取平均更新时间 (毫秒)
   */
  public getAvgUpdateTime(): number {
    if (this.updateCount === 0) return 0;
    return this.updateTime / this.updateCount;
  }

  /**
   * 获取平均渲染时间 (毫秒)
   */
  public getAvgRenderTime(): number {
    if (this.renderCount === 0) return 0;
    return this.renderTime / this.renderCount;
  }

  /**
   * 重置统计数据
   */
  public reset(): void {
    this.updateTime = 0;
    this.renderTime = 0;
    this.updateCount = 0;
    this.renderCount = 0;
  }

  /**
   * 渲染性能信息到画布
   */
  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.enabled) return;

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(10, 60, 180, 90);

    ctx.fillStyle = "#fff";
    ctx.font = "12px monospace";
    ctx.textAlign = "left";

    ctx.fillText(`FPS: ${this.fps}`, 15, 75);
    ctx.fillText(
      `Update: ${this.getAvgUpdateTime().toFixed(2)}ms`,
      15,
      90
    );
    ctx.fillText(
      `Render: ${this.getAvgRenderTime().toFixed(2)}ms`,
      15,
      105
    );

    // 性能警告
    if (this.fps < 30) {
      ctx.fillStyle = "#ef4444";
      ctx.fillText("⚠ Low FPS", 15, 120);
    } else if (this.fps < 50) {
      ctx.fillStyle = "#f59e0b";
      ctx.fillText("⚠ Medium FPS", 15, 120);
    } else {
      ctx.fillStyle = "#10b981";
      ctx.fillText("✓ Good FPS", 15, 120);
    }

    ctx.fillStyle = "#888";
    ctx.font = "10px monospace";
    ctx.fillText("Press P to toggle", 15, 140);

    ctx.restore();
  }
}
