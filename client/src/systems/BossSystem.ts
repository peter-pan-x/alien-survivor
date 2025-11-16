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
    currentTime: number
  ): void {
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
   * 获取技能系统（用于高级用法）
   */
  public getSkillSystem(): BossSkillSystem {
    return this.skillSystem;
  }
}

