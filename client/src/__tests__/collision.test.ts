/**
 * 碰撞检测单元测试
 */

import { describe, it, expect } from 'vitest';
import { MathUtils } from '../utils/MathUtils';

describe('MathUtils.checkCircleCollision', () => {
  it('should detect collision when circles overlap', () => {
    // 两个圆心距离为 5，半径和为 10，应该碰撞
    const result = MathUtils.checkCircleCollision(0, 0, 5, 5, 0, 5);
    expect(result).toBe(true);
  });

  it('should not detect collision when circles are apart', () => {
    // 两个圆心距离为 20，半径和为 10，不应碰撞
    const result = MathUtils.checkCircleCollision(0, 0, 5, 20, 0, 5);
    expect(result).toBe(false);
  });

  it('should detect collision when circles touch exactly', () => {
    // 两个圆心距离为 10，半径和为 10，边界碰撞
    const result = MathUtils.checkCircleCollision(0, 0, 5, 10, 0, 5);
    expect(result).toBe(true);
  });

  it('should detect collision when one circle contains another', () => {
    // 小圆在大圆内部
    const result = MathUtils.checkCircleCollision(0, 0, 20, 5, 5, 5);
    expect(result).toBe(true);
  });
});

describe('MathUtils.safeNormalize', () => {
  it('should normalize non-zero vectors', () => {
    const result = MathUtils.safeNormalize(3, 4);
    expect(result.x).toBeCloseTo(0.6);
    expect(result.y).toBeCloseTo(0.8);
  });

  it('should return zero vector for zero input', () => {
    const result = MathUtils.safeNormalize(0, 0);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it('should handle very small vectors', () => {
    const result = MathUtils.safeNormalize(0.0001, 0);
    expect(result.x).toBeCloseTo(1);
    expect(result.y).toBe(0);
  });
});

describe('MathUtils.clamp', () => {
  it('should clamp value within range', () => {
    expect(MathUtils.clamp(5, 0, 10)).toBe(5);
    expect(MathUtils.clamp(-5, 0, 10)).toBe(0);
    expect(MathUtils.clamp(15, 0, 10)).toBe(10);
  });

  it('should handle edge cases', () => {
    expect(MathUtils.clamp(0, 0, 10)).toBe(0);
    expect(MathUtils.clamp(10, 0, 10)).toBe(10);
  });
});

describe('MathUtils.safeDivide', () => {
  it('should divide normally', () => {
    expect(MathUtils.safeDivide(10, 2, 0)).toBe(5);
  });

  it('should return default value when dividing by zero', () => {
    expect(MathUtils.safeDivide(10, 0, -1)).toBe(-1);
  });

  it('should handle very small divisors', () => {
    // safeDivide 只检查除数为 0，非常小的值会正常计算
    const result = MathUtils.safeDivide(10, 0.0000001, -1);
    expect(result).toBe(100000000);
  });
});
