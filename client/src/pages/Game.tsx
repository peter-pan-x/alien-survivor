import { useEffect, useRef, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { GameState, GameStats } from "../gameTypes";
import { GameStorage } from "../utils/GameStorage";
import { VirtualJoystick } from "../utils/VirtualJoystick";
import { GameEngine } from "../core/GameEngine";
import { PixelUI } from "../components/PixelUI";
import type { SkillEffect } from "../systems/SkillSystem";
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

    const syncInput = () => {
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

      requestAnimationFrame(syncInput);
    };

    const animationId = requestAnimationFrame(syncInput);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [gameState]);

  /**
   * 开始游戏
   */
  const initGame = () => {
    const engine = gameEngineRef.current;
    if (!engine) {
      console.error('[Game] GameEngine not initialized!');
      return;
    }

    // 重置游戏引擎
    engine.reset();

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
    engine.start();
  };

  /**
   * 游戏结束处理
   */
  const handleGameOver = () => {
    const engine = gameEngineRef.current;
    if (!engine) return;

    const currentStats = engine.getStats();

    // 检查是否破纪录
    if (currentStats.score > stats.highScore) {
      setIsNewRecord(true);
      GameStorage.updateHighScore(currentStats.score);
      setStats((prev) => ({ ...prev, highScore: currentStats.score }));
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

  // 优化：缓存玩家数据，避免频繁调用getPlayer()
  const playerData = useMemo(() => {
    const player = gameEngineRef.current?.getPlayer();
    if (!player) {
      return {
        health: 0,
        maxHealth: 100,
        shield: 0,
        maxShield: 0,
        level: 1,
        exp: 0,
      };
    }
    return {
      health: player.health,
      maxHealth: player.maxHealth,
      shield: player.shield,
      maxShield: player.maxShield,
      level: player.level,
      exp: player.exp,
    };
  }, [gameState, stats]); // 只在游戏状态或统计数据变化时更新

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-900">
      {/* Canvas - 全屏显示 */}
      <canvas
        ref={canvasRef}
        className={`w-full h-full ${
          gameState === "menu" || gameState === "gameover" || gameState === "levelup"
            ? "hidden"
            : ""
        }`}
        style={{ touchAction: "none" }}
      />
      
      {/* 像素风格UI */}
      <PixelUI
        gameState={gameState}
        stats={stats}
        player={playerData}
        skillOptions={skillOptions}
        isNewRecord={isNewRecord}
        onStartGame={initGame}
        onSelectSkill={selectSkill}
        onRestart={initGame}
      />
      
      {/* 旧UI（暂时保留作为后备） */}
      {false && gameState === "menu" && (
        <div className="flex flex-col items-center gap-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-white mb-2">异星幸存者</h1>
            <p className="text-xl text-slate-400">Alien Survivor</p>
          </div>

          <div className="text-center text-slate-300 space-y-2">
            <p>🎮 移动: WASD 或虚拟摇杆</p>
            <p>🔫 射击: 自动攻击</p>
            <p>⏸️ 暂停: ESC 键</p>
          </div>

          <Button
            onClick={initGame}
            size="lg"
            className="text-xl px-8 py-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            开始游戏
          </Button>

          {stats.highScore > 0 && (
            <div className="text-center">
              <p className="text-slate-400">最高分</p>
              <p className="text-3xl font-bold text-yellow-400">
                {stats.highScore}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 暂停界面（像素风格） */}
      {gameState === "paused" && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.8)',
            zIndex: 50,
          }}
        >
          <div className="pixel-panel" style={{ textAlign: 'center', padding: '48px' }}>
            <h2 className="pixel-title" style={{ fontSize: '40px', marginBottom: '32px', color: '#63b3ed' }}>
              PAUSED
            </h2>
            <button
              className="pixel-button"
              onClick={resumeGame}
              style={{
                padding: '16px 32px',
                fontSize: '20px',
                background: '#4a5568',
                borderColor: '#2d3748 #1a202c #1a202c #2d3748',
              }}
            >
              ▶ CONTINUE
            </button>
          </div>
        </div>
      )}

      {/* 升级界面 */}
      {gameState === "levelup" && (
        <div className="flex flex-col items-center gap-6">
          <h2 className="text-4xl font-bold text-white">升级!</h2>
          <p className="text-xl text-slate-300">选择一个技能</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl">
            {skillOptions.map((skill) => (
              <button
                key={skill.id}
                onClick={() => selectSkill(skill)}
                className="p-6 bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 hover:border-blue-500 rounded-lg transition-all transform hover:scale-105"
              >
                <div className="text-2xl mb-2">{skill.icon}</div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {skill.name}
                </h3>
                <p className="text-slate-400">{skill.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 游戏结束界面 */}
      {gameState === "gameover" && (
        <div className="flex flex-col items-center gap-6">
          <h2 className="text-5xl font-bold text-red-500">游戏结束</h2>

          {isNewRecord && (
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-400 mb-2">
                🎉 新纪录! 🎉
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-8 text-center">
            <div>
              <p className="text-slate-400">得分</p>
              <p className="text-4xl font-bold text-white">{stats.score}</p>
            </div>
            <div>
              <p className="text-slate-400">击杀</p>
              <p className="text-4xl font-bold text-white">{stats.killCount}</p>
            </div>
            <div>
              <p className="text-slate-400">存活时间</p>
              <p className="text-4xl font-bold text-white">
                {Math.floor(stats.survivalTime / 60)}:
                {(stats.survivalTime % 60).toString().padStart(2, "0")}
              </p>
            </div>
            <div>
              <p className="text-slate-400">等级</p>
              <p className="text-4xl font-bold text-white">
                {gameEngineRef.current?.getPlayer().level || 1}
              </p>
            </div>
          </div>

          {stats.highScore > 0 && (
            <div className="text-center">
              <p className="text-slate-400">最高分</p>
              <p className="text-2xl font-bold text-yellow-400">
                {stats.highScore}
              </p>
            </div>
          )}

          <div className="flex gap-4">
            <Button
              onClick={initGame}
              size="lg"
              className="bg-blue-500 hover:bg-blue-600"
            >
              再来一局
            </Button>
            <Button
              onClick={() => setGameState("menu")}
              size="lg"
              variant="outline"
            >
              返回菜单
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
