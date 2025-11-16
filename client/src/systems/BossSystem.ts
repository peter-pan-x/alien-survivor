/**
 * Boss系统
 * 独立模块，管理Boss的生成、更新和技能
 */

import { Boss, BossType, Player } from "../gameTypes";
import { createBoss, BOSS_TYPES } from "./BossConfig";
import { BossSkillSystem } from "./BossSkillSystem";

export class BossSystem {
  private currentBoss: Boss | null = null;
  private skillSystem: BossSkillSystem;
  private spawnedBossLevels: Set<number> = new Set(); // 记录已生成Boss的等级

  constructor() {
    this.skillSystem = new BossSkillSystem();
  }

  /**
   * 检查是否应该在当前等级生成Boss
   * 每10级出现一次，第一次在10级
   */
  public shouldSpawnBoss(playerLevel: number): boolean {
    // 每10级出现一次
    if (playerLevel % 10 !== 0) {
      return false;
    }

    // 检查是否已经生成过这个等级的Boss
    if (this.spawnedBossLevels.has(playerLevel)) {
      return false;
    }

    // 第一次在10级出现
    return playerLevel >= 10;
  }

  /**
   * 生成Boss
   */
  public spawnBoss(
    playerLevel: number,
    playerX: number,
    playerY: number,
    canvasWidth: number,
    canvasHeight: number
  ): Boss | null {
    if (!this.shouldSpawnBoss(playerLevel)) {
      return null;
    }

    // 确定Boss类型
    const bossType = this.getBossTypeForLevel(playerLevel);
    if (!bossType) {
      return null;
    }

    // 创建Boss
    const boss = createBoss(bossType, playerLevel, playerX, playerY, canvasWidth, canvasHeight);
    this.currentBoss = boss;
    this.spawnedBossLevels.add(playerLevel);

    console.log(`[BossSystem] Boss spawned at level ${playerLevel}: ${BOSS_TYPES[bossType].name}`);
    return boss;
  }

  /**
   * 根据等级获取Boss类型
   */
  private getBossTypeForLevel(level: number): BossType | null {
    if (level === 10) return "level10";
    if (level === 20) return "level20";
    if (level === 30) return "level30";
    if (level === 40) return "level40";
    if (level === 50) return "level50";
    // 50级以后循环使用level50
    if (level >= 60 && level % 10 === 0) return "level50";
    return null;
  }

  /**
   * 获取当前Boss
   */
  public getCurrentBoss(): Boss | null {
    return this.currentBoss;
  }

  /**
   * 更新Boss（移动、技能等）
   */
  public updateBoss(
    boss: Boss,
    player: Player,
    deltaTime: number,
    currentTime: number,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    // 检查是否需要跳跃
    this.checkAndExecuteJump(boss, player, currentTime, canvasWidth, canvasHeight);
    
    // 如果正在跳跃，处理跳跃动画
    if (boss.isJumping) {
      this.updateJumpAnimation(boss, currentTime);
      return;
    }
    
    // Boss朝向玩家移动
    const dx = player.x - boss.x;
    const dy = player.y - boss.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0) {
      boss.angle = Math.atan2(dy, dx);
      const moveDistance = boss.speed * deltaTime;
      boss.x += Math.cos(boss.angle) * moveDistance;
      boss.y += Math.sin(boss.angle) * moveDistance;
    }
  }

  /**
   * 执行Boss技能
   */
  public executeBossSkill(
    boss: Boss,
    player: Player,
    currentTime: number
  ): any[] {
    return this.skillSystem.executeSkill(boss, player, [], currentTime);
  }

  /**
   * 移除Boss（Boss被击败）
   */
  public removeBoss(): void {
    this.currentBoss = null;
  }

  /**
   * 重置Boss系统
   */
  public reset(): void {
    this.currentBoss = null;
    this.spawnedBossLevels.clear();
  }

  /**
   * 获取Boss信息
   */
  public getBossInfo(bossType: BossType) {
    return BOSS_TYPES[bossType];
  }

  /**
   * 检查并执行Boss跳跃
   */
  private checkAndExecuteJump(
    boss: Boss,
    player: Player,
    currentTime: number,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    // 检查跳跃冷却时间
    if (currentTime - boss.lastJumpTime < boss.jumpCooldown) {
      return;
    }
    
    // 计算与玩家的距离
    const dx = player.x - boss.x;
    const dy = player.y - boss.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 如果距离超过跳跃触发距离，执行跳跃
    if (distance > boss.jumpRange) {
      this.executeJump(boss, player, currentTime, canvasWidth, canvasHeight);
    }
  }
  
  /**
   * 执行Boss跳跃
   */
  private executeJump(
    boss: Boss,
    player: Player,
    currentTime: number,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    // 记录跳跃起始位置
    boss.jumpStartX = boss.x;
    boss.jumpStartY = boss.y;
    boss.jumpStartTime = currentTime;
    boss.isJumping = true;
    boss.lastJumpTime = currentTime;
    
    // 计算跳跃目标位置（在玩家周围的随机位置）
    const angle = Math.random() * Math.PI * 2;
    const jumpDistance = Math.min(canvasWidth, canvasHeight) * 0.3; // 跳跃到屏幕内30%的距离
    
    boss.jumpTargetX = player.x + Math.cos(angle) * jumpDistance;
    boss.jumpTargetY = player.y + Math.sin(angle) * jumpDistance;
    
    // 确保目标位置在屏幕范围内
    boss.jumpTargetX = Math.max(boss.radius, Math.min(canvasWidth - boss.radius, boss.jumpTargetX));
    boss.jumpTargetY = Math.max(boss.radius, Math.min(canvasHeight - boss.radius, boss.jumpTargetY));
    
    console.log(`[BossSystem] Boss jumping to (${boss.jumpTargetX}, ${boss.jumpTargetY})`);
  }
  
  /**
   * 更新跳跃动画
   */
  private updateJumpAnimation(boss: Boss, currentTime: number): void {
    if (!boss.jumpStartTime || boss.jumpStartX === undefined || boss.jumpStartY === undefined || 
        boss.jumpTargetX === undefined || boss.jumpTargetY === undefined) {
      return;
    }
    
    const elapsed = currentTime - boss.jumpStartTime;
    const progress = Math.min(elapsed / boss.jumpDuration, 1);
    
    // 使用缓动函数让跳跃更自然
    const easeProgress = this.easeInOutCubic(progress);
    
    // 更新Boss位置
    boss.x = boss.jumpStartX + (boss.jumpTargetX - boss.jumpStartX) * easeProgress;
    boss.y = boss.jumpStartY + (boss.jumpTargetY - boss.jumpStartY) * easeProgress;
    
    // 跳跃完成
    if (progress >= 1) {
      boss.isJumping = false;
      boss.jumpStartTime = undefined;
      boss.jumpStartX = undefined;
      boss.jumpStartY = undefined;
      boss.jumpTargetX = undefined;
      boss.jumpTargetY = undefined;
      
      console.log(`[BossSystem] Boss jump completed`);
    }
  }
  
  /**
   * 缓动函数（进出三次）
   */
  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  
  /**
   * 获取技能系统（用于高级用法）
   */
  public getSkillSystem(): BossSkillSystem {
    return this.skillSystem;
  }
}

