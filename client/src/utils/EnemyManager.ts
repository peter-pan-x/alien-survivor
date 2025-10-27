import { Enemy, EnemyType, Player, Bullet } from "../gameTypes";
import { GAME_CONFIG } from "../gameConfig";

export class EnemyManager {
  private enemies: Enemy[] = [];
  private lastSpawnTime: number = 0;
  private gameStartTime: number = 0;

  constructor() {
    this.reset();
  }

  public reset() {
    this.enemies = [];
    this.lastSpawnTime = 0;
    this.gameStartTime = Date.now();
  }

  public getEnemies(): Enemy[] {
    return this.enemies;
  }

  public setEnemies(enemies: Enemy[]) {
    this.enemies = enemies;
  }

  public spawnEnemy(canvasWidth: number, canvasHeight: number, currentTime: number): void {
    const survivalTime = (currentTime - this.gameStartTime) / 1000; // 秒
    const spawnInterval = this.getSpawnInterval(survivalTime);

    if (currentTime - this.lastSpawnTime < spawnInterval) {
      return;
    }

    this.lastSpawnTime = currentTime;

    // 根据生存时间决定生成数量
    const spawnCount = this.getSpawnCount(survivalTime);

    for (let i = 0; i < spawnCount; i++) {
      const enemyType = this.selectEnemyType(survivalTime);
      const enemy = this.createEnemy(enemyType, canvasWidth, canvasHeight, survivalTime);
      this.enemies.push(enemy);
    }
  }

  private getSpawnInterval(survivalTime: number): number {
    // 基于时间的刷新间隔，随时间递减
    const baseInterval = GAME_CONFIG.ENEMY.INITIAL_SPAWN_INTERVAL;
    const minInterval = GAME_CONFIG.ENEMY.MIN_SPAWN_INTERVAL;
    const decreaseRate = 50; // 每秒减少的毫秒数

    const interval = baseInterval - survivalTime * decreaseRate;
    return Math.max(interval, minInterval);
  }

  private getSpawnCount(survivalTime: number): number {
    // 基于时间的生成数量
    if (survivalTime < 30) return 1;
    if (survivalTime < 60) return 2;
    if (survivalTime < 120) return 3;
    if (survivalTime < 180) return 4;
    return 5;
  }

  private selectEnemyType(survivalTime: number): EnemyType {
    // 根据生存时间解锁不同的敌人类型
    const availableTypes: { type: EnemyType; weight: number }[] = [];

    // 集群者 - 始终可用
    availableTypes.push({
      type: 'swarm',
      weight: GAME_CONFIG.ENEMY.TYPES.swarm.spawnWeight,
    });

    // 冲撞者 - 10秒后解锁
    if (survivalTime >= 10) {
      availableTypes.push({
        type: 'rusher',
        weight: GAME_CONFIG.ENEMY.TYPES.rusher.spawnWeight,
      });
    }

    // 射手 - 30秒后解锁
    if (survivalTime >= 30) {
      availableTypes.push({
        type: 'shooter',
        weight: GAME_CONFIG.ENEMY.TYPES.shooter.spawnWeight,
      });
    }

    // 精英 - 60秒后解锁
    if (survivalTime >= 60) {
      availableTypes.push({
        type: 'elite',
        weight: GAME_CONFIG.ENEMY.TYPES.elite.spawnWeight,
      });
    }

    // 加权随机选择
    const totalWeight = availableTypes.reduce((sum, t) => sum + t.weight, 0);
    let random = Math.random() * totalWeight;

    for (const typeInfo of availableTypes) {
      random -= typeInfo.weight;
      if (random <= 0) {
        return typeInfo.type;
      }
    }

    return 'swarm'; // 默认返回集群者
  }

  private createEnemy(
    type: EnemyType,
    canvasWidth: number,
    canvasHeight: number,
    survivalTime: number
  ): Enemy {
    const typeConfig = GAME_CONFIG.ENEMY.TYPES[type];
    
    // 基于时间的属性增长
    const timeMultiplier = 1 + survivalTime * 0.02; // 每秒增长2%

    // 随机生成位置（屏幕边缘外）
    const side = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    const offset = GAME_CONFIG.ENEMY.SPAWN_OFFSET;

    switch (side) {
      case 0: // 上
        x = Math.random() * canvasWidth;
        y = -offset;
        break;
      case 1: // 右
        x = canvasWidth + offset;
        y = Math.random() * canvasHeight;
        break;
      case 2: // 下
        x = Math.random() * canvasWidth;
        y = canvasHeight + offset;
        break;
      case 3: // 左
        x = -offset;
        y = Math.random() * canvasHeight;
        break;
    }

    const baseHealth = GAME_CONFIG.ENEMY.BASE_HEALTH * typeConfig.healthMultiplier;
    const baseSpeed = GAME_CONFIG.ENEMY.BASE_SPEED * typeConfig.speedMultiplier;

    const enemy: Enemy = {
      x,
      y,
      radius: typeConfig.radius,
      health: baseHealth * timeMultiplier,
      maxHealth: baseHealth * timeMultiplier,
      speed: Math.min(baseSpeed * timeMultiplier, GAME_CONFIG.ENEMY.MAX_SPEED),
      angle: 0,
      type,
    };

    // 射手类型需要额外的属性
    if (type === 'shooter') {
      enemy.shootCooldown = typeConfig.shootCooldown;
      enemy.lastShotTime = 0;
    }

    return enemy;
  }

  public updateEnemies(
    player: Player,
    deltaTime: number,
    canvasWidth: number,
    canvasHeight: number,
    currentTime: number,
    enemyBullets: Bullet[]
  ): void {
    for (const enemy of this.enemies) {
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      enemy.angle = Math.atan2(dy, dx);

      if (enemy.type === 'shooter') {
        // 射手保持距离并射击
        const shootRange = GAME_CONFIG.ENEMY.TYPES.shooter.shootRange || 250;
        
        if (distance > shootRange) {
          // 靠近玩家
          enemy.x += Math.cos(enemy.angle) * enemy.speed;
          enemy.y += Math.sin(enemy.angle) * enemy.speed;
        } else if (distance < shootRange - 50) {
          // 远离玩家
          enemy.x -= Math.cos(enemy.angle) * enemy.speed * 0.5;
          enemy.y -= Math.sin(enemy.angle) * enemy.speed * 0.5;
        }

        // 射击
        if (enemy.shootCooldown && enemy.lastShotTime !== undefined) {
          if (currentTime - enemy.lastShotTime > enemy.shootCooldown) {
            this.shootAtPlayer(enemy, player, enemyBullets);
            enemy.lastShotTime = currentTime;
          }
        }
      } else {
        // 其他类型直接追踪玩家
        enemy.x += Math.cos(enemy.angle) * enemy.speed;
        enemy.y += Math.sin(enemy.angle) * enemy.speed;
      }

      // 边界检查（防止敌人走太远）
      const maxDistance = Math.max(canvasWidth, canvasHeight) * 2;
      if (Math.abs(enemy.x - player.x) > maxDistance || Math.abs(enemy.y - player.y) > maxDistance) {
        enemy.health = 0; // 标记为死亡，稍后移除
      }
    }
  }

  private shootAtPlayer(enemy: Enemy, player: Player, enemyBullets: Bullet[]): void {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return;

    const bullet: Bullet = {
      x: enemy.x,
      y: enemy.y,
      vx: (dx / distance) * 3, // 敌人子弹速度较慢
      vy: (dy / distance) * 3,
      radius: 5,
      damage: GAME_CONFIG.ENEMY.TYPES.shooter.damage,
      isEnemyBullet: true,
    };

    enemyBullets.push(bullet);
  }

  public removeDeadEnemies(): number {
    const initialCount = this.enemies.length;
    this.enemies = this.enemies.filter(e => e.health > 0);
    return initialCount - this.enemies.length;
  }

  public getEnemyColor(type: EnemyType): string {
    switch (type) {
      case 'swarm':
        return GAME_CONFIG.COLORS.ENEMY_SWARM;
      case 'rusher':
        return GAME_CONFIG.COLORS.ENEMY_RUSHER;
      case 'shooter':
        return GAME_CONFIG.COLORS.ENEMY_SHOOTER;
      case 'elite':
        return GAME_CONFIG.COLORS.ENEMY_ELITE;
      default:
        return GAME_CONFIG.COLORS.ENEMY_GRADIENT_START;
    }
  }

  public getEnemyShape(type: EnemyType): 'circle' | 'square' | 'triangle' | 'hexagon' {
    switch (type) {
      case 'swarm':
        return 'circle';
      case 'rusher':
        return 'square';
      case 'shooter':
        return 'triangle';
      case 'elite':
        return 'hexagon';
      default:
        return 'circle';
    }
  }
}

