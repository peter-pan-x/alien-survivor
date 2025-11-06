// 游戏配置常量
export const GAME_CONFIG = {
  // 画布尺寸
  CANVAS: {
    MAX_WIDTH: 600,
    MAX_HEIGHT: 800,
    GRID_SIZE: 40,
  },

  // 玩家初始属性
  PLAYER: {
    RADIUS: 15,
    INITIAL_HEALTH: 100,
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
    RADIUS: 12,
    SPAWN_OFFSET: 20,
    BASE_HEALTH: 15,
    HEALTH_INCREMENT_PER_10_KILLS: 5,
    BASE_SPEED: 0.8,
    SPEED_INCREMENT_PER_20_KILLS: 0.15,
    MAX_SPEED: 2.5,
    INITIAL_SPAWN_INTERVAL: 1500,
    MIN_SPAWN_INTERVAL: 400,
    SPAWN_INTERVAL_DECREASE_PER_10_KILLS: 100,
    DAMAGE_TO_PLAYER: 5,
    // 不同类型敌人的配置
    TYPES: {
      swarm: {
        radius: 8,
        healthMultiplier: 0.5,
        speedMultiplier: 0.7,
        damage: 3,
        spawnWeight: 0.5,
      },
      rusher: {
        radius: 12,
        healthMultiplier: 1.0,
        speedMultiplier: 1.0,
        damage: 5,
        spawnWeight: 0.3,
      },
      shooter: {
        radius: 10,
        healthMultiplier: 0.8,
        speedMultiplier: 0.6,
        damage: 4,
        shootCooldown: 2000,
        shootRange: 250,
        spawnWeight: 0.15,
      },
      elite: {
        radius: 18,
        healthMultiplier: 3.0,
        speedMultiplier: 0.5,
        damage: 8,
        spawnWeight: 0.05,
      },
    },
  },

  // 子弹属性
  BULLET: {
    BASE_RADIUS: 4,
    ENLARGED_RADIUS: 6,
    SPEED: 8,
    SPREAD_ANGLE: Math.PI / 4,
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
    EXP_PER_KILL: 10,
    EXP_MULTIPLIER_PER_LEVEL: 50,
    SCORE_PER_KILL: 10,
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
    LIFE_STEAL_AMOUNT: 5,
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
  { id: "shield_boost", name: "护盾强化", description: "最大护盾 +20", type: "shield", icon: "🛡️" },
  { id: "pierce_shot", name: "穿透射击", description: "子弹可穿透敌人", type: "special", icon: "💥" },
  { id: "life_steal", name: "生命汲取", description: "击杀敌人恢复5点生命", type: "special", icon: "🩸" },
  { id: "bullet_size", name: "子弹增幅", description: "子弹体积 +50%", type: "attack", icon: "🔵" },
  { id: "move_speed", name: "移动加速", description: "移动速度 +20%", type: "special", icon: "💨" },
  { id: "orbital_drone", name: "轨道无人机", description: "获得环绕的攻击无人机", type: "special", icon: "🛸" },
  { id: "lightning_chain", name: "闪电链", description: "定期释放连锁闪电", type: "special", icon: "⚡" },
  { id: "guardian_field", name: "守护力场", description: "环状力场伤害并击退敌人", type: "special", icon: "🌀" },
];

