/**
 * 动画精灵渲染器 - 让像素角色真正"活"起来
 * 通过动态修改像素精灵的某些部分，实现肢体摆动动画
 */

import { PixelColors } from "../utils/PixelRenderer";

export interface AnimatedSpriteFrame {
  pixels: string[][];
  colors: Record<string, string>;
}

export class AnimatedSpriteRenderer {
  /**
   * 渲染带动画的敌人精灵
   * @param ctx Canvas上下文
   * @param x X坐标
   * @param y Y坐标
   * @param enemyType 敌人类型
   * @param time 动画时间（秒）
   * @param pixelSize 像素大小
   */
  public renderAnimatedEnemy(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    enemyType: string,
    time: number,
    pixelSize: number = 4
  ): void {
    // 获取动画帧
    const frame = this.getAnimatedFrame(enemyType, time);

    // 计算精灵尺寸
    const height = frame.pixels.length;
    const width = frame.pixels[0].length;
    const offsetX = x - (width * pixelSize) / 2;
    const offsetY = y - (height * pixelSize) / 2;

    // 渲染每个像素
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const char = frame.pixels[row][col];
        if (char === ' ') continue; // 跳过空像素

        // 获取颜色
        const color = frame.colors[char] || '#ffffff';
        if (color === 'transparent') continue;

        ctx.fillStyle = color;
        ctx.fillRect(
          offsetX + col * pixelSize,
          offsetY + row * pixelSize,
          pixelSize,
          pixelSize
        );
      }
    }
  }

  /**
   * 获取动画帧 - 根据时间动态生成
   */
  private getAnimatedFrame(enemyType: string, time: number): AnimatedSpriteFrame {
    switch (enemyType) {
      case 'swarm':
        return this.getSwarmFrame(time);
      case 'rusher':
        return this.getRusherFrame(time);
      case 'shooter':
        return this.getShooterFrame(time);
      case 'elite':
        return this.getEliteFrame(time);
      case 'spider':
        return this.getSpiderFrame(time);
      case 'crab':
        return this.getCrabFrame(time);
      case 'bigeye':
        return this.getBigEyeFrame(time);
      case 'frog':
        return this.getFrogFrame(time);
      default:
        return this.getSwarmFrame(time);
    }
  }

  // ==================== 敌人动画帧 ====================

  /**
   * Swarm (虫群) - 眼睛快速闪烁
   */
  private getSwarmFrame(time: number): AnimatedSpriteFrame {
    const blink = Math.sin(time * 8) > 0.7; // 快速眨眼
    const baseSprite = [
      "  ███  ",
      blink ? " █   █ " : " █ █ █ ",  // 眼窝闪烁
      "  ███  ",
      " ████  ",
      "█ █ █ █",
      "  ███  ",
    ];

    return {
      pixels: baseSprite.map(row => row.split('')),
      colors: PixelColors.enemySwarm
    };
  }

  /**
   * Rusher (冲锋龙) - 头部上下摆动，爪子伸缩
   */
  private getRusherFrame(time: number): AnimatedSpriteFrame {
    const headBob = Math.sin(time * 6) > 0.5; // 头部摆动
    const clawMove = Math.sin(time * 10) > 0; // 爪子移动

    const sprite = headBob ? [
      "  ███  ",  // 角
      " ████  ",  // 头部
      "███████",  // 身体
      "█ ███ █",
      "  ███  ",
      clawMove ? "█   █ " : " █ █ █ ",  // 爪子伸缩
    ] : [
      "  ███  ",
      " ████  ",
      "███████",
      "█ ███ █",
      "  ███  ",
      clawMove ? " ████ " : " █ █ █ ",
    ];

    return {
      pixels: sprite.map(row => row.split('')),
      colors: PixelColors.enemyRusher
    };
  }

  /**
   * Shooter (射手幽灵) - 眼睛左右移动，身体上下浮动
   */
  private getShooterFrame(time: number): AnimatedSpriteFrame {
    const eyeOffset = Math.sin(time * 3); // 眼睛左右移动
    const bodyFloat = Math.sin(time * 2); // 身体浮动

    const sprite = bodyFloat > 0 ? [
      "  ███  ",
      ` ${eyeOffset > 0 ? ' ████ ' : ' ████ '} `,  // 头部
      "███████",
      "███████",
      "█ ███ █",
      eyeOffset > 0 ? " ████ " : "█     █",
    ] : [
      "  ███  ",
      " ████  ",
      "███████",
      "███████",
      "█ ███ █",
      eyeOffset > 0 ? " █   █ " : "█     █",
    ];

    return {
      pixels: sprite.map(row => row.split('')),
      colors: PixelColors.enemyShooter
    };
  }

  /**
   * Elite (精英) - 身体上下起伏，装饰闪烁
   */
  private getEliteFrame(time: number): AnimatedSpriteFrame {
    const bodyPulse = Math.sin(time * 2); // 身体起伏
    const decorFlash = Math.sin(time * 5) > 0.5; // 装饰闪烁

    const sprite = bodyPulse > 0 ? [
      "   ███   ",
      "  █████  ",
      " ███████ ",
      "█████████",
      "█ █████ █",
      "█ █████ █",
      "  █████  ",
      decorFlash ? "█ █ █ ██" : " █ █ █ █",
    ] : [
      "   ███   ",
      "  █████  ",
      " ███████ ",
      "█████████",
      "█ █████ █",
      "█ █████ █",
      "  █████  ",
      decorFlash ? "████████" : " █ █ █ █ ",
    ];

    return {
      pixels: sprite.map(row => row.split('')),
      colors: PixelColors.enemyElite
    };
  }

  /**
   * Spider (蜘蛛) - 8条腿交替爬行
   */
  private getSpiderFrame(time: number): AnimatedSpriteFrame {
    const legPhase = (time * 8) % 4; // 腿部爬行相位
    const leg1 = Math.floor(legPhase);
    const leg2 = (leg1 + 2) % 4;

    const legPatterns = [
      ["x  x  x  x", "x  x  x  x"],  // 相位0
      [" x x  x x ", " x x  x x "],  // 相位1
      ["  x x x x ", "  x x x x "],  // 相位2
      ["x x  x x  ", "x x  x x  "],  // 相位3
    ];

    const sprite = [
      legPatterns[leg1][0],
      "x █o█ x",
      "  ███  ",
      "x █o█ x",
      legPatterns[leg1][1],
    ];

    return {
      pixels: sprite.map(row => row.split('')),
      colors: PixelColors.enemySpider
    };
  }

  /**
   * Crab (螃蟹) - 钳子开合，横向移动
   */
  private getCrabFrame(time: number): AnimatedSpriteFrame {
    const clawOpen = Math.sin(time * 4) > 0; // 钳子开合
    const sideMove = Math.sin(time * 3); // 横向移动

    const sprite = sideMove > 0 ? [
      clawOpen ? "X   X" : "x   x",
      "  ███  ",
      " █o█o█ ",
      "███████",
      clawOpen ? "X   X" : "x   x",
    ] : [
      clawOpen ? " X   X " : " x   x ",
      "  ███  ",
      " █o█o█ ",
      "███████",
      clawOpen ? " X   X " : " x   x ",
    ];

    return {
      pixels: sprite.map(row => row.split('')),
      colors: PixelColors.enemyCrab
    };
  }

  /**
   * BigEye (大眼怪) - 眼珠转动，身体起伏
   */
  private getBigEyeFrame(time: number): AnimatedSpriteFrame {
    const eyeX = Math.sin(time * 2); // 眼珠水平移动
    const eyeY = Math.sin(time * 3); // 眼珠垂直移动
    const bodyPulse = Math.sin(time * 1.5); // 身体起伏

    // 根据眼珠位置生成不同的眼睛
    let leftEye = 'o';
    let rightEye = 'o';

    if (eyeX < -0.3) { leftEye = '◄'; }
    else if (eyeX > 0.3) { leftEye = '►'; }

    if (eyeY < -0.3) { leftEye = '▲'; rightEye = '▲'; }
    else if (eyeY > 0.3) { leftEye = '▼'; rightEye = '▼'; }

    const sprite = bodyPulse > 0 ? [
      "  ███  ",
      ` █${leftEye}.${rightEye}█ `,
      " ████  ",
      " ████  ",
      "  ███  ",
    ] : [
      "  ███  ",
      " ████  ",
      ` █${leftEye}.${rightEye}█ `,
      " ████  ",
      "  ███  ",
    ];

    return {
      pixels: sprite.map(row => row.split('')),
      colors: PixelColors.enemyBigEye
    };
  }

  /**
   * Frog (青蛙) - 蹦跳动作，腿部伸展
   */
  private getFrogFrame(time: number): AnimatedSpriteFrame {
    const jumpPhase = (time * 5) % 2; // 跳跃周期
    const isJumping = jumpPhase > 1;

    const sprite = isJumping ? [
      "  o o  ",  // 眼睛
      " ████  ",  // 头部
      "██████ ",  // 身体
      "█     █",  // 腿部伸展
      "X     X",  // 脚部
    ] : [
      "  o o  ",
      " ████  ",
      "██████ ",
      "█ █ █ █",  // 腿部收缩
      " x   x ",
    ];

    return {
      pixels: sprite.map(row => row.split('')),
      colors: PixelColors.enemyFrog
    };
  }

  /**
   * 渲染带动画的玩家精灵（可选功能）
   */
  public renderAnimatedPlayer(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    time: number,
    isMoving: boolean,
    pixelSize: number = 4
  ): void {
    const frame = this.getPlayerFrame(time, isMoving);

    const height = frame.pixels.length;
    const width = frame.pixels[0].length;
    const offsetX = x - (width * pixelSize) / 2;
    const offsetY = y - (height * pixelSize) / 2;

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const char = frame.pixels[row][col];
        if (char === ' ') continue;

        const color = frame.colors[char] || '#ffffff';
        if (color === 'transparent') continue;

        ctx.fillStyle = color;
        ctx.fillRect(
          offsetX + col * pixelSize,
          offsetY + row * pixelSize,
          pixelSize,
          pixelSize
        );
      }
    }
  }

  /**
   * 玩家动画帧 - 手臂摆动
   */
  private getPlayerFrame(time: number, isMoving: boolean): AnimatedSpriteFrame {
    if (!isMoving) {
      // 静止状态
      const sprite = [
        "  ███  ",
        " █ █ █ ",
        "███████",
        "█ ███ █",
        "  ███  ",
        " █ █ █ ",
        "█     █",
      ];
      return {
        pixels: sprite.map(row => row.split('')),
        colors: PixelColors.player
      };
    }

    // 移动状态 - 手臂摆动
    const armSwing = Math.sin(time * 10) > 0;
    const sprite = armSwing ? [
      "  ███  ",
      " █ █ █ ",
      "███████",
      "█ ███ █",
      "  ███  ",
      "█/   \\█",  // 手臂向外
      "█     █",
    ] : [
      "  ███  ",
      " █ █ █ ",
      "███████",
      "█ ███ █",
      "  ███  ",
      " \\   /",  // 手臂向内
      "█     █",
    ];

    return {
      pixels: sprite.map(row => row.split('')),
      colors: PixelColors.player
    };
  }
}

// 导出单例
export const animatedSpriteRenderer = new AnimatedSpriteRenderer();
