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

  public spawnEnemy(
    canvasWidth: number,
    canvasHeight: number,
    currentTime: number,
    playerX: number = 0,
    playerY: number = 0,
    playerLevel: number = 1
  ): void {
    const survivalTime = (currentTime - this.gameStartTime) / 1000; // 秒
    const spawnInterval = this.getSpawnInterval(survivalTime, playerLevel);

    if (currentTime - this.lastSpawnTime < spawnInterval) {
      return;
    }

    this.lastSpawnTime = currentTime;

    // 根据等级和时间决定生成数量
    const spawnCount = this.getSpawnCount(survivalTime, playerLevel);

    for (let i = 0; i < spawnCount; i++) {
      const enemyType = this.selectEnemyType(playerLevel); // 改为基于等级
      const enemy = this.createEnemy(
        enemyType,
        canvasWidth,
        canvasHeight,
        survivalTime,
        playerX,
        playerY
      );
      this.enemies.push(enemy);
    }
  }

  private getSpawnInterval(survivalTime: number, playerLevel: number): number {
    // 基于等级的刷新间隔：大幅降低增长速度
    const baseInterval = GAME_CONFIG.ENEMY.INITIAL_SPAWN_INTERVAL;
    const minInterval = GAME_CONFIG.ENEMY.MIN_SPAWN_INTERVAL;

    // 大幅降低等级缩放：每级仅增加6%速度（减少间隔）
    const perLevel = 0.94; // 从0.88调整为0.94，降低敌人生长速度
    const levelMultiplier = Math.pow(perLevel, Math.max(0, playerLevel - 1));
    const interval = baseInterval * levelMultiplier;

    return Math.max(interval, minInterval);
  }

  private getSpawnCount(survivalTime: number, playerLevel: number): number {
    // 大幅降低生成数量增长，让游戏节奏更平缓
    if (playerLevel < 6) return 1;      // 前5级只生成1个
    if (playerLevel < 12) return 2;     // 6-11级生成2个
    if (playerLevel < 20) return 3;     // 12-19级生成3个
    if (playerLevel < 30) return 4;     // 20-29级生成4个
    // 30级之后每8级增加1个，增长极其缓慢
    const additional = Math.floor((playerLevel - 30) / 8);
    return Math.min(4 + additional, 6); // 上限降低到6个
  }

  private selectEnemyType(playerLevel: number): EnemyType {
    // 根据玩家等级解锁不同的敌人类型（每3级解锁一种新怪物）
    const availableTypes: { type: EnemyType; weight: number }[] = [];

    // 集群者 - 1级起始可用
    availableTypes.push({
      type: 'swarm',
      weight: GAME_CONFIG.ENEMY.TYPES.swarm.spawnWeight,
    });

    // 冲撞者 - 3级解锁
    if (playerLevel >= 3) {
      availableTypes.push({
        type: 'rusher',
        weight: GAME_CONFIG.ENEMY.TYPES.rusher.spawnWeight,
      });
    }

    // 射手 - 6级解锁
    if (playerLevel >= 6) {
      availableTypes.push({
        type: 'shooter',
        weight: GAME_CONFIG.ENEMY.TYPES.shooter.spawnWeight,
      });
    }

    // 精英 - 9级解锁
    if (playerLevel >= 9) {
      availableTypes.push({
        type: 'elite',
        weight: GAME_CONFIG.ENEMY.TYPES.elite.spawnWeight,
      });
    }

    // 蜘蛛 - 2级解锁（快、血量较低）
    if (playerLevel >= 2) {
      availableTypes.push({
        type: 'spider',
        weight: GAME_CONFIG.ENEMY.TYPES.spider.spawnWeight,
      });
    }

    // 螃蟹 - 4级解锁（慢、血量较高）
    if (playerLevel >= 4) {
      availableTypes.push({
        type: 'crab',
        weight: GAME_CONFIG.ENEMY.TYPES.crab.spawnWeight,
      });
    }

    // 大眼怪 - 5级解锁（中速、中血量）
    if (playerLevel >= 5) {
      availableTypes.push({
        type: 'bigeye',
        weight: GAME_CONFIG.ENEMY.TYPES.bigeye.spawnWeight,
      });
    }

    // 青蛙怪 - 7级解锁（中速、弹跳感）
    if (playerLevel >= 7) {
      availableTypes.push({
        type: 'frog',
        weight: GAME_CONFIG.ENEMY.TYPES.frog.spawnWeight,
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
    survivalTime: number,
    playerX: number = 0,
    playerY: number = 0
  ): Enemy {
    const typeConfig = GAME_CONFIG.ENEMY.TYPES[type];
    
    // 基于时间的属性增长（使用配置项，降低增长速度）
    const timeMultiplier = 1 + survivalTime * GAME_CONFIG.ENEMY.HEALTH_GROWTH_PER_SECOND;
    const globalHealthMultiplier = GAME_CONFIG.ENEMY.GLOBAL_HEALTH_MULTIPLIER ?? 1.0;

    // 无尽地图模式：相对于玩家位置生成敌人
    // 在玩家视野外的随机位置生成
    const side = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    const spawnDistance = Math.max(canvasWidth, canvasHeight) / 2 + 50; // 视野外距离

    switch (side) {
      case 0: // 上方
        x = playerX + (Math.random() - 0.5) * canvasWidth;
        y = playerY - spawnDistance;
        break;
      case 1: // 右方
        x = playerX + spawnDistance;
        y = playerY + (Math.random() - 0.5) * canvasHeight;
        break;
      case 2: // 下方
        x = playerX + (Math.random() - 0.5) * canvasWidth;
        y = playerY + spawnDistance;
        break;
      case 3: // 左方
        x = playerX - spawnDistance;
        y = playerY + (Math.random() - 0.5) * canvasHeight;
        break;
    }

    const baseHealth = GAME_CONFIG.ENEMY.BASE_HEALTH * typeConfig.healthMultiplier;
    const baseSpeed = GAME_CONFIG.ENEMY.BASE_SPEED * typeConfig.speedMultiplier;

    const computedMaxHealth = baseHealth * timeMultiplier * globalHealthMultiplier;

    // 基于血量缩放体型（半径），使用平方根缓和增长，并限制范围
    const healthScale = Math.sqrt(computedMaxHealth / Math.max(1, baseHealth));
    const radiusScale = Math.min(1.75, Math.max(0.9, healthScale));

    const enemy: Enemy = {
      x,
      y,
      radius: Math.floor(typeConfig.radius * radiusScale),
      health: computedMaxHealth,
      maxHealth: computedMaxHealth,
      speed: Math.min(baseSpeed * timeMultiplier, GAME_CONFIG.ENEMY.MAX_SPEED),
      angle: 0,
      type,
    };

    // 射手类型需要额外的属性
    if (type === 'shooter') {
      const shooterConfig = typeConfig as { shootCooldown?: number };
      enemy.shootCooldown = shooterConfig.shootCooldown || 2000;
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

    const baseDamage = GAME_CONFIG.ENEMY.TYPES.shooter.damage;
    const levelMultiplier = Math.pow(
      GAME_CONFIG.ENEMY.DAMAGE_PER_LEVEL_MULTIPLIER ?? 1.22,
      player.level - 1
    );
    const scaledDamage = baseDamage * levelMultiplier;

    const bullet: Bullet = {
      x: enemy.x,
      y: enemy.y,
      vx: (dx / distance) * 3, // 敌人子弹速度较慢
      vy: (dy / distance) * 3,
      radius: 5,
      damage: scaledDamage,
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
