// 游戏配置常量
export const GAME_CONFIG = {
  // 画布尺寸
  CANVAS: {
    MAX_WIDTH: 1080,  // 手机横屏宽度
    MAX_HEIGHT: 1920, // 手机竖屏高度
    GRID_SIZE: 40,
  },

  // 玩家初始属性
  PLAYER: {
    RADIUS: 30, // 从15增加到30，放大一倍
    INITIAL_HEALTH: 40, // 降低初始生命值，增加挑战性（从80降低到40）
    INITIAL_LIVES: 3,
    MAX_LIVES: 3,
    INITIAL_ATTACK_DAMAGE: 10,
    INITIAL_ATTACK_SPEED: 1.5,
    INITIAL_ATTACK_RANGE: 300,
    INITIAL_BULLET_COUNT: 1,
    INITIAL_MOVE_SPEED: 3,
    MAX_MOVE_SPEED: 8,
    DAMAGE_COOLDOWN: 500, // 受伤无敌时间（毫秒）
  },

  // 虚拟摇杆配置
  JOYSTICK: {
    OUTER_RADIUS: 70,
    INNER_RADIUS: 35,
    MAX_DISTANCE: 56, // 外圈半径的 80%
    OPACITY: 0.6,
    COLOR: '#60a5fa',
  },

  // 敌人属性
  ENEMY: {
    // 怪物伤害每级增加22%（乘法因子）
    DAMAGE_PER_LEVEL_MULTIPLIER: 1.22,
    RADIUS: 24, // 从12增加到24，放大一倍
    SPAWN_OFFSET: 20,
    BASE_HEALTH: 15,
    // 下调：每10击杀的血量增量，从5降至2（更平滑）
    HEALTH_INCREMENT_PER_10_KILLS: 2,
    BASE_SPEED: 0.6, // 降低基础速度25%（从0.8降至0.6），给玩家更多反应时间
    SPEED_INCREMENT_PER_20_KILLS: 0.15,
    MAX_SPEED: 2.5,
    INITIAL_SPAWN_INTERVAL: 1500,
    MIN_SPAWN_INTERVAL: 600,
    SPAWN_INTERVAL_DECREASE_PER_10_KILLS: 60,
    // 新增：按等级缩短刷新间隔的乘数（越小越快），调整为更慢的0.88
    SPAWN_INTERVAL_PER_LEVEL_MULTIPLIER: 0.88,
    DAMAGE_TO_PLAYER: 5,
    // 下调：全局敌人血量乘数，从1.3降至1.1，柔化基础强度
    GLOBAL_HEALTH_MULTIPLIER: 1.1,
    // 新增：每秒血量增长比例（原为2%/秒，改为1%/秒）
    HEALTH_GROWTH_PER_SECOND: 0.01,
    // 新增：16级之后的生成增长系数（强抑制增长）
    SPAWN_GROWTH_MULTIPLIER_AFTER_16: 0.35,
    // 不同类型敌人的配置
    TYPES: {
      swarm: {
        radius: 16, // 从8增加到16，放大一倍
        healthMultiplier: 0.5,
        speedMultiplier: 0.4, // 进一步降低速度（从0.6降至0.4）
        damage: 4, // 从3增加到4
        spawnWeight: 0.5,
      },
      rusher: {
        radius: 24, // 从12增加到24，放大一倍
        healthMultiplier: 1.0,
        speedMultiplier: 0.68, // 进一步降低速度（从0.85降至0.68）
        damage: 6, // 从5增加到6
        spawnWeight: 0.3,
      },
      shooter: {
        radius: 20, // 从10增加到20，放大一倍
        healthMultiplier: 0.8,
        speedMultiplier: 0.4, // 进一步降低速度（从0.5降至0.4）
        damage: 5, // 从4增加到5
        shootCooldown: 2000,
        shootRange: 250,
        spawnWeight: 0.15,
      },
      elite: {
        radius: 36, // 从18增加到36，放大一倍
        healthMultiplier: 3.0,
        speedMultiplier: 0.34, // 进一步降低速度（从0.43降至0.34）
        damage: 10, // 从8增加到10
        spawnWeight: 0.05,
      },
      spider: {
        radius: 18,
        healthMultiplier: 0.7,
        speedMultiplier: 0.78, // 进一步降低速度（从0.98降至0.78）
        damage: 5,
        spawnWeight: 0.2,
      },
      crab: {
        radius: 22,
        healthMultiplier: 1.4,
        speedMultiplier: 0.54, // 进一步降低速度（从0.68降至0.54）
        damage: 7,
        spawnWeight: 0.15,
      },
      bigeye: {
        radius: 20,
        healthMultiplier: 1.2,
        speedMultiplier: 0.61, // 进一步降低速度（从0.76降至0.61）
        damage: 6,
        spawnWeight: 0.15,
      },
      frog: {
        radius: 20,
        healthMultiplier: 1.0,
        speedMultiplier: 0.71, // 进一步降低速度（从0.89降至0.71）
        damage: 6,
        spawnWeight: 0.2,
      },
    },
  },

  // 子弹属性
  BULLET: {
    BASE_RADIUS: 4,
    ENLARGED_RADIUS: 6,
    SPEED: 8,
    SPREAD_ANGLE: Math.PI / 12,
  },

  // 粒子效果
  PARTICLE: {
    BASE_RADIUS: 3,
    BASE_LIFE: 30,
    BASE_SPEED: 2,
    SPEED_VARIANCE: 2,
    DEATH_PARTICLE_COUNT: 8,
    HIT_PARTICLE_COUNT: 3,
  },

  // 升级系统
  LEVELING: {
    EXP_PER_KILL: 8, // 降低到8，升级速度减半
    EXP_MULTIPLIER: 80, // 保持不变（在calculateExpNeeded中已减半）
    EXP_MULTIPLIER_PER_LEVEL: 80,
    SCORE_PER_KILL: 10,
    // 新增：升级需求规则
    BASE_KILLS_FOR_FIRST_LEVEL: 5, // 首次升级需要击杀5个敌人
    GROWTH_RATE: 1.33, // 之后每级在上一级基础上增加33%
    BOSS_EXP_REWARD_MULTIPLIER: 50, // Boss 经验奖励倍率（集中管理）
  },

  // 技能效果
  SKILLS: {
    HEALTH_BOOST: 20,
    ATTACK_BOOST: 5,
    SPEED_BOOST_MULTIPLIER: 1.15,
    RANGE_BOOST: 50,
    SHIELD_BOOST: 20,
    MOVE_SPEED_MULTIPLIER: 1.2,
    BULLET_SIZE_MULTIPLIER: 1.5,
    LIFE_STEAL_AMOUNT: 1,
    // 生命汲取特殊：每次在选项中出现后，后续出现概率乘以该值
    LIFE_STEAL_DECAY_ON_APPEAR: 0.5,
    // 稀有技能权重乘数：降低33%出现概率
    RARE_WEIGHT_MULTIPLIER: 0.67,
    // 暴击与AOE配置
    CRIT_MULTIPLIER_BASE: 2.0,
    CRIT_CHANCE_INCREMENT: 0.05, // 每次 +5%
    CRIT_CHANCE_MAX: 0.5, // 上限 50%
    CRIT_MULTIPLIER_INCREMENT: 0.25, // 每次 +0.25x
    CRIT_MULTIPLIER_MAX: 4.0, // 上限 4x
    AOE_DAMAGE_BASE: 8,
    AOE_DAMAGE_INCREMENT: 6,
    AOE_RADIUS: 80,
  },

  // 树木系统配置
  TREES: {
    // 开局预生成的半径（以玩家为中心）
    PREGENERATE_RADIUS: 1200,
    // 是否在玩家周围动态补充生成（默认关闭以避免“身边刷新”）
    DYNAMIC_UPDATE_ENABLED: false,
  },

  // 碰撞范围配置（极限优化，完全消除隐形围墙）
  COLLISION: {
    // 玩家 vs 树木：使用极限像素级精确碰撞（0.58 = 真实像素接触）
    PLAYER_VS_TREE_RADIUS_MULTIPLIER: 0.58,
    // 玩家 vs 敌人���保持正常碰撞判定
    PLAYER_VS_ENEMY_PLAYER_RADIUS_MULTIPLIER: 1.0,
    // 敌人 vs 玩家：保持正常碰撞判定
    ENEMY_VS_PLAYER_ENEMY_RADIUS_MULTIPLIER: 1.0,
    // 新增：前方阻挡角度范围（度）- 只有在前方扇形区域内才阻挡
    TREE_BLOCK_ANGLE: 120,
    // 新增：最小阻挡距离 - 彻底消除，只在物理接触时阻挡
    TREE_MIN_BLOCK_DISTANCE: 0,
  },

  // 新武器系统配置
  WEAPONS: {
    ORBITAL: {
      BASE_DAMAGE: 8,
      ROTATION_SPEED: 0.05,
      ORBIT_RADIUS: 50,
      DRONE_RADIUS: 8,
    },
    LIGHTNING: {
      BASE_DAMAGE: 15,
      COOLDOWN: 3000,
      CHAIN_COUNT: 3,
      CHAIN_RANGE: 150,
    },
    FIELD: {
      BASE_DAMAGE: 5,
      FIELD_RADIUS: 60,
      DAMAGE_INTERVAL: 500,
      KNOCKBACK_FORCE: 3,
    },
  },

  // 渲染相关
  RENDERING: {
    TARGET_FPS: 60,
    FRAME_TIME: 16.67, // 1000/60
    SHOW_HEALTH_BARS: false,
    HEALTH_BAR_WIDTH_MULTIPLIER: 2.5,
    HEALTH_BAR_HEIGHT: 4,
    HEALTH_BAR_OFFSET: 10,
    SHIELD_RADIUS_OFFSET: 5,
    AIM_INDICATOR_DISTANCE: 25,
    AIM_INDICATOR_RADIUS: 4,
  },

  // 颜色主题
  COLORS: {
    BACKGROUND: "#0f172a",
    GRID: "#1e293b",
    PLAYER_GRADIENT_START: "#60a5fa",
    PLAYER_GRADIENT_END: "#1e40af",
    ENEMY_GRADIENT_START: "#ef4444",
    ENEMY_GRADIENT_END: "#991b1b",
    ENEMY_EYE: "#7f1d1d",
    BULLET_GRADIENT_START: "#fbbf24",
    BULLET_GRADIENT_END: "#f59e0b",
    BULLET_CORE: "#fef3c7",
    PARTICLE_ENEMY_HIT: "rgb(239, 68, 68)",
    PARTICLE_ENEMY_DEATH: "rgb(251, 146, 60)", // 橙色死亡粒子
    PARTICLE_PLAYER_HIT: "rgb(59, 130, 246)",
    SHIELD: "rgba(96, 165, 250, 0.5)",
    AIM_INDICATOR: "#fbbf24",
    SHADOW: "rgba(0, 0, 0, 0.3)",
    // 新增敌人类型颜色
    ENEMY_SWARM: "#ef4444",
    ENEMY_RUSHER: "#f97316",
    ENEMY_SHOOTER: "#8b5cf6",
    ENEMY_ELITE: "#eab308",
    // 新增武器颜色
    WEAPON_ORBITAL: "#06b6d4",
    WEAPON_LIGHTNING: "#a855f7",
    WEAPON_FIELD: "#10b981",
  },
};

// 技能定义
export interface Skill {
  id: string;
  name: string;
  description: string;
  type: "health" | "attack" | "shield" | "special";
  icon?: string;
}

export const SKILLS: Skill[] = [
  { id: "health_boost", name: "生命强化", description: "最大生命值 +20", type: "health", icon: "❤️" },
  { id: "attack_boost", name: "攻击强化", description: "攻击力 +5", type: "attack", icon: "⚔️" },
  { id: "speed_boost", name: "速度强化", description: "攻击速度 +15%", type: "attack", icon: "⚡" },
  { id: "range_boost", name: "射程强化", description: "攻击范围 +50", type: "attack", icon: "🎯" },
  { id: "multi_shot", name: "多重射击", description: "子弹数量 +1", type: "attack", icon: "🔫" },
  { id: "critical_chance", name: "暴击几率", description: "暴击几率 +5%", type: "attack", icon: "❗" },
  { id: "critical_damage", name: "暴击伤害", description: "暴击伤害系数 +0.25x", type: "attack", icon: "✨" },
  { id: "shield_boost", name: "护盾强化", description: "最大护盾 +20", type: "shield", icon: "🛡️" },
  { id: "pierce_shot", name: "穿透射击", description: "子弹可穿透敌人", type: "special", icon: "💥" },
  { id: "life_steal", name: "生命汲取", description: "击杀敌人恢复1点生命（可重复选择，每次+1）", type: "special", icon: "🩸" },
  { id: "bullet_size", name: "子弹增幅", description: "子弹体积 +50%", type: "attack", icon: "🔵" },
  { id: "move_speed", name: "移动加速", description: "移动速度 +20%", type: "special", icon: "💨" },
  { id: "orbital_drone", name: "轨道无人机", description: "获得环绕的攻击无人机", type: "special", icon: "🛸" },
  { id: "lightning_chain", name: "闪电链", description: "定期释放连锁闪电", type: "special", icon: "⚡" },
  { id: "guardian_field", name: "守护力场", description: "环状力场伤害并击退敌人", type: "special", icon: "🌀" },
  { id: "aoe_blast", name: "爆裂", description: "敌人死亡触发爆炸并造成范围伤害（可升级）", type: "special", icon: "💣" },
];
