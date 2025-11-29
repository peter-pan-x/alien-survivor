/**
 * 像素风格UI组件
 * 8-bit/16-bit 复古游戏风格
 */

import { GameStats, GameState } from "../gameTypes";
import { GAME_CONFIG } from "../gameConfig";
import type { SkillEffect } from "../systems/SkillSystem";

interface PixelUIProps {
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

/**
 * 像素风格图标组件（预留用于未来扩展）
 */
function _PixelIcon({ type, size = 32 }: { type: string; size?: number }) {
  const iconStyle: React.CSSProperties = {
    width: size,
    height: size,
    fontSize: `${size}px`,
    lineHeight: `${size}px`,
    display: 'inline-block',
    textAlign: 'center',
  };

  // 使用emoji作为像素风格图标（实际项目中可以用SVG或图片）
  const icons: Record<string, string> = {
    hp: '💀',
    atk: '🐉',
    mag: '👻',
    shield: '🛡️',
    exp: '⭐',
    level: '⬆️',
    score: '🏆',
    time: '⏱️',
    kills: '💀',
  };

  return (
    <span style={iconStyle} className="pixel-icon">
      {icons[type.toLowerCase()] || '❓'}
    </span>
  );
}

/**
 * 像素风格进度条
 */
function PixelProgressBar({
  value,
  max,
  type = 'health',
  label,
}: {
  value: number;
  max: number;
  type?: 'health' | 'shield' | 'exp';
  label?: string;
}) {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div style={{ marginBottom: '8px' }}>
      {label && (
        <div className="pixel-label" style={{ marginBottom: '4px' }}>
          {label}
        </div>
      )}
      <div
        className="pixel-progress"
        style={{
          position: 'relative',
          height: '20px',
          background: '#1a202c',
          border: '2px solid #4a5568',
          imageRendering: 'pixelated' as any,
        }}
      >
        <div
          className={`pixel-progress-bar ${type}`}
          style={{
            width: `${percentage}%`,
            height: '100%',
            borderRight: '2px solid #1a202c',
            imageRendering: 'pixelated' as any,
            background: type === 'health'
              ? 'linear-gradient(to bottom, #f56565 0%, #e53e3e 50%, #c53030 50%, #9b2c2c 100%)'
              : type === 'shield'
                ? 'linear-gradient(to bottom, #4299e1 0%, #3182ce 50%, #2c5282 50%, #2a4365 100%)'
                : 'linear-gradient(to bottom, #fbbf24 0%, #f59e0b 50%, #d97706 50%, #b45309 100%)',
          }}
        />
        <div
          className="pixel-text"
          style={{
            position: 'absolute',
            top: '2px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '12px',
            lineHeight: '16px',
            pointerEvents: 'none',
          }}
        >
          {Math.floor(value)}/{Math.floor(max)}
        </div>
      </div>
    </div>
  );
}

/**
 * 像素风格按钮
 */
function PixelButton({
  children,
  onClick,
  variant = 'primary',
  size = 'normal',
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'normal' | 'large';
  disabled?: boolean;
}) {
  const sizeStyles = {
    small: { padding: '8px 16px', fontSize: '12px' },
    normal: { padding: '12px 24px', fontSize: '16px' },
    large: { padding: '16px 32px', fontSize: '20px' },
  };

  const variantStyles = {
    primary: { background: '#4a5568', borderColor: '#2d3748 #1a202c #1a202c #2d3748' },
    secondary: { background: '#2d3748', borderColor: '#4a5568 #1a202c #1a202c #4a5568' },
    danger: { background: '#742a2a', borderColor: '#c53030 #9b2c2c #9b2c2c #c53030' },
  };

  return (
    <button
      className={`pixel-button ${disabled ? 'pixel-disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...sizeStyles[size],
        ...variantStyles[variant],
        borderWidth: '3px',
        borderStyle: 'solid',
      }}
    >
      {children}
    </button>
  );
}

/**
 * 像素风格主菜单
 */
function PixelMainMenu({
  stats,
  onStartGame,
}: {
  stats: GameStats;
  onStartGame: () => void;
}) {
  // 检测移动端
  const isMobile = window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
  
  // 全屏切换（兼容各种浏览器）
  const toggleFullscreen = async () => {
    const doc = document as any;
    const docEl = document.documentElement as any;
    
    try {
      const isFullscreen = doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement;
      
      if (!isFullscreen) {
        // 进入全屏
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen(); // Safari/iOS
        } else if (docEl.mozRequestFullScreen) {
          await docEl.mozRequestFullScreen(); // Firefox
        } else if (docEl.msRequestFullscreen) {
          await docEl.msRequestFullscreen(); // IE/Edge
        }
      } else {
        // 退出全屏
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          await doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          await doc.msExitFullscreen();
        }
      }
    } catch (e) {
      console.log('Fullscreen error:', e);
    }
  };
  
  return (
    <div
      className="pixel-bg"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isMobile ? '16px' : '32px',
        zIndex: 50,
        padding: isMobile ? '16px' : '0',
        overflow: 'auto',
      }}
    >
      {/* 全屏按钮 - 移动端显示 */}
      {isMobile && (
        <button
          onClick={toggleFullscreen}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            padding: '8px 12px',
            background: '#2d3748',
            border: '2px solid #4a5568',
            color: '#fff',
            fontSize: '12px',
            cursor: 'pointer',
            zIndex: 100,
          }}
        >
          ⛶ 全屏
        </button>
      )}

      {/* 标题 */}
      <div style={{ textAlign: 'center' }}>
        <h1 className="pixel-title pixel-title-large" style={{ fontSize: isMobile ? '28px' : '48px' }}>异星幸存者</h1>
        <p className="pixel-text" style={{ fontSize: isMobile ? '14px' : '18px', marginTop: '8px' }}>
          ALIEN SURVIVOR
        </p>
      </div>

      {/* 最高分 */}
      {stats.highScore > 0 && (
        <div className="pixel-panel" style={{ textAlign: 'center', minWidth: isMobile ? '200px' : '300px', padding: isMobile ? '12px' : '16px' }}>
          <div className="pixel-label" style={{ marginBottom: '8px', fontSize: isMobile ? '12px' : '14px' }}>
            HIGH SCORE
          </div>
          <div className="pixel-number" style={{ fontSize: isMobile ? '24px' : '32px' }}>
            {stats.highScore.toLocaleString()}
          </div>
        </div>
      )}

      {/* 开始按钮 */}
      <PixelButton onClick={onStartGame} size={isMobile ? 'normal' : 'large'} variant="primary">
        ▶ START GAME
      </PixelButton>

      {/* 说明 - 移动端简化 */}
      <div className="pixel-panel" style={{ maxWidth: isMobile ? '280px' : '400px', textAlign: 'center', padding: isMobile ? '12px' : '16px' }}>
        <div className="pixel-label" style={{ marginBottom: '8px', fontSize: isMobile ? '12px' : '14px' }}>
          CONTROLS
        </div>
        <div className="pixel-text" style={{ fontSize: isMobile ? '11px' : '14px', lineHeight: '1.6' }}>
          {isMobile ? (
            <>
              <div>左侧滑动 - 移动</div>
              <div>自动瞄准射击</div>
            </>
          ) : (
            <>
              <div>WASD / ARROWS - MOVE</div>
              <div>MOUSE - AIM</div>
              <div>ESC - PAUSE</div>
            </>
          )}
        </div>
      </div>

      {/* 作者署名 */}
      <div
        className="pixel-text"
        style={{
          fontSize: '12px',
          color: '#718096',
          textAlign: 'center',
          marginTop: isMobile ? '8px' : '16px',
          fontStyle: 'italic'
        }}
      >
        AGI-彼得潘
      </div>
    </div>
  );
}

/**
 * 像素风格升级界面
 */
function PixelLevelUp({
  skillOptions,
  onSelectSkill,
}: {
  skillOptions: SkillEffect[];
  onSelectSkill: (skill: SkillEffect) => void;
}) {
  // 检测移动端
  const isMobile = window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
  
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.85)',
        zIndex: 50,
        padding: isMobile ? '8px' : '16px',
        overflow: 'auto',
      }}
    >
      <div className="pixel-panel" style={{ 
        maxWidth: isMobile ? '100%' : '800px', 
        width: '100%',
        padding: isMobile ? '12px' : '24px',
        maxHeight: '100%',
        overflow: 'auto',
      }}>
        {/* 标题 */}
        <div style={{ textAlign: 'center', marginBottom: isMobile ? '12px' : '24px' }}>
          <h2 className="pixel-title" style={{ fontSize: isMobile ? '24px' : '36px', color: '#fbbf24' }}>
            LEVEL UP!
          </h2>
          <div className="pixel-label" style={{ marginTop: '4px', fontSize: isMobile ? '12px' : '14px' }}>
            CHOOSE A SKILL
          </div>
        </div>

        {/* 技能选项 - 移动端竖向排列 */}
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            flexWrap: isMobile ? 'nowrap' : 'wrap',
            gap: isMobile ? '10px' : '16px',
            justifyContent: 'center',
            alignItems: 'center',
            overflowY: isMobile ? 'auto' : 'visible',
            maxHeight: isMobile ? '70vh' : 'none',
            paddingBottom: isMobile ? '8px' : '0',
          }}
        >
          {skillOptions.map((skill) => (
            <button
              key={skill.id}
              className="pixel-card"
              onClick={() => onSelectSkill(skill)}
              style={{
                padding: isMobile ? '12px 16px' : '20px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'transform 0.1s',
                width: isMobile ? '90%' : 'auto',
                minWidth: isMobile ? 'auto' : '180px',
                maxWidth: isMobile ? '100%' : '220px',
                flex: isMobile ? '0 0 auto' : '1 1 180px',
                display: 'flex',
                flexDirection: isMobile ? 'row' : 'column',
                alignItems: 'center',
                gap: isMobile ? '12px' : '0',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.borderColor = '#63b3ed #4299e1 #4299e1 #63b3ed';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.borderColor = '#4a5568 #1a202c #1a202c #4a5568';
              }}
            >
              {/* 图标 */}
              <div style={{ fontSize: isMobile ? '32px' : '48px', marginBottom: isMobile ? '0' : '12px', flexShrink: 0 }}>{skill.icon}</div>

              {/* 名称和描述容器 */}
              <div style={{ flex: 1, textAlign: isMobile ? 'left' : 'center' }}>
                {/* 名称 */}
                <div className="pixel-text" style={{ fontSize: isMobile ? '14px' : '18px', marginBottom: isMobile ? '2px' : '8px' }}>
                  {skill.name}
                </div>

                {/* 描述 */}
                <div className="pixel-label" style={{ 
                  fontSize: isMobile ? '11px' : '12px', 
                  color: '#cbd5e0',
                  lineHeight: '1.3',
                }}>
                  {skill.description}
                </div>
              </div>

              {/* 类型和稀有度标签 - 移动端隐藏类型 */}
              <div style={{ marginTop: isMobile ? '6px' : '12px' }}>
                {!isMobile && (
                  <span
                    style={{
                      padding: '4px 8px',
                      background: '#1a202c',
                      border: '2px solid #4a5568',
                      display: 'inline-block',
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      color: '#cbd5e0',
                      marginRight: '4px',
                    }}
                  >
                    {skill.type}
                  </span>
                )}

                {/* 稀有度标签 */}
                {skill.rarity && (
                  <span
                    style={{
                      padding: isMobile ? '2px 4px' : '4px 8px',
                      display: 'inline-block',
                      fontSize: isMobile ? '8px' : '10px',
                      textTransform: 'uppercase',
                      fontWeight: 'bold',
                      ...(skill.rarity === 'epic'
                        ? {
                          background: '#553c9a',
                          border: '2px solid #6b46c1',
                          color: '#e9d5ff',
                          boxShadow: '0 0 8px rgba(139, 92, 246, 0.6)',
                        }
                        : skill.rarity === 'rare'
                          ? {
                            background: '#065f46',
                            border: '2px solid #047857',
                            color: '#a7f3d0',
                            boxShadow: '0 0 6px rgba(16, 185, 129, 0.4)',
                          }
                          : {}),
                    }}
                  >
                    {skill.rarity === 'epic' ? '史诗' : skill.rarity === 'rare' ? '稀有' : ''}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * 像素风格游戏结束界面
 */
function PixelGameOver({
  stats,
  player,
  isNewRecord,
  onRestart,
}: {
  stats: GameStats;
  player: { level: number };
  isNewRecord: boolean;
  onRestart: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.9)',
        zIndex: 50,
      }}
    >
      <div className="pixel-panel" style={{ maxWidth: '500px', width: '90%', textAlign: 'center' }}>
        {/* 标题 */}
        <h2 className="pixel-title" style={{ fontSize: '40px', color: '#f56565', marginBottom: '24px' }}>
          GAME OVER
        </h2>

        {/* 新纪录 */}
        {isNewRecord && (
          <div
            className="pixel-text pixel-blink"
            style={{ fontSize: '24px', color: '#fbbf24', marginBottom: '16px' }}
          >
            🎉 NEW RECORD! 🎉
          </div>
        )}

        {/* 统计数据 */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="pixel-card" style={{ padding: '12px' }}>
              <div className="pixel-label">SCORE</div>
              <div className="pixel-number">{stats.score.toLocaleString()}</div>
            </div>
            <div className="pixel-card" style={{ padding: '12px' }}>
              <div className="pixel-label">KILLS</div>
              <div className="pixel-number">{stats.killCount}</div>
            </div>
            <div className="pixel-card" style={{ padding: '12px' }}>
              <div className="pixel-label">TIME</div>
              <div className="pixel-number">
                {Math.floor(stats.survivalTime / 60)}:
                {(stats.survivalTime % 60).toString().padStart(2, '0')}
              </div>
            </div>
            <div className="pixel-card" style={{ padding: '12px' }}>
              <div className="pixel-label">LEVEL</div>
              <div className="pixel-number">{player.level}</div>
            </div>
          </div>

          {stats.highScore > 0 && (
            <div className="pixel-card" style={{ padding: '12px', marginTop: '16px' }}>
              <div className="pixel-label">HIGH SCORE</div>
              <div className="pixel-number" style={{ fontSize: '28px', color: '#fbbf24' }}>
                {stats.highScore.toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* 重新开始按钮 */}
        <PixelButton onClick={onRestart} size="large" variant="primary">
          ▶ PLAY AGAIN
        </PixelButton>
      </div>
    </div>
  );
}

/**
 * 像素风格HUD（游戏内UI）
 */
function PixelHUD({
  player,
  stats,
}: {
  player: { health: number; maxHealth: number; shield: number; maxShield: number; level: number; exp: number };
  stats: GameStats;
}) {
  const baseKills = GAME_CONFIG.LEVELING.BASE_KILLS_FOR_FIRST_LEVEL ?? 5;
  const baseExp = GAME_CONFIG.LEVELING.EXP_PER_KILL * baseKills;
  const growth = GAME_CONFIG.LEVELING.GROWTH_RATE ?? 1.33;
  const expNeeded = Math.ceil(baseExp * Math.pow(growth, Math.max(0, player.level - 1)));

  return (
    <>
      {/* 顶部状态栏 */}
      <div
        style={{
          position: 'fixed',
          top: '16px',
          left: '16px',
          right: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        {/* 左侧：生命值与护盾 */}
        <div style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="pixel-panel" style={{ padding: '8px', background: 'rgba(0,0,0,0.6)' }}>
            <PixelProgressBar
              value={player.health}
              max={player.maxHealth}
              type="health"
              label="HP"
            />
            {player.maxShield > 0 && (
              <PixelProgressBar
                value={player.shield}
                max={player.maxShield}
                type="shield"
                label="SHIELD"
              />
            )}
          </div>
        </div>

        {/* 中间：时间与分数 */}
        <div style={{ textAlign: 'center' }}>
          <div className="pixel-panel" style={{ padding: '8px 24px', background: 'rgba(0,0,0,0.6)', display: 'inline-block' }}>
            <div className="pixel-number" style={{ fontSize: '32px', color: '#fff', textShadow: '2px 2px 0 #000' }}>
              {Math.floor(stats.survivalTime / 60)}:{(stats.survivalTime % 60).toString().padStart(2, '0')}
            </div>
            <div className="pixel-text" style={{ fontSize: '14px', color: '#fbbf24', marginTop: '4px' }}>
              SCORE: {stats.score.toLocaleString()}
            </div>
          </div>
        </div>

        {/* 右侧：击杀与等级 */}
        <div style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
          <div className="pixel-panel" style={{ padding: '8px', background: 'rgba(0,0,0,0.6)', minWidth: '120px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span className="pixel-label">KILLS</span>
              <span className="pixel-number">{stats.killCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="pixel-label">LEVEL</span>
              <span className="pixel-number" style={{ color: '#63b3ed' }}>{player.level}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 底部：经验条 */}
      <div
        style={{
          position: 'fixed',
          bottom: '0',
          left: '0',
          right: '0',
          height: '12px', // 变细
          background: '#1a202c',
          borderTop: '1px solid #4a5568', // 边框变细
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: `${Math.min(100, (player.exp / expNeeded) * 100)}%`,
            height: '100%',
            background: 'linear-gradient(to right, #fbbf24, #f59e0b)',
            transition: 'width 0.2s',
          }}
        />
        <div
          className="pixel-text"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '10px', // 字体变小
            color: '#fff',
            textShadow: '1px 1px 0 #000',
            whiteSpace: 'nowrap',
          }}
        >
          EXP {player.exp} / {expNeeded}
        </div>
      </div>
    </>
  );
}

/**
 * 主像素UI组件
 */
export function PixelUI({
  gameState,
  stats,
  player,
  skillOptions,
  isNewRecord,
  onStartGame,
  onSelectSkill,
  onRestart,
}: PixelUIProps) {
  // 游戏内HUD
  if (gameState === 'playing' || gameState === 'paused') {
    return <PixelHUD player={player} stats={stats} />;
  }

  // 主菜单
  if (gameState === 'menu') {
    return <PixelMainMenu stats={stats} onStartGame={onStartGame} />;
  }

  // 升级界面
  if (gameState === 'levelup') {
    return <PixelLevelUp skillOptions={skillOptions} onSelectSkill={onSelectSkill} />;
  }

  // 游戏结束
  if (gameState === 'gameover') {
    return (
      <PixelGameOver
        stats={stats}
        player={player}
        isNewRecord={isNewRecord}
        onRestart={onRestart}
      />
    );
  }

  return null;
}

