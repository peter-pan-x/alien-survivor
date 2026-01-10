/**
 * 每日挑战系统
 * 纯新增功能，不影响原有游戏逻辑
 */

export interface ChallengeModifier {
  type: 'enemy_speed' | 'player_damage' | 'exp_rate' | 'special_enemy' | 'boss_frequency';
  value: number;
  description: string;
}

export interface ChallengeReward {
  scoreMultiplier: number;
  expMultiplier: number;
}

export interface DailyChallenge {
  id: string; // 基于日期的ID，如 "2025-01-10"
  name: string;
  description: string;
  modifiers: ChallengeModifier[];
  rewards: ChallengeReward;
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
}

export class DailyChallengeSystem {
  private currentChallenge: DailyChallenge | null = null;

  /**
   * 基于日期生成挑战ID
   */
  private getTodayDateKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  /**
   * 简单的伪随机数生成器（基于日期种子）
   */
  private seededRandom(seed: string): () => number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return () => {
      const x = Math.sin(hash++) * 10000;
      return x - Math.floor(x);
    };
  }

  /**
   * 生成今日挑战
   */
  public generateTodaysChallenge(): DailyChallenge {
    const dateKey = this.getTodayDateKey();
    const random = this.seededRandom(dateKey);

    // 挑战模板库
    const challengeTemplates: Array<{
      name: string;
      description: string;
      difficulty: DailyChallenge['difficulty'];
      generateModifiers: (rand: () => number) => ChallengeModifier[];
      generateRewards: (rand: () => number) => ChallengeReward;
    }> = [
      {
        name: "双倍经验日",
        description: "经验获取翻倍，快速升级！",
        difficulty: 'easy',
        generateModifiers: () => [
          { type: 'exp_rate', value: 2.0, description: '经验获取 +100%' }
        ],
        generateRewards: () => ({ scoreMultiplier: 1.0, expMultiplier: 2.0 })
      },
      {
        name: "速度狂潮",
        description: "敌人速度提升，但分数奖励更丰厚",
        difficulty: 'medium',
        generateModifiers: () => [
          { type: 'enemy_speed', value: 1.5, description: '敌人速度 +50%' }
        ],
        generateRewards: () => ({ scoreMultiplier: 1.3, expMultiplier: 1.0 })
      },
      {
        name: "一击必杀",
        description: "伤害暴增，但敌人更耐打",
        difficulty: 'medium',
        generateModifiers: () => [
          { type: 'player_damage', value: 2.0, description: '玩家伤害 +100%' },
          { type: 'special_enemy', value: 1.5, description: '敌人血量 +50%' }
        ],
        generateRewards: () => ({ scoreMultiplier: 1.2, expMultiplier: 1.0 })
      },
      {
        name: "BOSS马拉松",
        description: "每5级出现BOSS，挑战极限！",
        difficulty: 'hard',
        generateModifiers: () => [
          { type: 'boss_frequency', value: 0.5, description: 'BOSS每5级出现' }
        ],
        generateRewards: () => ({ scoreMultiplier: 1.5, expMultiplier: 1.2 })
      },
      {
        name: "疯狂星期五",
        description: "全属性提升，全属性削弱，疯狂的一天！",
        difficulty: 'extreme',
        generateModifiers: () => [
          { type: 'player_damage', value: 2.5, description: '玩家伤害 +150%' },
          { type: 'enemy_speed', value: 2.0, description: '敌人速度 +100%' },
          { type: 'exp_rate', value: 1.5, description: '经验获取 +50%' }
        ],
        generateRewards: () => ({ scoreMultiplier: 2.0, expMultiplier: 1.5 })
      },
      {
        name: "经验盛宴",
        description: "经验值大幅提升，升级如喝水",
        difficulty: 'easy',
        generateModifiers: () => [
          { type: 'exp_rate', value: 3.0, description: '经验获取 +200%' }
        ],
        generateRewards: () => ({ scoreMultiplier: 0.8, expMultiplier: 3.0 })
      },
      {
        name: "钢铁洪流",
        description: "敌人血量激增，需要更强的火力",
        difficulty: 'hard',
        generateModifiers: () => [
          { type: 'special_enemy', value: 2.0, description: '敌人血量 +100%' }
        ],
        generateRewards: () => ({ scoreMultiplier: 1.8, expMultiplier: 1.0 })
      }
    ];

    // 随机选择一个挑战（基于日期种子）
    const templateIndex = Math.floor(random() * challengeTemplates.length);
    const template = challengeTemplates[templateIndex];

    const challenge: DailyChallenge = {
      id: dateKey,
      name: template.name,
      description: template.description,
      difficulty: template.difficulty,
      modifiers: template.generateModifiers(random),
      rewards: template.generateRewards(random)
    };

    this.currentChallenge = challenge;
    return challenge;
  }

  /**
   * 获取当前挑战
   */
  public getCurrentChallenge(): DailyChallenge | null {
    return this.currentChallenge;
  }

  /**
   * 应用挑战修正值到游戏
   * 这是纯粹的加法，不影响基础数值
   */
  public applyChallengeModifiers(
    baseValue: number,
    modifierType: ChallengeModifier['type']
  ): number {
    if (!this.currentChallenge) return baseValue;

    const modifier = this.currentChallenge.modifiers.find(m => m.type === modifierType);
    if (!modifier) return baseValue;

    return baseValue * modifier.value;
  }

  /**
   * 计算挑战奖励倍数
   */
  public getScoreMultiplier(): number {
    if (!this.currentChallenge) return 1.0;
    return this.currentChallenge.rewards.scoreMultiplier;
  }

  public getExpMultiplier(): number {
    if (!this.currentChallenge) return 1.0;
    return this.currentChallenge.rewards.expMultiplier;
  }

  /**
   * 重置挑战
   */
  public reset(): void {
    this.currentChallenge = null;
  }

  /**
   * 检查是否有活跃的挑战
   */
  public hasActiveChallenge(): boolean {
    return this.currentChallenge !== null;
  }
}
