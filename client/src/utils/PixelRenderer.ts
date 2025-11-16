/**
 * 像素风格渲染工具
 * 提供极简、有趣的像素艺术绘制方法
 */

export class PixelRenderer {
  private ctx: CanvasRenderingContext2D;
  private pixelSize: number; // 像素块大小

  constructor(ctx: CanvasRenderingContext2D, pixelSize: number = 2) {
    this.ctx = ctx;
    this.pixelSize = pixelSize;
  }

  /**
   * 绘制单个像素块
   */
  private drawPixel(x: number, y: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, this.pixelSize, this.pixelSize);
  }

  /**
   * 绘制像素精灵（从像素数组）
   * @param x 中心X坐标
   * @param y 中心Y坐标
   * @param sprite 像素精灵数组（字符串数组，每行一个字符串）
   * @param colors 颜色映射对象
   */
  public drawSprite(
    x: number,
    y: number,
    sprite: string[],
    colors: Record<string, string>
  ): void {
    const spriteWidth = sprite[0]?.length || 0;
    const spriteHeight = sprite.length;
    const startX = x - (spriteWidth * this.pixelSize) / 2;
    const startY = y - (spriteHeight * this.pixelSize) / 2;

    this.ctx.save();
    this.ctx.imageSmoothingEnabled = false;

    for (let row = 0; row < spriteHeight; row++) {
      const line = sprite[row];
      if (!line) continue;

      for (let col = 0; col < spriteWidth; col++) {
        const char = line[col];
        if (char && char !== ' ' && colors[char]) {
          const pixelX = startX + col * this.pixelSize;
          const pixelY = startY + row * this.pixelSize;
          this.drawPixel(pixelX, pixelY, colors[char]);
        }
      }
    }

    this.ctx.restore();
  }

  /**
   * 绘制像素风格圆形（使用像素块模拟）
   */
  public drawPixelCircle(
    x: number,
    y: number,
    radius: number,
    fillColor: string,
    strokeColor?: string
  ): void {
    this.ctx.save();
    this.ctx.imageSmoothingEnabled = false;

    // 使用像素块绘制圆形
    const r = Math.floor(radius / this.pixelSize);
    const rSquared = r * r;
    
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const distSquared = dx * dx + dy * dy;
        if (distSquared <= rSquared) {
          const pixelX = x + dx * this.pixelSize - this.pixelSize / 2;
          const pixelY = y + dy * this.pixelSize - this.pixelSize / 2;
          this.drawPixel(pixelX, pixelY, fillColor);
        }
      }
    }

    // 绘制像素风格边框
    if (strokeColor && strokeColor !== fillColor) {
      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = this.pixelSize;
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  /**
   * 绘制像素风格矩形
   */
  public drawPixelRect(
    x: number,
    y: number,
    width: number,
    height: number,
    fillColor: string,
    strokeColor?: string
  ): void {
    this.ctx.save();
    this.ctx.imageSmoothingEnabled = false;

    const w = Math.floor(width / this.pixelSize);
    const h = Math.floor(height / this.pixelSize);

    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const pixelX = x - width / 2 + dx * this.pixelSize;
        const pixelY = y - height / 2 + dy * this.pixelSize;
        this.drawPixel(pixelX, pixelY, fillColor);
      }
    }

    if (strokeColor) {
      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = this.pixelSize;
      this.ctx.strokeRect(x - width / 2, y - height / 2, width, height);
    }

    this.ctx.restore();
  }

  /**
   * 绘制像素风格血条
   */
  public drawPixelHealthBar(
    x: number,
    y: number,
    width: number,
    height: number,
    current: number,
    max: number,
    bgColor: string = "#1a1a1a",
    fillColor: string = "#ef4444"
  ): void {
    this.ctx.save();
    this.ctx.imageSmoothingEnabled = false;

    const ratio = Math.max(0, Math.min(1, current / max));
    const fillWidth = Math.floor(width * ratio);

    // 背景
    this.drawPixelRect(x, y, width, height, bgColor, "#000");

    // 填充
    if (fillWidth > 0) {
      this.drawPixelRect(x - width / 2 + fillWidth / 2, y, fillWidth, height, fillColor);
    }

    // 像素边框
    this.ctx.strokeStyle = "#000";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x - width / 2, y - height / 2, width, height);

    this.ctx.restore();
  }
}

/**
 * 像素精灵定义 - 极简有趣的像素艺术
 * 参考经典8-bit游戏风格，每个角色都有独特特征
 */
export const PixelSprites = {
  // 玩家精灵 - 像素风格战士（蓝色，有眼睛和身体）
  player: [
    "  ███  ",
    " █ █ █ ",  // 眼睛
    "███████",  // 头部
    "█ ███ █",  // 身体
    "  ███  ",  // 胸部
    " █ █ █ ",  // 手臂
    "█     █",  // 腿部
  ],

  // Swarm敌人 - 小骷髅（红色，极简骷髅头，类似HP图标）
  enemySwarm: [
    "  ███  ",
    " █ █ █ ",  // 眼窝
    "  ███  ",  // 额头
    " ████  ",  // 上颚
    "█ █ █ █",  // 牙齿
    "  ███  ",  // 下巴
  ],

  // Rusher敌人 - 橙色龙（有角和身体，类似ATK图标）
  enemyRusher: [
    "  ███  ",  // 角
    " ████  ",  // 头部
    "███████",  // 身体
    "█ ███ █",  // 身体细节
    "  ███  ",  // 尾巴
    " █ █ █ ",  // 爪子
  ],

  // Shooter敌人 - 紫色幽灵（圆润，大眼睛，类似MAG图标）
  enemyShooter: [
    "  ███  ",
    " ████  ",  // 头部
    "███████",  // 身体
    "███████",  // 身体
    "█ ███ █",  // 底部
    "█     █",  // 波浪底部
  ],

  // Elite敌人 - 大型Boss（多角形，有装饰和眼睛）
  enemyElite: [
    "   ███   ",  // 顶部装饰
    "  █████  ",  // 头部
    " ███████ ",  // 身体
    "█████████",  // 身体
    "█ █████ █",  // 身体细节
    "█ █████ █",  // 身体细节
    "  █████  ",  // 底部
    " █ █ █ █ ",  // 装饰
  ],

  // 蜘蛛 - 多足，圆形身体与对称腿
  enemySpider: [
    " x  x  ",
    "x █o█ x",
    "  ███  ",
    "x █o█ x",
    " x  x  ",
  ],

  // 螃蟹 - 扁平身体与两侧大钳
  enemyCrab: [
    " x   x ",
    "  ███  ",
    " █o█o█ ",
    "███████",
    " x   x ",
  ],

  // 大眼怪 - 显眼的大眼睛
  enemyBigEye: [
    "  ███  ",
    " █O.O█ ",
    " ████  ",
    " ████  ",
    "  ███  ",
  ],

  // 青蛙怪 - 圆润身体与浅显四肢
  enemyFrog: [
    "  o o  ",
    " ████  ",
    "██████ ",
    "█ █ █ █",
    " x   x ",
  ],

  // 树木精灵（顶视图新版：更圆润的树冠，仅使用'L'）
  treeSmall: [
    "  L  ",
    " LLL ",
    "LLTLL",
    " LLL ",
    "  L  ",
  ],
  treeMedium: [
    "   L   ",
    "  LLL  ",
    " LLLLL ",
    "LLLTLLL",
    " LLLLL ",
    "  LLL  ",
    "   L   ",
  ],
  treeLarge: [
    "    L    ",
    "   LLL   ",
    "  LLLLL  ",
    " LLLLLLL ",
    "LLLLTLLLL",
    " LLLLLLL ",
    "  LLLLL  ",
    "   LLL   ",
    "    L    ",
  ],
};

/**
 * 颜色方案
 */
export const PixelColors = {
  // 玩家颜色
  player: {
    "█": "#60a5fa", // 蓝色身体
    " ": "transparent",
  },

  // Swarm敌人 - 鲜红色骷髅（更鲜艳）
  enemySwarm: {
    "█": "#dc2626", // 鲜红色，更明显
    " ": "transparent",
  },

  // Rusher敌人 - 橙红色龙（更鲜艳）
  enemyRusher: {
    "█": "#ea580c", // 橙红色，更明显
    " ": "transparent",
  },

  // Shooter敌人 - 蓝紫色幽灵（更鲜艳）
  enemyShooter: {
    "█": "#7c3aed", // 蓝紫色，更明显
    " ": "transparent",
  },

  // Elite敌人 - 金黄色Boss（更鲜艳）
  enemyElite: {
    "█": "#ca8a04", // 金黄色，更明显
    " ": "transparent",
  },

  // 树木颜色（顶视角：树冠+树干）
  treeSmall: {
    "L": "#86efac",
    "T": "#92400e",
    " ": "transparent",
  },
  treeMedium: {
    "L": "#22c55e",
    "T": "#92400e",
    " ": "transparent",
  },
  treeLarge: {
    "L": "#14532d",
    "T": "#92400e",
    " ": "transparent",
  },

  // 新增敌人颜色映射
  enemySpider: {
    "█": "#374151", // 身体深灰
    "x": "#1f2937", // 腿
    "o": "#fef9c3", // 眼睛淡黄
    " ": "transparent",
  },
  enemyCrab: {
    "█": "#ef4444", // 红色身体
    "x": "#b91c1c", // 螯
    "o": "#fde68a", // 眼睛
    " ": "transparent",
  },
  enemyBigEye: {
    "█": "#14b8a6", // 青色身体
    "O": "#ffffff", // 眼白
    ".": "#000000", // 瞳孔
    " ": "transparent",
  },
  enemyFrog: {
    "█": "#22c55e", // 绿色身体
    "o": "#ffffff", // 眼睛
    "x": "#166534", // 腿部深绿
    " ": "transparent",
  },
};

