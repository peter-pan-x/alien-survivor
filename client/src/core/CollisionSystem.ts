/**
 * 碰撞检测系统
 * 负责所有游戏实体之间的碰撞检测
 */

import { Player, Enemy, Boss } from "../gameTypes";
import { GAME_CONFIG } from "../gameConfig";
import { MathUtils } from "../utils/MathUtils";
import { SpatialGrid } from "../utils/SpatialGrid";
import { BulletPool } from "../utils/BulletPool";
import { ParticlePool } from "../utils/ParticlePool";
import { DamageNumberSystem } from "../utils/DamageNumbers";
import { AudioSystem } from "../systems/AudioSystem";
import { EnemyIdGenerator } from "../utils/EnemyIdGenerator";

export interface CollisionContext {
  spatialGrid: SpatialGrid;
  bulletPool: BulletPool;
  enemyBulletPool: BulletPool;
  particlePool: ParticlePool;
  damageNumbers: DamageNumberSystem;
  audioSystem: AudioSystem;
  enemyIdGenerator: EnemyIdGenerator;
}

export interface CollisionResult {
  killedEnemies: Enemy[];
  playerDamaged: boolean;
  bossKilled: boolean;
  expGained: number;
  scoreGained: number;
}

/**
 * 碰撞检测系统类
 */
export class CollisionSystem {
  private lastDamageTime: number = 0;

  /**
   * 处理所有碰撞检测
   */
  public handleCollisions(
    player: Player,
    enemies: Enemy[],
    boss: Boss | null,
    now: number,
    gameStartTime: number,
    context: CollisionContext
  ): CollisionResult {
    const result: CollisionResult = {
      killedEnemies: [],
      playerDamaged: false,
      bossKilled: false,
      expGained: 0,
      scoreGained: 0,
    };

    // 为没有ID的敌人分配ID
    for (const enemy of enemies) {
      if (enemy.id === undefined) {
        enemy.id = context.enemyIdGenerator.getNextId();
      }
    }

    // 构建空间网格
    context.spatialGrid.clear();
    enemies.forEach((e) => context.spatialGrid.insert(e));

    // 子弹与敌人碰撞
    this.handleBulletEnemyCollisions(player, enemies, context, result);

    // 子弹与Boss碰撞
    if (boss) {
      this.handleBulletBossCollisions(player, boss, context, result);
    }

    // 处理敌人死亡和AOE
    this.handleEnemyDeaths(player, enemies, context, result);

    // 添加游戏开始后的短暂保护期
    const timeSinceStart = now - gameStartTime;
    const hasStartupProtection = timeSinceStart < GAME_CONFIG.PLAYER.STARTUP_PROTECTION_TIME;

    if (!hasStartupProtection) {
      // 敌人子弹与玩家碰撞
      this.handleEnemyBulletPlayerCollisions(player, now, context, result);

      // 玩家与敌人碰撞
      this.handlePlayerEnemyCollisions(player, enemies, now, context, result);

      // 玩家与Boss碰撞
      if (boss) {
        this.handlePlayerBossCollisions(player, boss, now, context, result);
      }
    }

    return result;
  }

  /**
   * 处理子弹与敌人的碰撞
   */
  private handleBulletEnemyCollisions(
    player: Player,
    _enemies: Enemy[],
    context: CollisionContext,
    _result: CollisionResult
  ): void {
    const bullets = context.bulletPool.getActive();
    
    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];
      const queryRadius = bullet.radius +
        GAME_CONFIG.COLLISION.BULLET_QUERY_EXTRA_RADIUS +
        GAME_CONFIG.COLLISION.BULLET_QUERY_SAFETY_MARGIN;
      const nearbyEnemies = context.spatialGrid.getNearby(bullet.x, bullet.y, queryRadius);

      let shouldRemoveBullet = false;

      for (const enemy of nearbyEnemies) {
        if (bullet.hitEnemies && bullet.hitEnemies.has(enemy.id!)) {
          continue;
        }

        if (MathUtils.checkCircleCollision(
          bullet.x, bullet.y, bullet.radius,
          enemy.x, enemy.y, enemy.radius
        )) {
          let damage = bullet.damage;

          if (bullet.pierce && bullet.currentPierceCount! > 0) {
            const reductionMultiplier = Math.pow(bullet.pierceDamageReduction!, bullet.currentPierceCount!);
            damage = Math.floor(bullet.originalDamage! * reductionMultiplier);
          }

          let isCrit = false;
          if (Math.random() < player.critChance) {
            damage = Math.floor(damage * player.critMultiplier);
            isCrit = true;
          }

          enemy.health -= damage;
          context.damageNumbers.add(enemy.x, enemy.y, damage, isCrit);

          context.particlePool.createParticles(
            enemy.x,
            enemy.y,
            GAME_CONFIG.COLORS.PARTICLE_ENEMY_HIT,
            isCrit ? GAME_CONFIG.PARTICLE.HIT_PARTICLE_COUNT * 2 : GAME_CONFIG.PARTICLE.HIT_PARTICLE_COUNT
          );

          context.audioSystem.playSound("hit");

          if (bullet.hitEnemies) {
            bullet.hitEnemies.add(enemy.id!);
          }

          if (bullet.pierce) {
            bullet.currentPierceCount!++;
            // 穿透次数用完后才移除（> 而非 >=，确保能穿透pierceCount个敌人）
            if (bullet.currentPierceCount !== undefined && 
                bullet.pierceCount !== undefined && 
                bullet.currentPierceCount > bullet.pierceCount) {
              shouldRemoveBullet = true;
            }
          } else {
            shouldRemoveBullet = true;
          }

          if (shouldRemoveBullet) break;
        }
      }

      if (shouldRemoveBullet) {
        context.bulletPool.release(bullet);
        bullets.splice(i, 1);
      }
    }
  }

  /**
   * 处理子弹与Boss的碰撞
   */
  private handleBulletBossCollisions(
    player: Player,
    boss: Boss,
    context: CollisionContext,
    result: CollisionResult
  ): void {
    const bullets = context.bulletPool.getActive();
    
    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];
      
      if (MathUtils.checkCircleCollision(
        bullet.x, bullet.y, bullet.radius,
        boss.x, boss.y, boss.radius
      )) {
        let damage = bullet.damage;
        if (Math.random() < player.critChance) {
          damage = Math.floor(damage * player.critMultiplier);
        }
        boss.health -= damage;
        context.damageNumbers.add(boss.x, boss.y, damage);

        context.particlePool.createParticles(
          boss.x,
          boss.y,
          GAME_CONFIG.COLORS.PARTICLE_ENEMY_HIT,
          GAME_CONFIG.PARTICLE.HIT_PARTICLE_COUNT * 2
        );

        context.audioSystem.playSound("hit");

        if (boss.health <= 0) {
          context.particlePool.createParticles(
            boss.x, boss.y,
            GAME_CONFIG.COLORS.PARTICLE_ENEMY_DEATH,
            GAME_CONFIG.PARTICLE.DEATH_PARTICLE_COUNT * 3
          );
          result.bossKilled = true;
          result.scoreGained += GAME_CONFIG.LEVELING.SCORE_PER_BOSS_KILL;
          result.expGained += GAME_CONFIG.LEVELING.EXP_PER_KILL * 
            (GAME_CONFIG.LEVELING.BOSS_EXP_REWARD_MULTIPLIER ?? 50);
          context.audioSystem.playSound("kill");
        }

        context.bulletPool.release(bullet);
        bullets.splice(i, 1);
        break;
      }
    }
  }

  /**
   * 处理敌人死亡和AOE爆炸
   */
  private handleEnemyDeaths(
    player: Player,
    enemies: Enemy[],
    context: CollisionContext,
    result: CollisionResult
  ): void {
    for (let i = enemies.length - 1; i >= 0; i--) {
      if (enemies[i].health <= 0) {
        const enemy = enemies[i];
        
        context.particlePool.createParticles(
          enemy.x, enemy.y,
          GAME_CONFIG.COLORS.PARTICLE_ENEMY_DEATH,
          GAME_CONFIG.PARTICLE.DEATH_PARTICLE_COUNT
        );

        // 分裂子弹（向四周发射3颗子弹）
        if (player.hasAOEExplosion) {
          const splitDamage = Math.floor(player.attackDamage * player.aoeDamage);
          const splitRange = player.aoeRadius;
          const bulletCount = 3;
          const bulletSpeed = 4;
          // 使用与玩家子弹相同的大小
          const bulletRadius = GAME_CONFIG.BULLET.BASE_RADIUS * player.bulletSizeMultiplier;

          for (let j = 0; j < bulletCount; j++) {
            const angle = (j / bulletCount) * Math.PI * 2 + Math.random() * 0.5;
            const vx = Math.cos(angle) * bulletSpeed;
            const vy = Math.sin(angle) * bulletSpeed;

            context.bulletPool.acquire(
              enemy.x, enemy.y,
              vx, vy,
              bulletRadius, splitDamage,
              false, undefined, undefined, false,
              enemy.x, enemy.y, splitRange
            );
          }

          context.particlePool.createParticles(
            enemy.x, enemy.y, "#ffaa00", 6
          );
        }

        result.killedEnemies.push(enemy);
        result.scoreGained += 10;
        result.expGained += GAME_CONFIG.LEVELING.EXP_PER_KILL;

        context.audioSystem.playSound("kill");

        if (player.hasLifeSteal) {
          const healAmount = player.lifeStealAmount ?? GAME_CONFIG.SKILLS.LIFE_STEAL_AMOUNT;
          player.health = Math.min(player.health + healAmount, player.maxHealth);
        }

        enemies.splice(i, 1);
      }
    }
  }

  /**
   * 处理敌人子弹与玩家的碰撞
   */
  private handleEnemyBulletPlayerCollisions(
    player: Player,
    now: number,
    context: CollisionContext,
    result: CollisionResult
  ): void {
    const enemyBullets = context.enemyBulletPool.getActive();
    
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const bullet = enemyBullets[i];

      if (MathUtils.checkCircleCollision(
        bullet.x, bullet.y, bullet.radius,
        player.x, player.y, player.radius
      )) {
        if (now - this.lastDamageTime > GAME_CONFIG.PLAYER.DAMAGE_COOLDOWN) {
          this.applyDamageToPlayer(player, bullet.damage, context.audioSystem);
          this.lastDamageTime = now;
          result.playerDamaged = true;
          
          context.particlePool.createParticles(
            player.x, player.y,
            GAME_CONFIG.COLORS.PARTICLE_PLAYER_HIT,
            GAME_CONFIG.PARTICLE.HIT_PARTICLE_COUNT
          );
        }

        context.enemyBulletPool.release(bullet);
        enemyBullets.splice(i, 1);
      }
    }
  }

  /**
   * 处理玩家与敌人的碰撞
   */
  private handlePlayerEnemyCollisions(
    player: Player,
    _enemies: Enemy[],
    now: number,
    context: CollisionContext,
    result: CollisionResult
  ): void {
    const playerRadius = player.radius * 
      (GAME_CONFIG.COLLISION?.PLAYER_VS_ENEMY_PLAYER_RADIUS_MULTIPLIER ?? 0.7) * 0.67;
    
    const nearbyEnemies = context.spatialGrid.getNearby(
      player.x, player.y,
      playerRadius + 30
    );

    for (const enemy of nearbyEnemies) {
      const enemyRadius = enemy.radius * 
        (GAME_CONFIG.COLLISION?.ENEMY_VS_PLAYER_ENEMY_RADIUS_MULTIPLIER ?? 0.85) * 0.67;

      if (MathUtils.checkCircleCollision(
        player.x, player.y, playerRadius,
        enemy.x, enemy.y, enemyRadius
      )) {
        if (now - this.lastDamageTime > GAME_CONFIG.PLAYER.DAMAGE_COOLDOWN) {
          const typeConfig = GAME_CONFIG.ENEMY.TYPES[enemy.type];
          const baseDamage = typeConfig.damage;
          const levelMultiplier = Math.pow(
            GAME_CONFIG.ENEMY.DAMAGE_PER_LEVEL_MULTIPLIER ?? 1.22,
            player.level - 1
          );
          const scaledDamage = baseDamage * levelMultiplier;

          this.applyDamageToPlayer(player, scaledDamage, context.audioSystem);
          this.lastDamageTime = now;
          result.playerDamaged = true;

          context.particlePool.createParticles(
            player.x, player.y,
            GAME_CONFIG.COLORS.PARTICLE_PLAYER_HIT,
            GAME_CONFIG.PARTICLE.HIT_PARTICLE_COUNT
          );
        }
      }
    }
  }

  /**
   * 处理玩家与Boss的碰撞
   */
  private handlePlayerBossCollisions(
    player: Player,
    boss: Boss,
    now: number,
    context: CollisionContext,
    result: CollisionResult
  ): void {
    if (MathUtils.checkCircleCollision(
      player.x, player.y, player.radius,
      boss.x, boss.y, boss.radius
    )) {
      if (now - this.lastDamageTime > GAME_CONFIG.PLAYER.DAMAGE_COOLDOWN) {
        const bossDamage = boss.maxHealth * 0.01;
        this.applyDamageToPlayer(player, bossDamage, context.audioSystem);
        this.lastDamageTime = now;
        result.playerDamaged = true;

        context.particlePool.createParticles(
          player.x, player.y,
          GAME_CONFIG.COLORS.PARTICLE_PLAYER_HIT,
          GAME_CONFIG.PARTICLE.HIT_PARTICLE_COUNT * 2
        );
      }
    }
  }

  /**
   * 应用伤害到玩家
   */
  private applyDamageToPlayer(player: Player, damage: number, audioSystem: AudioSystem): void {
    if (player.shield > 0) {
      player.shield -= damage;
      if (player.shield < 0) {
        const overflow = Math.abs(player.shield);
        player.shield = 0;
        player.health -= overflow;
      }
    } else {
      player.health -= damage;
    }

    player.health = MathUtils.clamp(player.health, 0, player.maxHealth);
    audioSystem.playSound("damage");
  }

  /**
   * 重置系统状态
   */
  public reset(): void {
    this.lastDamageTime = 0;
  }
}
