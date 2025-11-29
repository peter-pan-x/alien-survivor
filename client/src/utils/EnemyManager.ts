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

  private getSpawnInterval(_survivalTime: number, playerLevel: number): number {
    // 基于等级的刷新间隔：大幅降低增长速度
    const baseInterval = GAME_CONFIG.ENEMY.INITIAL_SPAWN_INTERVAL;
    const minInterval = GAME_CONFIG.ENEMY.MIN_SPAWN_INTERVAL;

    // 每级仅增加4%速度（从6%降至4%），7-10级更平缓
    const perLevel = 0.96;
    const levelMultiplier = Math.pow(perLevel, Math.max(0, playerLevel - 1));
    const interval = baseInterval * levelMultiplier;

    return Math.max(interval, minInterval);
  }

  private getSpawnCount(_survivalTime: number, playerLevel: number): number {
    // 大幅降低生成数量增长，让游戏节奏更平缓
    // 7-10级难度曲线优化：延后数量翻倍节点
    if (playerLevel < 10) return 1;     // 前9级只生成1个（原6级）
    if (playerLevel < 16) return 2;     // 10-15级生成2个（原6-11级）
    if (playerLevel < 24) return 3;     // 16-23级生成3个（原12-19级）
    if (playerLevel < 32) return 4;     // 24-31级生成4个（原20-29级）
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

    // 基于血量缩放体型（半径）优化：让血量差异更明显地体现在体型上
    const healthScale = Math.sqrt(computedMaxHealth / Math.max(1, baseHealth));
    // 扩大缩放范围：从1.75提升到3.0，让高血量怪物明显更大
    const radiusScale = Math.min(3.0, Math.max(0.95, healthScale * 1.2));

    // 速度增长优化：初始几级速度较快，10级（约90秒）后恢复正常曲线
    // 早期加速因子：初始+25%，90秒内衰减到0
    const earlyBoost = 0.25 * Math.exp(-survivalTime / 90);
    const speedMultiplier = 0.90 + 0.30 * Math.pow(timeMultiplier, 0.25) + earlyBoost;

    const enemy: Enemy = {
      x,
      y,
      radius: Math.floor(typeConfig.radius * radiusScale),
      health: computedMaxHealth,
      maxHealth: computedMaxHealth,
      speed: Math.min(baseSpeed * speedMultiplier, GAME_CONFIG.ENEMY.MAX_SPEED),
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
    _deltaTime: number,
    canvasWidth: number,
    canvasHeight: number,
    currentTime: number,
    enemyBullets: Bullet[],
    checkObstacle?: (x: number, y: number, radius: number) => boolean
  ): void {
    const now = Date.now();
    for (const enemy of this.enemies) {
      // 冰冻状态检查：冰冻期间无法移动和攻击
      if (enemy.frozenUntil && now < enemy.frozenUntil) {
        continue; // 跳过此敌人的更新
      }

      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const distanceSq = dx * dx + dy * dy; // 优化：使用距离平方

      enemy.angle = Math.atan2(dy, dx);

      // 计算原本的位移
      let moveX = 0;
      let moveY = 0;

      if (enemy.type === 'shooter') {
        // 射手保持距离并射击
        const shootRange = GAME_CONFIG.ENEMY.TYPES.shooter.shootRange || 250;
        const shootRangeSq = shootRange * shootRange;
        const innerRangeSq = (shootRange - 50) * (shootRange - 50);
        
        if (distanceSq > shootRangeSq) {
          // 靠近玩家
          moveX = Math.cos(enemy.angle) * enemy.speed;
          moveY = Math.sin(enemy.angle) * enemy.speed;
        } else if (distanceSq < innerRangeSq) {
          // 远离玩家
          moveX = -Math.cos(enemy.angle) * enemy.speed * 0.5;
          moveY = -Math.sin(enemy.angle) * enemy.speed * 0.5;
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
        moveX = Math.cos(enemy.angle) * enemy.speed;
        moveY = Math.sin(enemy.angle) * enemy.speed;
      }

      // 尝试移动并进行碰撞检测（带绕行逻辑）
      let nextX = enemy.x + moveX;
      let nextY = enemy.y + moveY;

      if (checkObstacle) {
        const blocked = checkObstacle(nextX, nextY, enemy.radius);
        
        if (blocked) {
          // 尝试分轴移动
          const xBlocked = checkObstacle(nextX, enemy.y, enemy.radius);
          const yBlocked = checkObstacle(enemy.x, nextY, enemy.radius);
          
          if (xBlocked && !yBlocked) {
            // X轴被挡，只走Y轴
            nextX = enemy.x;
          } else if (!xBlocked && yBlocked) {
            // Y轴被挡，只走X轴
            nextY = enemy.y;
          } else if (xBlocked && yBlocked) {
            // 两轴都被挡，尝试绕行（沿垂直方向偏移）
            const perpX = -moveY; // 垂直方向
            const perpY = moveX;
            
            // 尝试向左或向右绕行
            const slideX1 = enemy.x + perpX * 0.8;
            const slideY1 = enemy.y + perpY * 0.8;
            const slideX2 = enemy.x - perpX * 0.8;
            const slideY2 = enemy.y - perpY * 0.8;
            
            if (!checkObstacle(slideX1, slideY1, enemy.radius)) {
              nextX = slideX1;
              nextY = slideY1;
            } else if (!checkObstacle(slideX2, slideY2, enemy.radius)) {
              nextX = slideX2;
              nextY = slideY2;
            } else {
              // 完全被卡住，保持原位
              nextX = enemy.x;
              nextY = enemy.y;
            }
          }
        }
      }

      enemy.x = nextX;
      enemy.y = nextY;

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

    const shooterConfig = GAME_CONFIG.ENEMY.TYPES.shooter;
    const baseDamage = shooterConfig.damage;
    const levelMultiplier = Math.pow(
      GAME_CONFIG.ENEMY.DAMAGE_PER_LEVEL_MULTIPLIER ?? 1.22,
      player.level - 1
    );
    const scaledDamage = baseDamage * levelMultiplier;

    // 子弹最大距离随等级增加
    const baseDistance = (shooterConfig as { bulletMaxDistance?: number }).bulletMaxDistance ?? 350;
    const distancePerLevel = (shooterConfig as { bulletDistancePerLevel?: number }).bulletDistancePerLevel ?? 20;
    const maxDistance = baseDistance + distancePerLevel * (player.level - 1);

    const bullet: Bullet = {
      x: enemy.x,
      y: enemy.y,
      vx: (dx / distance) * 3, // 敌人子弹速度较慢
      vy: (dy / distance) * 3,
      radius: 5,
      damage: scaledDamage,
      isEnemyBullet: true,
      startX: enemy.x, // 记录起始位置
      startY: enemy.y,
      maxDistance: maxDistance, // 最大飞行距离
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
