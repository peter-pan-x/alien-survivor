import { Player, Enemy, GameStats, Bullet } from "../gameTypes";
import { GAME_CONFIG } from "../gameConfig";
import { EnemyManager } from "../utils/EnemyManager";
import { WeaponSystem } from "../utils/WeaponSystem";
import { ParticlePool } from "../utils/ParticlePool";
import { BulletPool } from "../utils/BulletPool";
import { SpatialGrid } from "../utils/SpatialGrid";
import { DamageNumberSystem } from "../utils/DamageNumbers";
import { BackgroundRenderer } from "../utils/BackgroundRenderer";
import { PerformanceMonitor } from "../utils/PerformanceMonitor";
import { MathUtils } from "../utils/MathUtils";
import { Camera } from "../utils/Camera";
import { SkillSystem } from "../systems/SkillSystem";
import { PixelRenderer, PixelSprites, PixelColors } from "../utils/PixelRenderer";
import { AudioSystem } from "../systems/AudioSystem";
import { BossSystem } from "../systems/BossSystem";
import { BOSS_TYPES } from "../systems/BossConfig";
import { Boss } from "../gameTypes";
import { TreeSystem } from "../systems/TreeSystem";
import { EnemyIdGenerator } from "../utils/EnemyIdGenerator";
import { ExpOrbSystem, EXP_ORB_CONFIG } from "../systems/ExpOrbSystem";
import { VirtualJoystick } from "../utils/VirtualJoystick";
import { DailyChallengeSystem } from "../systems/DailyChallengeSystem";
import { AchievementSystem, SessionData } from "../systems/AchievementSystem";
import { animationSystem } from "../systems/AnimationSystem";
import { animatedSpriteRenderer } from "../systems/AnimatedSpriteRenderer";

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
  private bulletPool: BulletPool;
  private enemyBulletPool: BulletPool;
  private currentBoss: Boss | null = null;

  // 游戏系统
  private enemyManager: EnemyManager;
  private weaponSystem: WeaponSystem;
  private particlePool: ParticlePool;
  private spatialGrid: SpatialGrid;
  private damageNumbers: DamageNumberSystem;
  private backgroundRenderer: BackgroundRenderer;
  private performanceMonitor: PerformanceMonitor;
  private camera: Camera; // 相机系统（无尽地图）
  private skillSystem: SkillSystem; // 技能系统（独立模块）
  private pixelRenderer: PixelRenderer; // 像素风格渲染器
  private audioSystem: AudioSystem; // 音频系统（独立模块）
  private bossSystem: BossSystem; // Boss系统（独立模块）
  private treeSystem: TreeSystem; // 树木系统
  private enemyIdGenerator: EnemyIdGenerator; // 敌人ID生成器
  private expOrbSystem: ExpOrbSystem; // 经验球系统
  private dailyChallengeSystem: DailyChallengeSystem; // 每日挑战系统（新增）
  private achievementSystem: AchievementSystem; // 成就系统（新增）
  private sessionData: SessionData; // 会话数据（新增）
  private animSystem = animationSystem; // 动画系统（新增 - 让角色活起来）

  // 游戏状态
  private gameStartTime: number = 0;
  private lastShotTime: number = 0;
  private lastDamageTime: number = 0;
  private lastTreeUpdateTime: number = 0; // 树木更新时间戳
  private shotToggle: boolean = false; // 双弹道左右交替偏移
  private isInvincible: boolean = false; // 新增：是否处于无敌状态
  private invincibleEndTime: number = 0; // 新增：无敌结束时间
  private stats: GameStats = {
    score: 0,
    killCount: 0,
    highScore: 0,
    survivalTime: 0,
  };

  // 输入状态
  private keys: Set<string> = new Set();
  private joystickInput: { x: number; y: number } = { x: 0, y: 0 };
  private virtualJoystick: VirtualJoystick | null = null;

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

    // 设置像素风格渲染
    this.ctx.imageSmoothingEnabled = false;

    // 初始化画布尺寸（临时值，resizeToWindow将会正确设置）
    this.width = 800;
    this.height = 600;

    // 初始化游戏系统
    this.particlePool = new ParticlePool();
    this.bulletPool = new BulletPool(500); // 玩家子弹池
    this.enemyBulletPool = new BulletPool(200); // 敌人子弹池
    this.enemyManager = new EnemyManager();
    this.weaponSystem = new WeaponSystem(this.particlePool);
    this.spatialGrid = new SpatialGrid(this.width, this.height, 100);
    this.damageNumbers = new DamageNumberSystem();
    this.backgroundRenderer = new BackgroundRenderer(this.width, this.height);
    this.camera = new Camera(this.width, this.height, false); // 无尽地图相机
    this.pixelRenderer = new PixelRenderer(this.ctx, 4); // 像素渲染器，像素块大小4px（放大一倍）
    this.audioSystem = new AudioSystem(); // 音频系统（独立模块）
    this.bossSystem = new BossSystem(); // Boss系统（独立模块）
    this.treeSystem = new TreeSystem(); // 树木系统
    this.enemyIdGenerator = new EnemyIdGenerator(); // 敌人ID生成器
    this.expOrbSystem = new ExpOrbSystem(); // 经验球系统
    this.dailyChallengeSystem = new DailyChallengeSystem(); // 每日挑战系统（新增）
    this.achievementSystem = new AchievementSystem(); // 成就系统（新增）
    this.sessionData = this.achievementSystem.createSessionData(); // 会话数据（新增）

    // 初始化技能系统（独立模块）
    this.skillSystem = new SkillSystem();
    this.skillSystem.setWeaponAddCallback((player, weaponType) => {
      this.weaponSystem.addWeapon(player, weaponType);
    });
    this.skillSystem.setMagnetizeAllCallback(() => {
      this.expOrbSystem.magnetizeAll();
    });

    // 在开发模式下启用性能监控
    this.performanceMonitor = new PerformanceMonitor(
      import.meta.env.DEV || false
    );

    // 初始化玩家（世界坐标原点）
    this.player = this.createInitialPlayer();

    // 添加键盘事件监听 (用于切换性能监控)
    this.setupKeyboardListeners();
  }

  /**
   * 依据当前窗口尺寸调整画布与视口（桌面/移动端自适配）
   * 完全适配窗口大小，不限制宽高比，支持任意尺寸
   */
  public resizeToWindow(): void {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    let dpr = window.devicePixelRatio || 1;

    // 移动端：降低渲染分辨率以提升性能（85%质量）
    if (isMobile) {
      dpr *= GAME_CONFIG.CANVAS.MOBILE_QUALITY_SCALE;
    }

    // 限制DPR最大值，避免过高分辨率导致性能问题
    dpr = Math.min(dpr, isMobile ? 2 : 3);

    // 完全适配窗口尺寸，不限制宽高比
    const displayWidth = window.innerWidth;
    const displayHeight = window.innerHeight;

    // 设置Canvas渲染分辨率（考虑高DPI和移动端优化）
    const renderWidth = Math.floor(displayWidth * dpr);
    const renderHeight = Math.floor(displayHeight * dpr);

    // 若尺寸未变化则跳过
    if (renderWidth === this.width && renderHeight === this.height) return;

    // 更新内部尺寸记录
    this.width = renderWidth;
    this.height = renderHeight;

    // 设置Canvas渲染分辨率
    this.canvas.width = renderWidth;
    this.canvas.height = renderHeight;

    // 设置CSS显示尺寸（与窗口完全一致）
    this.canvas.style.width = `${displayWidth}px`;
    this.canvas.style.height = `${displayHeight}px`;

    // 重新应用像素风格设置
    this.ctx.imageSmoothingEnabled = false;

    // 缩放上下文以适配高DPI（使用逻辑像素）
    this.ctx.scale(dpr, dpr);

    // 同步依赖视口尺寸的子系统（使用显示尺寸，不是渲染分辨率）
    this.backgroundRenderer?.resize(displayWidth, displayHeight);
    this.camera?.resize(displayWidth, displayHeight);

    // 更新空间网格（使用显示尺寸）
    if (this.spatialGrid) {
      this.spatialGrid.clear();
      this.spatialGrid = new SpatialGrid(displayWidth, displayHeight, 100);
    }

    console.log(`[GameEngine] Canvas resized to ${displayWidth}x${displayHeight} (DPR: ${dpr.toFixed(2)})`);
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
   * 无尽地图模式：玩家从世界坐标原点 (0, 0) 开始
   */
  private createInitialPlayer(): Player {
    return {
      x: 0, // 世界坐标原点
      y: 0,
      radius: GAME_CONFIG.PLAYER.RADIUS,
      health: GAME_CONFIG.PLAYER.INITIAL_HEALTH,
      maxHealth: GAME_CONFIG.PLAYER.INITIAL_HEALTH,
      lives: GAME_CONFIG.PLAYER.INITIAL_LIVES ?? 3,
      maxLives: GAME_CONFIG.PLAYER.MAX_LIVES ?? (GAME_CONFIG.PLAYER.INITIAL_LIVES ?? 3),
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
      lifeStealAmount: 0,
      // 初始子弹体积再次降低50%（从0.5降至0.25）
      bulletSizeMultiplier: 0.25,
      // 穿透相关
      pierceCount: 0,
      pierceDamageReduction: 0.5,
      // 暴击与分裂子弹初始值
      critChance: 0.0,
      critMultiplier: GAME_CONFIG.SKILLS.CRIT_MULTIPLIER_BASE ?? 2.0,
      hasAOEExplosion: false,
      aoeDamage: 0.3, // 分裂子弹伤害百分比（30%攻击力）
      aoeRadius: 200, // 分裂子弹飞行距离
      // 记录稀有技能的选择次数（用于递减权重）
      rareSkillSelections: {},
      // 记录技能出现次数（用于特殊技能"生命汲取"的出现递减）
      skillAppearances: {},
      weapons: [],
      // 经验球拾取范围
      pickupRange: EXP_ORB_CONFIG.BASE_PICKUP_RANGE,
    };
  }

  /**
   * 重置游戏状态
   */
  public reset(): void {
    this.player = this.createInitialPlayer();
    this.bulletPool.clear();
    this.enemyBulletPool.clear();
    this.enemyManager.reset();
    this.particlePool.clear();
    this.damageNumbers.clear();
    this.performanceMonitor.reset();
    this.spatialGrid.clear();  // 清空空间网格，防止残留数据
    this.lastShotTime = 0;
    this.lastDamageTime = 0;
    this.gameStartTime = Date.now();
    this.stats = {
      score: 0,
      killCount: 0,
      highScore: this.stats.highScore,
      survivalTime: 0,
    };
    // 重置Boss系统
    this.bossSystem.reset();
    this.currentBoss = null;
    // 停止Boss音乐（重置时）
    this.audioSystem.setBossActive(false);
    // 重置树木系统
    this.treeSystem.reset();
    // 生成初始树木
    this.treeSystem.generateTrees(this.player.x, this.player.y, 1000);
    // 重置经验球系统
    this.expOrbSystem.reset();
    // 停止背景音乐（重置时）
    this.audioSystem.stopBackgroundMusic();
    // 重置并生成今日挑战（新增）
    this.dailyChallengeSystem.reset();
    this.dailyChallengeSystem.generateTodaysChallenge();
    // 重置会话���据（新增）
    this.sessionData = this.achievementSystem.createSessionData();
    // 重置无敌状态（新增）
    this.isInvincible = false;
    this.invincibleEndTime = 0;
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
   * 设置虚拟摇杆引用（用于渲染）
   */
  public setVirtualJoystick(joystick: VirtualJoystick): void {
    this.virtualJoystick = joystick;
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
   * 规则：首级需击杀5个敌人，之后每级在上一级基础上增加33%
   * @param level 当前等级
   * @returns 升级所需经验值
   */
  private calculateExpNeeded(level: number): number {
    const baseKills = GAME_CONFIG.LEVELING.BASE_KILLS_FOR_FIRST_LEVEL ?? 5;
    const baseExp = GAME_CONFIG.LEVELING.EXP_PER_KILL * baseKills;
    const growth = GAME_CONFIG.LEVELING.GROWTH_RATE ?? 1.33;
    // 从1级开始，首次升级需求为 baseExp；之后按33%递增
    return Math.ceil(baseExp * Math.pow(growth, Math.max(0, level - 1)));
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

        // 检查满血升级（新增）
        if (this.player.health >= this.player.maxHealth * 0.95) {
          this.sessionData.perfectLevels++;
        }

        if (import.meta.env.DEV) {
          console.log(`[GameEngine] Level up! Now level ${this.player.level}`);
        }
      } else {
        break;
      }
    }

    // 只在升级后触发一次回调
    if (leveledUp && this.onLevelUp) {
      // 播放升级音效
      this.audioSystem.playSound("levelup");

      // 检查是否需要生成Boss（每10级）
      if (this.bossSystem.shouldSpawnBoss(this.player.level)) {
        const boss = this.bossSystem.spawnBoss(
          this.player.level,
          this.player.x,
          this.player.y,
          this.width,
          this.height
        );
        if (boss) {
          this.currentBoss = boss;
          // Boss出现时播放紧张背景音乐
          this.audioSystem.setBossActive(true);
        }
      }

      this.onLevelUp();
    }
  }

  /**
   * 应用技能效果（委托给独立的技能系统）
   * @param skillId 技能ID
   */
  public applySkill(skillId: string): void {
    const success = this.skillSystem.applySkill(skillId, this.player);

    if (!success) {
      console.warn(`[GameEngine] 技能应用失败: ${skillId}`);
      if (this.onError) {
        this.onError(new Error(`Failed to apply skill: ${skillId}`));
      }
    }
  }

  /**
   * 获取技能系统实例（用于外部访问）
   */
  public getSkillSystem(): SkillSystem {
    return this.skillSystem;
  }

  /**
   * 获取音频系统（用于UI控制）
   */
  public getAudioSystem(): AudioSystem {
    return this.audioSystem;
  }

  /**
   * 获取每日挑战系统（新增）
   */
  public getDailyChallengeSystem(): DailyChallengeSystem {
    return this.dailyChallengeSystem;
  }

  /**
   * 获取成就系统（新增）
   */
  public getAchievementSystem(): AchievementSystem {
    return this.achievementSystem;
  }

  /**
   * 获取会话数据（新增）
   */
  public getSessionData(): Readonly<SessionData> {
    return this.sessionData;
  }

  /**
   * 启动游戏循环
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = Date.now();
    // 播放背景音乐
    this.audioSystem.playBackgroundMusic(true);
    // 开局预生成树木，避免角色周围动态刷新造成突兀
    // 预生成2500半径，确保屏幕外至少2屏范围内都有树木
    try {
      const pregenerateRadius = GAME_CONFIG.TREES?.PREGENERATE_RADIUS ?? 2500;
      this.treeSystem.generateTrees(this.player.x, this.player.y, pregenerateRadius);
    } catch (e) {
      console.warn("[GameEngine] 预生成树木失败", e);
    }
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
    // 停止背景音乐
    this.audioSystem.stopBackgroundMusic();
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
    // 更新动画系统（新增 - 让所有角色动起来）
    this.animSystem.update(deltaTime);

    // 更新存活时间
    const survivalTime = Math.floor((now - this.gameStartTime) / 1000);
    this.stats.survivalTime = survivalTime;
    if (this.onStatsUpdate) {
      this.onStatsUpdate(this.stats);
    }

    // 更新树木系统：每500ms检查一次远处树木（提前预加载屏幕外2屏范围）
    if (!this.lastTreeUpdateTime || now - this.lastTreeUpdateTime > 500) {
      this.lastTreeUpdateTime = now;
      this.treeSystem.updateTreesAroundPlayer(this.player.x, this.player.y, 1500);
    }

    // 更新玩家位置
    this.updatePlayerPosition(deltaTime);

    // 生成敌人（无尽地图：基于玩家世界坐标和等级）
    this.enemyManager.spawnEnemy(
      this.width,
      this.height,
      now,
      this.player.x,
      this.player.y,
      this.player.level
    );

    // 更新敌人
    const enemies = this.enemyManager.getEnemies();
    const enemyBullets: Bullet[] = [];
    this.enemyManager.updateEnemies(
      this.player,
      deltaTime,
      this.width,
      this.height,
      now,
      enemyBullets,
      (x, y, r) => !!this.treeSystem.checkCollision(x, y, r)
    );

    // 将敌人生成的子弹添加到对象池（包含距离限制）
    for (const bullet of enemyBullets) {
      this.enemyBulletPool.acquire(
        bullet.x,
        bullet.y,
        bullet.vx,
        bullet.vy,
        bullet.radius,
        bullet.damage,
        false, // 不穿透
        undefined,
        undefined,
        true, // 是敌人子弹
        bullet.startX,
        bullet.startY,
        bullet.maxDistance
      );
    }

    // 处理燃烧DOT伤害（每0.5秒）
    const burnTickInterval = 500; // 0.5秒
    for (const enemy of enemies) {
      if (enemy.burningUntil && now < enemy.burningUntil && enemy.burnDamagePerTick) {
        if (!enemy.lastBurnTick || now - enemy.lastBurnTick >= burnTickInterval) {
          enemy.health -= enemy.burnDamagePerTick;
          enemy.lastBurnTick = now;
          // 燃烧伤害数字和粒子
          this.damageNumbers.add(enemy.x, enemy.y, enemy.burnDamagePerTick, false);
          this.particlePool.createParticles(enemy.x, enemy.y, "#ff4500", 2);
        }
      }
    }

    // 更新Boss
    if (this.currentBoss) {
      this.bossSystem.updateBoss(this.currentBoss, this.player, deltaTime, now, this.width, this.height);

      // Boss技能攻击
      const bossBullets = this.bossSystem.executeBossSkill(
        this.currentBoss,
        this.player,
        now
      );
      // 将Boss子弹添加到对象池（包含距离限制）
      for (const bullet of bossBullets) {
        this.enemyBulletPool.acquire(
          bullet.x,
          bullet.y,
          bullet.vx,
          bullet.vy,
          bullet.radius,
          bullet.damage,
          bullet.pierce,
          bullet.pierceCount,
          bullet.pierceDamageReduction,
          true, // 是敌人子弹
          bullet.startX,
          bullet.startY,
          bullet.maxDistance
        );
      }
    }

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

    // 更新经验球系统（玩家拾取范围跟随玩家属性）
    this.expOrbSystem.setPickupRange(this.player.pickupRange);
    const expCollected = this.expOrbSystem.update(this.player.x, this.player.y, deltaTime);
    if (expCollected > 0) {
      this.player.exp += expCollected;
      // 播放拾取音效
      this.audioSystem.playSound("hit");
      // 处理升级
      this.handleLevelUp();
    }

    // 检查死亡：优先扣命并复活，命数耗尽才结束
    if (this.player.health <= 0) {
      if ((this.player.lives ?? 1) > 1) {
        this.player.lives -= 1;
        this.player.health = this.player.maxHealth;
        this.lastDamageTime = now; // 复活后短暂无敌（沿用伤害冷却）
        // 轻微的复活粒子反馈
        this.particlePool.createParticles(
          this.player.x,
          this.player.y,
          GAME_CONFIG.COLORS.PARTICLE_PLAYER_HIT,
          Math.max(3, GAME_CONFIG.PARTICLE.HIT_PARTICLE_COUNT)
        );
      } else {
        this.stop();
        // 播放游戏结束音效
        this.audioSystem.playSound("gameover");

        // 检查成就（新增：游戏结束时检查）
        const newlyUnlocked = this.achievementSystem.checkAchievements(
          this.stats,
          this.player,
          this.sessionData
        );

        if (newlyUnlocked.length > 0) {
          console.log(`[Achievement] 新解锁 ${newlyUnlocked.length} 个成就！`);
        }

        if (this.onGameOver) {
          this.onGameOver();
        }
      }
    }
  }

  /**
   * 尝试简单的边缘滑动
   * @param currentX 当前X位置
   * @param currentY 当前Y位置
   * @param moveX X轴移动量
   * @param moveY Y轴移动量
   * @param playerRadius 玩家半径
   * @param tree 碰撞的树木
   * @returns 滑动后的位置或null
   */
  private trySimpleSlide(
    currentX: number,
    currentY: number,
    moveX: number,
    moveY: number,
    playerRadius: number,
    tree: any
  ): { x: number; y: number } | null {
    // 计算移动距离
    const moveLength = Math.sqrt(moveX * moveX + moveY * moveY);
    if (moveLength === 0) return null;

    // 计算从树木中心到玩家的方向
    const toPlayerX = currentX - tree.x;
    const toPlayerY = currentY - tree.y;
    const distanceToTree = Math.sqrt(toPlayerX * toPlayerX + toPlayerY * toPlayerY);

    if (distanceToTree === 0) {
      // 玩家正好在树木中心，随机方向推出
      const randomAngle = Math.random() * Math.PI * 2;
      const pushDistance = tree.radius + playerRadius + 2;
      return {
        x: tree.x + Math.cos(randomAngle) * pushDistance,
        y: tree.y + Math.sin(randomAngle) * pushDistance
      };
    }

    // 计算垂直方向（用于滑动）
    const toPlayerNormX = toPlayerX / distanceToTree;
    const toPlayerNormY = toPlayerY / distanceToTree;

    // 垂直于从树木到玩家方向的两个滑动方向
    const slideDir1X = -toPlayerNormY;
    const slideDir1Y = toPlayerNormX;
    const slideDir2X = toPlayerNormY;
    const slideDir2Y = -toPlayerNormX;

    // 选择与移动方向更接近的滑动方向
    const moveDirX = moveX / moveLength;
    const moveDirY = moveY / moveLength;

    const dot1 = slideDir1X * moveDirX + slideDir1Y * moveDirY;
    const dot2 = slideDir2X * moveDirX + slideDir2Y * moveDirY;

    const chosenSlideDirX = dot1 > dot2 ? slideDir1X : slideDir2X;
    const chosenSlideDirY = dot1 > dot2 ? slideDir1Y : slideDir2Y;

    // 尝试滑动移动（较小距离）
    const slideDistance = Math.min(moveLength * 0.3, playerRadius * 0.8);
    const slideX = chosenSlideDirX * slideDistance;
    const slideY = chosenSlideDirY * slideDistance;

    const slideNextX = currentX + slideX;
    const slideNextY = currentY + slideY;

    // 检查滑动位置是否安全
    const slideCollision = this.treeSystem.checkCollision(slideNextX, slideNextY, playerRadius);
    if (!slideCollision) {
      return { x: slideNextX, y: slideNextY };
    }

    // 如果滑动不安全，尝试沿移动方向稍微移动
    const smallMoveDistance = playerRadius * 0.3;
    const smallMoveX = moveDirX * smallMoveDistance;
    const smallMoveY = moveDirY * smallMoveDistance;
    const smallNextX = currentX + smallMoveX;
    const smallNextY = currentY + smallMoveY;

    const smallCollision = this.treeSystem.checkCollision(smallNextX, smallNextY, playerRadius);
    if (!smallCollision) {
      return { x: smallNextX, y: smallNextY };
    }

    return null;
  }



  /**
   * 更新玩家位置
   * 无尽地图模式：无边界限制，玩家可以自由移动
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

      // 简化的移动逻辑：基于方向的碰撞检测
      const playerTreeRadius = this.player.radius * (GAME_CONFIG.COLLISION?.PLAYER_VS_TREE_RADIUS_MULTIPLIER ?? 0.85);

      // 检查移动是否被阻挡
      const blockResult = this.treeSystem.checkPlayerMovementBlock(
        this.player.x,
        this.player.y,
        moveX,
        moveY,
        playerTreeRadius
      );

      if (!blockResult.blocked) {
        // 没有被阻挡，直接移动
        this.player.x += moveX;
        this.player.y += moveY;
      } else {
        // 被阻挡，尝试简单的边缘滑动
        const slideResult = this.trySimpleSlide(this.player.x, this.player.y, moveX, moveY, playerTreeRadius, blockResult.tree);
        if (slideResult) {
          this.player.x = slideResult.x;
          this.player.y = slideResult.y;
        }
        // 如果滑动也失败，保持原位置
      }
    }

    // 相机跟随玩家
    this.camera.follow(this.player.x, this.player.y);
  }

  /**
   * 玩家射击
   * 优化：多弹道时保持精准瞄准，支持瞄准Boss
   */
  private handlePlayerShooting(now: number): void {
    // 使用安全除法避免除零
    const shootInterval = MathUtils.safeDivide(1000, this.player.attackSpeed, 1000);
    if (now - this.lastShotTime < shootInterval) return;

    const enemies = this.enemyManager.getEnemies();
    
    // 没有敌人也没有Boss时不射击
    if (enemies.length === 0 && !this.currentBoss) return;

    let targetX = 0;
    let targetY = 0;
    let minDistanceSq = Infinity;

    // 检查所有敌人
    for (const enemy of enemies) {
      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      const distanceSq = dx * dx + dy * dy;

      if (distanceSq < minDistanceSq) {
        minDistanceSq = distanceSq;
        targetX = enemy.x;
        targetY = enemy.y;
      }
    }

    // 检查Boss（也作为目标）
    if (this.currentBoss) {
      const dx = this.currentBoss.x - this.player.x;
      const dy = this.currentBoss.y - this.player.y;
      const distanceSq = dx * dx + dy * dy;

      if (distanceSq < minDistanceSq) {
        minDistanceSq = distanceSq;
        targetX = this.currentBoss.x;
        targetY = this.currentBoss.y;
      }
    }

    // 没有找到目标
    if (minDistanceSq === Infinity) return;

    if (minDistanceSq <= this.player.attackRange * this.player.attackRange) {
      // 主要瞄准角度
      const angle = Math.atan2(
        targetY - this.player.y,
        targetX - this.player.x
      );

      // 生成弹道角度集合
      const bulletAngles: number[] = [];
      if (this.player.bulletCount === 2) {
        // 双弹道：保证一发直击目标，另一发以更小角度左右交替偏移
        const spread = GAME_CONFIG.BULLET.SPREAD_ANGLE / 2; // 更窄的左右偏移
        bulletAngles.push(angle);
        const side = this.shotToggle ? 1 : -1;
        bulletAngles.push(angle + side * spread);
        this.shotToggle = !this.shotToggle;
      } else {
        for (let i = 0; i < this.player.bulletCount; i++) {
          let spreadAngle = 0;
          if (this.player.bulletCount > 1) {
            const centerOffset = (this.player.bulletCount - 1) / 2;
            const offset = i - centerOffset;
            const maxSpread = GAME_CONFIG.BULLET.SPREAD_ANGLE; // 统一使用配置角度
            spreadAngle = (centerOffset === 0) ? 0 : (offset / centerOffset) * maxSpread;
          }
          bulletAngles.push(angle + spreadAngle);
        }
      }

      const bulletRadius = GAME_CONFIG.BULLET.BASE_RADIUS * this.player.bulletSizeMultiplier;
      for (const bulletAngle of bulletAngles) {
        this.bulletPool.acquire(
          this.player.x,
          this.player.y,
          Math.cos(bulletAngle) * GAME_CONFIG.BULLET.SPEED,
          Math.sin(bulletAngle) * GAME_CONFIG.BULLET.SPEED,
          bulletRadius,
          this.player.attackDamage,
          this.player.hasPierce,
          this.player.hasPierce ? this.player.pierceCount || 1 : 0,
          this.player.pierceDamageReduction || 0.5,
          false // 不是敌人子弹
        );
      }

      this.lastShotTime = now;
      // 播放射击音效
      this.audioSystem.playSound("shoot");
    }
  }

  /**
   * 更新子弹（优化：使用对象池管理）
   */
  private updateBullets(deltaTime: number): void {
    // 无尽地图：基于与玩家距离清理子弹
    const maxBulletDistance = Math.max(this.width, this.height) * 1.5;
    const maxBulletDistanceSq = maxBulletDistance * maxBulletDistance;

    // 更新玩家子弹位置
    const bullets = this.bulletPool.getActive();
    for (const bullet of bullets) {
      bullet.x += bullet.vx * deltaTime;
      bullet.y += bullet.vy * deltaTime;
    }

    // 移除超出范围或碰撞树木的玩家子弹
    this.bulletPool.removeIf((bullet) => {
      // 检查分裂子弹飞行距离是否超过最大限制
      if (bullet.maxDistance !== undefined && bullet.startX !== undefined && bullet.startY !== undefined) {
        const travelDx = bullet.x - bullet.startX;
        const travelDy = bullet.y - bullet.startY;
        const travelDistSq = travelDx * travelDx + travelDy * travelDy;
        if (travelDistSq > bullet.maxDistance * bullet.maxDistance) {
          return true; // 超出最大飞行距离，移除子弹
        }
      }

      // 基于与玩家距离清理（兜底机制）
      const dx = bullet.x - this.player.x;
      const dy = bullet.y - this.player.y;
      const distSq = dx * dx + dy * dy;

      if (distSq > maxBulletDistanceSq) {
        return true;
      }

      // 子弹与树木碰撞：树木阻挡子弹
      const hitTree = this.treeSystem.checkCollision(bullet.x, bullet.y, bullet.radius);
      if (hitTree) {
        // 简单的绿色粒子效果表示命中树木
        this.particlePool.createParticles(
          bullet.x,
          bullet.y,
          "#22c55e",
          GAME_CONFIG.PARTICLE.HIT_PARTICLE_COUNT
        );
        return true;
      }

      return false;
    });

    // 更新敌人子弹
    const maxEnemyBulletDistance = Math.max(this.width, this.height) * 2;
    const maxEnemyBulletDistanceSq = maxEnemyBulletDistance * maxEnemyBulletDistance;

    const enemyBullets = this.enemyBulletPool.getActive();
    for (const bullet of enemyBullets) {
      bullet.x += bullet.vx * deltaTime;
      bullet.y += bullet.vy * deltaTime;
    }

    // 移除超出范围或碰撞树木的敌人子弹
    this.enemyBulletPool.removeIf((bullet) => {
      // 检查子弹飞行距离是否超过最大限制
      if (bullet.maxDistance !== undefined && bullet.startX !== undefined && bullet.startY !== undefined) {
        const travelDx = bullet.x - bullet.startX;
        const travelDy = bullet.y - bullet.startY;
        const travelDistSq = travelDx * travelDx + travelDy * travelDy;
        if (travelDistSq > bullet.maxDistance * bullet.maxDistance) {
          return true; // 超出最大飞行距离，移除子弹
        }
      }

      // 基于与玩家距离清理（兜底机制）
      const dx = bullet.x - this.player.x;
      const dy = bullet.y - this.player.y;
      const distSq = dx * dx + dy * dy;

      if (distSq > maxEnemyBulletDistanceSq) {
        return true;
      }

      // 敌人子弹与树木碰撞：树木阻挡子弹
      const hitTree = this.treeSystem.checkCollision(bullet.x, bullet.y, bullet.radius);
      if (hitTree) {
        this.particlePool.createParticles(
          bullet.x,
          bullet.y,
          "#15803d",
          GAME_CONFIG.PARTICLE.HIT_PARTICLE_COUNT
        );
        return true;
      }

      return false;
    });
  }

  /**
   * 碰撞检测 (已修复子弹穿透问题)
   */
  private handleCollisions(now: number): void {
    const enemies = this.enemyManager.getEnemies();

    // 为没有ID的敌人分配ID
    for (const enemy of enemies) {
      if (enemy.id === undefined) {
        enemy.id = this.enemyIdGenerator.getNextId();
      }
    }

    // 构建空间网格
    this.spatialGrid.clear();
    enemies.forEach((e) => this.spatialGrid.insert(e));

    // 子弹与敌人碰撞 (修复子弹穿透问题)
    const bullets = this.bulletPool.getActive();
    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];
      // 动态查询范围：子弹半径 + 敌人最大半径 + 安全边距
      const queryRadius = bullet.radius +
        GAME_CONFIG.COLLISION.BULLET_QUERY_EXTRA_RADIUS +
        GAME_CONFIG.COLLISION.BULLET_QUERY_SAFETY_MARGIN;
      const nearbyEnemies = this.spatialGrid.getNearby(bullet.x, bullet.y, queryRadius);

      let shouldRemoveBullet = false;

      for (const enemy of nearbyEnemies) {
        // 检查敌人是否已经被这颗子弹击中过
        if (bullet.hitEnemies && bullet.hitEnemies.has(enemy.id!)) {
          continue; // 跳过已经击中过的敌人
        }

        // 使用优化的碰撞检测（距离平方）
        if (MathUtils.checkCircleCollision(
          bullet.x, bullet.y, bullet.radius,
          enemy.x, enemy.y, enemy.radius
        )) {
          // 计算伤害（考虑穿透伤害递减）
          let damage = bullet.damage;

          // 如果是穿透子弹，计算递减伤害
          if (bullet.pierce && bullet.currentPierceCount! > 0) {
            const reductionMultiplier = Math.pow(bullet.pierceDamageReduction!, bullet.currentPierceCount!);
            damage = Math.floor(bullet.originalDamage! * reductionMultiplier);
          }

          // 计算暴击
          let isCrit = false;
          if (Math.random() < this.player.critChance) {
            damage = Math.floor(damage * this.player.critMultiplier);
            isCrit = true;
          }

          // 冰冻射击伤害加成
          if (this.player.hasFrostShot && this.player.frostDamageBonus) {
            damage = Math.floor(damage * (1 + this.player.frostDamageBonus));
          }

          // 火焰攻击伤害加成
          if (this.player.hasFlameAttack && this.player.flameDamageBonus) {
            damage = Math.floor(damage * (1 + this.player.flameDamageBonus));
          }

          // 遇强则强：额外附带生命值百分比伤害
          if (this.player.strengthBonus) {
            const bonusDamage = Math.floor(this.player.health * this.player.strengthBonus);
            damage += bonusDamage;
          }

          // 应用伤害
          enemy.health -= damage;
          this.damageNumbers.add(enemy.x, enemy.y, damage, isCrit);

          // 冰冻效果：击中后冻结敌人
          if (this.player.hasFrostShot && this.player.frostDuration) {
            enemy.frozenUntil = Date.now() + this.player.frostDuration;
            // 冰冻粒子效果
            this.particlePool.createParticles(enemy.x, enemy.y, "#00bfff", 4);
          }

          // 燃烧效果：击中后施加燃烧DOT
          if (this.player.hasFlameAttack && this.player.flameBurnDuration) {
            const now = Date.now();
            enemy.burningUntil = now + this.player.flameBurnDuration;
            enemy.burnDamagePerTick = Math.floor(this.player.attackDamage * (this.player.flameBurnDamage || 0.1));
            enemy.lastBurnTick = now;
            // 燃烧粒子效果
            this.particlePool.createParticles(enemy.x, enemy.y, "#ff4500", 4);
          }

          // 创建粒子效果（根据当前效果选择颜色）
          let hitColor = GAME_CONFIG.COLORS.PARTICLE_ENEMY_HIT;
          if (this.player.hasFlameAttack) hitColor = "#ff6600";
          else if (this.player.hasFrostShot) hitColor = "#87ceeb";
          
          this.particlePool.createParticles(
            enemy.x,
            enemy.y,
            hitColor,
            isCrit ? GAME_CONFIG.PARTICLE.HIT_PARTICLE_COUNT * 2 : GAME_CONFIG.PARTICLE.HIT_PARTICLE_COUNT
          );

          // 播放击中音效
          this.audioSystem.playSound("hit");

          // 记录敌人已被击中
          if (bullet.hitEnemies) {
            bullet.hitEnemies.add(enemy.id!);
          }

          // 处理穿透逻辑
          if (bullet.pierce) {
            bullet.currentPierceCount!++;

            // 检查是否达到穿透上限（> 而非 >=，确保能穿透pierceCount个敌人）
            if (bullet.currentPierceCount !== undefined && bullet.pierceCount !== undefined && bullet.currentPierceCount > bullet.pierceCount) {
              shouldRemoveBullet = true;
            }
          } else {
            // 非穿透子弹击中后立即消失
            shouldRemoveBullet = true;
          }

          // 如果子弹应该消失，跳出循环
          if (shouldRemoveBullet) {
            break;
          }
        }
      }

      // 检查子弹与Boss碰撞
      if (!shouldRemoveBullet && this.currentBoss) {
        if (MathUtils.checkCircleCollision(
          bullet.x, bullet.y, bullet.radius,
          this.currentBoss.x, this.currentBoss.y, this.currentBoss.radius
        )) {
          let damage = bullet.damage;
          let isCrit = false;

          // Boss暴击
          if (Math.random() < this.player.critChance) {
            damage = Math.floor(damage * this.player.critMultiplier);
            isCrit = true;
          }

          // 冰冻射击伤害加成
          if (this.player.hasFrostShot && this.player.frostDamageBonus) {
            damage = Math.floor(damage * (1 + this.player.frostDamageBonus));
          }

          // 火焰攻击伤害加成
          if (this.player.hasFlameAttack && this.player.flameDamageBonus) {
            damage = Math.floor(damage * (1 + this.player.flameDamageBonus));
          }

          // 遇强则强：额外附带生命值百分比伤害
          if (this.player.strengthBonus) {
            const bonusDamage = Math.floor(this.player.health * this.player.strengthBonus);
            damage += bonusDamage;
          }

          this.currentBoss.health -= damage;
          this.damageNumbers.add(this.currentBoss.x, this.currentBoss.y, damage, isCrit);

          // 粒子颜色根据buff类型
          let hitColor = GAME_CONFIG.COLORS.PARTICLE_ENEMY_HIT;
          if (this.player.hasFlameAttack) hitColor = "#ff6600";
          else if (this.player.hasFrostShot) hitColor = "#87ceeb";

          this.particlePool.createParticles(
            this.currentBoss.x,
            this.currentBoss.y,
            hitColor,
            GAME_CONFIG.PARTICLE.HIT_PARTICLE_COUNT * 2
          );

          this.audioSystem.playSound("hit");
          shouldRemoveBullet = true;

          // 检查Boss是否被击败
          if (this.currentBoss.health <= 0) {
            this.particlePool.createParticles(
              this.currentBoss.x,
              this.currentBoss.y,
              GAME_CONFIG.COLORS.PARTICLE_ENEMY_DEATH,
              GAME_CONFIG.PARTICLE.DEATH_PARTICLE_COUNT * 3
            );
            this.stats.killCount++;
            // 应用每日挑战的分数倍数修正（新增）
            const baseScore = GAME_CONFIG.LEVELING.SCORE_PER_BOSS_KILL;
            const challengeScoreMultiplier = this.dailyChallengeSystem.getScoreMultiplier();
            this.stats.score += Math.ceil(baseScore * challengeScoreMultiplier);
            // Boss死亡生成大量经验球
            // 应用每日挑战的经验倍数修正（新增）
            const challengeExpMultiplier = this.dailyChallengeSystem.getExpMultiplier();
            const bossExpTotal = GAME_CONFIG.LEVELING.EXP_PER_KILL *
              (GAME_CONFIG.LEVELING.BOSS_EXP_REWARD_MULTIPLIER ?? 50) * challengeExpMultiplier;
            // 分成多个经验球散落
            const orbCount = 10;
            for (let j = 0; j < orbCount; j++) {
              const angle = (j / orbCount) * Math.PI * 2;
              const distance = 30 + Math.random() * 50;
              const orbX = this.currentBoss.x + Math.cos(angle) * distance;
              const orbY = this.currentBoss.y + Math.sin(angle) * distance;
              this.expOrbSystem.spawnOrb(orbX, orbY, Math.ceil(bossExpTotal / orbCount));
            }
            this.audioSystem.playSound("kill");
            this.bossSystem.removeBoss();
            this.currentBoss = null;
            // 停止Boss音乐，恢复普通背景音乐
            this.audioSystem.setBossActive(false);
          }
        }
      }

      // 移除应该消失的子弹
      if (shouldRemoveBullet) {
        this.bulletPool.release(bullet);
        bullets.splice(i, 1);
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

        // 敌人死亡触发分裂子弹（向四周发射3颗子弹）
        if (this.player.hasAOEExplosion) {
          const splitDamage = Math.floor(this.player.attackDamage * this.player.aoeDamage);
          const splitRange = this.player.aoeRadius;
          const bulletCount = 3;
          const bulletSpeed = 4;
          // 使用与玩家子弹相同的大小
          const bulletRadius = GAME_CONFIG.BULLET.BASE_RADIUS * this.player.bulletSizeMultiplier;

          // 向3个方向发射子弹（均匀分布360度）
          for (let b = 0; b < bulletCount; b++) {
            const angle = (b / bulletCount) * Math.PI * 2 + Math.random() * 0.5; // 略微随机偏移
            const vx = Math.cos(angle) * bulletSpeed;
            const vy = Math.sin(angle) * bulletSpeed;

            // 添加分裂子弹到玩家子弹池（会伤害敌人）
            this.bulletPool.acquire(
              enemy.x,
              enemy.y,
              vx,
              vy,
              bulletRadius,
              splitDamage,
              false, // 不穿透
              undefined,
              undefined,
              false, // 不是敌人子弹
              enemy.x, // 起始位置
              enemy.y,
              splitRange // 最大飞行距离
            );
          }

          // 分裂效果粒子
          this.particlePool.createParticles(
            enemy.x,
            enemy.y,
            "#ffaa00", // 橙色粒子
            6
          );
        }

        this.stats.killCount++;
        // 增加无伤击杀计数（新增）
        this.sessionData.killsWithoutTakingDamage++;
        // 应用每日挑战的分数倍数修正（新增）
        const baseScore = 10;
        const challengeScoreMultiplier = this.dailyChallengeSystem.getScoreMultiplier();
        this.stats.score += Math.ceil(baseScore * challengeScoreMultiplier);

        // 播放击杀音效
        this.audioSystem.playSound("kill");

        if (this.player.hasLifeSteal) {
          const healAmount = this.player.lifeStealAmount ?? GAME_CONFIG.SKILLS.LIFE_STEAL_AMOUNT;
          this.player.health = Math.min(
            this.player.health + healAmount,
            this.player.maxHealth
          );
        }

        // 生成经验球（不再直接给经验）
        // 应用每日挑战的经验倍数修正（新增）
        const baseExp = GAME_CONFIG.LEVELING.EXP_PER_KILL;
        const challengeExpMultiplier = this.dailyChallengeSystem.getExpMultiplier();
        const finalExp = Math.ceil(baseExp * challengeExpMultiplier);
        this.expOrbSystem.spawnOrb(enemy.x, enemy.y, finalExp);

        enemies.splice(i, 1);
      }
    }

    this.enemyManager.setEnemies(enemies);

    // 添加游戏开始后的短暂保护期
    const timeSinceStart = now - this.gameStartTime;
    const hasStartupProtection = timeSinceStart < GAME_CONFIG.PLAYER.STARTUP_PROTECTION_TIME;

    // 敌人子弹与玩家碰撞 (优化: 使用距离平方)
    const enemyBullets = this.enemyBulletPool.getActive();
    if (!hasStartupProtection) {
      for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];

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

          this.enemyBulletPool.release(bullet);
          enemyBullets.splice(i, 1);
        }
      }
    }

    // 玩家与敌人碰撞 (优化: 使用空间网格和距离平方)

    if (!hasStartupProtection) {
      const playerEnemyRadius = this.player.radius * (GAME_CONFIG.COLLISION?.PLAYER_VS_ENEMY_PLAYER_RADIUS_MULTIPLIER ?? 0.7) * 0.67; // 减少33%
      const nearbyEnemiesForPlayer = this.spatialGrid.getNearby(
        this.player.x,
        this.player.y,
        playerEnemyRadius + 30 // 缩小后的玩家半径 + 安全边距
      );

      for (const enemy of nearbyEnemiesForPlayer) {
        // 使用优化的碰撞检测
        if (MathUtils.checkCircleCollision(
          this.player.x, this.player.y, playerEnemyRadius,
          enemy.x, enemy.y, enemy.radius * (GAME_CONFIG.COLLISION?.ENEMY_VS_PLAYER_ENEMY_RADIUS_MULTIPLIER ?? 0.85) * 0.67 // 减少33%
        )) {
          if (
            now - this.lastDamageTime >
            GAME_CONFIG.PLAYER.DAMAGE_COOLDOWN
          ) {
            const typeConfig = GAME_CONFIG.ENEMY.TYPES[enemy.type];
            const baseDamage = typeConfig.damage;
            // 怪物伤害随等级每级增加22%（乘法增长）
            const levelMultiplier = Math.pow(
              GAME_CONFIG.ENEMY.DAMAGE_PER_LEVEL_MULTIPLIER ?? 1.22,
              this.player.level - 1
            );
            const scaledDamage = baseDamage * levelMultiplier;

            this.applyDamage(scaledDamage);

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

      // 玩家与Boss碰撞
      if (this.currentBoss) {
        if (MathUtils.checkCircleCollision(
          this.player.x, this.player.y, this.player.radius,
          this.currentBoss.x, this.currentBoss.y, this.currentBoss.radius
        )) {
          if (
            now - this.lastDamageTime >
            GAME_CONFIG.PLAYER.DAMAGE_COOLDOWN
          ) {
            // Boss伤害基于Boss类型配置
            const bossDamage = this.currentBoss.maxHealth * 0.01; // Boss血量的1%
            this.applyDamage(bossDamage);

            this.lastDamageTime = now;
            this.particlePool.createParticles(
              this.player.x,
              this.player.y,
              GAME_CONFIG.COLORS.PARTICLE_PLAYER_HIT,
              GAME_CONFIG.PARTICLE.HIT_PARTICLE_COUNT * 2
            );
          }
        }
      }
    }
  }

  /**
   * 应用伤害到玩家（修复：正确处理护盾溢出）
   * 新增：生命系统、闪烁无敌、音效
   */
  private applyDamage(damage: number): void {
    // 检查是否处于无敌状态
    const now = Date.now();
    if (this.isInvincible && now < this.invincibleEndTime) {
      return; // 无敌期间不受伤
    }

    // 应用护盾和伤害
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

    // 检查是否失去生命（生命值归零）
    if (this.player.health <= 0) {
      if (this.player.lives > 1) {
        // 失去一条生命
        this.player.lives--;
        this.player.health = this.player.maxHealth; // 恢复生命值
        this.player.shield = this.player.maxShield; // 恢复护盾

        // 触发3秒无敌状态
        this.isInvincible = true;
        this.invincibleEndTime = now + 3000; // 3秒后结束无敌

        // 播放失去生命音效
        this.audioSystem.playSound("life_lost"); // 新增音效

        // 粒子特效：更华丽的死亡粒子
        this.particlePool.createParticles(
          this.player.x,
          this.player.y,
          GAME_CONFIG.COLORS.PARTICLE_PLAYER_HIT,
          GAME_CONFIG.PARTICLE.DEATH_PARTICLE_COUNT
        );
      } else {
        // 最后一条命，游戏结束
        this.player.lives = 0;
        this.player.health = 0;
      }
    } else {
      // 普通受伤，播放受伤音效
      this.audioSystem.playSound("damage");
    }

    // 重置无伤击杀计数
    this.sessionData.killsWithoutTakingDamage = 0;
  }

  /**
   * 渲染游戏
   * 无尽地图模式：使用相机变换渲染世界
   */
  private render(now: number): void {

    // 绘制无限滚动背景（不需要变换）
    this.backgroundRenderer.draw(this.ctx, this.camera.x, this.camera.y);

    // 应用相机变换（世界坐标 -> 屏幕坐标）
    this.camera.applyTransform(this.ctx);

    // 渲染世界空间的对象
    this.renderTrees();
    this.renderEnemies();
    this.renderBoss();
    this.renderBullets();
    this.renderPlayer();
    this.weaponSystem.renderWeapons(this.player, this.ctx, now);
    this.particlePool.render(this.ctx);
    this.expOrbSystem.render(this.ctx); // 渲染经验球
    this.damageNumbers.render(this.ctx);

    // 恢复变换
    this.camera.restoreTransform(this.ctx);

    // 渲染屏幕空间的UI（HUD和性能监控）
    this.renderHUD();
    this.performanceMonitor.render(this.ctx);
  }

  /**
   * 渲染树木 - 异星风格像素植物（增强像素感）
   */
  private renderTrees(): void {
    this.ctx.save();

    const pixelSize = 4;
    // 辅助函数：强制对齐到像素网格
    const align = (v: number) => Math.floor(v / pixelSize) * pixelSize;
    
    const trees = this.treeSystem.getTreesInArea(this.player.x, this.player.y, 900);
    
    for (const tree of trees) {
      const shade = tree.shade ?? 1;
      const r = tree.radius;
      
      // 基于位置的随机种子
      const seed = Math.abs(tree.x * 7919 + tree.y * 7907) | 0;
      const rand = (n: number) => {
        const t = seed + n;
        return ((Math.sin(t) * 43758.5453123) % 1 + 1) % 1;
      };

      // 决定异星植物类型 (0: 扭曲荆棘, 1: 发光孢子, 2: 晶体矿石)
      // 40% 荆棘, 40% 孢子, 20% 矿石
      const typeRand = rand(0);
      const alienType = typeRand < 0.40 ? 0 : (typeRand < 0.80 ? 1 : 2);
      
      const adjustColor = (hex: string) => this.adjustTreeColor(hex, shade);

      // 阴影通用绘制（像素化椭圆）
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      const shadowW = align(r * 2.2);
      const shadowH = align(r * 1.2);
      this.ctx.fillRect(align(tree.x - shadowW/2 + 4), align(tree.y - shadowH/2 + 6), shadowW, shadowH);

      if (alienType === 0) {
        // ==================== 扭曲荆棘 (Twisted Thorns) ====================
        const colors = {
          outline: "#2d0a31",
          base: "#4a1252",
          mid: "#7b1fa2",
          light: "#ab47bc",
          highlight: "#e1bee7",
        };

        // 使用像素块构建扭曲触手
        const tentacleCount = 4 + Math.floor(rand(1) * 3);
        for (let i = 0; i < tentacleCount; i++) {
           const baseAngle = (i / tentacleCount) * Math.PI * 2;
           let cx = tree.x;
           let cy = tree.y;
           const length = r * (1.2 + rand(i+10) * 0.5);
           const segs = 8;
           
           for (let j = 0; j < segs; j++) {
              const progress = j / segs;
              const width = Math.max(pixelSize, (1 - progress) * r * 0.5);
              const angle = baseAngle + Math.sin(progress * 3 + rand(i)) * 1.0;
              
              cx += Math.cos(angle) * (length / segs);
              cy += Math.sin(angle) * (length / segs);
              
              // 绘制一段像素块
              const x = align(cx);
              const y = align(cy);
              const w = align(width);
              
              this.ctx.fillStyle = adjustColor(colors.outline);
              this.ctx.fillRect(x - pixelSize, y - pixelSize, w + pixelSize*2, w + pixelSize*2); // 描边
              
              this.ctx.fillStyle = adjustColor(j % 2 === 0 ? colors.base : colors.mid);
              this.ctx.fillRect(x, y, w, w);
              
              // 尖刺装饰
              if (rand(i*10+j) > 0.7) {
                 const spikeLen = pixelSize * 2;
                 const sx = x + (rand(j) > 0.5 ? w : -spikeLen);
                 const sy = y + (rand(j+1) > 0.5 ? w : -spikeLen);
                 this.ctx.fillStyle = adjustColor(colors.light);
                 this.ctx.fillRect(sx, sy, spikeLen, spikeLen);
              }
           }
        }

      } else if (alienType === 1) {
        // ==================== 发光孢子 (Glowing Spores) ====================
        const colors = {
          outline: "#002f35",
          base: "#004d40",
          mid: "#00897b",
          light: "#4db6ac",
          highlight: "#b2dfdb",
        };

        // 绘制像素化菌盖
        const drawPixelCircle = (cx: number, cy: number, radius: number, color: string) => {
           const gridR = Math.ceil(radius / pixelSize);
           this.ctx.fillStyle = adjustColor(color);
           for(let dx = -gridR; dx <= gridR; dx++) {
              for(let dy = -gridR; dy <= gridR; dy++) {
                 if (dx*dx + dy*dy <= gridR*gridR) {
                    this.ctx.fillRect(align(cx + dx * pixelSize), align(cy + dy * pixelSize), pixelSize, pixelSize);
                 }
              }
           }
        };

        // 主菌盖
        drawPixelCircle(tree.x, tree.y, r, colors.outline);
        drawPixelCircle(tree.x, tree.y - pixelSize, r - pixelSize, colors.base);
        
        // 随机小菌盖
        const smallCount = 3 + Math.floor(rand(2) * 3);
        for (let i = 0; i < smallCount; i++) {
            const angle = rand(i*20) * Math.PI * 2;
            const dist = r * 0.6;
            const sr = r * 0.4 * (0.8 + rand(i));
            const sx = tree.x + Math.cos(angle) * dist;
            const sy = tree.y + Math.sin(angle) * dist;
            
            drawPixelCircle(sx, sy, sr, colors.outline);
            drawPixelCircle(sx, sy - pixelSize, sr - pixelSize, colors.mid);
            
            // 发光点
            if (rand(i*30) > 0.3) {
               this.ctx.fillStyle = adjustColor(colors.highlight);
               this.ctx.fillRect(align(sx), align(sy - pixelSize), pixelSize, pixelSize);
            }
        }
        
        // 主发光点
        this.ctx.fillStyle = adjustColor(colors.highlight);
        this.ctx.fillRect(align(tree.x - pixelSize), align(tree.y - r * 0.5), pixelSize * 3, pixelSize * 2);

      } else if (alienType === 2) {
        // ==================== 橙色水晶矿石 (Orange Crystal Clusters) - 顶视图像素风格 ====================
        const colors = {
          outline: "#3e2215",    // 深棕色描边
          darkBase: "#8b4513",   // 深橙棕（阴影面）
          base: "#d2691e",       // 基础橙色
          mid: "#ff8c00",        // 中间橙色
          light: "#ffa500",      // 亮橙色
          highlight: "#ffd700",  // 高光金黄色
          glow: "#ffcc66",       // 发光色
        };

        // 绘制像素化六边形晶体尖端（从顶部看是六边形）
        const drawCrystalTop = (cx: number, cy: number, size: number, rotOffset: number) => {
          const s = Math.max(pixelSize * 2, size);
          const halfS = s / 2;
          
          // 六边形顶视图：6个切面围绕中心
          for (let face = 0; face < 6; face++) {
            const angle1 = rotOffset + (face / 6) * Math.PI * 2;
            const angle2 = rotOffset + ((face + 1) / 6) * Math.PI * 2;
            
            // 外边缘点
            const x1 = cx + Math.cos(angle1) * halfS;
            const y1 = cy + Math.sin(angle1) * halfS;
            const x2 = cx + Math.cos(angle2) * halfS;
            const y2 = cy + Math.sin(angle2) * halfS;
            
            // 根据切面朝向选择颜色（模拟光照）
            let faceColor: string;
            if (face === 0 || face === 5) {
              faceColor = colors.light;      // 顶部切面（亮）
            } else if (face === 1 || face === 2) {
              faceColor = colors.mid;        // 右侧切面
            } else {
              faceColor = colors.darkBase;   // 左侧切面（暗）
            }
            
            // 绘制三角形切面
            this.ctx.fillStyle = adjustColor(faceColor);
            this.ctx.beginPath();
            this.ctx.moveTo(align(cx), align(cy));
            this.ctx.lineTo(align(x1), align(y1));
            this.ctx.lineTo(align(x2), align(y2));
            this.ctx.closePath();
            this.ctx.fill();
          }
          
          // 描边轮廓
          this.ctx.strokeStyle = adjustColor(colors.outline);
          this.ctx.lineWidth = pixelSize;
          this.ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = rotOffset + (i / 6) * Math.PI * 2;
            const px = cx + Math.cos(angle) * halfS;
            const py = cy + Math.sin(angle) * halfS;
            if (i === 0) this.ctx.moveTo(align(px), align(py));
            else this.ctx.lineTo(align(px), align(py));
          }
          this.ctx.closePath();
          this.ctx.stroke();
          
          // 中心高光点（像素块）
          this.ctx.fillStyle = adjustColor(colors.highlight);
          this.ctx.fillRect(align(cx - pixelSize), align(cy - pixelSize), pixelSize * 2, pixelSize * 2);
          
          // 添加小像素高光
          this.ctx.fillStyle = adjustColor(colors.glow);
          this.ctx.fillRect(align(cx - pixelSize * 2), align(cy - pixelSize * 0.5), pixelSize, pixelSize);
        };

        // 主水晶簇：中心一个大晶体 + 周围4-6个小晶体
        const mainSize = r * 0.7;
        const crystalCount = 4 + Math.floor(rand(2) * 3); // 4-6个
        
        // 先绘制周围的小晶体（底层）
        for (let i = 0; i < crystalCount; i++) {
          const angle = (i / crystalCount) * Math.PI * 2 + rand(i) * 0.5;
          const dist = r * (0.5 + rand(i + 5) * 0.3);
          const cx = tree.x + Math.cos(angle) * dist;
          const cy = tree.y + Math.sin(angle) * dist;
          const size = mainSize * (0.4 + rand(i + 10) * 0.3);
          const rot = rand(i + 20) * Math.PI;
          
          drawCrystalTop(cx, cy, size, rot);
        }
        
        // 最后绘制中心大晶体（顶层）
        drawCrystalTop(tree.x, tree.y, mainSize, rand(100) * Math.PI / 3);
        
        // 底部岩石基座（像素块）
        const baseRadius = r * 0.3;
        this.ctx.fillStyle = adjustColor("#2a1a10");
        for (let i = 0; i < 5; i++) {
          const angle = rand(i * 50) * Math.PI * 2;
          const dist = rand(i * 60) * baseRadius;
          const bx = tree.x + Math.cos(angle) * dist;
          const by = tree.y + Math.sin(angle) * dist;
          const bs = pixelSize * (2 + Math.floor(rand(i * 70) * 2));
          this.ctx.fillRect(align(bx), align(by), bs, bs);
        }
      }
    }

    this.ctx.restore();
  }

  /**
   * 调整树木颜色的深浅
   */
  private adjustTreeColor(baseColor: string, factor: number): string {
    const r = parseInt(baseColor.slice(1, 3), 16);
    const g = parseInt(baseColor.slice(3, 5), 16);
    const b = parseInt(baseColor.slice(5, 7), 16);

    const adjustedR = Math.min(255, Math.floor(r * factor));
    const adjustedG = Math.min(255, Math.floor(g * factor));
    const adjustedB = Math.min(255, Math.floor(b * factor));

    return `#${adjustedR.toString(16).padStart(2, '0')}${adjustedG.toString(16).padStart(2, '0')}${adjustedB.toString(16).padStart(2, '0')}`;
  }

  /**
   * 渲染敌人 - 像素风格 + 真正的肢体动画（新增：手脚摆动、眼睛转动、身体起伏）
   */
  private renderEnemies(): void {
    const enemies = this.enemyManager.getEnemies();

    for (const enemy of enemies) {
      this.ctx.save();

      // ==================== 新增：真正的肢体动画 ====================

      // 使用新的动画精灵渲染器 - 让敌人的手脚真正动起来
      const animTime = this.animSystem.getTime();

      // 仅应用轻微的身体起伏（不旋转）
      const bodyBounce = this.animSystem.getEnemyBodyBounce(enemy.type);
      const drawX = enemy.x;
      const drawY = enemy.y + bodyBounce * 0.5; // 减小上下移动幅度

      // 渲染带动画的敌人精灵（手脚会动）
      animatedSpriteRenderer.renderAnimatedEnemy(
        this.ctx,
        drawX,
        drawY,
        enemy.type,
        animTime,
        4 // 像素大小
      );

      // 冰冻特效：蓝色染色 + 飘落雪花（范围与敌人大小一致）
      if (enemy.frozenUntil && Date.now() < enemy.frozenUntil) {
        const now = Date.now();
        const r = enemy.radius;
        
        // 蓝色染色覆盖（让怪物看起来被冻住）
        this.ctx.fillStyle = "rgba(100, 180, 255, 0.35)";
        this.ctx.beginPath();
        this.ctx.arc(enemy.x, enemy.y, r, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 飘落的小雪花粒子（范围限制在敌人范围内）
        for (let i = 0; i < 2; i++) {
          const phase = ((now * 0.0015 + i * 120) % 1);
          const px = enemy.x + Math.sin(now * 0.002 + i * 2) * r * 0.3;
          const py = enemy.y - r * 0.4 + phase * r * 0.8;
          
          // 雪花大小随下落渐小
          const size = 2 * (1 - phase * 0.5);
          const alpha = 0.7 * (1 - phase * 0.3);
          
          this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          this.ctx.fillRect(px - size / 2, py - size / 2, size, size);
        }
      }

      // 燃烧特效：简单的跳动小火苗粒子
      if (enemy.burningUntil && Date.now() < enemy.burningUntil) {
        const now = Date.now();
        const r = enemy.radius;
        
        // 小火苗粒子（向上飘动）
        for (let i = 0; i < 5; i++) {
          const seed = i * 137.5; // 黄金角分布
          const lifePhase = ((now * 0.003 + seed) % 1);
          
          // 粒子位置：从敌人边缘向上飘
          const startX = enemy.x + Math.sin(seed) * r * 0.6;
          const px = startX + Math.sin(now * 0.005 + i) * 3; // 左右摇摆
          const py = enemy.y - lifePhase * r * 1.2; // 向上飘动
          
          // 粒子大小随生命周期变化
          const size = 2 + (1 - lifePhase) * 2;
          
          // 颜色：黄色→橙色（随生命周期）
          const alpha = 0.8 * (1 - lifePhase * 0.5);
          const green = Math.floor(180 - lifePhase * 100);
          this.ctx.fillStyle = `rgba(255, ${green}, 30, ${alpha})`;
          this.ctx.fillRect(px - size / 2, py - size / 2, size, size);
        }
      }

      // 像素风格血条
      const barWidth = enemy.radius * 2.5;
      const barHeight = 4;
      const barY = enemy.y - enemy.radius - 10;
      if (GAME_CONFIG.RENDERING.SHOW_HEALTH_BARS) {
        this.pixelRenderer.drawPixelHealthBar(
          enemy.x,
          barY,
          barWidth,
          barHeight,
          enemy.health,
          enemy.maxHealth,
          "#1a1a1a",
          "#ef4444"
        );
      }

      this.ctx.restore();
    }
  }

  /**
   * 渲染Boss - 像素风格
   */
  private renderBoss(): void {
    if (!this.currentBoss) return;

    this.ctx.save();

    const boss = this.currentBoss;
    const bossInfo = BOSS_TYPES[boss.type];
    const bossColor = bossInfo?.color || "#ef4444";
    const r = boss.radius;
    const pixelSize = 4;
    const align = (v: number) => Math.floor(v / pixelSize) * pixelSize;

    // ==================== 新增：Boss动画 ====================

    // 1. 深沉的呼吸动画 - 缓慢的缩放效果
    const breathingScale = this.animSystem.getBossBreathingScale();

    // 2. 跳跃时的缩放效果（原有）
    const jumpScale = boss.isJumping ? 0.7 : 1;

    // 3. 攻击前摇 - 蓄力时的颤抖（基于跳跃状态判断）
    const isPreparing = boss.isJumping;
    const attackShake = this.animSystem.getBossAttackShake(isPreparing);

    // 4. 攻击冲击 - 攻击时的前冲（基于跳跃状态判断）
    const isAttacking = boss.isJumping;
    const attackLunge = this.animSystem.getBossAttackLunge(isAttacking);

    // 5. 愤怒模式 - 红色闪烁（基于血量比例判断）
    const healthPercent = boss.health / boss.maxHealth;
    const isEnraged = healthPercent < 0.3; // 血量低于30%时愤怒
    const enragedFlash = this.animSystem.getBossEnragedFlash(isEnraged);

    // 组合所有缩放效果
    const totalScale = breathingScale * jumpScale * (1 + attackShake);
    const drawR = r * totalScale;

    // 应用Boss位置的动画偏移
    const drawX = boss.x + attackLunge;
    const drawY = boss.y;

    // 移动到Boss位置并应用缩放
    this.ctx.translate(drawX, drawY);
    this.ctx.scale(totalScale, totalScale);
    this.ctx.translate(-drawX, -drawY); // 保持原点

    // 1. 阴影
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    this.ctx.beginPath();
    this.ctx.ellipse(align(boss.x + 4), align(boss.y + drawR * 0.8), drawR * 0.9, drawR * 0.4, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // 2. Boss主体 - 像素化八边形
    const darkColor = this.adjustBossColor(bossColor, 0.6);
    const lightColor = this.adjustBossColor(bossColor, 1.3);

    // 主体填充
    this.ctx.fillStyle = bossColor;
    this.ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 - Math.PI / 8;
      const px = boss.x + Math.cos(angle) * drawR;
      const py = boss.y + Math.sin(angle) * drawR;
      if (i === 0) this.ctx.moveTo(align(px), align(py));
      else this.ctx.lineTo(align(px), align(py));
    }
    this.ctx.closePath();
    this.ctx.fill();

    // 描边
    this.ctx.strokeStyle = darkColor;
    this.ctx.lineWidth = pixelSize;
    this.ctx.stroke();

    // 3. 内部纹理 - 像素块
    this.ctx.fillStyle = darkColor;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const dist = drawR * 0.5;
      const px = boss.x + Math.cos(angle) * dist;
      const py = boss.y + Math.sin(angle) * dist;
      this.ctx.fillRect(align(px), align(py), pixelSize * 2, pixelSize * 2);
    }

    // 4. 眼睛 - 两个发光的像素块
    const eyeOffset = drawR * 0.3;
    const eyeY = boss.y - drawR * 0.2;
    // 左眼
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(align(boss.x - eyeOffset - pixelSize), align(eyeY), pixelSize * 3, pixelSize * 3);
    this.ctx.fillStyle = "#ff0000";
    this.ctx.fillRect(align(boss.x - eyeOffset), align(eyeY + pixelSize), pixelSize, pixelSize);
    // 右眼
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(align(boss.x + eyeOffset - pixelSize), align(eyeY), pixelSize * 3, pixelSize * 3);
    this.ctx.fillStyle = "#ff0000";
    this.ctx.fillRect(align(boss.x + eyeOffset), align(eyeY + pixelSize), pixelSize, pixelSize);

    // 5. 高光
    this.ctx.fillStyle = lightColor;
    this.ctx.fillRect(align(boss.x - drawR * 0.4), align(boss.y - drawR * 0.6), pixelSize * 2, pixelSize);
    this.ctx.fillRect(align(boss.x - drawR * 0.5), align(boss.y - drawR * 0.4), pixelSize, pixelSize * 2);

    // 愤怒模式红色闪烁（新增）
    if (enragedFlash > 0) {
      this.ctx.fillStyle = `rgba(255, 0, 0, ${enragedFlash})`;
      this.ctx.fillRect(align(boss.x - drawR), align(boss.y - drawR), drawR * 2, drawR * 2);
    }

    // 恢复变换矩阵（在血条渲染之前）
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);

    // 6. Boss血条
    const barWidth = r * 3;
    const barHeight = 8;
    const barY = boss.y - r - 20;
    if (GAME_CONFIG.RENDERING.SHOW_HEALTH_BARS) {
      this.pixelRenderer.drawPixelHealthBar(
        boss.x,
        barY,
        barWidth,
        barHeight,
        boss.health,
        boss.maxHealth,
        "#1a1a1a",
        bossColor
      );
    }

    this.ctx.restore();
  }

  /**
   * 调整Boss颜色明暗
   */
  private adjustBossColor(hex: string, factor: number): string {
    const r = Math.min(255, Math.floor(parseInt(hex.slice(1, 3), 16) * factor));
    const g = Math.min(255, Math.floor(parseInt(hex.slice(3, 5), 16) * factor));
    const b = Math.min(255, Math.floor(parseInt(hex.slice(5, 7), 16) * factor));
    return `rgb(${r},${g},${b})`;
  }
  /**
   * 渲染子弹 - 像素风格
   */
  private renderBullets(): void {
    this.ctx.save();
    this.ctx.imageSmoothingEnabled = false;

    // 渲染玩家子弹 - 像素风格圆形
    for (const bullet of this.bulletPool.getActive()) {
      this.pixelRenderer.drawPixelCircle(
        bullet.x,
        bullet.y,
        bullet.radius,
        GAME_CONFIG.COLORS.BULLET_GRADIENT_START,
        GAME_CONFIG.COLORS.BULLET_GRADIENT_END
      );
    }

    // 渲染敌人子弹 - 像素风格圆形
    for (const bullet of this.enemyBulletPool.getActive()) {
      this.pixelRenderer.drawPixelCircle(
        bullet.x,
        bullet.y,
        bullet.radius,
        "#a855f7",
        "#7c3aed"
      );
    }

    this.ctx.restore();
  }

  /**
   * 渲染玩家 - 像素风格 + 真正的肢体动画（新增：手臂摆动、呼吸起伏）
   */
  private renderPlayer(): void {
    this.ctx.save();

    // 检查是否处于无敌状态（新增：闪烁效果）
    const now = Date.now();
    if (this.isInvincible && now < this.invincibleEndTime) {
      // 快速闪烁：每100ms切换一次可见性
      const blinkPhase = Math.floor(now / 100) % 2;
      if (blinkPhase === 0) {
        this.ctx.globalAlpha = 0.3; // 半透明
      }
    }

    // ==================== 新增：玩家真正的肢体动画 ====================

    // 1. 呼吸动画 - 缓慢的缩放效果
    const breathingScale = this.animSystem.getPlayerBreathingScale();

    // 2. 检测玩家是否在移动
    const isMoving = this.joystickInput.x !== 0 || this.joystickInput.y !== 0 ||
                    this.keys.has("w") || this.keys.has("s") ||
                    this.keys.has("a") || this.keys.has("d");

    // 3. 上下颠簸动画 - 模拟走路时的起伏
    const bounceY = isMoving ? this.animSystem.getPlayerWalkBounce() * 0.5 : 0; // 减小幅度

    // 4. 射击后坐力动画
    const timeSinceLastShot = now - this.lastShotTime;
    const hasRecoil = timeSinceLastShot < 100; // 射击后100ms内有后坐力
    const recoil = hasRecoil ? this.animSystem.getPlayerShootRecoil() : { x: 0, y: 0 };

    // 应用变换到玩家位置
    const drawX = this.player.x + recoil.x;
    const drawY = this.player.y + recoil.y + bounceY;

    // 应用呼吸缩放
    const finalScale = breathingScale;

    // 使用新的动画精灵渲染器 - 让玩家的手臂真正摆动
    const animTime = this.animSystem.getTime();

    // 临时应用缩放变换
    this.ctx.translate(drawX, drawY);
    this.ctx.scale(finalScale, finalScale);
    this.ctx.translate(-drawX, -drawY);

    // 渲染带动画的玩家精灵（手臂会摆动）
    animatedSpriteRenderer.renderAnimatedPlayer(
      this.ctx,
      drawX,
      drawY,
      animTime,
      isMoving,
      4 // 像素大小
    );

    // 恢复变换矩阵
    this.ctx.setTransform(1, 0, 0, 1, 0, 0); // 重置为单位矩阵

    // 护盾效果 - 像素风格圆形边框（带呼吸动画）
    if (this.player.shield > 0) {
      const shieldPulse = this.animSystem.getParticlePulse(1, 2); // 护盾脉冲动画
      this.pixelRenderer.drawPixelCircle(
        this.player.x,
        this.player.y,
        (this.player.radius + GAME_CONFIG.RENDERING.SHIELD_RADIUS_OFFSET) * shieldPulse,
        "transparent",
        GAME_CONFIG.COLORS.SHIELD
      );
    }

    // 玩家血条 - 像素风格
    const barWidth =
      this.player.radius * GAME_CONFIG.RENDERING.HEALTH_BAR_WIDTH_MULTIPLIER;
    const barHeight = GAME_CONFIG.RENDERING.HEALTH_BAR_HEIGHT;
    const barY =
      this.player.y - this.player.radius - GAME_CONFIG.RENDERING.HEALTH_BAR_OFFSET;
    if (GAME_CONFIG.RENDERING.SHOW_HEALTH_BARS) {
      this.pixelRenderer.drawPixelHealthBar(
        this.player.x,
        barY,
        barWidth,
        barHeight,
        this.player.health,
        this.player.maxHealth,
        "#1a1a1a",
        "#10b981"
      );
    }

    this.ctx.restore();
  }

  /**
   * 渲染 HUD (已移至 React PixelUI 组件)
   */
  private renderHUD(): void {
    // HUD 渲染已移交至 React 层 (PixelUI)
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

    // 清空对象池
    this.bulletPool.clear();
    this.enemyBulletPool.clear();
    this.keys.clear();

    // 清空回调
    this.onLevelUp = undefined;
    this.onGameOver = undefined;
    this.onStatsUpdate = undefined;
    this.onError = undefined;

    console.log('[GameEngine] Game engine destroyed successfully');
  }
}
