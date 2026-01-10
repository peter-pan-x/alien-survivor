/**
 * 动画系统 - 让所有角色"活起来"
 * 使用程序化动画技术，通过简单的数学函数实现生动的动画效果
 */

export interface AnimationState {
  // 时间相关
  time: number;
  deltaTime: number;

  // 玩家状态
  playerMoving: boolean;
  playerShooting: boolean;
  playerDirectionX: number;
  playerDirectionY: number;

  // 敌人状态
  enemyMoving: boolean;
  enemyAttacking: boolean;
  enemyType: string;

  // Boss状态
  bossAttacking: boolean;
  bossPhase: number;
}

export class AnimationSystem {
  private currentTime: number = 0;

  /**
   * 更新动画时间
   */
  public update(deltaTime: number): void {
    this.currentTime += deltaTime;
  }

  /**
   * 获取当前动画时间（秒）
   */
  public getTime(): number {
    return this.currentTime / 1000;
  }

  /**
   * 获取当前时间戳（毫秒）
   */
  public getCurrentTime(): number {
    return this.currentTime;
  }

  // ==================== 玩家动画 ====================

  /**
   * 玩家呼吸动画 - 缓慢的缩放效果
   * @returns 缩放系数 (0.98 ~ 1.02)
   */
  public getPlayerBreathingScale(): number {
    const t = this.getTime();
    // 每2秒一个呼吸周期
    return 1 + Math.sin(t * Math.PI) * 0.02;
  }

  /**
   * 玩家移动摇摆 - 左右轻微摇摆
   * @param moveSpeed - 移动速度
   * @returns 摇摆角度（弧度）
   */
  public getPlayerWalkSway(moveSpeed: number = 1): number {
    const t = this.getTime();
    // 移动时摇摆频率更高
    const frequency = 8;
    const amplitude = 0.08; // 最大倾斜角度
    return Math.sin(t * frequency) * amplitude;
  }

  /**
   * 玩家上下颠簸 - 模拟走路时的起伏
   * @returns Y轴偏移量
   */
  public getPlayerWalkBounce(): number {
    const t = this.getTime();
    // 快速的上下颠簸
    return Math.sin(t * 12) * 1.5;
  }

  /**
   * 玩家射击后坐力 - 向后震动
   * @returns X/Y偏移量 {x, y}
   */
  public getPlayerShootRecoil(): { x: number; y: number } {
    const t = this.getTime();
    const phase = t * 20;
    const intensity = Math.exp(-((phase % 1) * 5)); // 快速衰减
    return {
      x: -intensity * 3, // 向后
      y: intensity * 1.5, // 轻微向上
    };
  }

  /**
   * 玩家受伤震动 - 快速抖动
   * @returns X/Y偏移量 {x, y}
   */
  public getPlayerDamageShake(): { x: number; y: number } {
    const t = this.getTime();
    return {
      x: (Math.random() - 0.5) * 4,
      y: (Math.random() - 0.5) * 4,
    };
  }

  // ==================== 敌人动画 ====================

  /**
   * 敌人呼吸动画
   * @param enemyType - 敌人类型
   * @returns 缩放系数
   */
  public getEnemyBreathingScale(enemyType: string): number {
    const t = this.getTime();

    // 不同敌人类型有不同的呼吸节奏
    switch (enemyType) {
      case 'swarm':
        // 快速小幅度呼吸
        return 1 + Math.sin(t * Math.PI * 1.5) * 0.03;
      case 'rusher':
        // 激进的快速呼吸
        return 1 + Math.sin(t * Math.PI * 2) * 0.04;
      case 'shooter':
        // 缓慢平稳的呼吸
        return 1 + Math.sin(t * Math.PI * 0.8) * 0.02;
      case 'elite':
        // 深沉的呼吸
        return 1 + Math.sin(t * Math.PI * 0.6) * 0.025;
      case 'spider':
        // 快速颤抖
        return 1 + Math.sin(t * Math.PI * 3) * 0.02;
      case 'crab':
        // 横向呼吸
        return 1 + Math.sin(t * Math.PI * 1.2) * 0.03;
      case 'bigeye':
        // 眼睛眨动
        return 1 + Math.sin(t * Math.PI * 0.5) * 0.05;
      case 'frog':
        // 跳跃式呼吸
        const bounce = Math.sin(t * Math.PI * 2) > 0.5 ? 0.05 : 0;
        return 1 + bounce;
      default:
        return 1 + Math.sin(t * Math.PI) * 0.02;
    }
  }

  /**
   * 敌人移动摇摆
   * @param enemyType - 敌人类型
   * @param moveSpeed - 移动速度
   * @returns 摇摆角度
   */
  public getEnemyWalkSway(enemyType: string, moveSpeed: number = 1): number {
    const t = this.getTime();

    switch (enemyType) {
      case 'swarm':
        // 快速颤动
        return Math.sin(t * 15) * 0.15;
      case 'rusher':
        // 冲刺时的前倾
        return Math.sin(t * 10) * 0.1;
      case 'shooter':
        // 缓慢的漂浮感
        return Math.sin(t * 3) * 0.05;
      case 'spider':
        // 快速左右摆动（像蜘蛛腿）
        return Math.sin(t * 12) * 0.2;
      case 'crab':
        // 横向摆动
        return Math.cos(t * 8) * 0.12;
      case 'frog':
        // 跳跃式摆动
        return Math.sin(t * 6) * 0.18;
      case 'bigeye':
        // 沉重的摇摆
        return Math.sin(t * 4) * 0.08;
      default:
        return Math.sin(t * 6) * 0.1;
    }
  }

  /**
   * 敌人身体弹跳
   * @param enemyType - 敌人类型
   * @returns Y轴偏移量
   */
  public getEnemyBodyBounce(enemyType: string): number {
    const t = this.getTime();

    switch (enemyType) {
      case 'frog':
        // 青蛙跳跃 - 大幅度弹跳
        return Math.abs(Math.sin(t * 8)) * 4;
      case 'spider':
        // 蜘蛛爬行 - 小幅度快速弹跳
        return Math.sin(t * 16) * 1.5;
      case 'crab':
        // 螃蟹横行 - 中等弹跳
        return Math.sin(t * 10) * 2;
      case 'swarm':
        // 虫群快速颤动
        return Math.sin(t * 20) * 1;
      default:
        return Math.sin(t * 8) * 1.5;
    }
  }

  /**
   * 敌人旋转动画
   * @param enemyType - 敌人类型
   * @returns 旋转角度（弧度）
   */
  public getEnemyRotation(enemyType: string): number {
    const t = this.getTime();

    switch (enemyType) {
      case 'swarm':
        // 虫群快速旋转
        return Math.sin(t * 3) * 0.3;
      case 'bigeye':
        // 大眼睛怪物的眼球转动
        return Math.sin(t * 2) * 0.2;
      default:
        return 0;
    }
  }

  // ==================== Boss动画 ====================

  /**
   * Boss呼吸动画 - 大幅度缩放
   * @returns 缩放系数
   */
  public getBossBreathingScale(): number {
    const t = this.getTime();
    // 深沉的呼吸
    return 1 + Math.sin(t * Math.PI * 0.4) * 0.05;
  }

  /**
   * Boss攻击前摇 - 蓄力时的颤抖
   * @param isPreparing - 是否正在蓄力
   * @returns 震动强度
   */
  public getBossAttackShake(isPreparing: boolean): number {
    if (!isPreparing) return 0;

    const t = this.getTime();
    // 蓄力时快速颤抖
    return Math.sin(t * 30) * 0.05;
  }

  /**
   * Boss攻击冲击 - 攻击时的前冲
   * @param isAttacking - 是否正在攻击
   * @returns X轴偏移量
   */
  public getBossAttackLunge(isAttacking: boolean): number {
    if (!isAttacking) return 0;

    const t = this.getTime();
    // 攻击时快速向前冲
    const phase = (t * 10) % 1;
    return phase < 0.2 ? phase * 10 : (1 - phase) * 10;
  }

  /**
   * Boss愤怒模式 - 红色闪烁
   * @param isEnraged - 是否愤怒
   * @returns 透明度 (0 ~ 0.5)
   */
  public getBossEnragedFlash(isEnraged: boolean): number {
    if (!isEnraged) return 0;

    const t = this.getTime();
    // 快速红色闪烁
    const flash = Math.sin(t * 8);
    return flash > 0 ? flash * 0.3 : 0;
  }

  // ==================== 特效动画 ====================

  /**
   * 子弹轨迹波动 - 让子弹飞行更生动
   * @param bulletLifetime - 子弹已存在时间（秒）
   * @returns 横向偏移量
   */
  public getBulletWave(bulletLifetime: number): number {
    return Math.sin(bulletLifetime * 15) * 2;
  }

  /**
   * 子弹旋转 - 特殊子弹的旋转效果
   * @param bulletLifetime - 子弹已存在时间（秒）
   * @returns 旋转角度（弧度）
   */
  public getBulletRotation(bulletLifetime: number): number {
    return bulletLifetime * 10;
  }

  /**
   * 粒子脉冲 - 粒子大小的周期性变化
   * @param baseSize - 基础大小
   * @param speed - 脉冲速度
   * @returns 缩放系数
   */
  public getParticlePulse(baseSize: number, speed: number = 3): number {
    const t = this.getTime();
    return baseSize * (1 + Math.sin(t * speed) * 0.3);
  }

  /**
   * 霓虹闪烁 - 霓虹灯效果的快速闪烁
   * @param colorIndex - 颜色索引（用于相位偏移）
   * @returns 透明度 (0.5 ~ 1.0)
   */
  public getNeonFlicker(colorIndex: number = 0): number {
    const t = this.getTime();
    const phase = colorIndex * 0.5;
    return 0.7 + Math.sin(t * 10 + phase) * 0.3;
  }

  /**
   * 波纹扩散 - 用于爆炸或冲击波效果
   * @param startTime - 波纹开始时间（秒）
   * @param duration - 持续时间（秒）
   * @returns { scale: number, alpha: number }
   */
  public getRippleEffect(startTime: number, duration: number): {
    scale: number;
    alpha: number;
  } {
    const t = this.getTime();
    const elapsed = t - startTime;
    const progress = elapsed / duration;

    if (progress >= 1) {
      return { scale: 1, alpha: 0 };
    }

    return {
      scale: 1 + progress * 2,
      alpha: 1 - progress,
    };
  }

  // ==================== 辅助函数 ====================

  /**
   * 平滑插值 - 用于动画过渡
   * @param from - 起始值
   * @param to - 目标值
   * @param progress - 进度 (0 ~ 1)
   * @returns 插值结果
   */
  public lerp(from: number, to: number, progress: number): number {
    return from + (to - from) * progress;
  }

  /**
   * 缓动函数 - 让动画更自然
   * @param t - 输入值 (0 ~ 1)
   * @returns 缓动后的值
   */
  public easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  /**
   * 弹性缓动 - 带弹性的动画效果
   * @param t - 输入值 (0 ~ 1)
   * @returns 缓动后的值
   */
  public elasticOut(t: number): number {
    const p = 0.3;
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
  }
}

// 导出单例实例
export const animationSystem = new AnimationSystem();
