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
  // 分裂子弹相关（原 AOE 爆炸）
  hasAOEExplosion: boolean; // 是否有分裂子弹
  aoeDamage: number; // 分裂子弹伤害百分比（0.3 = 30%）
  aoeRadius: number; // 分裂子弹飞行距离
  // 子弹穿透相关
  pierceCount: number; // 子弹可以穿透的敌人数量
  pierceDamageReduction: number; // 穿透伤害递减系数（每次穿透后伤害 * 系数）
  // 稀有技能选择次数映射，用于动态降低同名稀有技能出现概率
  rareSkillSelections?: Record<string, number>;
  // 技能出现次数映射（用于特殊技能按"出现"递减概率）
  skillAppearances?: Record<string, number>;
  weapons: ActiveWeapon[];
  // 经验球拾取范围
  pickupRange: number;
  // 遇强则强：攻击额外附带生命值百分比的伤害
  strengthBonus?: number; // 0.3 = 30%生命值伤害
  // 冰冻射击：子弹伤害加成和冰冻时长
  hasFrostShot?: boolean;
  frostDamageBonus?: number; // 伤害加成（0.2 = 20%）
  frostDuration?: number; // 冰冻时长（毫秒）
  // 火焰攻击：伤害加成和燃烧效果
  hasFlameAttack?: boolean;
  flameDamageBonus?: number; // 伤害加成（0.2 = 20%）
  flameBurnDamage?: number; // 燃烧伤害百分比（0.1 = 10%）
  flameBurnDuration?: number; // 燃烧持续时间（毫秒）
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
  // 冰冻状态
  frozenUntil?: number; // 冰冻结束时间戳
  // 燃烧状态
  burningUntil?: number; // 燃烧结束时间戳
  burnDamagePerTick?: number; // 每次燃烧伤害
  lastBurnTick?: number; // 上次燃烧伤害时间
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
  // 跳跃机制相关
  jumpRange: number; // 跳跃触发距离
  jumpCooldown: number; // 跳跃冷却时间
  jumpDuration: number; // 跳跃持续时间
  lastJumpTime: number; // 上次跳跃时间
  isJumping: boolean; // 是否正在跳跃
  jumpStartTime?: number; // 跳跃开始时间
  jumpStartX?: number; // 跳跃起始位置X
  jumpStartY?: number; // 跳跃起始位置Y
  jumpTargetX?: number; // 跳跃目标位置X
  jumpTargetY?: number; // 跳跃目标位置Y
}

export interface Tree {
  x: number;
  y: number;
  radius: number;
  type: 'small' | 'medium' | 'large';
  // 每棵树的颜色深浅系数（用于渲染变体）
  shade?: number;
  // 树木形状种子（用于生成固定的不规则形状）
  seed?: number;
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
  // 敌人/Boss子弹距离限制
  startX?: number; // 起始位置 X
  startY?: number; // 起始位置 Y
  maxDistance?: number; // 最大飞行距离
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
  isCrit?: boolean; // 是否为暴击
}

export type GameState = "menu" | "playing" | "paused" | "levelup" | "gameover";

export type WeaponType = 'orbital' | 'lightning' | 'field';

export interface ActiveWeapon {
  type: WeaponType;
  level: number;
  lastActivation: number;
  // 闪电链武器的渲染数据
  lightningTargets?: Enemy[];
  lightningTime?: number;
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