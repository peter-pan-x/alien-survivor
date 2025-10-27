// 游戏实体类型定义

export interface Player {
  x: number;
  y: number;
  radius: number;
  health: number;
  maxHealth: number;
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
  bulletSizeMultiplier: number;
  weapons: ActiveWeapon[];
}

export type EnemyType = 'swarm' | 'rusher' | 'shooter' | 'elite';

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

