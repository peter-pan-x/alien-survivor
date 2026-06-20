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
          this.renderLightningChain(player, weapon, ctx, currentTime);
          break;
        case 'field':
          this.renderGuardianField(player, weapon, ctx, currentTime);
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
      const { x: droneX, y: droneY } = this.getOrbitalPosition(
        player,
        currentTime,
        i,
        droneCount,
        orbitRadius
      );

      // 检测与敌人的碰撞（优化：使用平方距离判定）
      for (const enemy of enemies) {
        const dx = droneX - enemy.x;
        const dy = droneY - enemy.y;
        const distanceSq = dx * dx + dy * dy;
        const radiusSum = droneRadius + enemy.radius;

        if (distanceSq < radiusSum * radiusSum) {
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
    const orbitYRadius = orbitRadius * 0.62;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Broken elliptical rail anchors the drones to the 45-degree ground plane.
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + 2, orbitRadius, orbitYRadius, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(6, 182, 212, 0.16)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.save();
    ctx.setLineDash([7, 9]);
    ctx.lineDashOffset = -(currentTime * 0.018);
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + 2, orbitRadius, orbitYRadius, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(103, 232, 249, 0.56)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    for (let i = 0; i < droneCount; i++) {
      const angle = this.getOrbitalAngle(currentTime, i, droneCount);
      const { x: droneX, y: droneY } = this.getOrbitalPosition(
        player,
        currentTime,
        i,
        droneCount,
        orbitRadius
      );
      this.drawPixelDrone(ctx, droneX, droneY, angle, droneRadius, currentTime, i);
    }

    ctx.restore();
  }

  private getOrbitalAngle(currentTime: number, index: number, droneCount: number): number {
    const rotation = (currentTime / 1000) * GAME_CONFIG.WEAPONS.ORBITAL.ROTATION_SPEED;
    return rotation + (index * Math.PI * 2) / Math.max(1, droneCount);
  }

  private getOrbitalPosition(
    player: Player,
    currentTime: number,
    index: number,
    droneCount: number,
    orbitRadius: number
  ): { x: number; y: number } {
    const angle = this.getOrbitalAngle(currentTime, index, droneCount);
    return {
      x: player.x + Math.cos(angle) * orbitRadius,
      y: player.y + Math.sin(angle) * orbitRadius * 0.62,
    };
  }

  private drawPixelDrone(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    radius: number,
    currentTime: number,
    index: number
  ): void {
    const pixel = Math.max(2, Math.round(radius * 0.3));
    const flap = Math.floor(currentTime / 110 + index) % 2;
    const depth = (Math.sin(angle) + 1) * 0.5;
    const lift = 3 + depth * 2;
    const px = Math.round(x);
    const py = Math.round(y - lift);

    ctx.save();
    ctx.globalAlpha = 0.64 + depth * 0.36;

    ctx.fillStyle = "rgba(0, 8, 16, 0.5)";
    ctx.beginPath();
    ctx.ellipse(px, Math.round(y + 2), radius * 0.82, radius * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Thruster pixels trail opposite the orbit tangent.
    const trailX = Math.round(-Math.cos(angle) * pixel * 2);
    const trailY = Math.round(-Math.sin(angle) * pixel);
    ctx.fillStyle = flap ? "#67e8f9" : "#0891b2";
    ctx.fillRect(px + trailX - pixel / 2, py + trailY, pixel, pixel);
    ctx.fillStyle = "rgba(34, 211, 238, 0.42)";
    ctx.fillRect(px + trailX * 1.5 - pixel / 2, py + trailY * 1.5, pixel, pixel);

    // Dark chassis, animated stabilizer wings, cyan reactor and white glint.
    ctx.fillStyle = "#06141e";
    ctx.fillRect(px - pixel * 2, py - pixel, pixel * 4, pixel * 3);
    ctx.fillRect(px - pixel * 3, py + (flap ? 0 : pixel), pixel, pixel);
    ctx.fillRect(px + pixel * 2, py + (flap ? 0 : pixel), pixel, pixel);

    ctx.fillStyle = "#155e75";
    ctx.fillRect(px - pixel, py - pixel * 2, pixel * 2, pixel);
    ctx.fillRect(px - pixel * 2, py, pixel * 4, pixel);

    ctx.fillStyle = "#22d3ee";
    ctx.fillRect(px - pixel, py - pixel, pixel * 2, pixel * 2);
    ctx.fillStyle = "#ecfeff";
    ctx.fillRect(px, py - pixel, pixel, pixel);

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

    // 连击数量：初始3个，每级+2
    const chainCount = config.CHAIN_COUNT + (weapon.level - 1) * 2;
    const chainRange = config.CHAIN_RANGE;
    // 伤害：玩家攻击力的1.5倍，每级增加50%
    const baseDamage = player.attackDamage * 1.5;
    const damage = Math.floor(baseDamage * Math.pow(1.5, weapon.level - 1));

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
    weapon.lightningTargets = targets;
    weapon.lightningTime = currentTime;
  }

  private renderLightningChain(
    player: Player,
    weapon: ActiveWeapon,
    ctx: CanvasRenderingContext2D,
    currentTime: number
  ): void {
    const targets = weapon.lightningTargets;
    const triggerTime = weapon.lightningTime;
    if (!targets || targets.length === 0 || triggerTime === undefined) return;

    // 仅在短时间内显示闪电（例如200ms）
    const duration = 200;
    const elapsed = currentTime - triggerTime;
    if (elapsed > duration) return;

    // 渲染从玩家到每个目标的连线（逐段）
    const points: { x: number; y: number }[] = [{ x: player.x, y: player.y }];
    for (const t of targets) {
      points.push({ x: t.x, y: t.y });
    }

    // 根据时间缩放抖动幅度与透明度
    const t = Math.max(0, 1 - elapsed / duration);
    const amplitude = 6 * t; // 抖动强度随时间减弱
    const alpha = 0.6 * t;   // 透明度随时间减弱

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 逐段绘制闪电折线
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      this.drawJitteredLightning(ctx, a.x, a.y, b.x, b.y, amplitude, alpha, currentTime);

      // Angular impact diamonds match the frozen and force-field effects.
      ctx.beginPath();
      ctx.moveTo(b.x, b.y - 8);
      ctx.lineTo(b.x + 8, b.y);
      ctx.lineTo(b.x, b.y + 5);
      ctx.lineTo(b.x - 8, b.y);
      ctx.closePath();
      ctx.fillStyle = `rgba(168,85,247,${0.46 * alpha})`;
      ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${0.8 * alpha})`;
      ctx.fillRect(Math.round(b.x - 2), Math.round(b.y - 2), 4, 4);
    }

    ctx.restore();
  }

  private drawJitteredLightning(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    amplitude: number,
    alpha: number,
    currentTime: number
  ): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len; // 法向量（用于抖动）
    const ny = dx / len;

    // 优化：减少段数，降低计算量
    const segments = Math.max(4, Math.min(8, Math.floor(len / 40)));
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const px = x1 + dx * t;
      const py = y1 + dy * t;
      // 在中段抖动更强，两端更弱
      const falloff = Math.sin(Math.PI * t);
      const noise = Math.sin(i * 12.73 + currentTime * 0.032 + x1 * 0.11 + y1 * 0.07);
      const jitter = amplitude * falloff * noise;
      points.push({
        x: Math.round(px + nx * jitter),
        y: Math.round(py + ny * jitter),
      });
    }

    // 优化：移除 shadowBlur（性能杀手），改用多层描边模拟发光
    const outer = `rgba(168,85,247,${0.3 * alpha})`;
    const mid = `rgba(200,150,255,${0.7 * alpha})`;
    const core = `rgba(255,255,255,${0.95 * alpha})`;

    // 构建路径一次，复用绘制
    const path = new Path2D();
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (i === 0) path.moveTo(p.x, p.y); else path.lineTo(p.x, p.y);
    }

    // 外层（无 shadowBlur）
    ctx.strokeStyle = outer;
    ctx.lineWidth = 5;
    ctx.stroke(path);

    // 中层
    ctx.strokeStyle = mid;
    ctx.lineWidth = 2;
    ctx.stroke(path);

    // 核心细线
    ctx.strokeStyle = core;
    ctx.lineWidth = 1;
    ctx.stroke(path);
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

    // 检测力场范围内的敌人（优化：使用平方距离判定）
    for (const enemy of enemies) {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const distanceSq = dx * dx + dy * dy;
      const radiusSum = fieldRadius + enemy.radius;

      if (distanceSq < radiusSum * radiusSum) {
        // 造成伤害（基于间隔）
        if (!enemy.lastShotTime || currentTime - enemy.lastShotTime > damageInterval) {
          enemy.health -= damage;
          enemy.lastShotTime = currentTime;

          // 击退效果
          const distance = Math.sqrt(distanceSq); // 这里需要实际距离用于归一化
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
    ctx: CanvasRenderingContext2D,
    currentTime: number
  ): void {
    const config = GAME_CONFIG.WEAPONS.FIELD;
    const fieldRadius = config.FIELD_RADIUS + (weapon.level - 1) * 10;
    const verticalRadius = fieldRadius * 0.42;
    const time = currentTime / 1000;
    const pulse = (Math.sin(time * 5.4) + 1) * 0.5;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Low translucent plate makes the field read as energy on the ground.
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + 3, fieldRadius, verticalRadius, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(16, 185, 129, ${0.035 + pulse * 0.025})`;
    ctx.fill();

    // Counter-rotating segmented rails replace the generic gradient circle.
    const segmentCount = 14;
    for (let i = 0; i < segmentCount; i++) {
      const start = (i / segmentCount) * Math.PI * 2 + time * 0.42;
      const end = start + Math.PI * 2 / segmentCount * 0.58;
      ctx.beginPath();
      ctx.ellipse(player.x, player.y + 3, fieldRadius, verticalRadius, 0, start, end);
      ctx.strokeStyle = i % 2 === 0
        ? `rgba(52, 211, 153, ${0.58 + pulse * 0.2})`
        : `rgba(103, 232, 249, ${0.34 + pulse * 0.14})`;
      ctx.lineWidth = i % 2 === 0 ? 3 : 2;
      ctx.stroke();
    }

    const innerRadius = fieldRadius - 8 - pulse * 2;
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + 3, innerRadius, innerRadius * 0.42, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(5, 150, 105, 0.34)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Six counter-rotating diamond emitters make the field feel engineered.
    const nodeCount = 6;
    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * Math.PI * 2 - time * 0.9;
      const pointX = player.x + Math.cos(angle) * innerRadius;
      const pointY = player.y + 3 + Math.sin(angle) * innerRadius * 0.42;
      const size = i % 2 === 0 ? 4 : 3;

      ctx.beginPath();
      ctx.moveTo(pointX, pointY - size);
      ctx.lineTo(pointX + size, pointY);
      ctx.lineTo(pointX, pointY + size);
      ctx.lineTo(pointX - size, pointY);
      ctx.closePath();
      ctx.fillStyle = i % 2 === 0 ? "#6ee7b7" : "#67e8f9";
      ctx.fill();
    }

    // Brief cardinal ticks communicate the active knockback boundary.
    ctx.fillStyle = `rgba(236, 253, 245, ${0.56 + pulse * 0.28})`;
    const tick = 3;
    ctx.fillRect(Math.round(player.x - tick), Math.round(player.y + 3 - verticalRadius), tick * 2, 2);
    ctx.fillRect(Math.round(player.x - tick), Math.round(player.y + 2 + verticalRadius), tick * 2, 2);
    ctx.fillRect(Math.round(player.x - fieldRadius), Math.round(player.y + 2), 2, tick * 2);
    ctx.fillRect(Math.round(player.x + fieldRadius - 2), Math.round(player.y + 2), 2, tick * 2);

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
