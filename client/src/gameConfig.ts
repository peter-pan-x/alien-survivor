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
  },
};

// 技能定义
export interface Skill {
  id: string;
  name: string;
  description: string;
  type: "health" | "attack" | "shield" | "special";
}

export const SKILLS: Skill[] = [
  { id: "health_boost", name: "生命强化", description: "最大生命值 +20", type: "health" },
  { id: "attack_boost", name: "攻击强化", description: "攻击力 +5", type: "attack" },
  { id: "speed_boost", name: "速度强化", description: "攻击速度 +15%", type: "attack" },
  { id: "range_boost", name: "射程强化", description: "攻击范围 +50", type: "attack" },
  { id: "multi_shot", name: "多重射击", description: "子弹数量 +1", type: "attack" },
  { id: "shield_boost", name: "护盾强化", description: "最大护盾 +20", type: "shield" },
  { id: "pierce_shot", name: "穿透射击", description: "子弹可穿透敌人", type: "special" },
  { id: "life_steal", name: "生命汲取", description: "击杀敌人恢复5点生命", type: "special" },
  { id: "bullet_size", name: "子弹增幅", description: "子弹体积 +50%", type: "attack" },
  { id: "move_speed", name: "移动加速", description: "移动速度 +20%", type: "special" },
];

