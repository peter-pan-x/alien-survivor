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
  rarity?: "common" | "rare" | "epic";
  level?: number;
  maxLevel?: number;
  tags?: string[];
  evolutionRequirements?: string[];
  evolvesTo?: string;
  getDescription?: (player?: Player) => string;
  
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
  private magnetizeAllCallback?: () => void;

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
   * 设置磁吸所有经验球回调
   */
  setMagnetizeAllCallback(callback: () => void): void {
    this.magnetizeAllCallback = callback;
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
      maxLevel: 8,
      tags: ["speed", "attack-rate"],
      evolvesTo: "overload_arc",
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
      maxLevel: 6,
      tags: ["range"],
      evolvesTo: "satellite_matrix",
      apply: (player: Player) => {
        player.attackRange += GAME_CONFIG.SKILLS.RANGE_BOOST;
        return true;
      },
      canSelect: () => true,
    });

    this.registerSkill({
      id: "multi_shot",
      name: "多重射击",
      description: "子弹数量 +1，伤害 -20%",
      type: "attack",
      icon: "🔫",
      maxLevel: 9,
      tags: ["multi", "projectile"],
      evolvesTo: "frost_burst",
      apply: (player: Player) => {
        player.bulletCount += 1;
        // 每次选择多重射击，伤害降低20%（优化：从30%降低到20%）
        player.attackDamage = Math.floor(player.attackDamage * 0.8);
        return true;
      },
      canSelect: (player: Player) => player.bulletCount < 10, // 最多10个子弹
    });

    this.registerSkill({
      id: "bullet_size",
      name: "子弹增幅",
      description: "子弹体积 +50%，伤害 +30%",
      type: "attack",
      icon: "🔵",
      apply: (player: Player) => {
        player.bulletSizeMultiplier *= GAME_CONFIG.SKILLS.BULLET_SIZE_MULTIPLIER;
        // 同时增加30%伤害
        player.attackDamage = Math.floor(player.attackDamage * 1.3);
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
      maxLevel: 5,
      tags: ["shield"],
      evolvesTo: "reactive_aegis",
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
      canSelect: (player: Player) => !player.hasPierce || player.pierceCount < 10, // 首次可选，之后可升级到10穿透
    });

    this.registerSkill({
      id: "life_steal",
      name: "生命汲取",
      description: "击杀敌人恢复1点生命（可重复选择，每次+1）",
      type: "special",
      rarity: "epic",
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

    // 拾取范围技能
    this.registerSkill({
      id: "pickup_range",
      name: "磁力吸收",
      description: "经验球拾取范围 +30",
      type: "special",
      icon: "🧲",
      apply: (player: Player) => {
        player.pickupRange += 30;
        return true;
      },
      canSelect: (player: Player) => player.pickupRange < 300, // 最大拾取范围300
    });

    // 磁吸全屏技能（稀有）
    this.registerSkill({
      id: "magnet_burst",
      name: "磁力爆发",
      description: "经验球拾取范围 +80，且立即吸收所有场上经验球",
      type: "special",
      rarity: "rare",
      icon: "⚡",
      apply: (player: Player) => {
        player.pickupRange += 80;
        // 立即吸收所有经验球
        if (this.magnetizeAllCallback) {
          this.magnetizeAllCallback();
        }
        return true;
      },
      canSelect: (player: Player) => player.pickupRange < 300,
    });

    // ==================== 武器类技能 ====================
    this.registerSkill({
      id: "orbital_drone",
      name: "轨道无人机",
      description: "获得环绕的攻击无人机",
      type: "special",
      rarity: "rare",
      icon: "🛸",
      maxLevel: 6,
      tags: ["orbital", "weapon"],
      evolvesTo: "satellite_matrix",
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
      description: "释放连锁闪电，伤害1.5倍攻击力（升级+50%伤害，+2连击）",
      type: "special",
      rarity: "rare",
      icon: "⚡",
      maxLevel: 6,
      tags: ["lightning", "weapon"],
      evolvesTo: "overload_arc",
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
      maxLevel: 6,
      tags: ["field", "weapon"],
      evolvesTo: "reactive_aegis",
      apply: (player: Player) => {
        if (this.weaponAddCallback) {
          this.weaponAddCallback(player, "field");
          return true;
        }
        return false;
      },
      canSelect: () => true,
    });

    // 分裂子弹（敌人死亡后向四周发射3颗子弹）
    this.registerSkill({
      id: "aoe_blast",
      name: "分裂",
      description: `敌人死亡后分裂出3颗子弹（升级提升伤害和射程）`,
      type: "special",
      icon: "💥",
      maxLevel: 6,
      tags: ["split", "projectile"],
      evolvesTo: "blast_inferno",
      apply: (player: Player) => {
        if (!player.hasAOEExplosion) {
          // 首次获得：30%攻击力伤害，200距离
          player.hasAOEExplosion = true;
          player.aoeDamage = 0.3; // 30%攻击力
          player.aoeRadius = 200; // 飞行距离（翻倍）
        } else {
          // 每次升级：伤害+10%，距离+40
          player.aoeDamage += 0.1;
          player.aoeRadius += 40;
        }
        return true;
      },
      canSelect: () => true, // 可重复选择以提升伤害和距离
    });

    // 遇强则强：攻击额外附带生命值10%的伤害
    this.registerSkill({
      id: "strength_bonus",
      name: "遇强则强",
      description: "攻击额外附带角色当前生命值10%的伤害（可叠加）",
      type: "attack",
      rarity: "rare",
      icon: "💪",
      apply: (player: Player) => {
        if (!player.strengthBonus) {
          player.strengthBonus = 0.1; // 初始10%
        } else {
          player.strengthBonus += 0.05; // 每次升级+5%
        }
        return true;
      },
      canSelect: () => true,
    });

    // 冰冻射击：子弹伤害+20%，击中敌人冰冻1秒
    this.registerSkill({
      id: "frost_shot",
      name: "冰冻射击",
      description: "子弹伤害+20%，击中敌人冰冻1秒（升级+10%伤害，+0.5秒冰冻）",
      type: "attack",
      rarity: "rare",
      icon: "❄️",
      maxLevel: 6,
      tags: ["frost", "projectile"],
      evolvesTo: "frost_burst",
      apply: (player: Player) => {
        if (!player.hasFrostShot) {
          player.hasFrostShot = true;
          player.frostDamageBonus = 0.2; // 初始20%伤害加成
          player.frostDuration = 1000; // 初始1秒冰冻
        } else {
          player.frostDamageBonus = (player.frostDamageBonus || 0.2) + 0.1; // +10%伤害
          player.frostDuration = (player.frostDuration || 1000) + 500; // +0.5秒冰冻
        }
        return true;
      },
      canSelect: () => true,
    });

    // 火焰攻击：子弹伤害+20%，施加燃烧效果
    this.registerSkill({
      id: "flame_attack",
      name: "火焰攻击",
      description: "伤害+20%，敌人燃烧3秒（每0.5秒造成10%攻击力伤害）",
      type: "attack",
      rarity: "rare",
      icon: "🔥",
      maxLevel: 6,
      tags: ["flame", "burn"],
      evolvesTo: "blast_inferno",
      apply: (player: Player) => {
        if (!player.hasFlameAttack) {
          player.hasFlameAttack = true;
          player.flameDamageBonus = 0.2; // 初始20%伤害加成
          player.flameBurnDamage = 0.1; // 每次燃烧10%攻击力
          player.flameBurnDuration = 3000; // 燃烧持续3秒
        } else {
          player.flameDamageBonus = (player.flameDamageBonus || 0.2) + 0.1; // +10%伤害
          player.flameBurnDamage = (player.flameBurnDamage || 0.1) + 0.05; // +5%燃烧伤害
          player.flameBurnDuration = (player.flameBurnDuration || 3000) + 1000; // +1秒燃烧
        }
        return true;
      },
      canSelect: () => true,
    });

    this.registerEvolutionSkills();
  }

  private registerEvolutionSkills(): void {
    this.registerSkill({
      id: "frost_burst",
      name: "冰霜弹幕",
      description: "进化：额外子弹并强化冰冻伤害",
      type: "attack",
      rarity: "epic",
      tags: ["evolution", "frost", "multi"],
      evolutionRequirements: ["frost_shot", "multi_shot"],
      getDescription: () => "冰冻射击 + 多重射击进化：子弹+1，冰冻伤害大幅提升。",
      apply: (player: Player) => {
        player.bulletCount += 1;
        player.hasFrostShot = true;
        player.frostDamageBonus = (player.frostDamageBonus ?? 0.2) + 0.25;
        player.frostDuration = (player.frostDuration ?? 1000) + 750;
        player.evolvedSkills = { ...(player.evolvedSkills ?? {}), frost_burst: true };
        return true;
      },
      canSelect: (player: Player) =>
        !!player.hasFrostShot &&
        player.bulletCount >= 2 &&
        !player.evolvedSkills?.frost_burst,
    });

    this.registerSkill({
      id: "blast_inferno",
      name: "燃爆弹",
      description: "进化：燃烧和分裂子弹互相增幅",
      type: "attack",
      rarity: "epic",
      tags: ["evolution", "flame", "split"],
      evolutionRequirements: ["flame_attack", "aoe_blast"],
      getDescription: () => "火焰攻击 + 分裂进化：燃烧更久，分裂弹伤害更高。",
      apply: (player: Player) => {
        player.hasFlameAttack = true;
        player.hasAOEExplosion = true;
        player.flameDamageBonus = (player.flameDamageBonus ?? 0.2) + 0.2;
        player.flameBurnDamage = (player.flameBurnDamage ?? 0.1) + 0.12;
        player.flameBurnDuration = (player.flameBurnDuration ?? 3000) + 1500;
        player.aoeDamage += 0.25;
        player.aoeRadius += 80;
        player.evolvedSkills = { ...(player.evolvedSkills ?? {}), blast_inferno: true };
        return true;
      },
      canSelect: (player: Player) =>
        !!player.hasFlameAttack &&
        !!player.hasAOEExplosion &&
        !player.evolvedSkills?.blast_inferno,
    });

    this.registerSkill({
      id: "overload_arc",
      name: "超载电弧",
      description: "进化：闪电链触发更频繁",
      type: "special",
      rarity: "epic",
      tags: ["evolution", "lightning"],
      evolutionRequirements: ["lightning_chain", "speed_boost"],
      getDescription: () => "闪电链 + 攻速强化进化：攻击速度提升，并追加闪电模块。",
      apply: (player: Player) => {
        player.attackSpeed *= 1.25;
        this.weaponAddCallback?.(player, "lightning");
        player.evolvedSkills = { ...(player.evolvedSkills ?? {}), overload_arc: true };
        return true;
      },
      canSelect: (player: Player) =>
        player.weapons.some((weapon) => weapon.type === "lightning") &&
        player.attackSpeed > GAME_CONFIG.PLAYER.INITIAL_ATTACK_SPEED &&
        !player.evolvedSkills?.overload_arc,
    });

    this.registerSkill({
      id: "satellite_matrix",
      name: "卫星矩阵",
      description: "进化：无人机轨道扩大并追加无人机",
      type: "special",
      rarity: "epic",
      tags: ["evolution", "orbital"],
      evolutionRequirements: ["orbital_drone", "range_boost"],
      getDescription: () => "轨道无人机 + 射程强化进化：射程+80，并追加无人机。",
      apply: (player: Player) => {
        player.attackRange += 80;
        this.weaponAddCallback?.(player, "orbital");
        player.evolvedSkills = { ...(player.evolvedSkills ?? {}), satellite_matrix: true };
        return true;
      },
      canSelect: (player: Player) =>
        player.weapons.some((weapon) => weapon.type === "orbital") &&
        player.attackRange > GAME_CONFIG.PLAYER.INITIAL_ATTACK_RANGE &&
        !player.evolvedSkills?.satellite_matrix,
    });

    this.registerSkill({
      id: "reactive_aegis",
      name: "反应护罩",
      description: "进化：护盾强化守护力场",
      type: "shield",
      rarity: "epic",
      tags: ["evolution", "field", "shield"],
      evolutionRequirements: ["guardian_field", "shield_boost"],
      getDescription: () => "守护力场 + 护盾强化进化：护盾+40，并强化力场模块。",
      apply: (player: Player) => {
        player.maxShield += 40;
        player.shield = player.maxShield;
        this.weaponAddCallback?.(player, "field");
        player.evolvedSkills = { ...(player.evolvedSkills ?? {}), reactive_aegis: true };
        return true;
      },
      canSelect: (player: Player) =>
        player.weapons.some((weapon) => weapon.type === "field") &&
        player.maxShield > 0 &&
        !player.evolvedSkills?.reactive_aegis,
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
      if (success) {
        if (!player.skillLevels) player.skillLevels = {};
        player.skillLevels[skill.id] = (player.skillLevels[skill.id] ?? 0) + 1;
      }
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

  // 特殊技能ID及其固定出现概率（不参与均等分配）
  private static readonly SPECIAL_SKILL_RATES: Record<string, number> = {
    "life_steal": 0.0001, // 生命汲取：0.01%
  };

  /**
   * 随机选择N个可用技能
   * 设计原则：
   * 1. 特殊技能（如生命汲取）有固定的低概率，不参与均等分配
   * 2. 其余所有技能均等概率出现
   * 3. 新增技能自动均等分配（无需额外配置）
   * 
   * @param player 玩家对象
   * @param count 数量
   * @returns 随机技能数组
   */
  getRandomSkills(player: Player, count: number = 3): SkillEffect[] {
    const available = this.getAvailableSkills(player);
    const selected: SkillEffect[] = [];
    
    // 分离特殊技能和普通技能
    const specialSkills: SkillEffect[] = [];
    const evolutionSkills: SkillEffect[] = [];
    const normalPool: SkillEffect[] = [];
    
    for (const skill of available) {
      if (SkillSystem.SPECIAL_SKILL_RATES[skill.id] !== undefined) {
        specialSkills.push(skill);
      } else if (skill.tags?.includes("evolution")) {
        evolutionSkills.push(skill);
      } else {
        normalPool.push(skill);
      }
    }

    if (evolutionSkills.length > 0) {
      const randomEvolution = evolutionSkills[Math.floor(Math.random() * evolutionSkills.length)];
      selected.push(randomEvolution);
    }
    
    // 处理特殊技能：按固定概率决定是否出现
    for (const skill of specialSkills) {
      const rate = SkillSystem.SPECIAL_SKILL_RATES[skill.id];
      if (Math.random() < rate) {
        selected.push(skill);
        // 记录出现次数（统计用）
        if (!player.skillAppearances) player.skillAppearances = {};
        player.skillAppearances[skill.id] = (player.skillAppearances[skill.id] ?? 0) + 1;
      }
    }
    
    // 普通技能：均等概率随机选择（无放回）
    const picks = Math.min(count - selected.length, normalPool.length);
    for (let i = 0; i < picks; i++) {
      // 均等概率：直接用数组长度随机索引
      const randomIndex = Math.floor(Math.random() * normalPool.length);
      selected.push(normalPool[randomIndex]);
      normalPool.splice(randomIndex, 1);
    }
    
    // 打乱顺序，避免特殊技能总在前面
    for (let i = selected.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [selected[i], selected[j]] = [selected[j], selected[i]];
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
