/**
 * Boss技能系统
 * 为每个Boss实现独特而简单的技能
 */

import { Boss, BossType, Player, Bullet } from "../gameTypes";

/**
 * Boss技能接口
 */
export interface BossSkill {
  name: string;
  description: string;
  execute: (boss: Boss, player: Player, bullets: Bullet[], currentTime: number) => Bullet[];
}

/**
 * Boss技能实现
 */
export class BossSkillSystem {
  private skills: Map<BossType, BossSkill> = new Map();

  constructor() {
    this.registerSkills();
  }

  /**
   * 注册所有Boss技能
   */
  private registerSkills(): void {
    // Level 10 Boss: 环形弹幕
    this.skills.set("level10", {
      name: "环形弹幕",
      description: "向8个方向发射子弹",
      execute: (boss: Boss, _player: Player, _bullets: Bullet[], _currentTime: number) => {
        const newBullets: Bullet[] = [];
        const bulletCount = 8;
        const bulletSpeed = 4;
        const bulletDamage = boss.maxHealth * 0.01; // 基于Boss血量的1%
        const bulletRadius = 8;

        for (let i = 0; i < bulletCount; i++) {
          const angle = (Math.PI * 2 * i) / bulletCount;
          newBullets.push({
            x: boss.x,
            y: boss.y,
            vx: Math.cos(angle) * bulletSpeed,
            vy: Math.sin(angle) * bulletSpeed,
            radius: bulletRadius,
            damage: bulletDamage,
            isEnemyBullet: true,
          });
        }

        return newBullets;
      },
    });

    // Level 20 Boss: 追踪弹幕
    this.skills.set("level20", {
      name: "追踪弹幕",
      description: "发射追踪玩家的子弹",
      execute: (boss: Boss, player: Player, _bullets: Bullet[], _currentTime: number) => {
        const newBullets: Bullet[] = [];
        const bulletCount = 3;
        const bulletSpeed = 5;
        const bulletDamage = boss.maxHealth * 0.015;
        const bulletRadius = 10;

        for (let i = 0; i < bulletCount; i++) {
          // 计算到玩家的角度
          const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
          // 添加一些随机偏移
          const spread = (i - 1) * 0.2; // -0.2, 0, 0.2
          const finalAngle = angle + spread;

          newBullets.push({
            x: boss.x,
            y: boss.y,
            vx: Math.cos(finalAngle) * bulletSpeed,
            vy: Math.sin(finalAngle) * bulletSpeed,
            radius: bulletRadius,
            damage: bulletDamage,
            isEnemyBullet: true,
          });
        }

        return newBullets;
      },
    });

    // Level 30 Boss: 扇形弹幕
    this.skills.set("level30", {
      name: "扇形弹幕",
      description: "向玩家方向发射扇形弹幕",
      execute: (boss: Boss, player: Player, _bullets: Bullet[], _currentTime: number) => {
        const newBullets: Bullet[] = [];
        const bulletCount = 5;
        const bulletSpeed = 5;
        const bulletDamage = boss.maxHealth * 0.012;
        const bulletRadius = 9;
        const spreadAngle = Math.PI / 3; // 60度扇形

        // 计算到玩家的角度
        const centerAngle = Math.atan2(player.y - boss.y, player.x - boss.x);

        for (let i = 0; i < bulletCount; i++) {
          const offset = (i / (bulletCount - 1) - 0.5) * spreadAngle;
          const angle = centerAngle + offset;

          newBullets.push({
            x: boss.x,
            y: boss.y,
            vx: Math.cos(angle) * bulletSpeed,
            vy: Math.sin(angle) * bulletSpeed,
            radius: bulletRadius,
            damage: bulletDamage,
            isEnemyBullet: true,
          });
        }

        return newBullets;
      },
    });

    // Level 40 Boss: 螺旋弹幕
    this.skills.set("level40", {
      name: "螺旋弹幕",
      description: "发射螺旋形弹幕",
      execute: (boss: Boss, player: Player, _bullets: Bullet[], currentTime: number) => {
        const newBullets: Bullet[] = [];
        const bulletCount = 12;
        const bulletSpeed = 4.5;
        const bulletDamage = boss.maxHealth * 0.01;
        const bulletRadius = 8;

        // 使用时间创建螺旋效果
        const timeOffset = (currentTime / 1000) % 1; // 0-1循环
        const baseAngle = Math.atan2(player.y - boss.y, player.x - boss.x);

        for (let i = 0; i < bulletCount; i++) {
          const angle = baseAngle + (i / bulletCount) * Math.PI * 2 + timeOffset * Math.PI;
          newBullets.push({
            x: boss.x,
            y: boss.y,
            vx: Math.cos(angle) * bulletSpeed,
            vy: Math.sin(angle) * bulletSpeed,
            radius: bulletRadius,
            damage: bulletDamage,
            isEnemyBullet: true,
          });
        }

        return newBullets;
      },
    });

    // Level 50 Boss: 多重弹幕
    this.skills.set("level50", {
      name: "多重弹幕",
      description: "同时发射多种弹幕",
      execute: (boss: Boss, player: Player, _bullets: Bullet[], _currentTime: number) => {
        const newBullets: Bullet[] = [];
        const bulletSpeed = 5;
        const bulletDamage = boss.maxHealth * 0.01;
        const bulletRadius = 8;

        // 组合技能：环形 + 追踪
        // 环形弹幕
        const ringCount = 8;
        for (let i = 0; i < ringCount; i++) {
          const angle = (Math.PI * 2 * i) / ringCount;
          newBullets.push({
            x: boss.x,
            y: boss.y,
            vx: Math.cos(angle) * bulletSpeed,
            vy: Math.sin(angle) * bulletSpeed,
            radius: bulletRadius,
            damage: bulletDamage,
            isEnemyBullet: true,
          });
        }

        // 追踪弹幕
        const trackCount = 2;
        const centerAngle = Math.atan2(player.y - boss.y, player.x - boss.x);
        for (let i = 0; i < trackCount; i++) {
          const offset = (i - 0.5) * 0.3;
          const angle = centerAngle + offset;
          newBullets.push({
            x: boss.x,
            y: boss.y,
            vx: Math.cos(angle) * bulletSpeed * 1.2,
            vy: Math.sin(angle) * bulletSpeed * 1.2,
            radius: bulletRadius * 1.2,
            damage: bulletDamage * 1.5,
            isEnemyBullet: true,
          });
        }

        return newBullets;
      },
    });
  }

  /**
   * 执行Boss技能
   */
  public executeSkill(
    boss: Boss,
    player: Player,
    bullets: Bullet[],
    currentTime: number
  ): Bullet[] {
    const skill = this.skills.get(boss.type);
    if (!skill) {
      console.warn(`[BossSkillSystem] No skill found for boss type: ${boss.type}`);
      return [];
    }

    // 检查冷却时间
    if (currentTime - boss.lastSkillTime < boss.skillCooldown) {
      return [];
    }

    // 更新技能使用时间
    boss.lastSkillTime = currentTime;

    // 执行技能
    const newBullets = skill.execute(boss, player, bullets, currentTime);

    // 为所有 Boss 子弹统一添加距离限制
    // Boss 子弹基础距离 700（翻倍），随玩家等级增加
    const baseBossDistance = 700;
    const distancePerLevel = 40;
    const maxDistance = baseBossDistance + distancePerLevel * (player.level - 1);

    for (const bullet of newBullets) {
      bullet.startX = boss.x;
      bullet.startY = boss.y;
      bullet.maxDistance = maxDistance;
    }

    return newBullets;
  }

  /**
   * 获取Boss技能信息
   */
  public getSkillInfo(bossType: BossType): BossSkill | undefined {
    return this.skills.get(bossType);
  }
}

