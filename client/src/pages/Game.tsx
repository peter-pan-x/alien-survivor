import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface Player {
  x: number;
  y: number;
  radius: number;
  health: number;
  maxHealth: number;
  exp: number;
  level: number;
  attackDamage: number;
  attackSpeed: number;
  attackRange: number;
  bulletCount: number;
  shield: number;
  maxShield: number;
  moveSpeed: number;
}

interface Enemy {
  x: number;
  y: number;
  radius: number;
  health: number;
  maxHealth: number;
  speed: number;
  angle: number;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  radius: number;
}

interface Skill {
  id: string;
  name: string;
  description: string;
  type: "health" | "attack" | "shield" | "special";
}

const SKILLS: Skill[] = [
  { id: "health_boost", name: "生命强化", description: "最大生命值 +20", type: "health" },
  { id: "attack_boost", name: "攻击强化", description: "攻击力 +5", type: "attack" },
  { id: "speed_boost", name: "速度强化", description: "攻击速度 +15%", type: "attack" },
  { id: "range_boost", name: "射程强化", description: "攻击范围 +50", type: "attack" },
  { id: "multi_shot", name: "多重射击", description: "子弹数量 +1", type: "attack" },
  { id: "shield_boost", name: "护盾强化", description: "最大护盾 +20", type: "shield" },
  { id: "pierce_shot", name: "穿透射击", description: "子弹可穿透敌人", type: "special" },
  { id: "life_steal", name: "生命汲取", description: "击杀敌人恢复5点生命", type: "special" },
  { id: "bullet_size", name: "子弹增幅", description: "子弹体积 +50%", type: "attack" },
  { id: "move_speed", name: "移动加速", description: "移动速度 +20%", type: "special" },
];

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<"menu" | "playing" | "paused" | "levelup" | "gameover">("menu");
  const [score, setScore] = useState(0);
  const [killCount, setKillCount] = useState(0);
  const [skillOptions, setSkillOptions] = useState<Skill[]>([]);
  const [acquiredSkills, setAcquiredSkills] = useState<string[]>([]);
  
  // 使用 ref 存储游戏状态，避免渲染延迟
  const playerRef = useRef<Player>({
    x: 0,
    y: 0,
    radius: 15,
    health: 100,
    maxHealth: 100,
    exp: 0,
    level: 1,
    attackDamage: 10,
    attackSpeed: 1.5,
    attackRange: 300,
    bulletCount: 1,
    shield: 0,
    maxShield: 0,
    moveSpeed: 3,
  });
  
  const enemiesRef = useRef<Enemy[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const lastShotTimeRef = useRef<number>(0);
  const lastDamageTimeRef = useRef<number>(0);
  const mousePositionRef = useRef({ x: 0, y: 0 });
  const keysRef = useRef<Set<string>>(new Set());

  // 初始化游戏
  const initGame = () => {
    setGameState("playing");
    setScore(0);
    setKillCount(0);
    setAcquiredSkills([]);
  };

  // 当游戏状态变为 playing 时初始化
  useEffect(() => {
    if (gameState !== "playing") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = Math.min(window.innerWidth, 600);
    const height = Math.min(window.innerHeight - 200, 800);
    canvas.width = width;
    canvas.height = height;

    playerRef.current = {
      x: width / 2,
      y: height / 2,
      radius: 15,
      health: 100,
      maxHealth: 100,
      exp: 0,
      level: 1,
      attackDamage: 10,
      attackSpeed: 1.5,
      attackRange: 300,
      bulletCount: 1,
      shield: 0,
      maxShield: 0,
      moveSpeed: 3,
    };
    
    enemiesRef.current = [];
    bulletsRef.current = [];
    particlesRef.current = [];
    mousePositionRef.current = { x: width / 2, y: height / 2 };
    lastShotTimeRef.current = 0;
    lastDamageTimeRef.current = 0;
  }, [gameState]);

  // 生成敌人
  const spawnEnemy = (canvas: HTMLCanvasElement): Enemy => {
    const side = Math.floor(Math.random() * 4);
    let x = 0, y = 0;

    switch (side) {
      case 0: x = Math.random() * canvas.width; y = -20; break;
      case 1: x = canvas.width + 20; y = Math.random() * canvas.height; break;
      case 2: x = Math.random() * canvas.width; y = canvas.height + 20; break;
      case 3: x = -20; y = Math.random() * canvas.height; break;
    }

    const baseHealth = 15 + Math.floor(killCount / 10) * 5;
    const baseSpeed = 0.8 + Math.floor(killCount / 20) * 0.15;

    return {
      x, y,
      radius: 12,
      health: baseHealth,
      maxHealth: baseHealth,
      speed: Math.min(baseSpeed, 2.5),
      angle: 0,
    };
  };

  // 创建粒子效果
  const createParticles = (x: number, y: number, color: string, count: number = 5) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 2 + Math.random() * 2;
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30,
        maxLife: 30,
        color,
        radius: 3,
      });
    }
  };

  // 升级
  const levelUp = () => {
    const availableSkills = SKILLS.filter(skill => {
      if (["pierce_shot", "life_steal", "move_speed", "bullet_size"].includes(skill.id)) {
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
        player.maxHealth += 20;
        player.health = Math.min(player.health + 20, player.maxHealth);
        break;
      case "attack_boost":
        player.attackDamage += 5;
        break;
      case "speed_boost":
        player.attackSpeed *= 1.15;
        break;
      case "range_boost":
        player.attackRange += 50;
        break;
      case "multi_shot":
        player.bulletCount += 1;
        break;
      case "shield_boost":
        player.maxShield += 20;
        player.shield = player.maxShield;
        break;
      case "move_speed":
        player.moveSpeed *= 1.2;
        break;
    }

    setAcquiredSkills((prev) => [...prev, skill.id]);
    setGameState("playing");
  };

  // 键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
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
  }, []);

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
      const deltaTime = (now - lastFrame) / 16.67; // 标准化到 60fps
      lastFrame = now;

      const player = playerRef.current;
      const enemies = enemiesRef.current;
      const bullets = bulletsRef.current;
      const particles = particlesRef.current;

      // 清空画布
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 绘制网格背景
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // 更新玩家位置（键盘控制）
      const keys = keysRef.current;
      let dx = 0, dy = 0;
      if (keys.has('w') || keys.has('arrowup')) dy -= 1;
      if (keys.has('s') || keys.has('arrowdown')) dy += 1;
      if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
      if (keys.has('d') || keys.has('arrowright')) dx += 1;

      if (dx !== 0 || dy !== 0) {
        const length = Math.sqrt(dx * dx + dy * dy);
        dx /= length;
        dy /= length;
        player.x += dx * player.moveSpeed * deltaTime;
        player.y += dy * player.moveSpeed * deltaTime;

        // 限制在画布内
        player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
        player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));
      }

      // 生成敌人
      const enemySpawnInterval = Math.max(1500 - Math.floor(killCount / 10) * 100, 400);
      if (now - lastEnemySpawn > enemySpawnInterval) {
        enemies.push(spawnEnemy(canvas));
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

        const bulletSpeed = 8;
        const spreadAngle = player.bulletCount > 1 ? Math.PI / 4 : 0;
        const bulletRadius = acquiredSkills.includes("bullet_size") ? 6 : 4;

        for (let i = 0; i < player.bulletCount; i++) {
          const offset = player.bulletCount === 1 ? 0 : 
            (i - (player.bulletCount - 1) / 2) * (spreadAngle / Math.max(player.bulletCount - 1, 1));
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

      // 更新并绘制粒子
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * deltaTime;
        p.y += p.vy * deltaTime;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.life -= deltaTime;

        if (p.life <= 0) {
          particles.splice(i, 1);
        } else {
          const alpha = p.life / p.maxLife;
          ctx.fillStyle = p.color.replace(")", `, ${alpha})`).replace("rgb", "rgba");
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 更新并绘制子弹
      for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.x += bullet.vx * deltaTime;
        bullet.y += bullet.vy * deltaTime;

        // 移除屏幕外的子弹
        if (bullet.x < -20 || bullet.x > canvas.width + 20 ||
            bullet.y < -20 || bullet.y > canvas.height + 20) {
          bullets.splice(i, 1);
          continue;
        }

        // 绘制子弹光晕
        const gradient = ctx.createRadialGradient(bullet.x, bullet.y, 0, bullet.x, bullet.y, bullet.radius * 2);
        gradient.addColorStop(0, "#fbbf24");
        gradient.addColorStop(0.5, "#f59e0b");
        gradient.addColorStop(1, "rgba(245, 158, 11, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius * 2, 0, Math.PI * 2);
        ctx.fill();

        // 绘制子弹核心
        ctx.fillStyle = "#fef3c7";
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 更新并绘制敌人
      for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        // 移动敌人
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        enemy.x += Math.cos(angle) * enemy.speed * deltaTime;
        enemy.y += Math.sin(angle) * enemy.speed * deltaTime;
        enemy.angle = angle;

        // 碰撞检测：子弹与敌人
        for (let j = bullets.length - 1; j >= 0; j--) {
          const bullet = bullets[j];
          const dx = bullet.x - enemy.x;
          const dy = bullet.y - enemy.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < bullet.radius + enemy.radius) {
            enemy.health -= bullet.damage;
            createParticles(enemy.x, enemy.y, "rgb(239, 68, 68)", 3);

            if (!acquiredSkills.includes("pierce_shot")) {
              bullets.splice(j, 1);
            }

            if (enemy.health <= 0) {
              enemies.splice(i, 1);
              setScore((prev) => prev + 10);
              setKillCount((prev) => prev + 1);
              createParticles(enemy.x, enemy.y, "rgb(239, 68, 68)", 8);

              // 生命汲取
              if (acquiredSkills.includes("life_steal")) {
                player.health = Math.min(player.health + 5, player.maxHealth);
              }

              // 经验和升级
              player.exp += 10;
              const expNeeded = player.level * 50;
              if (player.exp >= expNeeded) {
                player.exp -= expNeeded;
                player.level += 1;
                setTimeout(() => levelUp(), 0);
              }
              break;
            }
          }
        }

        if (enemy.health <= 0) continue;

        // 碰撞检测：敌人与玩家
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < player.radius + enemy.radius) {
          if (now - lastDamageTimeRef.current > 500) {
            lastDamageTimeRef.current = now;

            let damage = 5;
            if (player.shield > 0) {
              player.shield = Math.max(0, player.shield - damage);
              damage = Math.max(0, damage - player.shield);
            }
            player.health -= damage;

            createParticles(player.x, player.y, "rgb(59, 130, 246)", 5);

            if (player.health <= 0) {
              setGameState("gameover");
              return;
            }
          }
        }

        // 绘制敌人阴影
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.beginPath();
        ctx.arc(enemy.x + 2, enemy.y + 2, enemy.radius, 0, Math.PI * 2);
        ctx.fill();

        // 绘制敌人身体
        const gradient = ctx.createRadialGradient(enemy.x, enemy.y, 0, enemy.x, enemy.y, enemy.radius);
        gradient.addColorStop(0, "#ef4444");
        gradient.addColorStop(1, "#991b1b");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fill();

        // 绘制敌人眼睛
        const eyeOffset = 4;
        ctx.fillStyle = "#7f1d1d";
        ctx.beginPath();
        ctx.arc(enemy.x - eyeOffset, enemy.y - 3, 2, 0, Math.PI * 2);
        ctx.arc(enemy.x + eyeOffset, enemy.y - 3, 2, 0, Math.PI * 2);
        ctx.fill();

        // 绘制血条
        const barWidth = enemy.radius * 2.5;
        const barHeight = 4;
        const barX = enemy.x - barWidth / 2;
        const barY = enemy.y - enemy.radius - 10;

        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(barX, barY, barWidth, barHeight);

        const healthPercent = enemy.health / enemy.maxHealth;
        const healthColor = healthPercent > 0.5 ? "#22c55e" : healthPercent > 0.25 ? "#eab308" : "#ef4444";
        ctx.fillStyle = healthColor;
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
      }

      // 绘制玩家阴影
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.beginPath();
      ctx.arc(player.x + 2, player.y + 2, player.radius, 0, Math.PI * 2);
      ctx.fill();

      // 绘制玩家身体
      const playerGradient = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, player.radius);
      playerGradient.addColorStop(0, "#60a5fa");
      playerGradient.addColorStop(1, "#1e40af");
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
        ctx.arc(player.x, player.y, player.radius + 5, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 绘制玩家准星
      const aimAngle = Math.atan2(
        mousePositionRef.current.y - player.y,
        mousePositionRef.current.x - player.x
      );
      const aimDistance = 25;
      const aimX = player.x + Math.cos(aimAngle) * aimDistance;
      const aimY = player.y + Math.sin(aimAngle) * aimDistance;
      
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(aimX, aimY);
      ctx.stroke();

      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(aimX, aimY, 4, 0, Math.PI * 2);
      ctx.fill();

      animationId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [gameState, acquiredSkills, killCount]);

  const player = playerRef.current;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-2 sm:p-4">
      <div className="mb-2 sm:mb-4 text-white text-center">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
          异星幸存者
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">使用 WASD 或方向键移动，鼠标控制瞄准</p>
      </div>

      {gameState === "menu" && (
        <div className="bg-slate-800/90 backdrop-blur-sm p-6 sm:p-8 rounded-lg text-white text-center max-w-md border border-slate-700">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            游戏说明
          </h2>
          <div className="text-left space-y-2 mb-6 text-xs sm:text-sm">
            <p>🌍 你的星球已毁灭，被派往异星寻找新家园</p>
            <p>👾 击败不断涌现的怪物，获取经验升级</p>
            <p>⚡ 每次升级可选择一种技能强化自己</p>
            <p>⌨️ WASD/方向键移动，鼠标控制瞄准</p>
            <p>🔫 自动射击，尽可能存活更久！</p>
          </div>
          <Button onClick={initGame} className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
            开始游戏
          </Button>
        </div>
      )}

      {gameState === "playing" && (
        <>
          <div className="mb-2 flex gap-2 sm:gap-4 text-white text-xs sm:text-sm font-semibold">
            <div className="bg-slate-800/80 px-2 sm:px-3 py-1 rounded">等级 {player.level}</div>
            <div className="bg-slate-800/80 px-2 sm:px-3 py-1 rounded">分数 {score}</div>
            <div className="bg-slate-800/80 px-2 sm:px-3 py-1 rounded">击杀 {killCount}</div>
          </div>
          <div className="mb-2 w-full max-w-[600px] space-y-1">
            <div className="flex gap-2">
              <div className="flex-1">
                <div className="text-xs text-white mb-1 font-semibold">生命值 {Math.max(0, Math.floor(player.health))}/{player.maxHealth}</div>
                <div className="bg-slate-800 h-3 sm:h-4 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-400 h-full transition-all duration-300"
                    style={{ width: `${Math.max(0, (player.health / player.maxHealth) * 100)}%` }}
                  />
                </div>
              </div>
              {player.maxShield > 0 && (
                <div className="flex-1">
                  <div className="text-xs text-white mb-1 font-semibold">护盾 {Math.max(0, Math.floor(player.shield))}/{player.maxShield}</div>
                  <div className="bg-slate-800 h-3 sm:h-4 rounded-full overflow-hidden border border-slate-700">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full transition-all duration-300"
                      style={{ width: `${Math.max(0, (player.shield / player.maxShield) * 100)}%` }}
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
            攻击: {player.attackDamage} | 攻速: {player.attackSpeed.toFixed(1)} | 子弹: {player.bulletCount} | 移速: {player.moveSpeed.toFixed(1)}
          </div>
        </>
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
                    <div className="text-xs text-slate-400">{skill.description}</div>
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
            <div className="space-y-2 mb-6 text-sm sm:text-base">
              <p className="text-xl sm:text-2xl font-bold text-yellow-400">最终分数: {score}</p>
              <p>达到等级: <span className="font-bold text-blue-400">{player.level}</span></p>
              <p>击杀数量: <span className="font-bold text-red-400">{killCount}</span></p>
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

