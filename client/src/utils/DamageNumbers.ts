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
  add(x: number, y: number, value: number, isCrit: boolean = false): void {
    // 限制最大数量
    if (this.numbers.length >= this.maxNumbers) {
      this.numbers.shift();
    }

    this.numbers.push({
      x: x + (Math.random() - 0.5) * 20, // 随机偏移
      y: y - 10,
      value,
      life: isCrit ? 70 : 60, // 暴击显示时间更长
      maxLife: isCrit ? 70 : 60,
      vy: isCrit ? -2.0 : -1.5, // 暴击飘动更快
      isCrit,
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
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const num of this.numbers) {
      const alpha = Math.min(num.life / num.maxLife, 1);
      
      // 暴击效果：更大字体、特殊颜色、缩放动画
      if (num.isCrit) {
        // 暴击字体更大（22px）
        ctx.font = "bold 22px monospace";
        
        // 暴击缩放动画（开始时放大，然后恢复）
        const lifeRatio = num.life / num.maxLife;
        const scale = lifeRatio > 0.8 ? 1 + (1 - lifeRatio) * 2 : 1; // 刚出现时放大
        
        ctx.save();
        ctx.translate(num.x, num.y);
        ctx.scale(scale, scale);
        
        // 暴击描边（更粗、更明显）
        ctx.strokeStyle = `rgba(139, 0, 0, ${alpha})`; // 深红色描边
        ctx.lineWidth = 4;
        ctx.strokeText(num.value.toString(), 0, 0);

        // 暴击填充（金黄色）
        ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`; // 金色
        ctx.fillText(num.value.toString(), 0, 0);
        
        ctx.restore();
      } else {
        // 普通伤害
        ctx.font = "bold 14px monospace";
        
        // 描边
        ctx.strokeStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.strokeText(num.value.toString(), num.x, num.y);

        // 填充
        const color = num.value >= 20 ? "#ff6b6b" : "#ffd93d";
        ctx.fillStyle = `${color}${Math.floor(alpha * 255).toString(16).padStart(2, "0")}`;
        ctx.fillText(num.value.toString(), num.x, num.y);
      }
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

