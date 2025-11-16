import { Player, WeaponType } from "../gameTypes";
import { GAME_CONFIG } from "../gameConfig";

/**
 * 技能效果接口
 * 定义技能的行为契约
 */
export interface SkillEffect {
  id: string;
  name: string;
  description: string;
  type: "health" | "attack" | "shield" | "special";
  icon?: string;
  // 稀有度：用于控制出现概率
  rarity?: "common" | "rare";
  
  /**
   * 应用技能效果到玩家
   * @param player 玩家对象
   * @param level 技能等级（用于可升级技能）
   * @returns 是否成功应用
   */
  apply(player: Player, level?: number): boolean;
  
  /**
   * 检查技能是否可以再次选择
   * @param player 玩家对象
   * @returns 是否可选
   */
  canSelect(player: Player): boolean;
}

/**
 * 技能系统
 * 独立模块，管理所有技能的定义、应用和扩展
 */
export class SkillSystem {
  private skills: Map<string, SkillEffect> = new Map();
  private weaponAddCallback?: (player: Player, weaponType: WeaponType) => void;

  constructor() {
    this.registerDefaultSkills();
  }

  /**
   * 设置武器添加回调（用于武器技能）
   */
  setWeaponAddCallback(callback: (player: Player, weaponType: WeaponType) => void): void {
    this.weaponAddCallback = callback;
  }

  /**
   * 注册默认技能
   */
  private registerDefaultSkills(): void {
    // ==================== 生命类技能 ====================
    this.registerSkill({
      id: "health_boost",
      name: "生命强化",
      description: "最大生命值 +20",
      type: "health",
      icon: "❤️",
      apply: (player: Player) => {
        player.maxHealth += GAME_CONFIG.SKILLS.HEALTH_BOOST;
        player.health = Math.min(
          player.health + GAME_CONFIG.SKILLS.HEALTH_BOOST,
          player.maxHealth
        );
        return true;
      },
      canSelect: () => true, // 可重复选择
    });

    // ==================== 攻击类技能 ====================
    this.registerSkill({
      id: "attack_boost",
      name: "攻击强化",
      description: "攻击力 +30%",
      type: "attack",
      icon: "⚔️",
      apply: (player: Player) => {
        player.attackDamage = Math.floor(player.attackDamage * 1.3);
        return true;
      },
      canSelect: () => true,
    });

    // 强力攻击技能（较低出现概率）
    this.registerSkill({
      id: "attack_boost_major",
      name: "强力攻击",
      description: "攻击力 +50%",
      type: "attack",
      rarity: "rare",
      icon: "🗡️",
      apply: (player: Player) => {
        player.attackDamage = Math.floor(player.attackDamage * 1.5);
        return true;
      },
      canSelect: () => Math.random() < 0.3, // 30%出现概率
    });

    this.registerSkill({
      id: "speed_boost",
      name: "速度强化",
      description: "攻击速度 +15%",
      type: "attack",
      icon: "⚡",
      apply: (player: Player) => {
        player.attackSpeed *= GAME_CONFIG.SKILLS.SPEED_BOOST_MULTIPLIER;
        return true;
      },
      canSelect: () => true,
    });

    this.registerSkill({
      id: "range_boost",
      name: "射程强化",
      description: "攻击范围 +50",
      type: "attack",
      icon: "🎯",
      apply: (player: Player) => {
        player.attackRange += GAME_CONFIG.SKILLS.RANGE_BOOST;
        return true;
      },
      canSelect: () => true,
    });

    this.registerSkill({
      id: "multi_shot",
      name: "多重射击",
      description: "子弹数量 +1，伤害 -30%",
      type: "attack",
      icon: "🔫",
      apply: (player: Player) => {
        player.bulletCount += 1;
        // 每次选择多重射击，伤害降低30%
        player.attackDamage = Math.floor(player.attackDamage * 0.7);
        return true;
      },
      canSelect: (player: Player) => player.bulletCount < 10, // 最多10个子弹
    });

    this.registerSkill({
      id: "bullet_size",
      name: "子弹增幅",
      description: "子弹体积 +50%",
      type: "attack",
      icon: "🔵",
      apply: (player: Player) => {
        player.bulletSizeMultiplier *= GAME_CONFIG.SKILLS.BULLET_SIZE_MULTIPLIER;
        return true;
      },
      canSelect: (player: Player) => player.bulletSizeMultiplier < 3, // 最多3倍
    });

    // 暴击几率
    this.registerSkill({
      id: "critical_chance",
      name: "暴击几率",
      description: `暴击几率 +${Math.round((GAME_CONFIG.SKILLS.CRIT_CHANCE_INCREMENT ?? 0.05) * 100)}%`,
      type: "attack",
      icon: "❗",
      apply: (player: Player) => {
        player.critChance += GAME_CONFIG.SKILLS.CRIT_CHANCE_INCREMENT ?? 0.05;
        // 上限控制
        const max = GAME_CONFIG.SKILLS.CRIT_CHANCE_MAX ?? 0.5;
        player.critChance = Math.min(player.critChance, max);
        return true;
      },
      canSelect: (player: Player) => {
        const max = GAME_CONFIG.SKILLS.CRIT_CHANCE_MAX ?? 0.5;
        return player.critChance < max;
      },
    });

    // 暴击伤害
    this.registerSkill({
      id: "critical_damage",
      name: "暴击伤害",
      description: `暴击伤害系数 +${(GAME_CONFIG.SKILLS.CRIT_MULTIPLIER_INCREMENT ?? 0.25).toFixed(2)}x`,
      type: "attack",
      icon: "✨",
      apply: (player: Player) => {
        player.critMultiplier += GAME_CONFIG.SKILLS.CRIT_MULTIPLIER_INCREMENT ?? 0.25;
        const max = GAME_CONFIG.SKILLS.CRIT_MULTIPLIER_MAX ?? 4.0;
        player.critMultiplier = Math.min(player.critMultiplier, max);
        return true;
      },
      canSelect: (player: Player) => {
        const max = GAME_CONFIG.SKILLS.CRIT_MULTIPLIER_MAX ?? 4.0;
        return player.critMultiplier < max;
      },
    });

    // ==================== 防御类技能 ====================
    this.registerSkill({
      id: "shield_boost",
      name: "护盾强化",
      description: "最大护盾 +20",
      type: "shield",
      icon: "🛡️",
      apply: (player: Player) => {
        player.maxShield += GAME_CONFIG.SKILLS.SHIELD_BOOST;
        player.shield = player.maxShield;
        return true;
      },
      canSelect: () => true,
    });

    // ==================== 特殊类技能 ====================
    this.registerSkill({
      id: "pierce_shot",
      name: "穿透射击",
      description: "子弹可穿透1个敌人（可升级穿透数量）",
      type: "special",
      icon: "💥",
      apply: (player: Player) => {
        player.hasPierce = true;
        if (!player.pierceCount) {
          player.pierceCount = 1;
          player.pierceDamageReduction = 0.5; // 每穿透一次伤害减半
        } else {
          player.pierceCount += 1; // 每次升级增加1个穿透数量
        }
        return true;
      },
      canSelect: (player: Player) => player.hasPierce && player.pierceCount < 10, // 最多10个穿透
    });

    this.registerSkill({
      id: "life_steal",
      name: "生命汲取",
      description: "击杀敌人恢复1点生命（可重复选择，每次+1）",
      type: "special",
      icon: "🩸",
      apply: (player: Player) => {
        player.hasLifeSteal = true;
        player.lifeStealAmount = (player.lifeStealAmount ?? 0) + 1;
        return true;
      },
      canSelect: () => true, // 可重复选择，叠加数值
    });

    this.registerSkill({
      id: "move_speed",
      name: "移动加速",
      description: "移动速度 +20%",
      type: "special",
      icon: "💨",
      apply: (player: Player) => {
        player.moveSpeed *= GAME_CONFIG.SKILLS.MOVE_SPEED_MULTIPLIER;
        player.moveSpeed = Math.min(
          player.moveSpeed,
          GAME_CONFIG.PLAYER.MAX_MOVE_SPEED
        );
        return true;
      },
      canSelect: (player: Player) => player.moveSpeed < GAME_CONFIG.PLAYER.MAX_MOVE_SPEED,
    });

    // ==================== 武器类技能 ====================
    this.registerSkill({
      id: "orbital_drone",
      name: "轨道无人机",
      description: "获得环绕的攻击无人机",
      type: "special",
      rarity: "rare",
      icon: "🛸",
      apply: (player: Player) => {
        if (this.weaponAddCallback) {
          this.weaponAddCallback(player, "orbital");
          return true;
        }
        return false;
      },
      canSelect: () => true, // 可重复选择（增加无人机数量）
    });

    this.registerSkill({
      id: "lightning_chain",
      name: "闪电链",
      description: "定期释放连锁闪电",
      type: "special",
      rarity: "rare",
      icon: "⚡",
      apply: (player: Player) => {
        if (this.weaponAddCallback) {
          this.weaponAddCallback(player, "lightning");
          return true;
        }
        return false;
      },
      canSelect: () => true,
    });

    this.registerSkill({
      id: "guardian_field",
      name: "守护力场",
      description: "环状力场伤害并击退敌人",
      type: "special",
      rarity: "rare",
      icon: "🌀",
      apply: (player: Player) => {
        if (this.weaponAddCallback) {
          this.weaponAddCallback(player, "field");
          return true;
        }
        return false;
      },
      canSelect: () => true,
    });

    // AOE 爆裂（敌人死亡造成范围伤害，可升级范围）
    this.registerSkill({
      id: "aoe_blast",
      name: "爆裂",
      description: `敌人死亡触发爆炸并造成范围伤害（可升级范围）`,
      type: "special",
      icon: "💣",
      apply: (player: Player) => {
        if (!player.hasAOEExplosion) {
          player.hasAOEExplosion = true;
          player.aoeRadius = GAME_CONFIG.SKILLS.AOE_RADIUS ?? 80;
        } else {
          // 每次升级增加30%爆炸范围，不增加伤害
          player.aoeRadius = Math.floor(player.aoeRadius * 1.3);
        }
        return true;
      },
      canSelect: () => true, // 可重复选择以提升范围
    });
  }

  /**
   * 注册新技能
   * @param skill 技能定义
   */
  registerSkill(skill: SkillEffect): void {
    this.skills.set(skill.id, skill);
  }

  /**
   * 注销技能
   * @param skillId 技能ID
   */
  unregisterSkill(skillId: string): void {
    this.skills.delete(skillId);
  }

  /**
   * 应用技能到玩家
   * @param skillId 技能ID
   * @param player 玩家对象
   * @param level 技能等级（可选）
   * @returns 是否成功应用
   */
  applySkill(skillId: string, player: Player, level: number = 1): boolean {
    const skill = this.skills.get(skillId);
    
    if (!skill) {
      console.warn(`[SkillSystem] 未知的技能 ID: ${skillId}`);
      return false;
    }

    try {
      const success = skill.apply(player, level);
      // 稀有技能选择一次，则后续同名技能出现概率降低11%
      if (success && skill.rarity === "rare") {
        if (!player.rareSkillSelections) player.rareSkillSelections = {};
        const prev = player.rareSkillSelections[skill.id] || 0;
        player.rareSkillSelections[skill.id] = prev + 1;
      }
      return success;
    } catch (error) {
      console.error(`[SkillSystem] 应用技能失败: ${skillId}`, error);
      return false;
    }
  }

  /**
   * 获取所有可用技能
   * @param player 玩家对象（用于判断可选性）
   * @returns 技能列表
   */
  getAvailableSkills(player: Player): SkillEffect[] {
    const available: SkillEffect[] = [];
    
    for (const skill of this.skills.values()) {
      if (skill.canSelect(player)) {
        available.push(skill);
      }
    }
    
    return available;
  }

  /**
   * 获取指定技能
   * @param skillId 技能ID
   * @returns 技能定义
   */
  getSkill(skillId: string): SkillEffect | undefined {
    return this.skills.get(skillId);
  }

  /**
   * 获取所有技能
   * @returns 所有技能的数组
   */
  getAllSkills(): SkillEffect[] {
    return Array.from(this.skills.values());
  }

  /**
   * 随机选择N个可用技能
   * @param player 玩家对象
   * @param count 数量
   * @returns 随机技能数组
   */
  getRandomSkills(player: Player, count: number = 3): SkillEffect[] {
    const available = this.getAvailableSkills(player);

    // 基于权重的随机选择（无放回）
    const pool = [...available];
    const selected: SkillEffect[] = [];

    // 生命汲取特殊：固定出现率3%，玩家选择一次后为0%
    let lifeStealSkillIndex = pool.findIndex((s) => s.id === "life_steal");
    let lifeStealSkill: SkillEffect | undefined =
      lifeStealSkillIndex >= 0 ? pool[lifeStealSkillIndex] : undefined;

    // 从池中移除，改为按固定概率决定是否本次出现
    if (lifeStealSkillIndex >= 0) {
      pool.splice(lifeStealSkillIndex, 1);
    }

    const canLifeStealAppear =
      !!lifeStealSkill &&
      !player.hasLifeSteal &&
      lifeStealSkill.canSelect(player);

    // 初始出现概率0.5%，若玩家已选择过则不再出现（0%）
    if (canLifeStealAppear && Math.random() < 0.005) {
      selected.push(lifeStealSkill!);
      // 记录在选项中的“出现”次数（用于统计）
      if (!player.skillAppearances) player.skillAppearances = {};
      const prev = player.skillAppearances["life_steal"] ?? 0;
      player.skillAppearances["life_steal"] = prev + 1;
    }

    const getWeight = (skill: SkillEffect): number => {
      // 稀有技能：基础权重降低，并随选择次数递减
      if (skill.rarity === "rare") {
        const baseRare = GAME_CONFIG.SKILLS.RARE_WEIGHT_MULTIPLIER ?? 0.67; // 默认降低33%
        const timesSelected = player.rareSkillSelections?.[skill.id] ?? 0;
        const decayPerPick = 0.89; // 每次选择后再降低11%
        return baseRare * Math.pow(decayPerPick, timesSelected);
      }
      return 1;
    };

    const picks = Math.min(count - selected.length, pool.length);
    for (let i = 0; i < picks; i++) {
      const totalWeight = pool.reduce((sum, s) => sum + getWeight(s), 0);
      let r = Math.random() * totalWeight;
      let chosenIndex = 0;
      for (let j = 0; j < pool.length; j++) {
        r -= getWeight(pool[j]);
        if (r <= 0) {
          chosenIndex = j;
          break;
        }
      }
      const chosen = pool[chosenIndex];
      selected.push(chosen);
      pool.splice(chosenIndex, 1);
    }

    return selected;
  }

  /**
   * 获取技能统计信息
   */
  getStats(): {
    total: number;
    byType: Record<string, number>;
  } {
    const byType: Record<string, number> = {
      health: 0,
      attack: 0,
      shield: 0,
      special: 0,
    };

    for (const skill of this.skills.values()) {
      byType[skill.type]++;
    }

    return {
      total: this.skills.size,
      byType,
    };
  }
}

// 导出单例实例（也可以每次创建新实例）
export const skillSystem = new SkillSystem();

