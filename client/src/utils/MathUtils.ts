/**
 * 数学工具类
 * 提供安全的数学运算，避免NaN、Infinity等异常值
 * 
 * @author Manus AI
 * @date 2025-11-06
 */
export class MathUtils {
  /**
   * 将值限制在指定范围内
   * @param value 要限制的值
   * @param min 最小值
   * @param max 最大值
   * @returns 限制后的值
   */
  static clamp(value: number, min: number, max: number): number {
    if (!this.isValidNumber(value)) {
      console.warn('[MathUtils] clamp: invalid value', value);
      return min;
    }
    return Math.max(min, Math.min(max, value));
  }

  /**
   * 安全的除法运算，避免除零
   * @param a 被除数
   * @param b 除数
   * @param fallback 除零时的默认值
   * @returns 除法结果或默认值
   */
  static safeDivide(a: number, b: number, fallback: number = 0): number {
    if (!this.isValidNumber(a) || !this.isValidNumber(b)) {
      console.warn('[MathUtils] safeDivide: invalid input', { a, b });
      return fallback;
    }
    if (b === 0) {
      console.warn('[MathUtils] safeDivide: division by zero');
      return fallback;
    }
    const result = a / b;
    return this.isValidNumber(result) ? result : fallback;
  }

  /**
   * 安全的向量归一化
   * @param x 向量x分量
   * @param y 向量y分量
   * @returns 归一化后的向量
   */
  static safeNormalize(x: number, y: number): { x: number; y: number } {
    if (!this.isValidNumber(x) || !this.isValidNumber(y)) {
      console.warn('[MathUtils] safeNormalize: invalid input', { x, y });
      return { x: 0, y: 0 };
    }
    
    const length = Math.sqrt(x * x + y * y);
    
    if (length === 0 || !this.isValidNumber(length)) {
      return { x: 0, y: 0 };
    }
    
    return {
      x: x / length,
      y: y / length
    };
  }

  /**
   * 检查是否为有效数字
   * @param value 要检查的值
   * @returns 是否为有效数字
   */
  static isValidNumber(value: number): boolean {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
  }

  /**
   * 计算两点间的距离平方（避免开方运算，性能更好）
   * @param x1 第一个点的x坐标
   * @param y1 第一个点的y坐标
   * @param x2 第二个点的x坐标
   * @param y2 第二个点的y坐标
   * @returns 距离的平方
   */
  static distanceSquared(
    x1: number, y1: number,
    x2: number, y2: number
  ): number {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return dx * dx + dy * dy;
  }

  /**
   * 计算两点间的距离
   * @param x1 第一个点的x坐标
   * @param y1 第一个点的y坐标
   * @param x2 第二个点的x坐标
   * @param y2 第二个点的y坐标
   * @returns 距离
   */
  static distance(
    x1: number, y1: number,
    x2: number, y2: number
  ): number {
    return Math.sqrt(this.distanceSquared(x1, y1, x2, y2));
  }

  /**
   * 检查圆形碰撞（使用距离平方优化性能）
   * @param x1 第一个圆的x坐标
   * @param y1 第一个圆的y坐标
   * @param r1 第一个圆的半径
   * @param x2 第二个圆的x坐标
   * @param y2 第二个圆的y坐标
   * @param r2 第二个圆的半径
   * @returns 是否发生碰撞
   */
  static checkCircleCollision(
    x1: number, y1: number, r1: number,
    x2: number, y2: number, r2: number
  ): boolean {
    const distSq = this.distanceSquared(x1, y1, x2, y2);
    const radiusSum = r1 + r2;
    return distSq <= radiusSum * radiusSum;
  }

  /**
   * 线性插值
   * @param a 起始值
   * @param b 结束值
   * @param t 插值系数 (0-1)
   * @returns 插值结果
   */
  static lerp(a: number, b: number, t: number): number {
    t = this.clamp(t, 0, 1);
    return a + (b - a) * t;
  }

  /**
   * 将角度转换为弧度
   * @param degrees 角度
   * @returns 弧度
   */
  static degToRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * 将弧度转换为角度
   * @param radians 弧度
   * @returns 角度
   */
  static radToDeg(radians: number): number {
    return radians * (180 / Math.PI);
  }

  /**
   * 生成指定范围内的随机整数
   * @param min 最小值（包含）
   * @param max 最大值（包含）
   * @returns 随机整数
   */
  static randomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 生成指定范围内的随机浮点数
   * @param min 最小值
   * @param max 最大值
   * @returns 随机浮点数
   */
  static randomFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }
}
