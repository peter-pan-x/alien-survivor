import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Player, Enemy, Bullet, GameState, GameStats } from "../gameTypes";
import { GAME_CONFIG, SKILLS, Skill } from "../gameConfig";
import { ParticlePool } from "../utils/ParticlePool";
import { BackgroundRenderer } from "../utils/BackgroundRenderer";
import { SpatialGrid } from "../utils/SpatialGrid";
import { GameStorage } from "../utils/GameStorage";
import { DamageNumberSystem } from "../utils/DamageNumbers";

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
  });

  const enemiesRef = useRef<Enemy[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const lastShotTimeRef = useRef<number>(0);
  const lastDamageTimeRef = useRef<number>(0);
  const gameStartTimeRef = useRef<number>(0);
  const mousePositionRef = useRef({ x: 0, y: 0 });
  const keysRef = useRef<Set<string>>(new Set());

  // 加载最高分
  useEffect(() => {
    const savedData = GameStorage.load();
    setStats((prev) => ({ ...prev, highScore: savedData.highScore }));
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
      exp: 0,
      level: 1,
      attackDamage: GAME_CONFIG.PLAYER.INITIAL_ATTACK_DAMAGE,
      attackSpeed: GAME_CONFIG.PLAYER.INITIAL_ATTACK_SPEED,
      attackRange: GAME_CONFIG.PLAYER.INITIAL_ATTACK_RANGE,
      bulletCount: GAME_CONFIG.PLAYER.INITIAL_BULLET_COUNT,
      shield: 0,
      maxShield: 0,
      moveSpeed: GAME_CONFIG.PLAYER.INITIAL_MOVE_SPEED,
    };

    // 重置游戏状态
    enemiesRef.current = [];
    bulletsRef.current = [];
    particlePoolRef.current.clear();
    damageNumbersRef.current.clear();
    mousePositionRef.current = { x: width / 2, y: height / 2 };
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

  // 生成敌人
  const spawnEnemy = (canvas: HTMLCanvasElement, killCount: number): Enemy => {
    const side = Math.floor(Math.random() * 4);
    const offset = GAME_CONFIG.ENEMY.SPAWN_OFFSET;
    let x = 0,
      y = 0;

    switch (side) {
      case 0:
        x = Math.random() * canvas.width;
        y = -offset;
        break;
      case 1:
        x = canvas.width + offset;
        y = Math.random() * canvas.height;
        break;
      case 2:
        x = Math.random() * canvas.width;
        y = canvas.height + offset;
        break;
      case 3:
        x = -offset;
        y = Math.random() * canvas.height;
        break;
    }

    const baseHealth =
      GAME_CONFIG.ENEMY.BASE_HEALTH +
      Math.floor(killCount / 10) * GAME_CONFIG.ENEMY.HEALTH_INCREMENT_PER_10_KILLS;
    const baseSpeed =
      GAME_CONFIG.ENEMY.BASE_SPEED +
      Math.floor(killCount / 20) * GAME_CONFIG.ENEMY.SPEED_INCREMENT_PER_20_KILLS;

    return {
      x,
      y,
      radius: GAME_CONFIG.ENEMY.RADIUS,
      health: baseHealth,
      maxHealth: baseHealth,
      speed: Math.min(baseSpeed, GAME_CONFIG.ENEMY.MAX_SPEED),
      angle: 0,
    };
  };

  // 升级
  const levelUp = () => {
    const availableSkills = SKILLS.filter((skill) => {
      if (
        ["pierce_shot", "life_steal", "move_speed", "bullet_size"].includes(
          skill.id
        )
      ) {
        return !acquiredSkills.includes(skill.id);
      }
      return true;
    });

    const randomSkills = [...availableSkills]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

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
      case "move_speed":
        player.moveSpeed *= GAME_CONFIG.SKILLS.MOVE_SPEED_MULTIPLIER;
        player.moveSpeed = Math.min(
          player.moveSpeed,
          GAME_CONFIG.PLAYER.MAX_MOVE_SPEED
        );
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

  // 鼠标/触摸移动事件
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mousePositionRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      mousePositionRef.current = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchstart", handleTouchMove, { passive: false });

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchstart", handleTouchMove);
    };
  }, []);

  // 游戏循环
  useEffect(() => {
    if (gameState !== "playing") return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let animationId: number;
    let lastEnemySpawn = Date.now();
    let lastFrame = Date.now();

    const gameLoop = () => {
      const now = Date.now();
      const deltaTime = Math.min((now - lastFrame) / GAME_CONFIG.RENDERING.FRAME_TIME, 2);
      lastFrame = now;

      const player = playerRef.current;
      const enemies = enemiesRef.current;
      const bullets = bulletsRef.current;
      const particlePool = particlePoolRef.current;
      const spatialGrid = spatialGridRef.current!;
      const damageNumbers = damageNumbersRef.current;

      // 更新存活时间
      const survivalTime = Math.floor((now - gameStartTimeRef.current) / 1000);
      setStats((prev) => ({ ...prev, survivalTime }));

      // 绘制背景（使用离屏Canvas）
      backgroundRendererRef.current?.draw(ctx);

      // 更新玩家位置（键盘控制）
      const keys = keysRef.current;
      let dx = 0,
        dy = 0;
      if (keys.has("w") || keys.has("arrowup")) dy -= 1;
      if (keys.has("s") || keys.has("arrowdown")) dy += 1;
      if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
      if (keys.has("d") || keys.has("arrowright")) dx += 1;

      if (dx !== 0 || dy !== 0) {
        const length = Math.sqrt(dx * dx + dy * dy);
        dx /= length;
        dy /= length;
        player.x += dx * player.moveSpeed * deltaTime;
        player.y += dy * player.moveSpeed * deltaTime;

        // 限制在画布内
        player.x = Math.max(
          player.radius,
          Math.min(canvas.width - player.radius, player.x)
        );
        player.y = Math.max(
          player.radius,
          Math.min(canvas.height - player.radius, player.y)
        );
      }

      // 生成敌人
      const enemySpawnInterval = Math.max(
        GAME_CONFIG.ENEMY.INITIAL_SPAWN_INTERVAL -
          Math.floor(stats.killCount / 10) *
            GAME_CONFIG.ENEMY.SPAWN_INTERVAL_DECREASE_PER_10_KILLS,
        GAME_CONFIG.ENEMY.MIN_SPAWN_INTERVAL
      );
      if (now - lastEnemySpawn > enemySpawnInterval) {
        enemies.push(spawnEnemy(canvas, stats.killCount));
        lastEnemySpawn = now;
      }

      // 自动射击
      const shootInterval = 1000 / player.attackSpeed;
      if (now - lastShotTimeRef.current > shootInterval) {
        lastShotTimeRef.current = now;

        const angleToMouse = Math.atan2(
          mousePositionRef.current.y - player.y,
          mousePositionRef.current.x - player.x
        );

        const bulletSpeed = GAME_CONFIG.BULLET.SPEED;
        const spreadAngle =
          player.bulletCount > 1 ? GAME_CONFIG.BULLET.SPREAD_ANGLE : 0;
        const bulletRadius = acquiredSkills.includes("bullet_size")
          ? GAME_CONFIG.BULLET.ENLARGED_RADIUS
          : GAME_CONFIG.BULLET.BASE_RADIUS;

        for (let i = 0; i < player.bulletCount; i++) {
          const offset =
            player.bulletCount === 1
              ? 0
              : ((i - (player.bulletCount - 1) / 2) * spreadAngle) /
                Math.max(player.bulletCount - 1, 1);
          const angle = angleToMouse + offset;

          bullets.push({
            x: player.x,
            y: player.y,
            vx: Math.cos(angle) * bulletSpeed,
            vy: Math.sin(angle) * bulletSpeed,
            radius: bulletRadius,
            damage: player.attackDamage,
          });
        }
      }

      // 更新粒子
      particlePool.update(deltaTime);

      // 更新伤害数字
      damageNumbers.update(deltaTime);

      // 更新并绘制子弹
      for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.x += bullet.vx * deltaTime;
        bullet.y += bullet.vy * deltaTime;

        // 移除屏幕外的子弹
        if (
          bullet.x < -20 ||
          bullet.x > canvas.width + 20 ||
          bullet.y < -20 ||
          bullet.y > canvas.height + 20
        ) {
          bullets.splice(i, 1);
          continue;
        }

        // 绘制子弹光晕
        const gradient = ctx.createRadialGradient(
          bullet.x,
          bullet.y,
          0,
          bullet.x,
          bullet.y,
          bullet.radius * 2
        );
        gradient.addColorStop(0, GAME_CONFIG.COLORS.BULLET_GRADIENT_START);
        gradient.addColorStop(0.5, GAME_CONFIG.COLORS.BULLET_GRADIENT_END);
        gradient.addColorStop(1, "rgba(245, 158, 11, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius * 2, 0, Math.PI * 2);
        ctx.fill();

        // 绘制子弹核心
        ctx.fillStyle = GAME_CONFIG.COLORS.BULLET_CORE;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 构建空间网格
      spatialGrid.clear();
      for (const enemy of enemies) {
        spatialGrid.insert(enemy);
      }

      // 碰撞检测：子弹与敌人（使用空间分区优化）
      for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        let bulletRemoved = false;

        spatialGrid.checkBulletCollisions(bullet, (enemy) => {
          if (bulletRemoved && !acquiredSkills.includes("pierce_shot")) return;

          enemy.health -= bullet.damage;
          damageNumbers.add(enemy.x, enemy.y, bullet.damage);
          particlePool.createExplosion(
            enemy.x,
            enemy.y,
            GAME_CONFIG.COLORS.PARTICLE_ENEMY_HIT,
            GAME_CONFIG.PARTICLE.HIT_PARTICLE_COUNT,
            GAME_CONFIG.PARTICLE.BASE_SPEED,
            GAME_CONFIG.PARTICLE.BASE_LIFE,
            GAME_CONFIG.PARTICLE.BASE_RADIUS
          );

          if (!acquiredSkills.includes("pierce_shot") && !bulletRemoved) {
            bullets.splice(i, 1);
            bulletRemoved = true;
          }
        });
      }

      // 更新并绘制敌人
      for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];

        // 检查敌人是否死亡
        if (enemy.health <= 0) {
          enemies.splice(i, 1);
          setStats((prev) => ({
            ...prev,
            score: prev.score + GAME_CONFIG.LEVELING.SCORE_PER_KILL,
            killCount: prev.killCount + 1,
          }));

          particlePool.createExplosion(
            enemy.x,
            enemy.y,
            GAME_CONFIG.COLORS.PARTICLE_ENEMY_HIT,
            GAME_CONFIG.PARTICLE.DEATH_PARTICLE_COUNT,
            GAME_CONFIG.PARTICLE.BASE_SPEED,
            GAME_CONFIG.PARTICLE.BASE_LIFE,
            GAME_CONFIG.PARTICLE.BASE_RADIUS
          );

          // 生命汲取
          if (acquiredSkills.includes("life_steal")) {
            player.health = Math.min(
              player.health + GAME_CONFIG.SKILLS.LIFE_STEAL_AMOUNT,
              player.maxHealth
            );
          }

          // 经验和升级
          player.exp += GAME_CONFIG.LEVELING.EXP_PER_KILL;
          const expNeeded =
            player.level * GAME_CONFIG.LEVELING.EXP_MULTIPLIER_PER_LEVEL;
          if (player.exp >= expNeeded) {
            player.exp -= expNeeded;
            player.level += 1;
            setTimeout(() => levelUp(), 0);
          }
          continue;
        }

        // 移动敌人
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        enemy.x += Math.cos(angle) * enemy.speed * deltaTime;
        enemy.y += Math.sin(angle) * enemy.speed * deltaTime;
        enemy.angle = angle;

        // 绘制敌人阴影
        ctx.fillStyle = GAME_CONFIG.COLORS.SHADOW;
        ctx.beginPath();
        ctx.arc(enemy.x + 2, enemy.y + 2, enemy.radius, 0, Math.PI * 2);
        ctx.fill();

        // 绘制敌人身体
        const gradient = ctx.createRadialGradient(
          enemy.x,
          enemy.y,
          0,
          enemy.x,
          enemy.y,
          enemy.radius
        );
        gradient.addColorStop(0, GAME_CONFIG.COLORS.ENEMY_GRADIENT_START);
        gradient.addColorStop(1, GAME_CONFIG.COLORS.ENEMY_GRADIENT_END);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fill();

        // 绘制敌人眼睛
        const eyeOffset = 4;
        ctx.fillStyle = GAME_CONFIG.COLORS.ENEMY_EYE;
        ctx.beginPath();
        ctx.arc(enemy.x - eyeOffset, enemy.y - 3, 2, 0, Math.PI * 2);
        ctx.arc(enemy.x + eyeOffset, enemy.y - 3, 2, 0, Math.PI * 2);
        ctx.fill();

        // 绘制血条
        const barWidth =
          enemy.radius * GAME_CONFIG.RENDERING.HEALTH_BAR_WIDTH_MULTIPLIER;
        const barHeight = GAME_CONFIG.RENDERING.HEALTH_BAR_HEIGHT;
        const barX = enemy.x - barWidth / 2;
        const barY =
          enemy.y - enemy.radius - GAME_CONFIG.RENDERING.HEALTH_BAR_OFFSET;

        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(barX, barY, barWidth, barHeight);

        const healthPercent = enemy.health / enemy.maxHealth;
        const healthColor =
          healthPercent > 0.5
            ? "#22c55e"
            : healthPercent > 0.25
            ? "#eab308"
            : "#ef4444";
        ctx.fillStyle = healthColor;
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
      }

      // 碰撞检测：敌人与玩家（使用空间分区优化）
      if (now - lastDamageTimeRef.current > GAME_CONFIG.PLAYER.DAMAGE_COOLDOWN) {
        spatialGrid.checkPlayerCollisions(
          player.x,
          player.y,
          player.radius,
          (enemy) => {
            lastDamageTimeRef.current = now;

            let damage = GAME_CONFIG.ENEMY.DAMAGE_TO_PLAYER;
            if (player.shield > 0) {
              const shieldDamage = Math.min(player.shield, damage);
              player.shield -= shieldDamage;
              damage -= shieldDamage;
            }
            player.health -= damage;

            particlePool.createExplosion(
              player.x,
              player.y,
              GAME_CONFIG.COLORS.PARTICLE_PLAYER_HIT,
              5,
              GAME_CONFIG.PARTICLE.BASE_SPEED,
              GAME_CONFIG.PARTICLE.BASE_LIFE,
              GAME_CONFIG.PARTICLE.BASE_RADIUS
            );

            if (player.health <= 0) {
              const newRecord = GameStorage.recordGameEnd(
                stats.score,
                stats.killCount,
                survivalTime
              );
              setIsNewRecord(newRecord);
              if (newRecord) {
                setStats((prev) => ({ ...prev, highScore: stats.score }));
              }
              setGameState("gameover");
              return;
            }
          }
        );
      }

      // 绘制玩家阴影
      ctx.fillStyle = GAME_CONFIG.COLORS.SHADOW;
      ctx.beginPath();
      ctx.arc(player.x + 2, player.y + 2, player.radius, 0, Math.PI * 2);
      ctx.fill();

      // 绘制玩家身体
      const playerGradient = ctx.createRadialGradient(
        player.x,
        player.y,
        0,
        player.x,
        player.y,
        player.radius
      );
      playerGradient.addColorStop(0, GAME_CONFIG.COLORS.PLAYER_GRADIENT_START);
      playerGradient.addColorStop(1, GAME_CONFIG.COLORS.PLAYER_GRADIENT_END);
      ctx.fillStyle = playerGradient;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
      ctx.fill();

      // 绘制玩家护盾
      if (player.shield > 0) {
        const shieldAlpha = Math.min(player.shield / player.maxShield, 1) * 0.5;
        ctx.strokeStyle = `rgba(96, 165, 250, ${shieldAlpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(
          player.x,
          player.y,
          player.radius + GAME_CONFIG.RENDERING.SHIELD_RADIUS_OFFSET,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      }

      // 绘制玩家准星
      const aimAngle = Math.atan2(
        mousePositionRef.current.y - player.y,
        mousePositionRef.current.x - player.x
      );
      const aimDistance = GAME_CONFIG.RENDERING.AIM_INDICATOR_DISTANCE;
      const aimX = player.x + Math.cos(aimAngle) * aimDistance;
      const aimY = player.y + Math.sin(aimAngle) * aimDistance;

      ctx.strokeStyle = GAME_CONFIG.COLORS.AIM_INDICATOR;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(aimX, aimY);
      ctx.stroke();

      ctx.fillStyle = GAME_CONFIG.COLORS.AIM_INDICATOR;
      ctx.beginPath();
      ctx.arc(
        aimX,
        aimY,
        GAME_CONFIG.RENDERING.AIM_INDICATOR_RADIUS,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // 绘制粒子效果
      particlePool.render(ctx);

      // 绘制伤害数字
      damageNumbers.render(ctx);

      animationId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [gameState, acquiredSkills, stats.killCount]);

  const player = playerRef.current;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-2 sm:p-4">
      <div className="mb-2 sm:mb-4 text-white text-center">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
          异星幸存者
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          使用 WASD 或方向键移动，鼠标控制瞄准，ESC 暂停
        </p>
      </div>

      {gameState === "menu" && (
        <div className="bg-slate-800/90 backdrop-blur-sm p-6 sm:p-8 rounded-lg text-white text-center max-w-md border border-slate-700">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            游戏说明
          </h2>
          <div className="text-left space-y-2 mb-4 text-xs sm:text-sm">
            <p>🌍 你的星球已毁灭,被派往异星寻找新家园</p>
            <p>👾 击败不断涌现的怪物，获取经验升级</p>
            <p>⚡ 每次升级可选择一种技能强化自己</p>
            <p>⌨️ WASD/方向键移动，鼠标控制瞄准</p>
            <p>⏸️ ESC键暂停游戏</p>
            <p>🔫 自动射击，尽可能存活更久！</p>
          </div>
          {stats.highScore > 0 && (
            <div className="mb-4 p-3 bg-slate-700/50 rounded">
              <p className="text-sm text-yellow-400">
                🏆 最高分: {stats.highScore}
              </p>
            </div>
          )}
          <Button
            onClick={initGame}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            开始游戏
          </Button>
        </div>
      )}

      {gameState === "playing" && (
        <>
          <div className="mb-2 flex gap-2 sm:gap-4 text-white text-xs sm:text-sm font-semibold">
            <div className="bg-slate-800/80 px-2 sm:px-3 py-1 rounded">
              等级 {player.level}
            </div>
            <div className="bg-slate-800/80 px-2 sm:px-3 py-1 rounded">
              分数 {stats.score}
            </div>
            <div className="bg-slate-800/80 px-2 sm:px-3 py-1 rounded">
              击杀 {stats.killCount}
            </div>
            <div className="bg-slate-800/80 px-2 sm:px-3 py-1 rounded">
              时间 {stats.survivalTime}s
            </div>
          </div>
          <div className="mb-2 w-full max-w-[600px] space-y-1">
            <div className="flex gap-2">
              <div className="flex-1">
                <div className="text-xs text-white mb-1 font-semibold">
                  生命值 {Math.max(0, Math.floor(player.health))}/
                  {player.maxHealth}
                </div>
                <div className="bg-slate-800 h-3 sm:h-4 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-400 h-full transition-all duration-300"
                    style={{
                      width: `${Math.max(0, (player.health / player.maxHealth) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              {player.maxShield > 0 && (
                <div className="flex-1">
                  <div className="text-xs text-white mb-1 font-semibold">
                    护盾 {Math.max(0, Math.floor(player.shield))}/
                    {player.maxShield}
                  </div>
                  <div className="bg-slate-800 h-3 sm:h-4 rounded-full overflow-hidden border border-slate-700">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full transition-all duration-300"
                      style={{
                        width: `${Math.max(0, (player.shield / player.maxShield) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-white mb-1 font-semibold">
                经验值 {player.exp} / {player.level * 50}
              </div>
              <div className="bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="bg-gradient-to-r from-yellow-500 to-orange-400 h-full transition-all duration-300"
                  style={{ width: `${(player.exp / (player.level * 50)) * 100}%` }}
                />
              </div>
            </div>
          </div>
          <canvas
            ref={canvasRef}
            className="border-4 border-slate-700 rounded-lg touch-none shadow-2xl"
          />
          <div className="mt-2 text-xs text-slate-400">
            攻击: {player.attackDamage} | 攻速: {player.attackSpeed.toFixed(1)}{" "}
            | 子弹: {player.bulletCount} | 移速: {player.moveSpeed.toFixed(1)}
          </div>
        </>
      )}

      {gameState === "paused" && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-10">
          <div className="bg-slate-800/95 backdrop-blur-sm p-6 sm:p-8 rounded-lg text-white text-center max-w-md border-2 border-blue-500/50">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-cyan-500 bg-clip-text text-transparent">
              游戏暂停
            </h2>
            <p className="text-slate-300 mb-6">按 ESC 键继续游戏</p>
            <div className="space-y-2 text-sm text-slate-400">
              <p>当前分数: {stats.score}</p>
              <p>当前等级: {player.level}</p>
              <p>存活时间: {stats.survivalTime}秒</p>
            </div>
            <div className="mt-6 space-y-2">
              <Button
                onClick={() => setGameState("playing")}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700"
              >
                继续游戏
              </Button>
              <Button
                onClick={() => {
                  setGameState("menu");
                }}
                variant="outline"
                className="w-full"
              >
                返回菜单
              </Button>
            </div>
          </div>
        </div>
      )}

      {gameState === "levelup" && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-4 z-10">
          <div className="bg-slate-800/95 backdrop-blur-sm p-6 sm:p-8 rounded-lg text-white max-w-md border-2 border-yellow-500/50">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-center bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              升级！
            </h2>
            <p className="text-center mb-6 text-slate-300">选择一项技能强化</p>
            <div className="space-y-3">
              {skillOptions.map((skill) => (
                <Button
                  key={skill.id}
                  onClick={() => selectSkill(skill)}
                  className="w-full text-left justify-start h-auto py-3 px-4 bg-slate-700 hover:bg-gradient-to-r hover:from-blue-600 hover:to-purple-600 border border-slate-600 hover:border-transparent transition-all"
                  variant="outline"
                >
                  <div>
                    <div className="font-bold text-base">{skill.name}</div>
                    <div className="text-xs text-slate-400">
                      {skill.description}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-4 z-10">
          <div className="bg-slate-800/95 backdrop-blur-sm p-6 sm:p-8 rounded-lg text-white text-center max-w-md border-2 border-red-500/50">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 bg-gradient-to-r from-red-500 to-orange-600 bg-clip-text text-transparent">
              游戏结束
            </h2>
            {isNewRecord && (
              <div className="mb-4 p-3 bg-yellow-500/20 border-2 border-yellow-500 rounded-lg animate-pulse">
                <p className="text-xl font-bold text-yellow-400">
                  🎉 新纪录！🎉
                </p>
              </div>
            )}
            <div className="space-y-2 mb-6 text-sm sm:text-base">
              <p className="text-xl sm:text-2xl font-bold text-yellow-400">
                最终分数: {stats.score}
              </p>
              <p>
                达到等级: <span className="font-bold text-blue-400">{player.level}</span>
              </p>
              <p>
                击杀数量:{" "}
                <span className="font-bold text-red-400">{stats.killCount}</span>
              </p>
              <p>
                存活时间:{" "}
                <span className="font-bold text-green-400">
                  {stats.survivalTime}秒
                </span>
              </p>
              <p className="text-xs text-slate-400 mt-4">
                历史最高分: {stats.highScore}
              </p>
            </div>
            <Button
              onClick={initGame}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              重新开始
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

