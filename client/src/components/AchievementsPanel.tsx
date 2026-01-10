/**
 * 成就面板组件
 * 显示所有成就及其解锁状态
 */

import type { Achievement, AchievementProgress } from "../systems/AchievementSystem";

interface AchievementsPanelProps {
  achievements: Achievement[];
  progress: Map<string, AchievementProgress>;
  onClose: () => void;
}

export function AchievementsPanel({
  achievements,
  progress,
  onClose,
}: AchievementsPanelProps) {
  const isMobile = window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // 按分类组织成就
  const categorizedAchievements = {
    survival: achievements.filter(a => a.category === 'survival'),
    combat: achievements.filter(a => a.category === 'combat'),
    progression: achievements.filter(a => a.category === 'progression'),
    special: achievements.filter(a => a.category === 'special'),
  };

  // 分类标题
  const categoryTitles: Record<Achievement['category'], string> = {
    survival: '🏃 生存',
    combat: '⚔️ 战斗',
    progression: '📈 成长',
    special: '⭐ 特殊',
  };

  // 计算完成度
  const unlockedCount = Array.from(progress.values()).filter(p => p.unlocked).length;
  const totalCount = achievements.length;
  const completionPercentage = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.9)',
        zIndex: 100,
        padding: isMobile ? '16px' : '0',
      }}
      onClick={onClose}
    >
      <div
        className="pixel-panel"
        style={{
          width: '90%',
          maxWidth: isMobile ? '100%' : '700px',
          maxHeight: '80vh',
          overflow: 'auto',
          padding: isMobile ? '16px' : '24px',
          background: '#1a202c',
          border: '3px solid #4a5568',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2
            className="pixel-title"
            style={{
              fontSize: isMobile ? '24px' : '32px',
              color: '#fbbf24',
              margin: 0
            }}
          >
            🏆 成就
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: '#e53e3e',
              border: '2px solid #fc8181',
              color: '#fff',
              fontSize: isMobile ? '14px' : '16px',
              cursor: 'pointer',
            }}
          >
            ✕ 关闭
          </button>
        </div>

        {/* 总体进度 */}
        <div
          className="pixel-card"
          style={{
            padding: '16px',
            marginBottom: '20px',
            background: 'linear-gradient(135deg, rgba(66, 153, 225, 0.1) 0%, rgba(159, 122, 234, 0.1) 100%)',
            border: '2px solid #4299e1',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span className="pixel-label" style={{ fontSize: isMobile ? '12px' : '14px' }}>
              完成进度
            </span>
            <span
              className="pixel-number"
              style={{
                fontSize: isMobile ? '16px' : '20px',
                color: '#68d391'
              }}
            >
              {unlockedCount} / {totalCount} ({completionPercentage.toFixed(1)}%)
            </span>
          </div>
          {/* 进度条 */}
          <div
            style={{
              width: '100%',
              height: '12px',
              background: '#2d3748',
              borderRadius: '6px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${completionPercentage}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #48bb78 0%, #38a169 100%)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* 成就列表 */}
        {Object.entries(categorizedAchievements).map(([category, categoryAchievements]) => (
          <div key={category} style={{ marginBottom: '24px' }}>
            {/* 分类标题 */}
            <h3
              className="pixel-label"
              style={{
                fontSize: isMobile ? '14px' : '18px',
                color: '#cbd5e0',
                marginBottom: '12px',
                borderBottom: '2px solid #4a5568',
                paddingBottom: '8px',
              }}
            >
              {categoryTitles[category as Achievement['category']]} ({categoryAchievements.length})
            </h3>

            {/* 成就卡片 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {categoryAchievements.map((achievement) => {
                const achievementProgress = progress.get(achievement.id);
                const isUnlocked = achievementProgress?.unlocked || false;

                return (
                  <div
                    key={achievement.id}
                    className="pixel-card"
                    style={{
                      padding: '12px',
                      background: isUnlocked
                        ? 'linear-gradient(135deg, rgba(72, 187, 120, 0.1) 0%, rgba(56, 161, 105, 0.1) 100%)'
                        : 'rgba(26, 32, 44, 0.8)',
                      border: `2px solid ${isUnlocked ? '#48bb78' : '#4a5568'}`,
                      opacity: isUnlocked ? 1 : 0.6,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      {/* 图标 */}
                      <div
                        style={{
                          fontSize: isMobile ? '24px' : '32px',
                          filter: isUnlocked ? 'none' : 'grayscale(100%)',
                        }}
                      >
                        {achievement.icon}
                      </div>

                      {/* 内容 */}
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: '4px',
                          }}
                        >
                          <h4
                            className="pixel-text"
                            style={{
                              fontSize: isMobile ? '14px' : '16px',
                              color: isUnlocked ? '#68d391' : '#cbd5e0',
                              margin: 0,
                              fontWeight: 'bold',
                            }}
                          >
                            {achievement.name}
                          </h4>
                          <span
                            className="pixel-label"
                            style={{
                              fontSize: isMobile ? '10px' : '12px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: isUnlocked
                                ? 'rgba(72, 187, 120, 0.2)'
                                : 'rgba(74, 85, 104, 0.3)',
                              color: isUnlocked ? '#48bb78' : '#a0aec0',
                            }}
                          >
                            {isUnlocked ? '✓ 已解锁' : '未解锁'}
                          </span>
                        </div>

                        <p
                          className="pixel-text"
                          style={{
                            fontSize: isMobile ? '11px' : '13px',
                            color: '#a0aec0',
                            margin: '4px 0',
                            lineHeight: '1.4',
                          }}
                        >
                          {achievement.description}
                        </p>

                        {isUnlocked && achievementProgress?.unlockedAt && (
                          <p
                            className="pixel-text"
                            style={{
                              fontSize: isMobile ? '9px' : '11px',
                              color: '#718096',
                              margin: '4px 0 0 0',
                            }}
                          >
                            解锁时间: {new Date(achievementProgress.unlockedAt).toLocaleString('zh-CN')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
