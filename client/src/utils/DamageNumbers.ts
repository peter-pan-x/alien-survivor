import { DamageNumber } from "../gameTypes";

/**
 * 伤害数字显示系统
 */
export class DamageNumberSystem {
  private numbers: DamageNumber[] = [];
  private maxNumbers: number;

  constructor(maxNumbers: number = 50) {
    this.maxNumbers = maxNumbers;
  }

  /**
   * 添加伤害数字
   */
  add(x: number, y: number, value: number): void {
    // 限制最大数量
    if (this.numbers.length >= this.maxNumbers) {
      this.numbers.shift();
    }

    this.numbers.push({
      x: x + (Math.random() - 0.5) * 20, // 随机偏移
      y: y - 10,
      value,
      life: 60,
      maxLife: 60,
      vy: -1.5, // 向上飘动
    });
  }

  /**
   * 更新所有伤害数字
   */
  update(deltaTime: number): void {
    for (let i = this.numbers.length - 1; i >= 0; i--) {
      const num = this.numbers[i];
      num.y += num.vy * deltaTime;
      num.life -= deltaTime;

      if (num.life <= 0) {
        this.numbers.splice(i, 1);
      }
    }
  }

  /**
   * 渲染所有伤害数字
   */
  render(ctx: CanvasRenderingContext2D): void {
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const num of this.numbers) {
      const alpha = Math.min(num.life / num.maxLife, 1);
      
      // 描边
      ctx.strokeStyle = `rgba(0, 0, 0, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.strokeText(num.value.toString(), num.x, num.y);

      // 填充
      const color = num.value >= 20 ? "#ff6b6b" : "#ffd93d";
      ctx.fillStyle = `${color}${Math.floor(alpha * 255).toString(16).padStart(2, "0")}`;
      ctx.fillText(num.value.toString(), num.x, num.y);
    }

    ctx.textAlign = "left";
  }

  /**
   * 清空所有伤害数字
   */
  clear(): void {
    this.numbers = [];
  }

  /**
   * 获取当前数字数量
   */
  getCount(): number {
    return this.numbers.length;
  }
}

