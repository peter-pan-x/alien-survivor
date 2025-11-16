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
import { Camera } from "../utils/Camera";
import { SkillSystem } from "../systems/SkillSystem";
import { PixelRenderer, PixelSprites, PixelColors } from "../utils/PixelRenderer";
import { AudioSystem } from "../systems/AudioSystem";
import { BossSystem } from "../systems/BossSystem";
import { Boss, Tree } from "../gameTypes";
import { TreeSystem } from "../systems/TreeSystem";
import { EnemyIdGenerator } from "../utils/EnemyIdGenerator";

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

  // 游戏状态
  private gameStartTime: number = 0;
  private lastShotTime: number = 0;
  private lastDamageTime: number = 0;
  private shotToggle: boolean = false; // 双弹道左右交替偏移
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

    // 设置像素风格渲染
    this.ctx.imageSmoothingEnabled = false;

    // 设置画布尺寸（适配不同屏幕）
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // 手机端：全屏显示
      this.width = window.innerWidth;
      this.height = window.innerHeight;
    } else {
      // 桌面端：限制最大尺寸
    this.width = Math.min(window.innerWidth, GAME_CONFIG.CANVAS.MAX_WIDTH);
    this.height = Math.min(
        window.innerHeight - 100,
      GAME_CONFIG.CANVAS.MAX_HEIGHT
    );
    }
    
    canvas.width = this.width;
    canvas.height = this.height;

    // 初始化游戏系统
    this.particlePool = new ParticlePool();
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
    
    // 初始化技能系统（独立模块）
    this.skillSystem = new SkillSystem();
    this.skillSystem.setWeaponAddCallback((player, weaponType) => {
      this.weaponSystem.addWeapon(player, weaponType);
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
   */
  public resizeToWindow(): void {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    let newWidth: number;
    let newHeight: number;

    if (isMobile) {
      // 移动端：充满可视窗口
      newWidth = window.innerWidth;
      newHeight = window.innerHeight;
    } else {
      // 桌面端：限制最大尺寸并预留顶部UI空间
      newWidth = Math.min(window.innerWidth, GAME_CONFIG.CANVAS.MAX_WIDTH);
      newHeight = Math.min(window.innerHeight - 100, GAME_CONFIG.CANVAS.MAX_HEIGHT);
    }

    // 若尺寸未变化则跳过
    if (newWidth === this.width && newHeight === this.height) return;

    this.width = newWidth;
    this.height = newHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // 同步依赖视口尺寸的子系统
    this.backgroundRenderer?.resize(this.width, this.height);
    this.camera?.resize(this.width, this.height);

    // 为空间网格的调试绘制更新宽高（功能不受影响）
    if (this.spatialGrid) {
      this.spatialGrid.clear();
      this.spatialGrid = new SpatialGrid(this.width, this.height, 100);
    }
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
      // 暴击与AOE初始值
      critChance: 0.0,
      critMultiplier: GAME_CONFIG.SKILLS.CRIT_MULTIPLIER_BASE ?? 2.0,
      hasAOEExplosion: false,
      aoeDamage: 0,
      aoeRadius: GAME_CONFIG.SKILLS.AOE_RADIUS ?? 80,
      // 记录稀有技能的选择次数（用于递减权重）
      rareSkillSelections: {},
      // 记录技能出现次数（用于特殊技能“生命汲取”的出现递减）
      skillAppearances: {},
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
    // 停止背景音乐（重置时）
    this.audioSystem.stopBackgroundMusic();
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
        
        if (import.meta && (import.meta as any).env && (import.meta as any).env.DEV) {
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
   * 启动游戏循环
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = Date.now();
    // 播放背景音乐
    this.audioSystem.playBackgroundMusic(true);
    // 开局预生成树木，避免角色周围动态刷新造成突兀
    try {
      const pregenerateRadius = GAME_CONFIG.TREES?.PREGENERATE_RADIUS ?? 1200;
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
    // 更新存活时间
    const survivalTime = Math.floor((now - this.gameStartTime) / 1000);
    this.stats.survivalTime = survivalTime;
    if (this.onStatsUpdate) {
      this.onStatsUpdate(this.stats);
    }

    // 更新树木系统：若启用动态补充则在玩家周围生成，否则仅使用预生成内容
    if (GAME_CONFIG.TREES?.DYNAMIC_UPDATE_ENABLED) {
      this.treeSystem.updateTreesAroundPlayer(this.player.x, this.player.y, 800);
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
    this.updateEnemies(enemies, now, deltaTime);

    // 更新Boss
    if (this.currentBoss) {
      this.bossSystem.updateBoss(this.currentBoss, this.player, deltaTime, now, this.width, this.height);
      
      // Boss技能攻击
      const bossBullets = this.bossSystem.executeBossSkill(
        this.currentBoss,
        this.player,
        now
      );
      this.enemyBullets.push(...bossBullets);
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
   * 优化：多弹道时保持精准瞄准
   */
  private handlePlayerShooting(now: number): void {
    // 使用安全除法避免除零
    const shootInterval = MathUtils.safeDivide(1000, this.player.attackSpeed, 1000);
    if (now - this.lastShotTime < shootInterval) return;

    const enemies = this.enemyManager.getEnemies();
    if (enemies.length === 0) return;

    let closestEnemy = enemies[0];
    let minDistanceSq = Infinity;

    for (const enemy of enemies) {
      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      const distanceSq = dx * dx + dy * dy;

      if (distanceSq < minDistanceSq) {
        minDistanceSq = distanceSq;
        closestEnemy = enemy;
      }
    }

    if (minDistanceSq <= this.player.attackRange * this.player.attackRange) {
      // 主要瞄准角度
      const angle = Math.atan2(
        closestEnemy.y - this.player.y,
        closestEnemy.x - this.player.x
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
        this.bullets.push({
          x: this.player.x,
          y: this.player.y,
          vx: Math.cos(bulletAngle) * GAME_CONFIG.BULLET.SPEED,
          vy: Math.sin(bulletAngle) * GAME_CONFIG.BULLET.SPEED,
          radius: bulletRadius,
          damage: this.player.attackDamage,
          pierce: this.player.hasPierce,
          pierceCount: this.player.hasPierce ? this.player.pierceCount || 1 : 0,
          currentPierceCount: 0,
          hitEnemies: new Set<number>(),
          originalDamage: this.player.attackDamage,
          pierceDamageReduction: this.player.pierceDamageReduction || 0.5,
        });
      }

      this.lastShotTime = now;
      // 播放射击音效
      this.audioSystem.playSound("shoot");
    }
  }

  /**
   * 更新子弹
   */
  private updateBullets(deltaTime: number): void {
    // 无尽地图：基于与玩家距离清理子弹
    const maxBulletDistance = Math.max(this.width, this.height) * 1.5;
    
    // 更新玩家子弹
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.x += bullet.vx * deltaTime;
      bullet.y += bullet.vy * deltaTime;

      // 基于与玩家距离清理
      const dx = bullet.x - this.player.x;
      const dy = bullet.y - this.player.y;
      const distSq = dx * dx + dy * dy;
      
      if (distSq > maxBulletDistance * maxBulletDistance) {
        this.bullets.splice(i, 1);
        continue;
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
        this.bullets.splice(i, 1);
      }
    }

    // 更新敌人子弹
    const maxEnemyBulletDistance = Math.max(this.width, this.height) * 2;
    
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const bullet = this.enemyBullets[i];
      bullet.x += bullet.vx * deltaTime;
      bullet.y += bullet.vy * deltaTime;

      // 基于与玩家距离清理
      const dx = bullet.x - this.player.x;
      const dy = bullet.y - this.player.y;
      const distSq = dx * dx + dy * dy;
      
      if (distSq > maxEnemyBulletDistance * maxEnemyBulletDistance) {
        this.enemyBullets.splice(i, 1);
        continue;
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
        this.enemyBullets.splice(i, 1);
      }
    }
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
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      // 动态查询范围：子弹半径 + 敌人最大半径 + 安全边距
      const queryRadius = bullet.radius + 30 + 10;
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
          
          // 应用伤害
          enemy.health -= damage;
          this.damageNumbers.add(enemy.x, enemy.y, damage);

          // 创建粒子效果
          this.particlePool.createParticles(
            enemy.x,
            enemy.y,
            GAME_CONFIG.COLORS.PARTICLE_ENEMY_HIT,
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
            
            // 检查是否达到穿透上限
            if (bullet.currentPierceCount >= bullet.pierceCount) {
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
          // Boss也可被暴击
          let damage = bullet.damage;
          if (Math.random() < this.player.critChance) {
            damage = Math.floor(damage * this.player.critMultiplier);
          }
          this.currentBoss.health -= damage;
          this.damageNumbers.add(this.currentBoss.x, this.currentBoss.y, damage);

          this.particlePool.createParticles(
            this.currentBoss.x,
            this.currentBoss.y,
            GAME_CONFIG.COLORS.PARTICLE_ENEMY_HIT,
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
            this.stats.score += 1000; // Boss击败奖励
            this.player.exp +=
              GAME_CONFIG.LEVELING.EXP_PER_KILL *
              (GAME_CONFIG.LEVELING.BOSS_EXP_REWARD_MULTIPLIER ?? 50); // Boss经验奖励
            this.audioSystem.playSound("kill");
            this.bossSystem.removeBoss();
            this.currentBoss = null;
            // 停止Boss音乐，恢复普通背景音乐
            this.audioSystem.setBossActive(false);
            this.handleLevelUp();
          }
        }
      }

      // 移除应该消失的子弹
      if (shouldRemoveBullet) {
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

        // 敌人死亡触发AOE爆炸（固定33%玩家伤害）
        if (this.player.hasAOEExplosion) {
          const aoeRadius = this.player.aoeRadius;
          const explosionDamage = Math.floor(this.player.attackDamage * 0.33);
          const nearby = this.spatialGrid.getNearby(enemy.x, enemy.y, aoeRadius);
          
          for (const e of nearby) {
            if (e === enemy) continue;
            const dx = e.x - enemy.x;
            const dy = e.y - enemy.y;
            const distSq = dx * dx + dy * dy;
            if (distSq <= aoeRadius * aoeRadius) {
              e.health -= explosionDamage;
              this.damageNumbers.add(e.x, e.y, explosionDamage);
              this.particlePool.createParticles(
                e.x,
                e.y,
                GAME_CONFIG.COLORS.PARTICLE_ENEMY_HIT,
                GAME_CONFIG.PARTICLE.HIT_PARTICLE_COUNT
              );
            }
          }
          // 爆炸中心更强的粒子效果
          this.particlePool.createParticles(
            enemy.x,
            enemy.y,
            GAME_CONFIG.COLORS.PARTICLE_ENEMY_DEATH,
            GAME_CONFIG.PARTICLE.DEATH_PARTICLE_COUNT
          );
        }

        this.stats.killCount++;
        this.stats.score += 10;

        // 播放击杀音效
        this.audioSystem.playSound("kill");

        if (this.player.hasLifeSteal) {
          const healAmount = this.player.lifeStealAmount ?? GAME_CONFIG.SKILLS.LIFE_STEAL_AMOUNT;
          this.player.health = Math.min(
            this.player.health + healAmount,
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

    // 添加游戏开始后的短暂保护期（前2秒）
    const timeSinceStart = now - this.gameStartTime;
    const hasStartupProtection = timeSinceStart < 2000; // 2秒保护期

    // 敌人子弹与玩家碰撞 (优化: 使用距离平方)
    if (!hasStartupProtection) {
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
    
    // 播放受伤音效
    this.audioSystem.playSound("damage");
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
    this.damageNumbers.render(this.ctx);

    // 恢复变换
    this.camera.restoreTransform(this.ctx);

    // 渲染屏幕空间的UI（HUD和性能监控）
    this.renderHUD();
    this.performanceMonitor.render(this.ctx);
  }

  /**
   * 渲染树木 - 像素风格
   */
  private renderTrees(): void {
    this.ctx.save();
    this.ctx.imageSmoothingEnabled = false;

    // 仅渲染玩家附近的树木，提升性能
    const trees = this.treeSystem.getTreesInArea(this.player.x, this.player.y, 900);
    for (const tree of trees) {
      let sprite: string[];
      let colors: Record<string, string>;
      switch (tree.type) {
        case "small":
          sprite = PixelSprites.treeSmall;
          colors = PixelColors.treeSmall;
          break;
        case "medium":
          sprite = PixelSprites.treeMedium;
          colors = PixelColors.treeMedium;
          break;
        case "large":
          sprite = PixelSprites.treeLarge;
          colors = PixelColors.treeLarge;
          break;
        default:
          sprite = PixelSprites.treeSmall;
          colors = PixelColors.treeSmall;
      }

      // 按每棵树的shade调整颜色深浅
      const shaded = this.shadeColors(colors, tree.shade ?? 1);
      this.pixelRenderer.drawSprite(tree.x, tree.y, sprite, shaded);
    }

    this.ctx.restore();
  }

  // 将十六进制颜色按系数明暗调整
  private adjustColorBrightness(hex: string, factor: number): string {
    if (!hex || hex === "transparent") return hex;
    const match = hex.match(/^#([0-9a-fA-F]{6})$/);
    if (!match) return hex;
    const num = parseInt(match[1], 16);
    let r = (num >> 16) & 0xff;
    let g = (num >> 8) & 0xff;
    let b = num & 0xff;
    r = Math.min(255, Math.max(0, Math.floor(r * factor)));
    g = Math.min(255, Math.max(0, Math.floor(g * factor)));
    b = Math.min(255, Math.max(0, Math.floor(b * factor)));
    const out = (r << 16) | (g << 8) | b;
    return `#${out.toString(16).padStart(6, "0")}`;
  }

  // 为颜色映射应用明暗调整
  private shadeColors(colors: Record<string, string>, factor: number): Record<string, string> {
    const shaded: Record<string, string> = {};
    for (const key in colors) {
      shaded[key] = this.adjustColorBrightness(colors[key], factor);
    }
    return shaded;
  }

  /**
   * 渲染敌人 - 像素风格
   */
  private renderEnemies(): void {
    const enemies = this.enemyManager.getEnemies();
    for (const enemy of enemies) {
      this.ctx.save();

      // 根据敌人类型选择精灵和颜色
      let sprite: string[];
      let colors: Record<string, string>;

      switch (enemy.type) {
        case "swarm":
          sprite = PixelSprites.enemySwarm;
          colors = PixelColors.enemySwarm;
          break;
        case "rusher":
          sprite = PixelSprites.enemyRusher;
          colors = PixelColors.enemyRusher;
          break;
        case "shooter":
          sprite = PixelSprites.enemyShooter;
          colors = PixelColors.enemyShooter;
          break;
        case "elite":
          sprite = PixelSprites.enemyElite;
          colors = PixelColors.enemyElite;
          break;
        case "spider":
          sprite = PixelSprites.enemySpider;
          colors = PixelColors.enemySpider;
          break;
        case "crab":
          sprite = PixelSprites.enemyCrab;
          colors = PixelColors.enemyCrab;
          break;
        case "bigeye":
          sprite = PixelSprites.enemyBigEye;
          colors = PixelColors.enemyBigEye;
          break;
        case "frog":
          sprite = PixelSprites.enemyFrog;
          colors = PixelColors.enemyFrog;
          break;
        default:
          sprite = PixelSprites.enemySwarm;
          colors = PixelColors.enemySwarm;
          }

      // 绘制像素精灵
      this.pixelRenderer.drawSprite(enemy.x, enemy.y, sprite, colors);

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

    // 获取Boss配置
    const bossInfo = this.bossSystem.getBossInfo(this.currentBoss.type);
    const bossColor = bossInfo?.color || "#ef4444";

    // Boss跳跃特效
    if (this.currentBoss.isJumping) {
      // 跳跃时的光环效果
      this.ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.01) * 0.2;
      this.pixelRenderer.drawPixelCircle(
        this.currentBoss.x,
        this.currentBoss.y,
        this.currentBoss.radius + 20,
        "transparent",
        bossColor
      );
      this.ctx.globalAlpha = 1;
      
      // 跳跃时的残影效果
      this.ctx.globalAlpha = 0.5;
      this.pixelRenderer.drawPixelCircle(
        this.currentBoss.x,
        this.currentBoss.y,
        this.currentBoss.radius,
        "transparent",
        bossColor
      );
      this.ctx.globalAlpha = 1;
    }

    // ���制Boss（使用更大的像素精灵）
    const bossSprite = [
      "   ███   ",
      "  █████  ",
      " ███████ ",
      "█████████",
      "█ █████ █",
      "█ █████ █",
      "  █████  ",
      " █ █ █ █ ",
    ];

    const bossColors = {
      "█": bossColor,
      " ": "transparent",
    };

    // 跳跃时Boss闪烁效果
    if (this.currentBoss.isJumping) {
      const flash = Math.sin(Date.now() * 0.02) > 0;
      if (flash) {
        this.ctx.globalAlpha = 0.7;
      }
    }

    this.pixelRenderer.drawSprite(
      this.currentBoss.x,
      this.currentBoss.y,
      bossSprite,
      bossColors
    );

    this.ctx.globalAlpha = 1;

    // Boss血条（更大更明显）
    const barWidth = this.currentBoss.radius * 4;
    const barHeight = 6;
    const barY = this.currentBoss.y - this.currentBoss.radius - 15;
    if (GAME_CONFIG.RENDERING.SHOW_HEALTH_BARS) {
      this.pixelRenderer.drawPixelHealthBar(
        this.currentBoss.x,
          barY,
        barWidth,
        barHeight,
        this.currentBoss.health,
        this.currentBoss.maxHealth,
        "#1a1a1a",
        bossColor
      );
    }

    // Boss名称标签
    this.ctx.restore();
    this.ctx.save();
    const screenPos = this.camera.worldToScreen(this.currentBoss.x, barY - 20);
    this.ctx.fillStyle = bossColor;
    this.ctx.font = "bold 14px monospace";
    this.ctx.textAlign = "center";
    const bossName = this.currentBoss.isJumping ? `${bossInfo?.name || "BOSS"} (跳跃中!)` : (bossInfo?.name || "BOSS");
    this.ctx.fillText(bossName, screenPos.x, screenPos.y);

      this.ctx.restore();
  }

  /**
   * 渲染子弹 - 像素风格
   */
  private renderBullets(): void {
    this.ctx.save();
    this.ctx.imageSmoothingEnabled = false;

    // 渲染玩家子弹 - 像素风格圆形
    for (const bullet of this.bullets) {
      this.pixelRenderer.drawPixelCircle(
        bullet.x,
        bullet.y,
        bullet.radius,
        GAME_CONFIG.COLORS.BULLET_GRADIENT_START,
        GAME_CONFIG.COLORS.BULLET_GRADIENT_END
      );
    }

    // 渲染敌人子弹 - 像素风格圆形
    for (const bullet of this.enemyBullets) {
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
   * 渲染玩家 - 像素风格
   */
  private renderPlayer(): void {
    this.ctx.save();

    // 绘制玩家像素精灵
    this.pixelRenderer.drawSprite(
      this.player.x,
      this.player.y,
      PixelSprites.player,
      PixelColors.player
    );

    // 护盾效果 - 像素风格圆形边框
    if (this.player.shield > 0) {
      this.pixelRenderer.drawPixelCircle(
        this.player.x,
        this.player.y,
        this.player.radius + GAME_CONFIG.RENDERING.SHIELD_RADIUS_OFFSET,
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

    // 命数❤显示（左上角）
    const heartsY = this.player.shield > 0 ? 65 : 45;
    for (let i = 0; i < (this.player.maxLives ?? 3); i++) {
      this.ctx.fillStyle = i < (this.player.lives ?? 1) ? "#ef4444" : "#64748b";
      this.ctx.fillText("❤", 10 + i * 20, heartsY);
    }

    // 显示保护期状态
    const timeSinceStart = Date.now() - this.gameStartTime;
    const protectionTimeLeft = 2000 - timeSinceStart;
    if (protectionTimeLeft > 0) {
      this.ctx.fillStyle = "#10b981";
      this.ctx.font = "bold 14px Arial";
      this.ctx.fillText(
        `🛡️ 保护中: ${Math.ceil(protectionTimeLeft / 1000)}s`,
        10,
        this.player.shield > 0 ? 65 : 45
      );
    }

    this.ctx.fillStyle = "#fff";
    this.ctx.font = "16px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      `Time: ${Math.floor(this.stats.survivalTime / 60)}:${(this.stats.survivalTime % 60).toString().padStart(2, "0")}`,
      this.width / 2,
      25
    );

    this.ctx.textAlign = "right";
    this.ctx.fillText(`Kills: ${this.stats.killCount}`, this.width - 10, 25);
    this.ctx.fillText(`Level: ${this.player.level}`, this.width - 10, 45);
    
    // 显示世界坐标（无尽地图模式）
    this.ctx.fillStyle = "#60a5fa";
    this.ctx.font = "12px monospace";
    this.ctx.fillText(
      `Pos: (${Math.floor(this.player.x)}, ${Math.floor(this.player.y)})`,
      this.width - 10,
      65
    );

    // 经验条
    const expBarWidth = this.width * 0.8;
    const expBarHeight = 8;
    const expBarX = (this.width - expBarWidth) / 2;
    const expBarY = this.height - 20;
    const expNeeded = this.calculateExpNeeded(this.player.level);
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
