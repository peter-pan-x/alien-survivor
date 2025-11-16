/**
 * 游戏性能优化器
 * 提供全面的性能监控和优化功能
 */

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  updateTime: number;
  renderTime: number;
  memoryUsage?: number;
  drawCalls: number;
  entityCount: number;
  particleCount: number;
}

export interface OptimizationSettings {
  targetFPS: number;
  adaptiveQuality: boolean;
  particleLimit: number;
  entityLimit: number;
  cullingDistance: number;
  lodEnabled: boolean;
}

export class PerformanceOptimizer {
  private metrics: PerformanceMetrics;
  private settings: OptimizationSettings;
  private frameCount: number = 0;
  private lastTime: number = 0;
  private fpsHistory: number[] = [];
  private maxFPSHistory: number = 60;
  private isLowEndDevice: boolean = false;
  private adaptiveQualityLevel: number = 1; // 0-低, 1-中, 2-高

  constructor() {
    this.metrics = {
      fps: 60,
      frameTime: 16.67,
      updateTime: 0,
      renderTime: 0,
      drawCalls: 0,
      entityCount: 0,
      particleCount: 0,
    };

    this.settings = {
      targetFPS: 60,
      adaptiveQuality: true,
      particleLimit: 100,
      entityLimit: 200,
      cullingDistance: 1000,
      lodEnabled: true,
    };

    this.detectDeviceCapabilities();
  }

  /**
   * 检测设备性能等级
   */
  private detectDeviceCapabilities(): void {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    // 检测WebGL支持
    const hasWebGL = !!gl;
    
    // 检测内存（如果支持）
    let memoryInfo: any = null;
    if ('memory' in performance) {
      memoryInfo = (performance as any).memory;
    }
    
    // 检测CPU核心数
    const cores = navigator.hardwareConcurrency || 4;
    
    // 检测设备类型
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // 综合评估设备性能
    let score = 0;
    
    // WebGL支持 (+30分)
    if (hasWebGL) score += 30;
    
    // CPU核心数 (+20分)
    score += Math.min(20, cores * 5);
    
    // 内存大小 (+25分)
    if (memoryInfo && memoryInfo.jsHeapSizeLimit) {
      const memoryGB = memoryInfo.jsHeapSizeLimit / (1024 * 1024 * 1024);
      score += Math.min(25, memoryGB * 5);
    }
    
    // 移动设备扣分 (-15分)
    if (isMobile) score -= 15;
    
    // 低端设备判定
    this.isLowEndDevice = score < 40;
    
    // 根据设备性能调整设置
    if (this.isLowEndDevice) {
      this.settings.targetFPS = 30;
      this.settings.particleLimit = 50;
      this.settings.entityLimit = 100;
      this.settings.cullingDistance = 600;
      this.adaptiveQualityLevel = 0;
    } else if (score > 70) {
      this.settings.targetFPS = 60;
      this.settings.particleLimit = 200;
      this.settings.entityLimit = 300;
      this.settings.cullingDistance = 1200;
      this.adaptiveQualityLevel = 2;
    }
    
    console.log(`[PerformanceOptimizer] Device score: ${score}, Low-end: ${this.isLowEndDevice}`);
  }

  /**
   * 更新性能指标
   */
  public updateMetrics(deltaTime: number, updateTime: number, renderTime: number): void {
    this.frameCount++;
    const currentTime = performance.now();
    
    // 计算FPS
    if (currentTime - this.lastTime >= 1000) {
      this.metrics.fps = this.frameCount;
      this.frameCount = 0;
      this.lastTime = currentTime;
      
      // 更新FPS历史
      this.fpsHistory.push(this.metrics.fps);
      if (this.fpsHistory.length > this.maxFPSHistory) {
        this.fpsHistory.shift();
      }
      
      // 自适应质量调整
      if (this.settings.adaptiveQuality) {
        this.adjustQuality();
      }
    }
    
    this.metrics.frameTime = deltaTime;
    this.metrics.updateTime = updateTime;
    this.metrics.renderTime = renderTime;
    
    // 获取内存使用情况
    if ('memory' in performance) {
      const memoryInfo = (performance as any).memory;
      this.metrics.memoryUsage = memoryInfo.usedJSHeapSize / (1024 * 1024); // MB
    }
  }

  /**
   * 自适应质量调整
   */
  private adjustQuality(): void {
    const avgFPS = this.getAverageFPS();
    const targetFPS = this.settings.targetFPS;
    
    if (avgFPS < targetFPS * 0.8) {
      // 性能不足，降低质量
      if (this.adaptiveQualityLevel > 0) {
        this.adaptiveQualityLevel--;
        this.applyQualitySettings();
        console.log(`[PerformanceOptimizer] 降低质量到等级 ${this.adaptiveQualityLevel}`);
      }
    } else if (avgFPS > targetFPS * 1.1) {
      // 性能充足，提升质量
      if (this.adaptiveQualityLevel < 2) {
        this.adaptiveQualityLevel++;
        this.applyQualitySettings();
        console.log(`[PerformanceOptimizer] 提升质量到等级 ${this.adaptiveQualityLevel}`);
      }
    }
  }

  /**
   * 应用质量设置
   */
  private applyQualitySettings(): void {
    switch (this.adaptiveQualityLevel) {
      case 0: // 低质量
        this.settings.particleLimit = 30;
        this.settings.entityLimit = 80;
        this.settings.cullingDistance = 500;
        break;
      case 1: // 中等质量
        this.settings.particleLimit = 100;
        this.settings.entityLimit = 200;
        this.settings.cullingDistance = 800;
        break;
      case 2: // 高质量
        this.settings.particleLimit = 200;
        this.settings.entityLimit = 300;
        this.settings.cullingDistance = 1200;
        break;
    }
  }

  /**
   * 获取平均FPS
   */
  public getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return 60;
    const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
    return sum / this.fpsHistory.length;
  }

  /**
   * 获取性能等级
   */
  public getPerformanceGrade(): 'A' | 'B' | 'C' | 'D' | 'F' {
    const avgFPS = this.getAverageFPS();
    const targetFPS = this.settings.targetFPS;
    
    const ratio = avgFPS / targetFPS;
    if (ratio >= 0.95) return 'A';
    if (ratio >= 0.85) return 'B';
    if (ratio >= 0.70) return 'C';
    if (ratio >= 0.50) return 'D';
    return 'F';
  }

  /**
   * 获取当前指标
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * 获取当前设置
   */
  public getSettings(): OptimizationSettings {
    return { ...this.settings };
  }

  /**
   * 更新实体数量
   */
  public updateEntityCount(count: number): void {
    this.metrics.entityCount = count;
  }

  /**
   * 更新粒子数量
   */
  public updateParticleCount(count: number): void {
    this.metrics.particleCount = count;
  }

  /**
   * 更新绘制调用次数
   */
  public updateDrawCalls(count: number): void {
    this.metrics.drawCalls = count;
  }

  /**
   * 检查是否应该进行视锥剔除
   */
  public shouldCull(distance: number): boolean {
    return this.settings.lodEnabled && distance > this.settings.cullingDistance;
  }

  /**
   * 检查是否应该限制粒子生成
   */
  public shouldLimitParticles(): boolean {
    return this.metrics.particleCount >= this.settings.particleLimit;
  }

  /**
   * 检查是否应该限制实体生成
   */
  public shouldLimitEntities(): boolean {
    return this.metrics.entityCount >= this.settings.entityLimit;
  }

  /**
   * 获取LOD等级
   */
  public getLODLevel(distance: number): number {
    if (!this.settings.lodEnabled) return 2;
    
    if (distance < 200) return 2; // 高质量
    if (distance < 500) return 1; // 中等质量
    return 0; // 低质量
  }

  /**
   * 渲染性能调试信息
   */
  public renderDebugInfo(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const metrics = this.metrics;
    const grade = this.getPerformanceGrade();
    const gradeColor = grade === 'A' ? '#10b981' : 
                      grade === 'B' ? '#3b82f6' : 
                      grade === 'C' ? '#f59e0b' : 
                      grade === 'D' ? '#f97316' : '#ef4444';
    
    ctx.save();
    ctx.font = '12px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    
    const lines = [
      `FPS: ${metrics.fps} (${grade})`,
      `Frame: ${metrics.frameTime.toFixed(2)}ms`,
      `Update: ${metrics.updateTime.toFixed(2)}ms`,
      `Render: ${metrics.renderTime.toFixed(2)}ms`,
      `Entities: ${metrics.entityCount}/${this.settings.entityLimit}`,
      `Particles: ${metrics.particleCount}/${this.settings.particleLimit}`,
      `Draw Calls: ${metrics.drawCalls}`,
      `Quality: ${['Low', 'Medium', 'High'][this.adaptiveQualityLevel]}`,
    ];
    
    if (metrics.memoryUsage) {
      lines.push(`Memory: ${metrics.memoryUsage.toFixed(1)}MB`);
    }
    
    // 背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x - 5, y - 5, 150, lines.length * 15 + 10);
    
    // 文本
    lines.forEach((line, index) => {
      ctx.fillStyle = line.includes('FPS') ? gradeColor : '#ffffff';
      ctx.fillText(line, x, y + index * 15);
    });
    
    ctx.restore();
  }

  /**
   * 导出性能报告
   */
  public exportReport(): string {
    const metrics = this.metrics;
    const settings = this.settings;
    const grade = this.getPerformanceGrade();
    
    return `
性能报告
==================
设备信息:
- 低端设备: ${this.isLowEndDevice}
- 自适应质量: ${this.settings.adaptiveQuality}
- 质量等级: ${this.adaptiveQualityLevel}

性能指标:
- FPS: ${metrics.fps} (等级: ${grade})
- 帧时间: ${metrics.frameTime.toFixed(2)}ms
- 更新时间: ${metrics.updateTime.toFixed(2)}ms
- 渲染时间: ${metrics.renderTime.toFixed(2)}ms
- 实体数量: ${metrics.entityCount}
- 粒子数量: ${metrics.particleCount}
- 绘制调用: ${metrics.drawCalls}
${metrics.memoryUsage ? `- 内存使用: ${metrics.memoryUsage.toFixed(1)}MB` : ''}

优化设置:
- 目标FPS: ${settings.targetFPS}
- 粒子限制: ${settings.particleLimit}
- 实体限制: ${settings.entityLimit}
- 剔除距离: ${settings.cullingDistance}
- LOD启用: ${settings.lodEnabled}
==================
    `.trim();
  }

  /**
   * 重置统计数据
   */
  public reset(): void {
    this.frameCount = 0;
    this.lastTime = 0;
    this.fpsHistory = [];
    this.adaptiveQualityLevel = this.isLowEndDevice ? 0 : 1;
    this.applyQualitySettings();
  }
}

// 创建全局实例
export const performanceOptimizer = new PerformanceOptimizer();