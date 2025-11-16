/**
 * 响应式游戏UI组件
 * 为不同设备提供优化的用户体验
 */

import { GameStats, GameState } from "../gameTypes";
import type { SkillEffect } from "../systems/SkillSystem";
import { useEffect, useState } from "react";
import "../styles/responsive.css";

interface ResponsiveUIProps {
  gameState: GameState;
  stats: GameStats;
  player: {
    health: number;
    maxHealth: number;
    shield: number;
    maxShield: number;
    level: number;
    exp: number;
    lives?: number;
    maxLives?: number;
  };
  skillOptions: SkillEffect[];
  isNewRecord: boolean;
  onStartGame: () => void;
  onSelectSkill: (skill: SkillEffect) => void;
  onRestart: () => void;
  onResume?: () => void;
}

export function ResponsiveUI({
  gameState,
  stats,
  player,
  skillOptions,
  isNewRecord,
  onStartGame,
  onSelectSkill,
  onRestart,
  onResume,
}: ResponsiveUIProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isTouchSupported, setIsTouchSupported] = useState(false);

  // 检测设备类型
  useEffect(() => {
    const checkDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const mobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) || 
                     window.innerWidth < 768;
      setIsMobile(mobile);
      setIsTouchSupported('ontouchstart' in window || navigator.maxTouchPoints > 0);
      setOrientation(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
    };

    checkDevice();
    
    // 监听设备变化
    const handleResize = () => {
      checkDevice();
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // 渲染HUD（游戏中的UI）
  const renderHUD = () => {
    const healthPercentage = Math.max(0, (player.health / player.maxHealth) * 100);
    const expNeeded = calculateExpNeeded(player.level);
    const expPercentage = (player.exp / expNeeded) * 100;

    return (
      <div className="game-ui">
        {/* 顶部HUD */}
        <div className="hud-top safe-area-inset-top">
          <div className="hud-left">
            <div className="flex items-center gap-2">
              <span className="text-red-400 font-bold">HP</span>
              <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-300"
                  style={{ width: `${healthPercentage}%` }}
                />
              </div>
              <span className="text-white text-sm">
                {Math.max(0, Math.floor(player.health))}/{player.maxHealth}
              </span>
            </div>
            
            {player.shield > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-blue-400 font-bold">护盾</span>
                <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                    style={{ width: `${(player.shield / player.maxShield) * 100}%` }}
                  />
                </div>
                <span className="text-white text-sm">
                  {Math.floor(player.shield)}/{player.maxShield}
                </span>
              </div>
            )}
            
            {/* 命数显示 */}
            {(player.lives !== undefined && player.maxLives !== undefined) && (
              <div className="flex items-center gap-1">
                {Array.from({ length: player.maxLives }).map((_, i) => (
                  <span 
                    key={i} 
                    className={i < player.lives ? "text-red-500" : "text-gray-600"}
                  >
                    ❤
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="hud-center">
            <div className="text-center">
              <div className="text-white font-bold text-lg">
                {Math.floor(stats.survivalTime / 60)}:{(stats.survivalTime % 60).toString().padStart(2, '0')}
              </div>
              <div className="text-gray-400 text-sm">时间</div>
            </div>
          </div>

          <div className="hud-right">
            <div className="text-right">
              <div className="text-cyan-400 font-bold text-lg">{stats.killCount}</div>
              <div className="text-gray-400 text-sm">击杀</div>
            </div>
            <div className="text-right">
              <div className="text-purple-400 font-bold text-lg">{player.level}</div>
              <div className="text-gray-400 text-sm">等级</div>
            </div>
            <div className="text-right">
              <div className="text-yellow-400 font-bold text-lg">{stats.score}</div>
              <div className="text-gray-400 text-sm">得分</div>
            </div>
          </div>
        </div>

        {/* 底部经验条 */}
        <div className="hud-bottom safe-area-inset-bottom">
          <div className="w-full max-w-md">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>经验值</span>
              <span>{player.exp}/{expNeeded}</span>
            </div>
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-500"
                style={{ width: `${expPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 计算升级所需经验值
  const calculateExpNeeded = (level: number): number => {
    const baseKills = 5;
    const baseExp = 10 * baseKills;
    const growth = 1.33;
    return Math.ceil(baseExp * Math.pow(growth, Math.max(0, level - 1)));
  };

  // 主菜单
  if (gameState === "menu") {
    return (
      <div className="game-container">
        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
          <div className="text-center space-y-8 max-w-lg w-full">
            {/* 标题 */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl lg:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 animate-pulse">
                异星幸存者
              </h1>
              <p className="text-lg md:text-xl text-slate-400">Alien Survivor</p>
            </div>

            {/* 最高分 */}
            {stats.highScore > 0 && (
              <div className="card">
                <div className="text-2xl text-slate-300">
                  最高分: <span className="text-cyan-400 font-mono font-bold">{stats.highScore}</span>
                </div>
              </div>
            )}

            {/* 开始按钮 */}
            <button
              onClick={onStartGame}
              className="btn btn-primary text-xl md:text-2xl px-8 py-4 w-full max-w-xs"
            >
              开始游戏
            </button>

            {/* 说明 */}
            <div className="card text-left space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎮</span>
                <span className="text-slate-300">
                  {isTouchSupported ? '触摸屏幕移动' : 'WASD 或方向键移动'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🔫</span>
                <span className="text-slate-300">自动射击</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">⏸️</span>
                <span className="text-slate-300">ESC 暂停</span>
              </div>
            </div>

            {/* 设备信息 */}
            <div className="text-xs text-slate-600 text-center">
              {isMobile ? '📱 移动设备' : '🖥️ 桌面设备'} • 
              {orientation === 'portrait' ? '竖屏' : '横屏'} •
              {isTouchSupported ? '触摸支持' : '键鼠操作'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 升级界面
  if (gameState === "levelup") {
    return (
      <div className="game-container">
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 z-50">
          <div className="card max-w-4xl w-full">
            {/* 标题 */}
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 mb-2">
                升级！
              </h2>
              <p className="text-slate-400 text-lg">选择一个技能强化</p>
            </div>

            {/* 技能选项 */}
            <div className={`grid gap-4 md:gap-6 ${
              skillOptions.length === 3 ? 'grid-cols-1 md:grid-cols-3' : 
              skillOptions.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 
              'grid-cols-1'
            }`}>
              {skillOptions.map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => onSelectSkill(skill)}
                  className="card hover:scale-105 transition-all duration-300 cursor-pointer group"
                >
                  {/* 图标 */}
                  <div className="text-5xl md:text-6xl mb-4 group-hover:scale-110 transition-transform">
                    {skill.icon}
                  </div>
                  
                  {/* 名称 */}
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-2 group-hover:text-cyan-200 transition-colors">
                    {skill.name}
                  </h3>
                  
                  {/* 描述 */}
                  <p className="text-sm md:text-base text-slate-400 group-hover:text-slate-300 transition-colors">
                    {skill.description}
                  </p>

                  {/* 类型标签 */}
                  <div className="mt-4">
                    <span className={`
                      inline-block px-3 py-1 rounded-full text-xs font-semibold
                      ${skill.type === 'health' ? 'bg-green-500/20 text-green-400' : ''}
                      ${skill.type === 'attack' ? 'bg-red-500/20 text-red-400' : ''}
                      ${skill.type === 'shield' ? 'bg-blue-500/20 text-blue-400' : ''}
                      ${skill.type === 'special' ? 'bg-purple-500/20 text-purple-400' : ''}
                    `}>
                      {skill.type === 'health' && '生命'}
                      {skill.type === 'attack' && '攻击'}
                      {skill.type === 'shield' && '防御'}
                      {skill.type === 'special' && '特殊'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 暂停界面
  if (gameState === "paused") {
    return (
      <div className="game-container">
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 z-50">
          <div className="card max-w-md w-full text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-cyan-400 mb-6">
              游戏暂停
            </h2>
            
            <div className="space-y-4">
              {onResume && (
                <button
                  onClick={onResume}
                  className="btn btn-primary w-full text-lg"
                >
                  继续游戏
                </button>
              )}
              
              <button
                onClick={() => window.location.reload()}
                className="btn btn-secondary w-full"
              >
                返回菜单
              </button>
            </div>
            
            <div className="mt-6 text-slate-400 text-sm">
              按 ESC 键继续
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 游戏结束界面
  if (gameState === "gameover") {
    return (
      <div className="game-container">
        <div className="fixed inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 z-50">
          <div className="card max-w-md w-full text-center">
            {/* 标题 */}
            <h2 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400 mb-6">
              游戏结束
            </h2>

            {/* 新纪录 */}
            {isNewRecord && (
              <div className="text-2xl text-yellow-400 font-bold mb-4 animate-bounce">
                🎉 新纪录！🎉
              </div>
            )}

            {/* 统计数据 */}
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                <span className="text-slate-400">得分</span>
                <span className="text-white font-mono font-bold text-xl">{stats.score}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                <span className="text-slate-400">击杀</span>
                <span className="text-cyan-400 font-mono font-bold text-xl">{stats.killCount}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                <span className="text-slate-400">存活时间</span>
                <span className="text-green-400 font-mono font-bold text-xl">
                  {Math.floor(stats.survivalTime / 60)}:{(stats.survivalTime % 60).toString().padStart(2, "0")}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                <span className="text-slate-400">等级</span>
                <span className="text-purple-400 font-mono font-bold text-xl">{player.level}</span>
              </div>
              {stats.highScore > 0 && (
                <div className="flex justify-between items-center p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                  <span className="text-yellow-400">最高分</span>
                  <span className="text-yellow-400 font-mono font-bold text-xl">{stats.highScore}</span>
                </div>
              )}
            </div>

            {/* 按钮组 */}
            <div className="space-y-3">
              <button
                onClick={onRestart}
                className="btn btn-primary w-full text-lg"
              >
                再来一局
              </button>
              <button
                onClick={() => window.location.reload()}
                className="btn btn-secondary w-full"
              >
                返回菜单
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 游戏中的HUD
  if (gameState === "playing") {
    return <div className="ui-overlay">{renderHUD()}</div>;
  }

  return null;
}