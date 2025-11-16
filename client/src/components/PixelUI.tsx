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
 * 像素风格图标组件
 */
function PixelIcon({ type, size = 32 }: { type: string; size?: number }) {
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
        gap: '32px',
        zIndex: 50,
      }}
    >
      {/* 标题 */}
      <div style={{ textAlign: 'center' }}>
        <h1 className="pixel-title pixel-title-large">异星幸存者</h1>
        <p className="pixel-text" style={{ fontSize: '18px', marginTop: '8px' }}>
          ALIEN SURVIVOR
        </p>
      </div>

      {/* 最高分 */}
      {stats.highScore > 0 && (
        <div className="pixel-panel" style={{ textAlign: 'center', minWidth: '300px' }}>
          <div className="pixel-label" style={{ marginBottom: '8px' }}>
            HIGH SCORE
          </div>
          <div className="pixel-number" style={{ fontSize: '32px' }}>
            {stats.highScore.toLocaleString()}
          </div>
        </div>
      )}

      {/* 开始按钮 */}
      <PixelButton onClick={onStartGame} size="large" variant="primary">
        ▶ START GAME
      </PixelButton>

      {/* 说明 */}
      <div className="pixel-panel" style={{ maxWidth: '400px', textAlign: 'center' }}>
        <div className="pixel-label" style={{ marginBottom: '12px' }}>
          CONTROLS
        </div>
        <div className="pixel-text" style={{ fontSize: '14px', lineHeight: '1.6' }}>
          <div>WASD / ARROWS - MOVE</div>
          <div>MOUSE - AIM</div>
          <div>ESC - PAUSE</div>
        </div>
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
  return (
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
      <div className="pixel-panel" style={{ maxWidth: '800px', width: '90%' }}>
        {/* 标题 */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 className="pixel-title" style={{ fontSize: '36px', color: '#fbbf24' }}>
            LEVEL UP!
          </h2>
          <div className="pixel-label" style={{ marginTop: '8px' }}>
            CHOOSE A SKILL
          </div>
        </div>

        {/* 技能选项 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
          }}
        >
          {skillOptions.map((skill) => (
            <button
              key={skill.id}
              className="pixel-card"
              onClick={() => onSelectSkill(skill)}
              style={{
                padding: '20px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'transform 0.1s',
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
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>{skill.icon}</div>

              {/* 名称 */}
              <div className="pixel-text" style={{ fontSize: '18px', marginBottom: '8px' }}>
                {skill.name}
              </div>

              {/* 描述 */}
              <div className="pixel-label" style={{ fontSize: '12px', color: '#cbd5e0' }}>
                {skill.description}
              </div>

              {/* 类型标签 */}
              <div
                style={{
                  marginTop: '12px',
                  padding: '4px 8px',
                  background: '#1a202c',
                  border: '2px solid #4a5568',
                  display: 'inline-block',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  color: '#cbd5e0',
                }}
              >
                {skill.type}
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
    <div
      style={{
        position: 'fixed',
        top: '16px',
        left: '16px',
        right: '16px',
        zIndex: 10,
        pointerEvents: 'none',
      }}
    >
      {/* 左侧：生命和护盾 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '300px' }}>
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
        <PixelProgressBar
          value={player.exp}
          max={expNeeded}
          type="exp"
          label="EXP"
        />
      </div>

      {/* 右侧：统计信息 */}
      <div
        style={{
          position: 'fixed',
          top: '16px',
          right: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          textAlign: 'right',
        }}
      >
        <div className="pixel-card" style={{ padding: '8px 12px', display: 'inline-block' }}>
          <div className="pixel-label">LEVEL</div>
          <div className="pixel-number">{player.level}</div>
        </div>
        <div className="pixel-card" style={{ padding: '8px 12px', display: 'inline-block' }}>
          <div className="pixel-label">KILLS</div>
          <div className="pixel-number">{stats.killCount}</div>
        </div>
        <div className="pixel-card" style={{ padding: '8px 12px', display: 'inline-block' }}>
          <div className="pixel-label">SCORE</div>
          <div className="pixel-number">{stats.score.toLocaleString()}</div>
        </div>
        <div className="pixel-card" style={{ padding: '8px 12px', display: 'inline-block' }}>
          <div className="pixel-label">TIME</div>
          <div className="pixel-number">
            {Math.floor(stats.survivalTime / 60)}:
            {(stats.survivalTime % 60).toString().padStart(2, '0')}
          </div>
        </div>
      </div>
    </div>
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

