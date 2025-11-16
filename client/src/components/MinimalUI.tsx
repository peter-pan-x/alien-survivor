/**
 * 极简美观的游戏UI组件
 * 设计理念：干净、现代、无干扰
 */

import { GameStats, GameState } from "../gameTypes";
import type { SkillEffect } from "../systems/SkillSystem";

interface MinimalUIProps {
  gameState: GameState;
  stats: GameStats;
  player: {
    health: number;
    maxHealth: number;
    shield: number;
    maxShield: number;
    level: number;
    exp: number;
  };
  skillOptions: SkillEffect[];
  isNewRecord: boolean;
  onStartGame: () => void;
  onSelectSkill: (skill: SkillEffect) => void;
  onRestart: () => void;
}

export function MinimalUI({
  gameState,
  stats,
  player,
  skillOptions,
  isNewRecord,
  onStartGame,
  onSelectSkill,
  onRestart,
}: MinimalUIProps) {
  // 菜单界面
  if (gameState === "menu") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 z-50">
        <div className="text-center space-y-8 px-4">
          {/* 标题 */}
          <div className="space-y-4">
            <h1 className="text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 animate-pulse">
              异星幸存者
            </h1>
            <p className="text-xl text-slate-400">Alien Survivor</p>
          </div>

          {/* 最高分 */}
          {stats.highScore > 0 && (
            <div className="text-2xl text-slate-300">
              最高分: <span className="text-cyan-400 font-mono">{stats.highScore}</span>
            </div>
          )}

          {/* 开始按钮 */}
          <button
            onClick={onStartGame}
            className="group relative px-12 py-4 text-2xl font-bold text-white bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full overflow-hidden transition-all hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/50"
          >
            <span className="relative z-10">开始游戏</span>
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* 说明 */}
          <div className="text-sm text-slate-500 space-y-2 max-w-md mx-auto">
            <p>🎮 WASD 或 方向键移动</p>
            <p>🔫 瞄准自动射击</p>
            <p>📱 支持触屏操作</p>
          </div>
        </div>
      </div>
    );
  }

  // 升级界面
  if (gameState === "levelup") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50">
        <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 rounded-3xl p-8 md:p-12 max-w-4xl w-full mx-4 border border-cyan-500/30 shadow-2xl shadow-cyan-500/20">
          {/* 标题 */}
          <div className="text-center mb-8">
            <h2 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 mb-2">
              升级！
            </h2>
            <p className="text-slate-400">选择一个技能强化</p>
          </div>

          {/* 技能选项 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {skillOptions.map((skill) => (
              <button
                key={skill.id}
                onClick={() => onSelectSkill(skill)}
                className="group relative bg-gradient-to-br from-slate-700/80 to-slate-800/80 hover:from-blue-600/80 hover:to-cyan-600/80 rounded-2xl p-6 transition-all hover:scale-105 hover:shadow-xl hover:shadow-cyan-500/30 border border-slate-600/50 hover:border-cyan-400/50"
              >
                {/* 图标 */}
                <div className="text-5xl mb-4">{skill.icon}</div>
                
                {/* 名称 */}
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-200">
                  {skill.name}
                </h3>
                
                {/* 描述 */}
                <p className="text-sm text-slate-400 group-hover:text-slate-300">
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
    );
  }

  // 游戏结束界面
  if (gameState === "gameover") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm z-50">
        <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 rounded-3xl p-8 md:p-12 max-w-md w-full mx-4 text-center border border-red-500/30 shadow-2xl shadow-red-500/20">
          {/* 标题 */}
          <h2 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400 mb-6">
            游戏结束
          </h2>

          {/* 新纪录 */}
          {isNewRecord && (
            <div className="text-2xl text-yellow-400 font-bold mb-4 animate-bounce">
              🎉 新纪录！
            </div>
          )}

          {/* 统计数据 */}
          <div className="space-y-4 mb-8">
            <div className="flex justify-between text-lg">
              <span className="text-slate-400">得分</span>
              <span className="text-white font-mono font-bold">{stats.score}</span>
            </div>
            <div className="flex justify-between text-lg">
              <span className="text-slate-400">击杀</span>
              <span className="text-cyan-400 font-mono font-bold">{stats.killCount}</span>
            </div>
            <div className="flex justify-between text-lg">
              <span className="text-slate-400">存活时间</span>
              <span className="text-green-400 font-mono font-bold">
                {Math.floor(stats.survivalTime / 60)}:{(stats.survivalTime % 60).toString().padStart(2, "0")}
              </span>
            </div>
            <div className="flex justify-between text-lg">
              <span className="text-slate-400">等级</span>
              <span className="text-purple-400 font-mono font-bold">{player.level}</span>
            </div>
            {stats.highScore > 0 && (
              <div className="flex justify-between text-lg pt-4 border-t border-slate-700">
                <span className="text-slate-400">最高分</span>
                <span className="text-yellow-400 font-mono font-bold">{stats.highScore}</span>
              </div>
            )}
          </div>

          {/* 重新开始按钮 */}
          <button
            onClick={onRestart}
            className="w-full px-8 py-4 text-xl font-bold text-white bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full hover:scale-105 transition-all hover:shadow-xl hover:shadow-cyan-500/50"
          >
            再来一局
          </button>
        </div>
      </div>
    );
  }

  return null;
}

