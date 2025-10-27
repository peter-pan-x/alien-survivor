import { Player, Enemy, WeaponType, ActiveWeapon } from "../gameTypes";
import { GAME_CONFIG } from "../gameConfig";
import { ParticlePool } from "./ParticlePool";

export class WeaponSystem {
  private particlePool: ParticlePool;

  constructor(particlePool: ParticlePool) {
    this.particlePool = particlePool;
  }

  public updateWeapons(
    player: Player,
    enemies: Enemy[],
    currentTime: number,
    ctx: CanvasRenderingContext2D
  ): void {
    for (const weapon of player.weapons) {
      switch (weapon.type) {
        case 'orbital':
          this.updateOrbitalDrone(player, enemies, weapon, currentTime);
          break;
        case 'lightning':
          this.updateLightningChain(player, enemies, weapon, currentTime);
          break;
        case 'field':
          this.updateGuardianField(player, enemies, weapon, currentTime);
          break;
      }
    }
  }

  public renderWeapons(
    player: Player,
    ctx: CanvasRenderingContext2D,
    currentTime: number
  ): void {
    for (const weapon of player.weapons) {
      switch (weapon.type) {
        case 'orbital':
          this.renderOrbitalDrone(player, weapon, ctx, currentTime);
          break;
        case 'lightning':
          // 闪电链在触发时渲染
          break;
        case 'field':
          this.renderGuardianField(player, weapon, ctx);
          break;
      }
    }
  }

  // ==================== 轨道无人机 ====================
  private updateOrbitalDrone(
    player: Player,
    enemies: Enemy[],
    weapon: ActiveWeapon,
    currentTime: number
  ): void {
    const config = GAME_CONFIG.WEAPONS.ORBITAL;
    const droneCount = weapon.level;
    const orbitRadius = config.ORBIT_RADIUS;
    const droneRadius = config.DRONE_RADIUS;
    const damage = config.BASE_DAMAGE * weapon.level;

    // 计算每个无人机的位置并检测碰撞
    for (let i = 0; i < droneCount; i++) {
      const angle = (currentTime * config.ROTATION_SPEED) + (i * Math.PI * 2 / droneCount);
      const droneX = player.x + Math.cos(angle) * orbitRadius;
      const droneY = player.y + Math.sin(angle) * orbitRadius;

      // 检测与敌人的碰撞
      for (const enemy of enemies) {
        const dx = droneX - enemy.x;
        const dy = droneY - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < droneRadius + enemy.radius) {
          enemy.health -= damage * 0.016; // 每帧造成伤害（约60fps）
          
          // 生成粒子效果
          this.particlePool.createParticles(
            enemy.x,
            enemy.y,
            GAME_CONFIG.COLORS.WEAPON_ORBITAL,
            2
          );
        }
      }
    }
  }

  private renderOrbitalDrone(
    player: Player,
    weapon: ActiveWeapon,
    ctx: CanvasRenderingContext2D,
    currentTime: number
  ): void {
    const config = GAME_CONFIG.WEAPONS.ORBITAL;
    const droneCount = weapon.level;
    const orbitRadius = config.ORBIT_RADIUS;
    const droneRadius = config.DRONE_RADIUS;

    ctx.save();

    for (let i = 0; i < droneCount; i++) {
      const angle = (currentTime * config.ROTATION_SPEED) + (i * Math.PI * 2 / droneCount);
      const droneX = player.x + Math.cos(angle) * orbitRadius;
      const droneY = player.y + Math.sin(angle) * orbitRadius;

      // 绘制无人机
      const gradient = ctx.createRadialGradient(droneX, droneY, 0, droneX, droneY, droneRadius);
      gradient.addColorStop(0, GAME_CONFIG.COLORS.WEAPON_ORBITAL);
      gradient.addColorStop(1, GAME_CONFIG.COLORS.WEAPON_ORBITAL + '66');

      ctx.beginPath();
      ctx.arc(droneX, droneY, droneRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // 绘制光晕
      ctx.beginPath();
      ctx.arc(droneX, droneY, droneRadius + 3, 0, Math.PI * 2);
      ctx.strokeStyle = GAME_CONFIG.COLORS.WEAPON_ORBITAL + '44';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  }

  // ==================== 闪电链 ====================
  private updateLightningChain(
    player: Player,
    enemies: Enemy[],
    weapon: ActiveWeapon,
    currentTime: number
  ): void {
    const config = GAME_CONFIG.WEAPONS.LIGHTNING;
    const cooldown = config.COOLDOWN / weapon.level; // 等级越高冷却越短

    if (currentTime - weapon.lastActivation < cooldown) {
      return;
    }

    weapon.lastActivation = currentTime;

    // 找到最近的敌人
    const chainCount = config.CHAIN_COUNT + weapon.level - 1;
    const chainRange = config.CHAIN_RANGE;
    const damage = config.BASE_DAMAGE * weapon.level;

    const targets = this.findNearestEnemies(player.x, player.y, enemies, chainCount, chainRange);

    // 对每个目标造成伤害
    for (const target of targets) {
      target.health -= damage;
      
      // 生成粒子效果
      this.particlePool.createParticles(
        target.x,
        target.y,
        GAME_CONFIG.COLORS.WEAPON_LIGHTNING,
        5
      );
    }

    // 触发闪电链视觉效果（存储在武器对象中，供渲染使用）
    (weapon as any).lightningTargets = targets;
    (weapon as any).lightningTime = currentTime;
  }

  private findNearestEnemies(
    x: number,
    y: number,
    enemies: Enemy[],
    count: number,
    maxRange: number
  ): Enemy[] {
    const enemiesWithDistance = enemies
      .map(enemy => {
        const dx = enemy.x - x;
        const dy = enemy.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return { enemy, distance };
      })
      .filter(e => e.distance <= maxRange)
      .sort((a, b) => a.distance - b.distance);

    return enemiesWithDistance.slice(0, count).map(e => e.enemy);
  }

  // ==================== 守护力场 ====================
  private updateGuardianField(
    player: Player,
    enemies: Enemy[],
    weapon: ActiveWeapon,
    currentTime: number
  ): void {
    const config = GAME_CONFIG.WEAPONS.FIELD;
    const fieldRadius = config.FIELD_RADIUS + (weapon.level - 1) * 10;
    const damage = config.BASE_DAMAGE * weapon.level;
    const damageInterval = config.DAMAGE_INTERVAL;

    // 检测力场范围内的敌人
    for (const enemy of enemies) {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < fieldRadius + enemy.radius) {
        // 造成伤害（基于间隔）
        if (!enemy.lastShotTime || currentTime - enemy.lastShotTime > damageInterval) {
          enemy.health -= damage;
          enemy.lastShotTime = currentTime;

          // 击退效果
          const knockbackForce = config.KNOCKBACK_FORCE;
          const angle = Math.atan2(dy, dx);
          enemy.x += Math.cos(angle) * knockbackForce;
          enemy.y += Math.sin(angle) * knockbackForce;

          // 生成粒子效果
          this.particlePool.createParticles(
            enemy.x,
            enemy.y,
            GAME_CONFIG.COLORS.WEAPON_FIELD,
            3
          );
        }
      }
    }
  }

  private renderGuardianField(
    player: Player,
    weapon: ActiveWeapon,
    ctx: CanvasRenderingContext2D
  ): void {
    const config = GAME_CONFIG.WEAPONS.FIELD;
    const fieldRadius = config.FIELD_RADIUS + (weapon.level - 1) * 10;

    ctx.save();

    // 绘制力场环
    const gradient = ctx.createRadialGradient(
      player.x,
      player.y,
      fieldRadius - 10,
      player.x,
      player.y,
      fieldRadius
    );
    gradient.addColorStop(0, GAME_CONFIG.COLORS.WEAPON_FIELD + '00');
    gradient.addColorStop(0.5, GAME_CONFIG.COLORS.WEAPON_FIELD + '44');
    gradient.addColorStop(1, GAME_CONFIG.COLORS.WEAPON_FIELD + '88');

    ctx.beginPath();
    ctx.arc(player.x, player.y, fieldRadius, 0, Math.PI * 2);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 5;
    ctx.stroke();

    // 绘制旋转的能量点
    const time = Date.now() * 0.002;
    const pointCount = 8;
    for (let i = 0; i < pointCount; i++) {
      const angle = (i / pointCount) * Math.PI * 2 + time;
      const pointX = player.x + Math.cos(angle) * fieldRadius;
      const pointY = player.y + Math.sin(angle) * fieldRadius;

      ctx.beginPath();
      ctx.arc(pointX, pointY, 3, 0, Math.PI * 2);
      ctx.fillStyle = GAME_CONFIG.COLORS.WEAPON_FIELD;
      ctx.fill();
    }

    ctx.restore();
  }

  public addWeapon(player: Player, weaponType: WeaponType): void {
    const existingWeapon = player.weapons.find(w => w.type === weaponType);

    if (existingWeapon) {
      // 升级现有武器
      existingWeapon.level++;
    } else {
      // 添加新武器
      player.weapons.push({
        type: weaponType,
        level: 1,
        lastActivation: 0,
      });
    }
  }
}

