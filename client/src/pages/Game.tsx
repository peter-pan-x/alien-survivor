import { useEffect, useRef, useState } from "react";
import { GameMode, GameState, GameStats } from "../gameTypes";
import { GameStorage } from "../utils/GameStorage";
import { VirtualJoystick } from "../utils/VirtualJoystick";
import { GameEngine } from "../core/GameEngine";
import { PixelUI } from "../components/PixelUI";
import type { SkillEffect } from "../systems/SkillSystem";
import type { DailyChallenge } from "../systems/DailyChallengeSystem";
import type { Achievement, AchievementProgress } from "../systems/AchievementSystem";
import { DeviceUtils } from "../utils/DeviceUtils";
import "../styles/pixel.css";

/**
 * Game 组件 - 轻量级 UI 控制器
 * 
 * 职责:
 * 1. 渲染 Canvas 和 UI 元素
 * 2. 捕获用户输入并传递给 GameEngine
 * 3. 从 GameEngine 获取状态并更新 UI
 * 4. 管理游戏状态机 (menu, playing, levelup, gameover)
 */
export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);
  const virtualJoystickRef = useRef<VirtualJoystick | null>(null);
  const keysRef = useRef<Set<string>>(new Set());

  // React 状态 (仅用于 UI)
  const [gameState, setGameState] = useState<GameState>("menu");
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    killCount: 0,
    highScore: 0,
    survivalTime: 0,
  });
  const [skillOptions, setSkillOptions] = useState<SkillEffect[]>([]);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>("classic");
  const [dailyBestScore, setDailyBestScore] = useState(0);
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null); // 新增：每日挑战状态
  const [achievements, setAchievements] = useState<Achievement[]>([]); // 新增：成就列表
  const [achievementProgress, setAchievementProgress] = useState<Map<string, AchievementProgress>>(new Map()); // 新增：成就进度

  // 加载最高分
  useEffect(() => {
    const savedData = GameStorage.load();
    setStats((prev) => ({ ...prev, highScore: savedData.highScore }));
  }, []);

  // 初始化虚拟摇杆和设备优化
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    virtualJoystickRef.current = new VirtualJoystick(canvas);

    // 防止移动端双击缩放
    DeviceUtils.preventDoubleTapZoom(canvas);

    // 检测设备信息
    const deviceInfo = DeviceUtils.detectDevice();
    if (import.meta.env.DEV) {
      console.log('[Game] Device info:', deviceInfo);
      console.log('[Game] Performance level:', DeviceUtils.getPerformanceLevel());
    }

    // 移动端：尝试锁定横屏方向（游戏更适合横屏）
    if (deviceInfo.isMobile && deviceInfo.orientation === 'landscape') {
      DeviceUtils.lockOrientation('landscape').catch(() => {
        if (import.meta.env.DEV) {
          console.log('[Game] Screen orientation lock not supported');
        }
      });
    }

    return () => {
      virtualJoystickRef.current?.destroy();
      DeviceUtils.unlockOrientation();
    };
  }, []);

  // 初始化游戏引擎
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || gameEngineRef.current) {
      return;
    }

    try {
      const engine = new GameEngine(canvas);

      // 设置回调函数
      engine.setCallbacks({
        onLevelUp: handleLevelUp,
        onGameOver: handleGameOver,
        onStatsUpdate: (newStats) => {
          setStats((prev) => ({ ...prev, ...newStats }));
        },
      });

      gameEngineRef.current = engine;

      // 获取每日挑战信息（新增）
      const challengeSystem = engine.getDailyChallengeSystem();
      challengeSystem.generateTodaysChallenge();
      const currentChallenge = challengeSystem.getCurrentChallenge();
      setDailyChallenge(currentChallenge);
      if (currentChallenge) {
        const savedData = GameStorage.load();
        setDailyBestScore(savedData.dailyBestByDate[currentChallenge.id] ?? 0);
      }

      // 获取成就系统信息（新增）
      const achievementSystem = engine.getAchievementSystem();
      setAchievements(achievementSystem.getAllAchievements());
      setAchievementProgress(achievementSystem.getAllProgress());

      // 将虚拟摇杆传递给引擎（用于渲染）
      if (virtualJoystickRef.current) {
        engine.setVirtualJoystick(virtualJoystickRef.current);
      }

      // 初始化时按窗口尺寸自适配
      engine.resizeToWindow();
      virtualJoystickRef.current?.updateCanvasRect();

      // 绑定窗口resize事件以自动适配
      const handleResize = () => {
        gameEngineRef.current?.resizeToWindow();
        virtualJoystickRef.current?.updateCanvasRect();
      };
      window.addEventListener("resize", handleResize);
      // 立即调用一次，确保首屏正确
      handleResize();

      // 清理监听
      return () => {
        window.removeEventListener("resize", handleResize);
        gameEngineRef.current?.destroy();
        gameEngineRef.current = null;
      };
    } catch (error) {
      console.error('[Game] 游戏引擎初始化失败:', error);
    }
  }, []);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current.add(key);

      // ESC键暂停/继续
      if (key === "escape") {
        if (gameState === "playing") {
          setGameState("paused");
          gameEngineRef.current?.stop();
        } else if (gameState === "paused") {
          setGameState("playing");
          gameEngineRef.current?.start();
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

  // 同步输入到游戏引擎
  useEffect(() => {
    if (gameState !== "playing") return;

    let animationId: number;
    let active = true;

    const syncInput = () => {
      if (!active) return;
      const engine = gameEngineRef.current;
      if (!engine) return;

      // 同步键盘输入
      engine.setKeys(keysRef.current);

      // 同步摇杆输入
      const joystick = virtualJoystickRef.current?.getMovementVector() || {
        x: 0,
        y: 0,
      };
      engine.setJoystickInput(joystick.x, joystick.y);

      animationId = requestAnimationFrame(syncInput);
    };

    animationId = requestAnimationFrame(syncInput);

    return () => {
      active = false;
      cancelAnimationFrame(animationId);
    };
  }, [gameState]);

  /**
   * 开始游戏
   */
  const initGame = async (mode: GameMode = gameMode) => {
    const engine = gameEngineRef.current;
    if (!engine) {
      console.error('[Game] GameEngine not initialized!');
      return;
    }

    // 移动端：尝试进入全屏模式
    const deviceInfo = DeviceUtils.detectDevice();
    if (deviceInfo.isMobile && !DeviceUtils.isFullscreen()) {
      await DeviceUtils.requestFullscreen(document.documentElement);
    }

    setGameMode(mode);
    engine.setGameMode(mode);
    engine.reset(mode);

    // 重置 UI 状态
    setStats((prev) => ({
      score: 0,
      killCount: 0,
      highScore: prev.highScore,
      survivalTime: 0,
    }));
    setIsNewRecord(false);
    setGameState("playing");

    // 启动游戏循环
    engine.start();
  };

  /**
   * 升级处理
   */
  const handleLevelUp = () => {
    // 暂停游戏
    gameEngineRef.current?.stop();

    // 使用技能系统获取可用技能
    const engine = gameEngineRef.current;
    if (!engine) return;

    const skillSystem = engine.getSkillSystem();
    const player = engine.getPlayer();
    
    // 获取3个随机可用技能
    const randomSkills = skillSystem.getRandomSkills(player, 3);

    setSkillOptions(randomSkills);
    setGameState("levelup");
  };

  /**
   * 选择技能
   */
  const selectSkill = (skill: SkillEffect) => {
    const engine = gameEngineRef.current;
    if (!engine) return;

    // 应用技能到游戏引擎（通过技能系统）
    engine.applySkill(skill.id);

    // 继续游戏
    setGameState("playing");
    
    // 延迟一帧后更新摇杆状态，确保 canvas 已经显示
    requestAnimationFrame(() => {
      virtualJoystickRef.current?.updateCanvasRect();
    });
    
    engine.start();
  };

  /**
   * 游戏结束处理
   */
  const handleGameOver = () => {
    const engine = gameEngineRef.current;
    if (!engine) return;

    const currentStats = engine.getStats();

    const isRecord = GameStorage.recordGameEnd(
      currentStats.score,
      currentStats.killCount,
      currentStats.survivalTime,
      engine.getGameMode(),
      engine.getCurrentChallengeId()
    );

    if (isRecord) {
      setIsNewRecord(true);
      setStats((prev) => ({ ...prev, highScore: currentStats.score }));
    }

    const savedData = GameStorage.load();
    const challengeId = engine.getCurrentChallengeId();
    if (challengeId) {
      setDailyBestScore(savedData.dailyBestByDate[challengeId] ?? 0);
    }

    setGameState("gameover");
  };

  /**
   * 继续游戏
   */
  const resumeGame = () => {
    setGameState("playing");
    gameEngineRef.current?.start();
  };

  // 从 GameEngine 读取当前玩家快照，供 React HUD 使用。
  const playerData = (() => {
    const player = gameEngineRef.current?.getPlayer();
    if (!player) {
      return {
        health: 0,
        maxHealth: 100,
        shield: 0,
        maxShield: 0,
        level: 1,
        exp: 0,
        lives: 3, // 新增：默认3条命
        maxLives: 3, // 新增：最大3条命
        bulletCount: 1,
        hasFrostShot: false,
        hasFlameAttack: false,
        hasPierce: false,
        critChance: 0,
        weapons: [],
      };
    }
    return {
      health: player.health,
      maxHealth: player.maxHealth,
      shield: player.shield,
      maxShield: player.maxShield,
      level: player.level,
      exp: player.exp,
      lives: player.lives, // 新增
      maxLives: player.maxLives, // 新增
      bulletCount: player.bulletCount,
      hasFrostShot: player.hasFrostShot,
      hasFlameAttack: player.hasFlameAttack,
      hasPierce: player.hasPierce,
      critChance: player.critChance,
      weapons: player.weapons.map((weapon) => ({
        type: weapon.type,
        level: weapon.level,
      })),
    };
  })();

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-900">
      {/* Canvas - 完全充满窗口 */}
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{
          touchAction: "none",
          display: gameState === "menu" || gameState === "gameover" || gameState === "levelup" ? "none" : "block",
          imageRendering: "pixelated",
        }}
      />
      
      {/* 像素风格UI */}
      <PixelUI
        gameState={gameState}
        stats={stats}
        player={playerData}
        skillOptions={skillOptions}
        isNewRecord={isNewRecord}
        gameMode={gameMode}
        onStartGame={initGame}
        onResume={resumeGame}
        onSelectSkill={selectSkill}
        onRestart={() => initGame(gameMode)}
        dailyChallenge={dailyChallenge}
        dailyBestScore={dailyBestScore}
        achievements={achievements}
        achievementProgress={achievementProgress}
      />
    </div>
  );
}
