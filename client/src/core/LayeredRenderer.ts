/**
 * 分层渲染系统
 * 支持多层渲染，优化静态元素缓存
 */

export enum RenderLayer {
  BACKGROUND = 0,
  TERRAIN = 1,      // 树木等地形
  ENTITIES = 2,     // 敌人、玩家
  EFFECTS = 3,      // 粒子、特效
  UI = 4,           // HUD、UI
}

interface LayerConfig {
  name: string;
  zIndex: number;
  useCache: boolean;  // 是否使用离屏缓存
  dirty: boolean;     // 是否需要重绘
}

/**
 * 分层渲染管理器
 */
export class LayeredRenderer {
  private mainCanvas: HTMLCanvasElement;
  private mainCtx: CanvasRenderingContext2D;
  private layers: Map<RenderLayer, LayerConfig> = new Map();
  private offscreenCanvases: Map<RenderLayer, HTMLCanvasElement> = new Map();
  private offscreenContexts: Map<RenderLayer, CanvasRenderingContext2D> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    this.mainCanvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.mainCtx = ctx;

    // 初始化默认层配置
    this.initDefaultLayers();
  }

  private initDefaultLayers(): void {
    this.registerLayer(RenderLayer.BACKGROUND, { name: 'Background', zIndex: 0, useCache: true, dirty: true });
    this.registerLayer(RenderLayer.TERRAIN, { name: 'Terrain', zIndex: 1, useCache: false, dirty: true });
    this.registerLayer(RenderLayer.ENTITIES, { name: 'Entities', zIndex: 2, useCache: false, dirty: true });
    this.registerLayer(RenderLayer.EFFECTS, { name: 'Effects', zIndex: 3, useCache: false, dirty: true });
    this.registerLayer(RenderLayer.UI, { name: 'UI', zIndex: 4, useCache: false, dirty: true });
  }

  /**
   * 注册渲染层
   */
  public registerLayer(layer: RenderLayer, config: LayerConfig): void {
    this.layers.set(layer, config);

    if (config.useCache) {
      const offscreen = document.createElement('canvas');
      offscreen.width = this.mainCanvas.width;
      offscreen.height = this.mainCanvas.height;
      const ctx = offscreen.getContext('2d');
      if (ctx) {
        this.offscreenCanvases.set(layer, offscreen);
        this.offscreenContexts.set(layer, ctx);
      }
    }
  }

  /**
   * 获取层的绘图上下文
   */
  public getLayerContext(layer: RenderLayer): CanvasRenderingContext2D {
    const config = this.layers.get(layer);
    if (config?.useCache) {
      const offscreenCtx = this.offscreenContexts.get(layer);
      if (offscreenCtx) return offscreenCtx;
    }
    return this.mainCtx;
  }

  /**
   * 标记层需要重绘
   */
  public markDirty(layer: RenderLayer): void {
    const config = this.layers.get(layer);
    if (config) {
      config.dirty = true;
    }
  }

  /**
   * 检查层是否需要重绘
   */
  public isDirty(layer: RenderLayer): boolean {
    const config = this.layers.get(layer);
    return config?.dirty ?? true;
  }

  /**
   * 标记层已完成重绘
   */
  public markClean(layer: RenderLayer): void {
    const config = this.layers.get(layer);
    if (config) {
      config.dirty = false;
    }
  }

  /**
   * 清除指定层
   */
  public clearLayer(layer: RenderLayer): void {
    const ctx = this.getLayerContext(layer);
    const canvas = this.offscreenCanvases.get(layer) || this.mainCanvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  /**
   * 合成所有层到主画布
   */
  public compose(): void {
    // 清除主画布
    this.mainCtx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);

    // 按 zIndex 排序并绘制
    const sortedLayers = Array.from(this.layers.entries())
      .sort((a, b) => a[1].zIndex - b[1].zIndex);

    for (const [layer, config] of sortedLayers) {
      if (config.useCache) {
        const offscreen = this.offscreenCanvases.get(layer);
        if (offscreen) {
          this.mainCtx.drawImage(offscreen, 0, 0);
        }
      }
      // 非缓存层直接绘制到主画布，不需要在这里处理
    }
  }

  /**
   * 调整画布大小
   */
  public resize(width: number, height: number): void {
    this.mainCanvas.width = width;
    this.mainCanvas.height = height;

    // 调整离屏画布大小
    for (const [layer, canvas] of this.offscreenCanvases) {
      canvas.width = width;
      canvas.height = height;
      this.markDirty(layer);
    }
  }

  /**
   * 获取主画布上下文
   */
  public getMainContext(): CanvasRenderingContext2D {
    return this.mainCtx;
  }

  /**
   * 开始帧渲染
   */
  public beginFrame(): void {
    // 清除主画布
    this.mainCtx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
  }

  /**
   * 结束帧渲染
   */
  public endFrame(): void {
    // 合成缓存层
    this.compose();
  }
}
