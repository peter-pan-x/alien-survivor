import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Player, Enemy, Bullet, GameState, GameStats } from "../gameTypes";
import { GAME_CONFIG, SKILLS, Skill } from "../gameConfig";
import { ParticlePool } from "../utils/ParticlePool";
import { BackgroundRenderer } from "../utils/BackgroundRenderer";
import { SpatialGrid } from "../utils/SpatialGrid";
import { GameStorage } from "../utils/GameStorage";
import { DamageNumberSystem } from "../utils/DamageNumbers";
import { VirtualJoystick } from "../utils/VirtualJoystick";
import { EnemyManager } from "../utils/EnemyManager";
import { WeaponSystem } from "../utils/WeaponSystem";

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("menu");
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    killCount: 0,
    highScore: 0,
    survivalTime: 0,
  });
  const [skillOptions, setSkillOptions] = useState<Skill[]>([]);
  const [acquiredSkills, setAcquiredSkills] = useState<string[]>([]);
  const [isNewRecord, setIsNewRecord] = useState(false);

  // 游戏系统
  const particlePoolRef = useRef<ParticlePool>(new ParticlePool());
  const backgroundRendererRef = useRef<BackgroundRenderer | null>(null);
  const spatialGridRef = useRef<SpatialGrid | null>(null);
  const damageNumbersRef = useRef<DamageNumberSystem>(new DamageNumberSystem());
  const virtualJoystickRef = useRef<VirtualJoystick | null>(null);
  const enemyManagerRef = useRef<EnemyManager>(new EnemyManager());
  const weaponSystemRef = useRef<WeaponSystem>(new WeaponSystem(particlePoolRef.current));

  // 游戏状态
  const playerRef = useRef<Player>({
    x: 0,
    y: 0,
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
    // 暴击 & AOE 初始值（页面本地版）
    critChance: 0.0,
    critMultiplier: GAME_CONFIG.SKILLS.CRIT_MULTIPLIER_BASE ?? 2.0,
    hasAOEExplosion: false,
    aoeDamage: 0,
    aoeRadius: GAME_CONFIG.SKILLS.AOE_RADIUS ?? 80,
    weapons: [],
  });

  const bulletsRef = useRef<Bullet[]>([]);
  const enemyBulletsRef = useRef<Bullet[]>([]);
  const lastShotTimeRef = useRef<number>(0);
  const lastDamageTimeRef = useRef<number>(0);
  const gameStartTimeRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());

  // 加载最高分
  useEffect(() => {
    const savedData = GameStorage.load();
    setStats((prev) => ({ ...prev, highScore: savedData.highScore }));
  }, []);

  // 初始化虚拟摇杆
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    virtualJoystickRef.current = new VirtualJoystick(canvas);

    return () => {
      virtualJoystickRef.current?.destroy();
    };
  }, []);

  // 初始化游戏
  const initGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = Math.min(window.innerWidth, GAME_CONFIG.CANVAS.MAX_WIDTH);
    const height = Math.min(
      window.innerHeight - 200,
      GAME_CONFIG.CANVAS.MAX_HEIGHT
    );
    canvas.width = width;
    canvas.height = height;

    // 初始化渲染系统
    backgroundRendererRef.current = new BackgroundRenderer(width, height);
    spatialGridRef.current = new SpatialGrid(width, height, 100);

    // 重置玩家
    playerRef.current = {
      x: width / 2,
      y: height / 2,
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
      bulletSizeMultiplier: 1.0,
      weapons: [],
    };

    // 重置游戏状态
    enemyManagerRef.current.reset();
    bulletsRef.current = [];
    enemyBulletsRef.current = [];
    particlePoolRef.current.clear();
    damageNumbersRef.current.clear();
    lastShotTimeRef.current = 0;
    lastDamageTimeRef.current = 0;
    gameStartTimeRef.current = Date.now();

    setStats({
      score: 0,
      killCount: 0,
      highScore: GameStorage.load().highScore,
      survivalTime: 0,
    });
    setAcquiredSkills([]);
    setIsNewRecord(false);
    setGameState("playing");
  };

  // 升级
  const levelUp = () => {
    // 通过 SkillSystem 按权重获取可选技能（稀有概率降低33%）
    const randomSkillsEffects = skillSystem.getRandomSkills(playerRef.current, 3);
    // 兼容页面 Skill 类型
    const randomSkills = randomSkillsEffects.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      type: s.type,
      icon: s.icon,
    }));

    setSkillOptions(randomSkills);
    setGameState("levelup");
  };

  // 选择技能
  const selectSkill = (skill: Skill) => {
    const player = playerRef.current;

    switch (skill.id) {
      case "health_boost":
        player.maxHealth += GAME_CONFIG.SKILLS.HEALTH_BOOST;
        player.health = Math.min(
          player.health + GAME_CONFIG.SKILLS.HEALTH_BOOST,
          player.maxHealth
        );
        break;
      case "attack_boost":
        player.attackDamage += GAME_CONFIG.SKILLS.ATTACK_BOOST;
        break;
      case "speed_boost":
        player.attackSpeed *= GAME_CONFIG.SKILLS.SPEED_BOOST_MULTIPLIER;
        break;
      case "range_boost":
        player.attackRange += GAME_CONFIG.SKILLS.RANGE_BOOST;
        break;
      case "multi_shot":
        player.bulletCount += 1;
        break;
      case "shield_boost":
        player.maxShield += GAME_CONFIG.SKILLS.SHIELD_BOOST;
        player.shield = player.maxShield;
        break;
      case "pierce_shot":
        player.hasPierce = true;
        break;
      case "life_steal":
        player.hasLifeSteal = true;
        player.lifeStealAmount = (player.lifeStealAmount ?? 0) + 1;
        break;
      case "bullet_size":
        player.bulletSizeMultiplier *= GAME_CONFIG.SKILLS.BULLET_SIZE_MULTIPLIER;
        break;
      case "move_speed":
        player.moveSpeed *= GAME_CONFIG.SKILLS.MOVE_SPEED_MULTIPLIER;
        player.moveSpeed = Math.min(
          player.moveSpeed,
          GAME_CONFIG.PLAYER.MAX_MOVE_SPEED
        );
        break;
      case "orbital_drone":
        weaponSystemRef.current.addWeapon(player, 'orbital');
        break;
      case "lightning_chain":
        weaponSystemRef.current.addWeapon(player, 'lightning');
        break;
      case "guardian_field":
        weaponSystemRef.current.addWeapon(player, 'field');
        break;
    }

    setAcquiredSkills((prev) => [...prev, skill.id]);
    setGameState("playing");
  };

  // 键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current.add(key);

      // ESC键暂停/继续
      if (key === "escape") {
        if (gameState === "playing") {
          setGameState("paused");
        } else if (gameState === "paused") {
          setGameState("playing");
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gameState]);

  // 游戏循环
  useEffect(() => {
    if (gameState !== "playing") return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let animationId: number;
    let lastFrame = Date.now();

    const gameLoop = () => {
      const now = Date.now();
      const deltaTime = Math.min((now - lastFrame) / GAME_CONFIG.RENDERING.FRAME_TIME, 2);
      lastFrame = now;

      const player = playerRef.current;
      const enemies = enemyManagerRef.current.getEnemies();
      const bullets = bulletsRef.current;
      const enemyBullets = enemyBulletsRef.current;
      const particlePool = particlePoolRef.current;
      const spatialGrid = spatialGridRef.current!;
      const damageNumbers = damageNumbersRef.current;
      const enemyManager = enemyManagerRef.current;
      const weaponSystem = weaponSystemRef.current;

      // 更新存活时间
      const survivalTime = Math.floor((now - gameStartTimeRef.current) / 1000);
      setStats((prev) => ({ ...prev, survivalTime }));

      // 绘制背景
      backgroundRendererRef.current?.draw(ctx);

      // 更新玩家位置（虚拟摇杆 + 键盘控制）
      const joystick = virtualJoystickRef.current?.getMovementVector() || { x: 0, y: 0 };
      const keys = keysRef.current;
      
      let dx = joystick.x;
      let dy = joystick.y;
      
      // 键盘控制（作为备选）
      if (keys.has("w") || keys.has("arrowup")) dy -= 1;
      if (keys.has("s") || keys.has("arrowdown")) dy += 1;
      if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
      if (keys.has("d") || keys.has("arrowright")) dx += 1;

      if (dx !== 0 || dy !== 0) {
        const length = Math.sqrt(dx * dx + dy * dy);
        dx = (dx / length) * player.moveSpeed;
        dy = (dy / length) * player.moveSpeed;

        player.x = Math.max(
          player.radius,
          Math.min(canvas.width - player.radius, player.x + dx)
        );
        player.y = Math.max(
          player.radius,
          Math.min(canvas.height - player.radius, player.y + dy)
        );
      }

      // 生成敌人（基于时间）
      enemyManager.spawnEnemy(canvas.width, canvas.height, now);

      // 更新敌人
      enemyManager.updateEnemies(player, deltaTime, canvas.width, canvas.height, now, enemyBullets);

      // 自动射击（向最近的敌人）
      const shotInterval = 1000 / player.attackSpeed;
      if (now - lastShotTimeRef.current > shotInterval && enemies.length > 0) {
        // 找到最近的敌人
        let nearestEnemy: Enemy | null = null;
        let minDistance = player.attackRange;

        for (const enemy of enemies) {
          const dx = enemy.x - player.x;
          const dy = enemy.y - player.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < minDistance) {
            minDistance = distance;
            nearestEnemy = enemy;
          }
        }

        if (nearestEnemy) {
          const dx = nearestEnemy.x - player.x;
          const dy = nearestEnemy.y - player.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);

          // 发射多重子弹
          for (let i = 0; i < player.bulletCount; i++) {
            const spreadAngle =
              player.bulletCount > 1
                ? angle +
                  GAME_CONFIG.BULLET.SPREAD_ANGLE *
                    ((i - (player.bulletCount - 1) / 2) / (player.bulletCount - 1))
                : angle;

            const bulletRadius = player.bulletSizeMultiplier > 1
              ? GAME_CONFIG.BULLET.ENLARGED_RADIUS * player.bulletSizeMultiplier
              : GAME_CONFIG.BULLET.BASE_RADIUS;

            bullets.push({
              x: player.x,
              y: player.y,
              vx: Math.cos(spreadAngle) * GAME_CONFIG.BULLET.SPEED,
              vy: Math.sin(spreadAngle) * GAME_CONFIG.BULLET.SPEED,
              radius: bulletRadius,
              damage: player.attackDamage,
              pierce: player.hasPierce,
              pierceCount: player.hasPierce ? 999 : 1,
            });
          }

          lastShotTimeRef.current = now;
        }
      }

      // 更新子弹
      for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;

        if (
          bullet.x < -50 ||
          bullet.x > canvas.width + 50 ||
          bullet.y < -50 ||
          bullet.y > canvas.height + 50
        ) {
          bullets.splice(i, 1);
        }
      }

      // 更新敌人子弹
      for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;

        if (
          bullet.x < -50 ||
          bullet.x > canvas.width + 50 ||
          bullet.y < -50 ||
          bullet.y > canvas.height + 50
        ) {
          enemyBullets.splice(i, 1);
        }
      }

      // 更新武器系统
      weaponSystem.updateWeapons(player, enemies, now, ctx);

      // 碰撞检测（使用空间网格）
      spatialGrid.clear();
      enemies.forEach((e) => spatialGrid.insert(e.x, e.y, e));

      // 子弹与敌人碰撞
      for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        const nearbyEnemies = spatialGrid.query(
          bullet.x - 50,
          bullet.y - 50,
          bullet.x + 50,
          bullet.y + 50
        );

        let hit = false;
        for (const enemy of nearbyEnemies) {
          const dx = bullet.x - enemy.x;
          const dy = bullet.y - enemy.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < bullet.radius + enemy.radius) {
            enemy.health -= bullet.damage;
            damageNumbers.add(enemy.x, enemy.y, bullet.damage);

            particlePool.createParticles(
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
          bullets.splice(i, 1);
        }
      }

      // 敌人子弹与玩家碰撞
      for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        const dx = bullet.x - player.x;
        const dy = bullet.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < bullet.radius + player.radius) {
          // 玩家受伤
          if (now - lastDamageTimeRef.current > GAME_CONFIG.PLAYER.DAMAGE_COOLDOWN) {
            if (player.shield > 0) {
              player.shield -= bullet.damage;
              if (player.shield < 0) {
                player.health += player.shield;
                player.shield = 0;
              }
            } else {
              player.health -= bullet.damage;
            }

            lastDamageTimeRef.current = now;
            particlePool.createParticles(
              player.x,
              player.y,
              GAME_CONFIG.COLORS.PARTICLE_PLAYER_HIT,
              GAME_CONFIG.PARTICLE.HIT_PARTICLE_COUNT
            );
          }

          enemyBullets.splice(i, 1);
        }
      }

      // 玩家与敌人碰撞
      for (const enemy of enemies) {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const playerEffectiveRadius = player.radius * (GAME_CONFIG.COLLISION?.PLAYER_VS_ENEMY_PLAYER_RADIUS_MULTIPLIER ?? 0.7);
        const enemyEffectiveRadius = enemy.radius * (GAME_CONFIG.COLLISION?.ENEMY_VS_PLAYER_ENEMY_RADIUS_MULTIPLIER ?? 0.85);
        if (distance < playerEffectiveRadius + enemyEffectiveRadius) {
          if (now - lastDamageTimeRef.current > GAME_CONFIG.PLAYER.DAMAGE_COOLDOWN) {
            const typeConfig = GAME_CONFIG.ENEMY.TYPES[enemy.type];
            const damage = typeConfig.damage;

            if (player.shield > 0) {
              player.shield -= damage;
              if (player.shield < 0) {
                player.health += player.shield;
                player.shield = 0;
              }
            } else {
              player.health -= damage;
            }

            lastDamageTimeRef.current = now;
            particlePool.createParticles(
              player.x,
              player.y,
              GAME_CONFIG.COLORS.PARTICLE_PLAYER_HIT,
              GAME_CONFIG.PARTICLE.HIT_PARTICLE_COUNT
            );
          }
        }
      }

      // 移除死亡敌人并计算经验
      let killCount = 0;
      for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (enemy.health <= 0) {
          killCount++;
          player.exp += GAME_CONFIG.LEVELING.EXP_PER_KILL;

          if (player.hasLifeSteal) {
            const healAmount = player.lifeStealAmount ?? GAME_CONFIG.SKILLS.LIFE_STEAL_AMOUNT;
            player.health = Math.min(
              player.health + healAmount,
              player.maxHealth
            );
          }

          particlePool.createParticles(
            enemy.x,
            enemy.y,
            enemyManager.getEnemyColor(enemy.type),
            GAME_CONFIG.PARTICLE.DEATH_PARTICLE_COUNT
          );
        }
      }

      enemyManager.removeDeadEnemies();

      if (killCount > 0) {
        setStats((prev) => ({
          ...prev,
          killCount: prev.killCount + killCount,
          score: prev.score + killCount * GAME_CONFIG.LEVELING.SCORE_PER_KILL,
        }));
      }

      // 检查升级
  const baseKills = GAME_CONFIG.LEVELING.BASE_KILLS_FOR_FIRST_LEVEL ?? 5;
  const baseExp = GAME_CONFIG.LEVELING.EXP_PER_KILL * baseKills;
  const growth = GAME_CONFIG.LEVELING.GROWTH_RATE ?? 1.33;
  const expRequired = Math.ceil(baseExp * Math.pow(growth, Math.max(0, player.level - 1)));
      if (player.exp >= expRequired) {
        player.exp -= expRequired;
        player.level++;
        levelUp();
      }

      // 检查死亡：先扣命并复活，命数耗尽时结束
      if (player.health <= 0) {
        if ((player.lives ?? 1) > 1) {
          player.lives -= 1;
          player.health = player.maxHealth;
          lastDamageTimeRef.current = now; // 复活后短暂无敌（沿用伤害冷却）
        } else {
          const finalScore = stats.score + killCount * GAME_CONFIG.LEVELING.SCORE_PER_KILL;
          const savedData = GameStorage.load();
          
          if (finalScore > savedData.highScore) {
            GameStorage.save({ highScore: finalScore });
            setIsNewRecord(true);
          }
          
          setStats((prev) => ({
            ...prev,
            score: finalScore,
            highScore: Math.max(finalScore, savedData.highScore),
          }));
          
          setGameState("gameover");
          return;
        }
      }

      // 更新粒子
      particlePool.update();

      // 更新伤害数字
      damageNumbers.update();

      // 渲染
      renderGame(ctx, player, enemies, bullets, enemyBullets, particlePool, damageNumbers, weaponSystem, now);

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [gameState, stats.score]);

  // 渲染函数
  const renderGame = (
    ctx: CanvasRenderingContext2D,
    player: Player,
    enemies: Enemy[],
    bullets: Bullet[],
    enemyBullets: Bullet[],
    particlePool: ParticlePool,
    damageNumbers: DamageNumberSystem,
    weaponSystem: WeaponSystem,
    currentTime: number
  ) => {
    const canvas = ctx.canvas;

    // 渲染武器（在玩家下方）
    weaponSystem.renderWeapons(player, ctx, currentTime);

    // 渲染敌人
    const enemyManager = enemyManagerRef.current;
    for (const enemy of enemies) {
      const shape = enemyManager.getEnemyShape(enemy.type);
      const color = enemyManager.getEnemyColor(enemy.type);

      ctx.save();
      ctx.translate(enemy.x, enemy.y);

      // 绘制形状
      ctx.beginPath();
      switch (shape) {
        case 'circle':
          ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
          break;
        case 'square':
          ctx.rect(-enemy.radius, -enemy.radius, enemy.radius * 2, enemy.radius * 2);
          break;
        case 'triangle':
          ctx.moveTo(0, -enemy.radius);
          ctx.lineTo(enemy.radius, enemy.radius);
          ctx.lineTo(-enemy.radius, enemy.radius);
          ctx.closePath();
          break;
        case 'hexagon':
          for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const x = Math.cos(angle) * enemy.radius;
            const y = Math.sin(angle) * enemy.radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          break;
      }

      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, enemy.radius);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, color + '88');
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();

      // 血条
      if (GAME_CONFIG.RENDERING.SHOW_HEALTH_BARS && enemy.health < enemy.maxHealth) {
        const barWidth = enemy.radius * 2;
        const barHeight = 3;
        const barY = enemy.y - enemy.radius - 8;

        ctx.fillStyle = "#333";
        ctx.fillRect(enemy.x - barWidth / 2, barY, barWidth, barHeight);

        ctx.fillStyle = color;
        ctx.fillRect(
          enemy.x - barWidth / 2,
          barY,
          (enemy.health / enemy.maxHealth) * barWidth,
          barHeight
        );
      }
    }

    // 渲染玩家子弹
    for (const bullet of bullets) {
      const gradient = ctx.createRadialGradient(
        bullet.x,
        bullet.y,
        0,
        bullet.x,
        bullet.y,
        bullet.radius
      );
      gradient.addColorStop(0, GAME_CONFIG.COLORS.BULLET_CORE);
      gradient.addColorStop(0.5, GAME_CONFIG.COLORS.BULLET_GRADIENT_START);
      gradient.addColorStop(1, GAME_CONFIG.COLORS.BULLET_GRADIENT_END);

      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius + 2, 0, Math.PI * 2);
      ctx.strokeStyle = GAME_CONFIG.COLORS.BULLET_GRADIENT_START + "44";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 渲染敌人子弹
    for (const bullet of enemyBullets) {
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      ctx.fillStyle = "#a855f7";
      ctx.fill();
      ctx.strokeStyle = "#7c3aed";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 渲染玩家
    const gradient = ctx.createRadialGradient(
      player.x,
      player.y,
      0,
      player.x,
      player.y,
      player.radius
    );
    gradient.addColorStop(0, GAME_CONFIG.COLORS.PLAYER_GRADIENT_START);
    gradient.addColorStop(1, GAME_CONFIG.COLORS.PLAYER_GRADIENT_END);

    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // 护盾
    if (player.shield > 0) {
      ctx.beginPath();
      ctx.arc(
        player.x,
        player.y,
        player.radius + GAME_CONFIG.RENDERING.SHIELD_RADIUS_OFFSET,
        0,
        Math.PI * 2
      );
      ctx.strokeStyle = GAME_CONFIG.COLORS.SHIELD;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // 玩家血条
    if (GAME_CONFIG.RENDERING.SHOW_HEALTH_BARS) {
      const barWidth = player.radius * GAME_CONFIG.RENDERING.HEALTH_BAR_WIDTH_MULTIPLIER;
      const barHeight = GAME_CONFIG.RENDERING.HEALTH_BAR_HEIGHT;
      const barY = player.y - player.radius - GAME_CONFIG.RENDERING.HEALTH_BAR_OFFSET;

      ctx.fillStyle = "#333";
      ctx.fillRect(player.x - barWidth / 2, barY, barWidth, barHeight);

      ctx.fillStyle = "#10b981";
      ctx.fillRect(
        player.x - barWidth / 2,
        barY,
        (player.health / player.maxHealth) * barWidth,
        barHeight
      );
    }

    // 渲染粒子
    particlePool.render(ctx);

    // 渲染伤害数字
    damageNumbers.render(ctx);

    // 渲染虚拟摇杆
    virtualJoystickRef.current?.render(ctx);

    // 渲染 HUD
    ctx.save();
    ctx.fillStyle = "#fff";
    ctx.font = "16px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`HP: ${Math.max(0, Math.floor(player.health))}/${player.maxHealth}`, 10, 25);
    
    if (player.shield > 0) {
      ctx.fillStyle = "#60a5fa";
      ctx.fillText(`Shield: ${Math.floor(player.shield)}/${player.maxShield}`, 10, 45);
    }

    // 命数❤显示（左上角）
    const heartsY = player.shield > 0 ? 65 : 45;
    for (let i = 0; i < (player.maxLives ?? 3); i++) {
      ctx.fillStyle = i < (player.lives ?? 1) ? "#ef4444" : "#64748b";
      ctx.fillText("❤", 10 + i * 20, heartsY);
    }

    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText(
      `Time: ${Math.floor(stats.survivalTime / 60)}:${(stats.survivalTime % 60).toString().padStart(2, "0")}`,
      canvas.width / 2,
      25
    );

    ctx.textAlign = "right";
    ctx.fillText(`Kills: ${stats.killCount}`, canvas.width - 10, 25);
    ctx.fillText(`Level: ${player.level}`, canvas.width - 10, 45);

    // 经验条
  const baseKills = GAME_CONFIG.LEVELING.BASE_KILLS_FOR_FIRST_LEVEL ?? 5;
  const baseExp = GAME_CONFIG.LEVELING.EXP_PER_KILL * baseKills;
  const growth = GAME_CONFIG.LEVELING.GROWTH_RATE ?? 1.33;
  const expRequired = Math.ceil(baseExp * Math.pow(growth, Math.max(0, player.level - 1)));
    const expProgress = player.exp / expRequired;
    const expBarHeight = 5;

    ctx.fillStyle = "#333";
    ctx.fillRect(0, canvas.height - expBarHeight, canvas.width, expBarHeight);

    ctx.fillStyle = "#fbbf24";
    ctx.fillRect(0, canvas.height - expBarHeight, canvas.width * expProgress, expBarHeight);

    ctx.restore();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 p-4">
      <div className="mb-4 text-center">
        <h1 className="text-4xl font-bold text-white mb-2">异星幸存者</h1>
        <p className="text-slate-400">Alien Survivor</p>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          className="border-2 border-slate-700 rounded-lg shadow-2xl"
          style={{ touchAction: "none" }}
        />

        {gameState === "menu" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-lg">
            <h2 className="text-3xl font-bold text-white mb-8">准备开始</h2>
            <div className="space-y-4">
              <Button onClick={initGame} size="lg" className="w-48">
                开始游戏
              </Button>
              <div className="text-center text-slate-300">
                <p>最高分: {stats.highScore}</p>
              </div>
            </div>
            <div className="mt-8 text-slate-400 text-sm text-center max-w-md">
              <p>• 使用虚拟摇杆或 WASD 移动</p>
              <p>• 自动攻击最近的敌人</p>
              <p>• 升级选择技能强化自己</p>
              <p>• 尽可能存活更久！</p>
            </div>
          </div>
        )}

        {gameState === "paused" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-lg">
            <h2 className="text-3xl font-bold text-white mb-8">游戏暂停</h2>
            <div className="space-y-4">
              <Button onClick={() => setGameState("playing")} size="lg" className="w-48">
                继续游戏
              </Button>
              <Button
                onClick={() => {
                  setGameState("menu");
                }}
                variant="outline"
                size="lg"
                className="w-48"
              >
                返回菜单
              </Button>
            </div>
          </div>
        )}

        {gameState === "levelup" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 rounded-lg">
            <h2 className="text-3xl font-bold text-white mb-8">升级！</h2>
            <div className="space-y-4 w-full max-w-md px-4">
              {skillOptions.map((skill) => (
                <Button
                  key={skill.id}
                  onClick={() => selectSkill(skill)}
                  variant="outline"
                  size="lg"
                  className="w-full text-left justify-start h-auto py-4"
                >
                  <div>
                    <div className="font-bold text-lg">{skill.name}</div>
                    <div className="text-sm text-slate-400">{skill.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        {gameState === "gameover" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 rounded-lg">
            <h2 className="text-4xl font-bold text-red-500 mb-4">游戏结束</h2>
            {isNewRecord && (
              <p className="text-2xl text-yellow-400 mb-4">🎉 新纪录！</p>
            )}
            <div className="text-white text-xl mb-8 space-y-2">
              <p>得分: {stats.score}</p>
              <p>击杀: {stats.killCount}</p>
              <p>
                生存时间: {Math.floor(stats.survivalTime / 60)}:
                {(stats.survivalTime % 60).toString().padStart(2, "0")}
              </p>
              <p>等级: {playerRef.current.level}</p>
              <p className="text-slate-400">最高分: {stats.highScore}</p>
            </div>
            <div className="space-y-4">
              <Button onClick={initGame} size="lg" className="w-48">
                再来一局
              </Button>
              <Button
                onClick={() => setGameState("menu")}
                variant="outline"
                size="lg"
                className="w-48"
              >
                返回菜单
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 text-slate-500 text-sm">
        按 ESC 暂停游戏
      </div>
    </div>
  );
}
