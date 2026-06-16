/**
 * 成就系统
 * 纯新增功能，不影响原有游戏逻辑
 */

import { Player, GameStats } from "../gameTypes";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'survival' | 'combat' | 'progression' | 'special';
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  condition: (stats: GameStats, player: Player, sessionData: SessionData) => boolean;
  reward?: {
    description: string;
  };
}

export interface SessionData {
  startTime: number;
  killsWithoutTakingDamage: number; // 不受伤击杀数
  perfectLevels: number; // 满血升级次数
  elementalWeapons: Set<string>; // 拥有的元素武器
  totalDamage: number; // 总伤害
}

export interface AchievementProgress {
  achievementId: string;
  unlocked: boolean;
  unlockedAt?: number; // 解锁时间戳
  progress?: number; // 当前进度（用于计数类成就）
  target?: number; // 目标值
}

export class AchievementSystem {
  private achievements: Map<string, Achievement> = new Map();
  private progress: Map<string, AchievementProgress> = new Map();

  constructor() {
    this.registerDefaultAchievements();
    this.loadProgress();
  }

  /**
   * 注册默认成就
   */
  private registerDefaultAchievements(): void {
    // ==================== 生存类成就 ====================
    this.registerAchievement({
      id: 'first_steps',
      name: '初次胜利',
      description: '存活时间达到5分钟',
      icon: '🎯',
      category: 'survival',
      difficulty: 'easy',
      condition: (stats) => stats.survivalTime >= 300,
      reward: { description: '解锁新手身份' }
    });

    this.registerAchievement({
      id: 'survivor',
      name: '幸存者',
      description: '存活时间达到15分钟',
      icon: '🏃',
      category: 'survival',
      difficulty: 'medium',
      condition: (stats) => stats.survivalTime >= 900,
      reward: { description: '证明你的生存能力' }
    });

    this.registerAchievement({
      id: 'marathon',
      name: '马拉松',
      description: '存活时间达到30分钟',
      icon: '🏆',
      category: 'survival',
      difficulty: 'hard',
      condition: (stats) => stats.survivalTime >= 1800,
      reward: { description: '真正的持久战专家' }
    });

    this.registerAchievement({
      id: 'immortal',
      name: '不死传说',
      description: '存活时间达到60分钟',
      icon: '👑',
      category: 'survival',
      difficulty: 'extreme',
      condition: (stats) => stats.survivalTime >= 3600,
      reward: { description: '传奇级别的生存' }
    });

    // ==================== 战斗类成就 ====================
    this.registerAchievement({
      id: 'hunter',
      name: '猎人',
      description: '单局击杀100个敌人',
      icon: '⚔️',
      category: 'combat',
      difficulty: 'medium',
      condition: (stats) => stats.killCount >= 100,
      reward: { description: '熟练的猎手' }
    });

    this.registerAchievement({
      id: 'butcher',
      name: '屠夫',
      description: '单局击杀500个敌人',
      icon: '💀',
      category: 'combat',
      difficulty: 'hard',
      condition: (stats) => stats.killCount >= 500,
      reward: { description: '敌人的噩梦' }
    });

    this.registerAchievement({
      id: 'exterminator',
      name: '终结者',
      description: '单局击杀1000个敌人',
      icon: '☠️',
      category: 'combat',
      difficulty: 'extreme',
      condition: (stats) => stats.killCount >= 1000,
      reward: { description: '怪物清理专家' }
    });

    this.registerAchievement({
      id: 'untouchable',
      name: '无伤通过',
      description: '连续击杀50个敌人不受伤',
      icon: '🛡️',
      category: 'combat',
      difficulty: 'hard',
      condition: (stats, _, session) => session.killsWithoutTakingDamage >= 50,
      reward: { description: '完美的闪避技巧' }
    });

    this.registerAchievement({
      id: 'perfect',
      name: '完美主义',
      description: '满血状态下完成5次升级',
      icon: '✨',
      category: 'combat',
      difficulty: 'medium',
      condition: (stats, player, session) => session.perfectLevels >= 5,
      reward: { description: '完美的战斗节奏' }
    });

    // ==================== 进度类成就 ====================
    this.registerAchievement({
      id: 'rookie',
      name: '新手',
      description: '达到10级',
      icon: '🌟',
      category: 'progression',
      difficulty: 'easy',
      condition: (_, player) => player.level >= 10,
      reward: { description: '刚刚开始成长' }
    });

    this.registerAchievement({
      id: 'veteran',
      name: '老兵',
      description: '达到25级',
      icon: '⭐',
      category: 'progression',
      difficulty: 'medium',
      condition: (_, player) => player.level >= 25,
      reward: { description: '经验丰富的战士' }
    });

    this.registerAchievement({
      id: 'champion',
      name: '冠军',
      description: '达到50级',
      icon: '🌟🌟🌟',
      category: 'progression',
      difficulty: 'hard',
      condition: (_, player) => player.level >= 50,
      reward: { description: '精英级别的实力' }
    });

    this.registerAchievement({
      id: 'legend',
      name: '传奇',
      description: '达到75级',
      icon: '👑🌟',
      category: 'progression',
      difficulty: 'extreme',
      condition: (_, player) => player.level >= 75,
      reward: { description: '传说中的存在' }
    });

    // ==================== 特殊类成就 ====================
    this.registerAchievement({
      id: 'elemental_master',
      name: '元素大师',
      description: '同时拥有冰冻、燃烧和闪电武器',
      icon: '🔥❄️⚡',
      category: 'special',
      difficulty: 'hard',
      condition: (_, __, session) =>
        session.elementalWeapons.has('ice') &&
        session.elementalWeapons.has('fire') &&
        session.elementalWeapons.has('lightning'),
      reward: { description: '掌控所有元素力量' }
    });

    this.registerAchievement({
      id: 'score_hunter',
      name: '高分猎人',
      description: '单局达到10万分',
      icon: '💰',
      category: 'special',
      difficulty: 'hard',
      condition: (stats) => stats.score >= 100000,
      reward: { description: '分数收集专家' }
    });

    this.registerAchievement({
      id: 'millionaire',
      name: '百万富翁',
      description: '单局达到100万分',
      icon: '💎',
      category: 'special',
      difficulty: 'extreme',
      condition: (stats) => stats.score >= 1000000,
      reward: { description: '顶级分数收集者' }
    });

    this.registerAchievement({
      id: 'damage_dealer',
      name: '伤害输出',
      description: '单局造成100万点伤害',
      icon: '💥',
      category: 'special',
      difficulty: 'hard',
      condition: (_, __, session) => session.totalDamage >= 1000000,
      reward: { description: '强大的火力输出' }
    });
  }

  /**
   * 注册成就
   */
  public registerAchievement(achievement: Achievement): void {
    this.achievements.set(achievement.id, achievement);

    // 初始化进度（如果不存在）
    if (!this.progress.has(achievement.id)) {
      this.progress.set(achievement.id, {
        achievementId: achievement.id,
        unlocked: false
      });
    }
  }

  /**
   * 检查并解锁成就
   * 返回新解锁的成就列表
   */
  public checkAchievements(
    stats: GameStats,
    player: Player,
    sessionData: SessionData
  ): Achievement[] {
    const newlyUnlocked: Achievement[] = [];

    for (const [id, achievement] of this.achievements) {
      const currentProgress = this.progress.get(id);

      // 跳过已解锁的成就
      if (currentProgress?.unlocked) continue;

      // 检查成就条件
      if (achievement.condition(stats, player, sessionData)) {
        // 解锁成就
        this.progress.set(id, {
          achievementId: id,
          unlocked: true,
          unlockedAt: Date.now()
        });

        newlyUnlocked.push(achievement);
        if (import.meta.env.DEV) {
          console.log(`[Achievement] 解锁成就: ${achievement.name}`);
        }
      }
    }

    // 保存进度
    if (newlyUnlocked.length > 0) {
      this.saveProgress();
    }

    return newlyUnlocked;
  }

  /**
   * 获取所有成就
   */
  public getAllAchievements(): Achievement[] {
    return Array.from(this.achievements.values());
  }

  /**
   * 获取成就进度
   */
  public getAchievementProgress(achievementId: string): AchievementProgress | undefined {
    return this.progress.get(achievementId);
  }

  /**
   * 获取所有成就进度
   */
  public getAllProgress(): Map<string, AchievementProgress> {
    return new Map(this.progress);
  }

  /**
   * 获取已解锁的成就数量
   */
  public getUnlockedCount(): number {
    let count = 0;
    for (const progress of this.progress.values()) {
      if (progress.unlocked) count++;
    }
    return count;
  }

  /**
   * 获取总成就数量
   */
  public getTotalCount(): number {
    return this.achievements.size;
  }

  /**
   * 获取解锁百分比
   */
  public getCompletionPercentage(): number {
    if (this.achievements.size === 0) return 0;
    return (this.getUnlockedCount() / this.achievements.size) * 100;
  }

  /**
   * 按分类获取成就
   */
  public getAchievementsByCategory(category: Achievement['category']): Achievement[] {
    return Array.from(this.achievements.values()).filter(a => a.category === category);
  }

  /**
   * 保存进度到localStorage
   */
  private saveProgress(): void {
    try {
      const progressArray = Array.from(this.progress.entries());
      localStorage.setItem('alien-survivor-achievements', JSON.stringify(progressArray));
    } catch (error) {
      console.error('[Achievement] 保存成就进度失败:', error);
    }
  }

  /**
   * 从localStorage加载进度
   */
  private loadProgress(): void {
    try {
      const saved = localStorage.getItem('alien-survivor-achievements');
      if (saved) {
        const progressArray = JSON.parse(saved);
        this.progress = new Map(progressArray);
        if (import.meta.env.DEV) {
          console.log('[Achievement] 加载成就进度成功');
        }
      }
    } catch (error) {
      console.error('[Achievement] 加载成就进度失败:', error);
    }
  }

  /**
   * 重置所有进度（谨慎使用）
   */
  public resetProgress(): void {
    this.progress.clear();
    // 重新初始化进度
    for (const id of this.achievements.keys()) {
      this.progress.set(id, {
        achievementId: id,
        unlocked: false
      });
    }
    this.saveProgress();
    if (import.meta.env.DEV) {
      console.log('[Achievement] 成就进度已重置');
    }
  }

  /**
   * 创建新的会话数据
   */
  public createSessionData(): SessionData {
    return {
      startTime: Date.now(),
      killsWithoutTakingDamage: 0,
      perfectLevels: 0,
      elementalWeapons: new Set<string>(),
      totalDamage: 0
    };
  }
}
