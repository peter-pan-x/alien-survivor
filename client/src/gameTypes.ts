// 游戏实体类型定义

export interface Player {
  x: number;
  y: number;
  radius: number;
  health: number;
  maxHealth: number;
  lives: number;
  maxLives: number;
  exp: number;
  level: number;
  attackDamage: number;
  attackSpeed: number;
  attackRange: number;
  bulletCount: number;
  shield: number;
  maxShield: number;
  moveSpeed: number;
  hasPierce: boolean;
  hasLifeSteal: boolean;
  // 可叠加的生命汲取数值（每次选择 +1）
  lifeStealAmount?: number;
  bulletSizeMultiplier: number;
  // 暴击相关
  critChance: number; // 0-1 几率
  critMultiplier: number; // 暴击伤害系数，例如 2.0
  // AOE 爆炸相关
  hasAOEExplosion: boolean;
  aoeDamage: number; // 爆炸伤害
  aoeRadius: number; // 爆炸范围半径
  // 子弹穿透相关
  pierceCount: number; // 子弹可以穿透的敌人数量
  pierceDamageReduction: number; // 穿透伤害递减系数（每次穿透后伤害 * 系数）
  // 稀有技能选择次数映射，用于动态降低同名稀有技能出现概率
  rareSkillSelections?: Record<string, number>;
  // 技能出现次数映射（用于特殊技能按"出现"递减概率）
  skillAppearances?: Record<string, number>;
  weapons: ActiveWeapon[];
}

export type EnemyType = 'swarm' | 'rusher' | 'shooter' | 'elite' | 'spider' | 'crab' | 'bigeye' | 'frog';

export interface Enemy {
  x: number;
  y: number;
  radius: number;
  health: number;
  maxHealth: number;
  speed: number;
  angle: number;
  type: EnemyType;
  shootCooldown?: number;
  lastShotTime?: number;
  id?: number; // 敌人唯一ID，用于穿透子弹追踪
}

export type BossType = 'level10' | 'level20' | 'level30' | 'level40' | 'level50';

export interface Boss {
  x: number;
  y: number;
  radius: number;
  health: number;
  maxHealth: number;
  speed: number;
  angle: number;
  type: BossType;
  level: number; // Boss出现的等级
  skillCooldown: number; // 技能冷却时间
  lastSkillTime: number; // 上次使用技能的时间
  skillData?: any; // Boss技能特定数据
}

export interface Tree {
  x: number;
  y: number;
  radius: number;
  type: 'small' | 'medium' | 'large';
  // 每棵树的颜色深浅系数（用于渲染变体）
  shade?: number;
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  pierce?: boolean;
  pierceCount?: number;
  currentPierceCount?: number; // 当前已穿透次数
  pierceDamageReduction?: number; // 当前伤害递减系数
  hitEnemies?: Set<number>; // 记录这颗子弹已经伤害过的敌人（通过ID）
  originalDamage?: number; // 原始伤害（用于计算递减伤害）
  isEnemyBullet?: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  radius: number;
}

export interface DamageNumber {
  x: number;
  y: number;
  value: number;
  life: number;
  maxLife: number;
  vy: number;
}

export type GameState = "menu" | "playing" | "paused" | "levelup" | "gameover";

export type WeaponType = 'orbital' | 'lightning' | 'field';

export interface ActiveWeapon {
  type: WeaponType;
  level: number;
  lastActivation: number;
}

export interface Joystick {
  active: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  angle: number;
  distance: number;
}

export interface GameStats {
  score: number;
  killCount: number;
  highScore: number;
  survivalTime: number;
}