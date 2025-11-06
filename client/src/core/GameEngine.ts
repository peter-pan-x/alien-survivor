import { Player, Enemy, Bullet, GameStats } from "../gameTypes";
import { GAME_CONFIG } from "../gameConfig";
import { EnemyManager } from "../utils/EnemyManager";
import { WeaponSystem } from "../utils/WeaponSystem";
import { ParticlePool } from "../utils/ParticlePool";
import { SpatialGrid } from "../utils/SpatialGrid";
import { DamageNumberSystem } from "../utils/DamageNumbers";
import { BackgroundRenderer } from "../utils/BackgroundRenderer";
import { PerformanceMonitor } from "../utils/PerformanceMonitor";
import { MathUtils } from "../utils/MathUtils";

/**
 * 游戏引擎核心类
 * 负责管理游戏状态、更新逻辑和渲染
 * 将游戏逻辑与 React 组件解耦
 */
export class GameEngine {
  // 画布相关
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  // 游戏实体
  private player: Player;
  private bullets: Bullet[] = [];
  private enemyBullets: Bullet[] = [];

  // 游戏系统
  private enemyManager: EnemyManager;
  private weaponSystem: WeaponSystem;
  private particlePool: ParticlePool;
  private spatialGrid: SpatialGrid;
  private damageNumbers: DamageNumberSystem;
  private backgroundRenderer: BackgroundRenderer;
  private performanceMonitor: PerformanceMonitor;

  // 游戏状态
  private gameStartTime: number = 0;
  private lastShotTime: number = 0;
  private lastDamageTime: number = 0;
  private stats: GameStats = {
    score: 0,
    killCount: 0,
    highScore: 0,
    survivalTime: 0,
  };

  // 输入状态
  private keys: Set<string> = new Set();
  private joystickInput: { x: number; y: number } = { x: 0, y: 0 };

  // 游戏循环
  private animationId: number | null = null;
  private lastFrameTime: number = 0;
  private isRunning: boolean = false;

  // 回调函数
  private onLevelUp?: () => void;
  private onGameOver?: () => void;
  
  // 事件处理器
  private keyboardHandler: ((e: KeyboardEvent) => void) | null = null;
  private onStatsUpdate?: (stats: GameStats) => void;
  private onError?: (error: Error) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("无法获取 Canvas 2D 上下文");
    }
    this.ctx = ctx;

    // 设置画布尺寸
    this.width = Math.min(window.innerWidth, GAME_CONFIG.CANVAS.MAX_WIDTH);
    this.height = Math.min(
      window.innerHeight - 200,
      GAME_CONFIG.CANVAS.MAX_HEIGHT
    );
    canvas.width = this.width;
    canvas.height = this.height;

    // 初始化游戏系统
    this.particlePool = new ParticlePool();
    this.enemyManager = new EnemyManager();
    this.weaponSystem = new WeaponSystem(this.particlePool);
    this.spatialGrid = new SpatialGrid(this.width, this.height, 100);
    this.damageNumbers = new DamageNumberSystem();
    this.backgroundRenderer = new BackgroundRenderer(this.width, this.height);
    
    // 在开发模式下启用性能监控
    this.performanceMonitor = new PerformanceMonitor(
      import.meta.env.DEV || false
    );

    // 初始化玩家
    this.player = this.createInitialPlayer();

    // 添加键盘事件监听 (用于切换性能监控)
    this.setupKeyboardListeners();
  }

  /**
   * 设置键盘监听器 (修复: 保存处理器引用以便清理)
   */
  private setupKeyboardListeners(): void {
    this.keyboardHandler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "p" && e.ctrlKey) {
        e.preventDefault();
        const currentState = this.performanceMonitor.getFPS() > 0;
        this.performanceMonitor.setEnabled(!currentState);
      }
    };
    
    window.addEventListener("keydown", this.keyboardHandler);
  }

  /**
   * 创建初始玩家对象
   */
  private createInitialPlayer(): Player {
    return {
      x: this.width / 2,
      y: this.height / 2,
      radius: GAME_CONFIG.PLAYER.RADIUS,
      health: GAME_CONFIG.PLAYER.INITIAL_HEALTH,
      maxHealth: GAME_CONFIG.PLAYER.INITIAL_HEALTH,
      exp: 0,
      level: 1,
      attackDamage: GAME_CONFIG.PLAYER.INITIAL_ATTACK_DAMAGE,
      attackSpeed: GAME_CONFIG.PLAYER.INITIAL_ATTACK_SPEED,
      attackRange: GAME_CONFIG.PLAYER.INITIAL_ATTACK_RANGE,
      bulletCount: GAME_CONFIG.PLAYER.INITIAL_BULLET_COUNT,
      shield: 0,
      maxShield: 0,
      moveSpeed: GAME_CONFIG.PLAYER.INITIAL_MOVE_SPEED,
      hasPierce: false,
      hasLifeSteal: false,
      bulletSizeMultiplier: 1.0,
      weapons: [],
    };
  }

  /**
   * 重置游戏状态
   */
  public reset(): void {
    this.player = this.createInitialPlayer();
    this.bullets = [];
    this.enemyBullets = [];
    this.enemyManager.reset();
    this.particlePool.clear();
    this.damageNumbers.clear();
    this.performanceMonitor.reset();
    this.lastShotTime = 0;
    this.lastDamageTime = 0;
    this.gameStartTime = Date.now();
    this.stats = {
      score: 0,
      killCount: 0,
      highScore: this.stats.highScore,
      survivalTime: 0,
    };
  }

  /**
   * 设置回调函数
   */
  public setCallbacks(callbacks: {
    onLevelUp?: () => void;
    onGameOver?: () => void;
    onStatsUpdate?: (stats: GameStats) => void;
    onError?: (error: Error) => void;
  }): void {
    this.onLevelUp = callbacks.onLevelUp;
    this.onGameOver = callbacks.onGameOver;
    this.onStatsUpdate = callbacks.onStatsUpdate;
    this.onError = callbacks.onError;
  }

  /**
   * 设置键盘输入
   */
  public setKeys(keys: Set<string>): void {
    this.keys = keys;
  }

  /**
   * 设置摇杆输入
   */
  public setJoystickInput(x: number, y: number): void {
    this.joystickInput = { x, y };
  }

  /**
   * 获取玩家对象 (只读)
   */
  public getPlayer(): Readonly<Player> {
    return this.player;
  }

  /**
   * 获取游戏统计数据
   */
  public getStats(): Readonly<GameStats> {
    return { ...this.stats };
  }

  /**
   * 计算升级所需经验值
   * @param level 当前等级
   * @returns 升级所需经验值
   */
  private calculateExpNeeded(level: number): number {
    return level * GAME_CONFIG.LEVELING.EXP_MULTIPLIER;
  }

  /**
   * 处理玩家升级（修复：支持多级升级）
   */
  private handleLevelUp(): void {
    let leveledUp = false;
    
    // 循环检查是否可以升级
    while (true) {
      const expNeeded = this.calculateExpNeeded(this.player.level);
      
      if (this.player.exp >= expNeeded) {
        this.player.exp -= expNeeded;
        this.player.level++;
        leveledUp = true;
        
        console.log(`[GameEngine] Level up! Now level ${this.player.level}`);
      } else {
        break;
      }
    }
    
    // 只在升级后触发一次回调
    if (leveledUp && this.onLevelUp) {
      this.onLevelUp();
    }
  }

  /**
   * 应用技能效果
   */
  public applySkill(skillId: string): void {
    try {
      switch (skillId) {
        case "health_boost":
          this.player.maxHealth += GAME_CONFIG.SKILLS.HEALTH_BOOST;
          this.player.health = Math.min(
            this.player.health + GAME_CONFIG.SKILLS.HEALTH_BOOST,
            this.player.maxHealth
          );
          break;
        case "attack_boost":
          this.player.attackDamage += GAME_CONFIG.SKILLS.ATTACK_BOOST;
          break;
        case "speed_boost":
          this.player.attackSpeed *= GAME_CONFIG.SKILLS.SPEED_BOOST_MULTIPLIER;
          break;
        case "range_boost":
          this.player.attackRange += GAME_CONFIG.SKILLS.RANGE_BOOST;
          break;
        case "multi_shot":
          this.player.bulletCount += 1;
          break;
        case "shield_boost":
          this.player.maxShield += GAME_CONFIG.SKILLS.SHIELD_BOOST;
          this.player.shield = this.player.maxShield;
          break;
        case "pierce_shot":
          this.player.hasPierce = true;
          break;
        case "life_steal":
          this.player.hasLifeSteal = true;
          break;
        case "bullet_size":
          this.player.bulletSizeMultiplier *=
            GAME_CONFIG.SKILLS.BULLET_SIZE_MULTIPLIER;
          break;
        case "move_speed":
          this.player.moveSpeed *= GAME_CONFIG.SKILLS.MOVE_SPEED_MULTIPLIER;
          this.player.moveSpeed = Math.min(
            this.player.moveSpeed,
            GAME_CONFIG.PLAYER.MAX_MOVE_SPEED
          );
          break;
        case "orbital_drone":
          this.weaponSystem.addWeapon(this.player, "orbital");
          break;
        case "lightning_chain":
          this.weaponSystem.addWeapon(this.player, "lightning");
          break;
        case "guardian_field":
          this.weaponSystem.addWeapon(this.player, "field");
          break;
        default:
          console.warn(`未知的技能 ID: ${skillId}`);
      }
    } catch (error) {
      console.error(`应用技能失败: ${skillId}`, error);
      if (this.onError && error instanceof Error) {
        this.onError(error);
      }
    }
  }

  /**
   * 启动游戏循环
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = Date.now();
    this.gameLoop();
  }

  /**
   * 停止游戏循环
   */
  public stop(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * 游戏主循环
   */
  private gameLoop = (): void => {
    if (!this.isRunning) return;

    try {
      const now = Date.now();
      const deltaTime = Math.min(
        (now - this.lastFrameTime) / GAME_CONFIG.RENDERING.FRAME_TIME,
        2
      );
      this.lastFrameTime = now;

      // 更新性能监控
      this.performanceMonitor.update();

      // 更新游戏状态
      const updateStart = performance.now();
      this.update(now, deltaTime);
      const updateTime = performance.now() - updateStart;
      this.performanceMonitor.recordUpdateTime(updateTime);

      // 渲染游戏
      const renderStart = performance.now();
      this.render(now);
      const renderTime = performance.now() - renderStart;
      this.performanceMonitor.recordRenderTime(renderTime);

      // 继续下一帧
      this.animationId = requestAnimationFrame(this.gameLoop);
    } catch (error) {
      console.error("游戏循环错误:", error);
      this.stop();
      
      if (this.onError && error instanceof Error) {
        this.onError(error);
      }
      
      if (this.onGameOver) {
        this.onGameOver();
      }
    }
  };

  /**
   * 更新游戏状态
   */
  private update(now: number, deltaTime: number): void {
    // 更新存活时间
    const survivalTime = Math.floor((now - this.gameStartTime) / 1000);
    this.stats.survivalTime = survivalTime;
    if (this.onStatsUpdate) {
      this.onStatsUpdate(this.stats);
    }

    // 更新玩家位置
    this.updatePlayerPosition(deltaTime);

    // 生成敌人
    this.enemyManager.spawnEnemy(this.width, this.height, now);

    // 更新敌人
    const enemies = this.enemyManager.getEnemies();
    this.updateEnemies(enemies, now, deltaTime);

    // 玩家射击
    this.handlePlayerShooting(now);

    // 更新子弹
    this.updateBullets(deltaTime);

    // 更新武器系统
    this.weaponSystem.updateWeapons(this.player, enemies, now, this.ctx);

    // 碰撞检测
    this.handleCollisions(now);

    // 更新粒子和伤害数字
    this.particlePool.update(deltaTime);
    this.damageNumbers.update(deltaTime);

    // 检查游戏结束
    if (this.player.health <= 0) {
      this.stop();
      if (this.onGameOver) {
        this.onGameOver();
      }
    }
  }

  /**
   * 更新玩家位置
   */
  private updatePlayerPosition(deltaTime: number): void {
    let dx = this.joystickInput.x;
    let dy = this.joystickInput.y;

    // 键盘控制（作为备选）
    if (this.keys.has("w") || this.keys.has("arrowup")) dy -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) dy += 1;
    if (this.keys.has("a") || this.keys.has("arrowleft")) dx -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) dx += 1;

    if (dx !== 0 || dy !== 0) {
      // 使用安全的归一化
      const { x: normalizedX, y: normalizedY } = MathUtils.safeNormalize(dx, dy);
      
      const moveX = normalizedX * this.player.moveSpeed * deltaTime;
      const moveY = normalizedY * this.player.moveSpeed * deltaTime;

      // 使用 clamp 限制位置
      this.player.x = MathUtils.clamp(
        this.player.x + moveX,
        this.player.radius,
        this.width - this.player.radius
      );
      this.player.y = MathUtils.clamp(
        this.player.y + moveY,
        this.player.radius,
        this.height - this.player.radius
      );
    }
  }

  /**
   * 更新敌人
   */
  private updateEnemies(enemies: Enemy[], now: number, deltaTime: number): void {
    for (const enemy of enemies) {
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (enemy.type === "shooter") {
        const shootRange = GAME_CONFIG.ENEMY.TYPES.shooter.shootRange || 250;
        if (distance > shootRange) {
          // 使用安全的归一化
          const { x: normalizedX, y: normalizedY } = MathUtils.safeNormalize(dx, dy);
          enemy.x += normalizedX * enemy.speed * deltaTime;
          enemy.y += normalizedY * enemy.speed * deltaTime;
        }

        const shootCooldown =
          GAME_CONFIG.ENEMY.TYPES.shooter.shootCooldown || 2000;
        if (
          distance <= shootRange &&
          now - (enemy.lastShotTime || 0) > shootCooldown
        ) {
          const angle = Math.atan2(dy, dx);
          this.enemyBullets.push({
            x: enemy.x,
            y: enemy.y,
            vx: Math.cos(angle) * GAME_CONFIG.BULLET.SPEED * 0.6,
            vy: Math.sin(angle) * GAME_CONFIG.BULLET.SPEED * 0.6,
            radius: GAME_CONFIG.BULLET.BASE_RADIUS,
            damage: GAME_CONFIG.ENEMY.TYPES.shooter.damage,
            isEnemyBullet: true,
          });
          enemy.lastShotTime = now;
        }
      } else {
        // 使用安全的归一化
        const { x: normalizedX, y: normalizedY } = MathUtils.safeNormalize(dx, dy);
        enemy.x += normalizedX * enemy.speed * deltaTime;
        enemy.y += normalizedY * enemy.speed * deltaTime;
      }
    }
  }

  /**
   * 玩家射击
   */
  private handlePlayerShooting(now: number): void {
    // 使用安全除法避免除零
    const shootInterval = MathUtils.safeDivide(1000, this.player.attackSpeed, 1000);
    if (now - this.lastShotTime < shootInterval) return;

    const enemies = this.enemyManager.getEnemies();
    if (enemies.length === 0) return;

    let closestEnemy = enemies[0];
    let minDistance = Infinity;

    for (const enemy of enemies) {
      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance) {
        minDistance = distance;
        closestEnemy = enemy;
      }
    }

    if (minDistance <= this.player.attackRange) {
      const angle = Math.atan2(
        closestEnemy.y - this.player.y,
        closestEnemy.x - this.player.x
      );

      for (let i = 0; i < this.player.bulletCount; i++) {
        const spreadAngle =
          this.player.bulletCount > 1
            ? GAME_CONFIG.BULLET.SPREAD_ANGLE *
              ((i - (this.player.bulletCount - 1) / 2) /
                (this.player.bulletCount - 1))
            : 0;

        const bulletAngle = angle + spreadAngle;
        const bulletRadius =
          GAME_CONFIG.BULLET.BASE_RADIUS * this.player.bulletSizeMultiplier;

        this.bullets.push({
          x: this.player.x,
          y: this.player.y,
          vx: Math.cos(bulletAngle) * GAME_CONFIG.BULLET.SPEED,
          vy: Math.sin(bulletAngle) * GAME_CONFIG.BULLET.SPEED,
          radius: bulletRadius,
          damage: this.player.attackDamage,
          pierce: this.player.hasPierce,
          pierceCount: this.player.hasPierce ? 3 : 0,
        });
      }

      this.lastShotTime = now;
    }
  }

  /**
   * 更新子弹
   */
  private updateBullets(deltaTime: number): void {
    // 更新玩家子弹
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.x += bullet.vx * deltaTime;
      bullet.y += bullet.vy * deltaTime;

      if (
        bullet.x < 0 ||
        bullet.x > this.width ||
        bullet.y < 0 ||
        bullet.y > this.height
      ) {
        this.bullets.splice(i, 1);
      }
    }

    // 更新敌人子弹
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const bullet = this.enemyBullets[i];
      bullet.x += bullet.vx * deltaTime;
      bullet.y += bullet.vy * deltaTime;

      if (
        bullet.x < 0 ||
        bullet.x > this.width ||
        bullet.y < 0 ||
        bullet.y > this.height
      ) {
        this.enemyBullets.splice(i, 1);
      }
    }
  }

  /**
   * 碰撞检测 (已修复 P0 级别错误)
   */
  private handleCollisions(now: number): void {
    const enemies = this.enemyManager.getEnemies();

    // 构建空间网格 (修复: 使用正确的 insert 方法)
    this.spatialGrid.clear();
    enemies.forEach((e) => this.spatialGrid.insert(e));

    // 子弹与敌人碰撞 (优化: 使用距离平方和动态查询范围)
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      // 动态查询范围：子弹半径 + 敌人最大半径 + 安全边距
      const queryRadius = bullet.radius + 30 + 10;
      const nearbyEnemies = this.spatialGrid.getNearby(bullet.x, bullet.y, queryRadius);

      let hit = false;
      for (const enemy of nearbyEnemies) {
        // 使用优化的碰撞检测（距离平方）
        if (MathUtils.checkCircleCollision(
          bullet.x, bullet.y, bullet.radius,
          enemy.x, enemy.y, enemy.radius
        )) {
          enemy.health -= bullet.damage;
          this.damageNumbers.add(enemy.x, enemy.y, bullet.damage);

          this.particlePool.createParticles(
            enemy.x,
            enemy.y,
            GAME_CONFIG.COLORS.PARTICLE_ENEMY_HIT,
            GAME_CONFIG.PARTICLE.HIT_PARTICLE_COUNT
          );

          if (bullet.pierce && bullet.pierceCount) {
            bullet.pierceCount--;
            if (bullet.pierceCount <= 0) {
              hit = true;
            }
          } else {
            hit = true;
          }

          if (hit) break;
        }
      }

      if (hit) {
        this.bullets.splice(i, 1);
      }
    }

    // 移除死亡敌人
    for (let i = enemies.length - 1; i >= 0; i--) {
      if (enemies[i].health <= 0) {
        const enemy = enemies[i];
        this.particlePool.createParticles(
          enemy.x,
          enemy.y,
          GAME_CONFIG.COLORS.PARTICLE_ENEMY_DEATH,
          GAME_CONFIG.PARTICLE.DEATH_PARTICLE_COUNT
        );

        this.stats.killCount++;
        this.stats.score += 10;

        if (this.player.hasLifeSteal) {
          this.player.health = Math.min(
            this.player.health + 5,
            this.player.maxHealth
          );
        }

        // 添加经验
        this.player.exp += GAME_CONFIG.LEVELING.EXP_PER_KILL;
        
        // 处理升级（可能升多级）
        this.handleLevelUp();

        enemies.splice(i, 1);
      }
    }

    this.enemyManager.setEnemies(enemies);

    // 敌人子弹与玩家碰撞 (优化: 使用距离平方)
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const bullet = this.enemyBullets[i];
      
      // 使用优化的碰撞检测
      if (MathUtils.checkCircleCollision(
        bullet.x, bullet.y, bullet.radius,
        this.player.x, this.player.y, this.player.radius
      )) {
        if (
          now - this.lastDamageTime >
          GAME_CONFIG.PLAYER.DAMAGE_COOLDOWN
        ) {
          this.applyDamage(bullet.damage);

          this.lastDamageTime = now;
          this.particlePool.createParticles(
            this.player.x,
            this.player.y,
            GAME_CONFIG.COLORS.PARTICLE_PLAYER_HIT,
            GAME_CONFIG.PARTICLE.HIT_PARTICLE_COUNT
          );
        }

        this.enemyBullets.splice(i, 1);
      }
    }

    // 玩家与敌人碰撞 (优化: 使用空间网格和距离平方)
    const nearbyEnemiesForPlayer = this.spatialGrid.getNearby(
      this.player.x,
      this.player.y,
      this.player.radius + 30 // 玩家半径 + 敌人最大半径
    );
    
    for (const enemy of nearbyEnemiesForPlayer) {
      // 使用优化的碰撞检测
      if (MathUtils.checkCircleCollision(
        this.player.x, this.player.y, this.player.radius,
        enemy.x, enemy.y, enemy.radius
      )) {
        if (
          now - this.lastDamageTime >
          GAME_CONFIG.PLAYER.DAMAGE_COOLDOWN
        ) {
          const typeConfig = GAME_CONFIG.ENEMY.TYPES[enemy.type];
          const damage = typeConfig.damage;

          this.applyDamage(damage);

          this.lastDamageTime = now;
          this.particlePool.createParticles(
            this.player.x,
            this.player.y,
            GAME_CONFIG.COLORS.PARTICLE_PLAYER_HIT,
            GAME_CONFIG.PARTICLE.HIT_PARTICLE_COUNT
          );
        }
      }
    }
  }

  /**
   * 应用伤害到玩家（修复：正确处理护盾溢出）
   */
  private applyDamage(damage: number): void {
    if (this.player.shield > 0) {
      this.player.shield -= damage;
      if (this.player.shield < 0) {
        // 护盾溢出的伤害转移到生命值
        const overflow = Math.abs(this.player.shield);
        this.player.shield = 0;
        this.player.health -= overflow;
      }
    } else {
      this.player.health -= damage;
    }
    
    // 确保生命值在有效范围内
    this.player.health = MathUtils.clamp(this.player.health, 0, this.player.maxHealth);
  }

  /**
   * 渲染游戏
   */
  private render(now: number): void {
    // 绘制背景
    this.backgroundRenderer.draw(this.ctx);

    // 渲染敌人
    this.renderEnemies();

    // 渲染子弹
    this.renderBullets();

    // 渲染玩家
    this.renderPlayer();

    // 渲染武器系统
    this.weaponSystem.renderWeapons(this.player, this.ctx, now);

    // 渲染粒子
    this.particlePool.render(this.ctx);

    // 渲染伤害数字
    this.damageNumbers.render(this.ctx);

    // 渲染 HUD
    this.renderHUD();

    // 渲染性能监控 (仅在开发模式下)
    this.performanceMonitor.render(this.ctx);
  }

  /**
   * 渲染敌人
   */
  private renderEnemies(): void {
    const enemies = this.enemyManager.getEnemies();
    for (const enemy of enemies) {
      const typeConfig = GAME_CONFIG.ENEMY.TYPES[enemy.type];
      const color = GAME_CONFIG.COLORS[`ENEMY_${enemy.type.toUpperCase()}`];

      this.ctx.save();

      // 绘制敌人形状
      this.ctx.beginPath();
      if (enemy.type === "swarm") {
        this.ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
      } else if (enemy.type === "rusher") {
        this.ctx.rect(
          enemy.x - enemy.radius,
          enemy.y - enemy.radius,
          enemy.radius * 2,
          enemy.radius * 2
        );
      } else if (enemy.type === "shooter") {
        for (let i = 0; i < 3; i++) {
          const angle = (Math.PI * 2 * i) / 3 - Math.PI / 2;
          const x = enemy.x + Math.cos(angle) * enemy.radius;
          const y = enemy.y + Math.sin(angle) * enemy.radius;
          if (i === 0) {
            this.ctx.moveTo(x, y);
          } else {
            this.ctx.lineTo(x, y);
          }
        }
        this.ctx.closePath();
      } else if (enemy.type === "elite") {
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI * 2 * i) / 6;
          const x = enemy.x + Math.cos(angle) * enemy.radius;
          const y = enemy.y + Math.sin(angle) * enemy.radius;
          if (i === 0) {
            this.ctx.moveTo(x, y);
          } else {
            this.ctx.lineTo(x, y);
          }
        }
        this.ctx.closePath();
      }

      this.ctx.fillStyle = color;
      this.ctx.fill();
      this.ctx.strokeStyle = color + "88";
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // 血条
      const barWidth = enemy.radius * 2;
      const barHeight = 3;
      const barY = enemy.y - enemy.radius - 8;

      this.ctx.fillStyle = "#333";
      this.ctx.fillRect(enemy.x - barWidth / 2, barY, barWidth, barHeight);

      this.ctx.fillStyle = "#ef4444";
      this.ctx.fillRect(
        enemy.x - barWidth / 2,
        barY,
        (enemy.health / enemy.maxHealth) * barWidth,
        barHeight
      );

      this.ctx.restore();
    }
  }

  /**
   * 渲染子弹
   */
  private renderBullets(): void {
    // 渲染玩家子弹
    for (const bullet of this.bullets) {
      const gradient = this.ctx.createRadialGradient(
        bullet.x,
        bullet.y,
        0,
        bullet.x,
        bullet.y,
        bullet.radius
      );
      gradient.addColorStop(0, GAME_CONFIG.COLORS.BULLET_GRADIENT_START);
      gradient.addColorStop(1, GAME_CONFIG.COLORS.BULLET_GRADIENT_END);

      this.ctx.beginPath();
      this.ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = gradient;
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.arc(bullet.x, bullet.y, bullet.radius + 2, 0, Math.PI * 2);
      this.ctx.strokeStyle = GAME_CONFIG.COLORS.BULLET_GRADIENT_START + "44";
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }

    // 渲染敌人子弹
    for (const bullet of this.enemyBullets) {
      this.ctx.beginPath();
      this.ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = "#a855f7";
      this.ctx.fill();
      this.ctx.strokeStyle = "#7c3aed";
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }
  }

  /**
   * 渲染玩家
   */
  private renderPlayer(): void {
    const gradient = this.ctx.createRadialGradient(
      this.player.x,
      this.player.y,
      0,
      this.player.x,
      this.player.y,
      this.player.radius
    );
    gradient.addColorStop(0, GAME_CONFIG.COLORS.PLAYER_GRADIENT_START);
    gradient.addColorStop(1, GAME_CONFIG.COLORS.PLAYER_GRADIENT_END);

    this.ctx.beginPath();
    this.ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    // 护盾
    if (this.player.shield > 0) {
      this.ctx.beginPath();
      this.ctx.arc(
        this.player.x,
        this.player.y,
        this.player.radius + GAME_CONFIG.RENDERING.SHIELD_RADIUS_OFFSET,
        0,
        Math.PI * 2
      );
      this.ctx.strokeStyle = GAME_CONFIG.COLORS.SHIELD;
      this.ctx.lineWidth = 3;
      this.ctx.stroke();
    }

    // 玩家血条
    const barWidth =
      this.player.radius * GAME_CONFIG.RENDERING.HEALTH_BAR_WIDTH_MULTIPLIER;
    const barHeight = GAME_CONFIG.RENDERING.HEALTH_BAR_HEIGHT;
    const barY =
      this.player.y - this.player.radius - GAME_CONFIG.RENDERING.HEALTH_BAR_OFFSET;

    this.ctx.fillStyle = "#333";
    this.ctx.fillRect(this.player.x - barWidth / 2, barY, barWidth, barHeight);

    this.ctx.fillStyle = "#10b981";
    this.ctx.fillRect(
      this.player.x - barWidth / 2,
      barY,
      (this.player.health / this.player.maxHealth) * barWidth,
      barHeight
    );
  }

  /**
   * 渲染 HUD
   */
  private renderHUD(): void {
    this.ctx.save();
    this.ctx.fillStyle = "#fff";
    this.ctx.font = "16px Arial";
    this.ctx.textAlign = "left";
    this.ctx.fillText(
      `HP: ${Math.max(0, Math.floor(this.player.health))}/${this.player.maxHealth}`,
      10,
      25
    );

    if (this.player.shield > 0) {
      this.ctx.fillStyle = "#60a5fa";
      this.ctx.fillText(
        `Shield: ${Math.floor(this.player.shield)}/${this.player.maxShield}`,
        10,
        45
      );
    }

    this.ctx.fillStyle = "#fff";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      `Time: ${Math.floor(this.stats.survivalTime / 60)}:${(this.stats.survivalTime % 60).toString().padStart(2, "0")}`,
      this.width / 2,
      25
    );

    this.ctx.textAlign = "right";
    this.ctx.fillText(`Kills: ${this.stats.killCount}`, this.width - 10, 25);
    this.ctx.fillText(`Level: ${this.player.level}`, this.width - 10, 45);

    // 经验条
    const expBarWidth = this.width * 0.8;
    const expBarHeight = 8;
    const expBarX = (this.width - expBarWidth) / 2;
    const expBarY = this.height - 20;
    const expNeeded = this.player.level * GAME_CONFIG.LEVELING.EXP_MULTIPLIER;
    const expProgress = this.player.exp / expNeeded;

    this.ctx.fillStyle = "#333";
    this.ctx.fillRect(expBarX, expBarY, expBarWidth, expBarHeight);

    this.ctx.fillStyle = "#fbbf24";
    this.ctx.fillRect(expBarX, expBarY, expBarWidth * expProgress, expBarHeight);

    this.ctx.restore();
  }

  /**
   * 清理资源 (修复: 完善资源清理，防止内存泄漏)
   */
  public destroy(): void {
    console.log('[GameEngine] Destroying game engine...');
    
    // 停止游戏循环
    this.stop();
    
    // 移除事件监听器
    if (this.keyboardHandler) {
      window.removeEventListener("keydown", this.keyboardHandler);
      this.keyboardHandler = null;
    }
    
    // 清理子系统
    try {
      this.enemyManager?.reset();
      this.particlePool?.clear();
      this.damageNumbers?.clear();
      this.performanceMonitor?.reset();
      this.spatialGrid?.clear();
    } catch (error) {
      console.error('[GameEngine] Error during subsystem cleanup', error);
    }
    
    // 清空数组
    this.bullets = [];
    this.enemyBullets = [];
    this.keys.clear();
    
    // 清空回调
    this.onLevelUp = undefined;
    this.onGameOver = undefined;
    this.onStatsUpdate = undefined;
    this.onError = undefined;
    
    console.log('[GameEngine] Game engine destroyed successfully');
  }
}
