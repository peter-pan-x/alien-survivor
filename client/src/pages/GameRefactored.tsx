import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { GameState, GameStats } from "../gameTypes";
import { SKILLS, Skill } from "../gameConfig";
import { GameStorage } from "../utils/GameStorage";
import { VirtualJoystick } from "../utils/VirtualJoystick";
import { GameEngine } from "../core/GameEngine";

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
  const [skillOptions, setSkillOptions] = useState<Skill[]>([]);
  const [acquiredSkills, setAcquiredSkills] = useState<string[]>([]);
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
    if (!canvas || gameEngineRef.current) return;

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
    } catch (error) {
      console.error("游戏引擎初始化失败:", error);
    }

    return () => {
      gameEngineRef.current?.destroy();
      gameEngineRef.current = null;
    };
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
    if (!engine) return;

    // 重置游戏引擎
    engine.reset();

    // 重置 UI 状态
    setStats((prev) => ({
      score: 0,
      killCount: 0,
      highScore: prev.highScore,
      survivalTime: 0,
    }));
    setAcquiredSkills([]);
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

    // 使用技能系统进行加权随机选择
    const player = gameEngineRef.current?.getPlayer?.() ?? (playerRef.current as any);
    const randomSkillsEffects = skillSystem.getRandomSkills(player, 3);
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

  /**
   * 选择技能
   */
  const selectSkill = (skill: Skill) => {
    const engine = gameEngineRef.current;
    if (!engine) return;

    // 应用技能到游戏引擎
    engine.applySkill(skill.id);

    // 更新已获得技能列表
    setAcquiredSkills((prev) => [...prev, skill.id]);

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
      GameStorage.save({ highScore: currentStats.score });
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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-900">
      {/* 主菜单 */}
      {gameState === "menu" && (
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

      {/* 游戏画布 */}
      {(gameState === "playing" || gameState === "paused") && (
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="border-2 border-slate-700 rounded-lg shadow-2xl"
          />
          {gameState === "paused" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
              <div className="text-center">
                <h2 className="text-4xl font-bold text-white mb-4">游戏暂停</h2>
                <Button
                  onClick={resumeGame}
                  size="lg"
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  继续游戏
                </Button>
              </div>
            </div>
          )}
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
