import { useMemo, useState } from "react";
import { ActiveWeapon, GameMode, GameState, GameStats, WeaponType } from "../gameTypes";
import { GAME_CONFIG } from "../gameConfig";
import type { SkillEffect } from "../systems/SkillSystem";
import type { DailyChallenge } from "../systems/DailyChallengeSystem";
import { AchievementsPanel } from "./AchievementsPanel";
import type { Achievement, AchievementProgress } from "../systems/AchievementSystem";

interface PixelUIProps {
  gameState: GameState;
  gameMode: GameMode;
  stats: GameStats;
  player: {
    health: number;
    maxHealth: number;
    shield: number;
    maxShield: number;
    level: number;
    exp: number;
    lives: number;
    maxLives: number;
    bulletCount: number;
    hasFrostShot?: boolean;
    hasFlameAttack?: boolean;
    hasPierce?: boolean;
    critChance?: number;
    weapons?: Pick<ActiveWeapon, "type" | "level">[];
  };
  skillOptions: SkillEffect[];
  isNewRecord: boolean;
  onStartGame: (mode: GameMode) => void;
  onResume: () => void;
  onSelectSkill: (skill: SkillEffect) => void;
  onRestart: () => void;
  dailyChallenge: DailyChallenge | null;
  dailyBestScore: number;
  achievements?: Achievement[];
  achievementProgress?: Map<string, AchievementProgress>;
}

function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
}

function getExpNeeded(level: number): number {
  const baseKills = GAME_CONFIG.LEVELING.BASE_KILLS_FOR_FIRST_LEVEL ?? 5;
  const baseExp = GAME_CONFIG.LEVELING.EXP_PER_KILL * baseKills;
  const growth = GAME_CONFIG.LEVELING.GROWTH_RATE ?? 1.33;
  return Math.ceil(baseExp * Math.pow(growth, Math.max(0, level - 1)));
}

function getRarityLabel(skill: SkillEffect): string {
  if (skill.rarity === "epic") return "EPIC";
  if (skill.rarity === "rare") return "RARE";
  return "CORE";
}

function getSkillGlyph(skill: SkillEffect): string {
  if (skill.id.includes("frost")) return "FR";
  if (skill.id.includes("flame")) return "FL";
  if (skill.id.includes("lightning")) return "LX";
  if (skill.id.includes("shield")) return "SH";
  if (skill.id.includes("critical")) return "CR";
  if (skill.id.includes("speed")) return "SP";
  if (skill.id.includes("range")) return "RG";
  if (skill.id.includes("orbital")) return "OD";
  return skill.type.slice(0, 2).toUpperCase();
}

function getSkillIconKind(skill: SkillEffect): string {
  if (skill.id.includes("frost")) return "frost";
  if (skill.id.includes("flame")) return "flame";
  if (skill.id.includes("lightning")) return "lightning";
  if (skill.id.includes("shield")) return "shield";
  if (skill.id.includes("orbital")) return "drone";
  if (skill.id.includes("critical")) return "crit";
  if (skill.id.includes("speed")) return "speed";
  if (skill.id.includes("range")) return "range";
  if (skill.id.includes("pierce")) return "pierce";
  return "core";
}

function getEvolutionLabel(skill: SkillEffect): string | null {
  if (skill.tags?.includes("evolution")) return "EVOLUTION READY";
  if (skill.evolvesTo) return `EVOLVES -> ${skill.evolvesTo.replace(/_/g, " ").toUpperCase()}`;
  return null;
}

function getWeaponLabel(type: WeaponType): string {
  if (type === "orbital") return "OD";
  if (type === "lightning") return "LX";
  return "BF";
}

function getHudSlots(player: PixelUIProps["player"]) {
  const slots = [
    {
      id: "rifle",
      label: "AR",
      value: `x${Math.max(1, player.bulletCount)}`,
      active: true,
      tone: "cyan",
    },
  ];

  for (const weapon of player.weapons ?? []) {
    slots.push({
      id: weapon.type,
      label: getWeaponLabel(weapon.type),
      value: `Lv${weapon.level}`,
      active: true,
      tone: weapon.type === "lightning" ? "yellow" : weapon.type === "field" ? "green" : "cyan",
    });
  }

  if (player.hasFrostShot) {
    slots.push({ id: "frost", label: "FR", value: "ICE", active: true, tone: "cyan" });
  }
  if (player.hasFlameAttack) {
    slots.push({ id: "flame", label: "FL", value: "HOT", active: true, tone: "orange" });
  }
  if (player.hasPierce) {
    slots.push({ id: "pierce", label: "PC", value: "PEN", active: true, tone: "yellow" });
  }
  if ((player.critChance ?? 0) > 0) {
    slots.push({ id: "crit", label: "CR", value: `${Math.round((player.critChance ?? 0) * 100)}%`, active: true, tone: "orange" });
  }

  while (slots.length < 5) {
    slots.push({
      id: `empty-${slots.length}`,
      label: "--",
      value: "LOCK",
      active: false,
      tone: "muted",
    });
  }

  return slots.slice(0, 5);
}

function PixelButton({
  children,
  onClick,
  tone = "primary",
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: "primary" | "secondary" | "danger";
}) {
  return (
    <button className={`pixelx-button pixelx-button-${tone}`} onClick={onClick}>
      {children}
    </button>
  );
}

function Meter({
  value,
  max,
  tone,
  label,
}: {
  value: number;
  max: number;
  tone: "hp" | "shield" | "xp";
  label: string;
}) {
  const percentage = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));

  return (
    <div className="pixelx-meter-wrap">
      <div className="pixelx-meter-label">
        <span>{label}</span>
        <span>{Math.floor(value)}/{Math.floor(max)}</span>
      </div>
      <div className={`pixelx-meter pixelx-meter-${tone}`}>
        <div style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function ModeCard({
  mode,
  active,
  title,
  meta,
  body,
  onClick,
}: {
  mode: GameMode;
  active: boolean;
  title: string;
  meta: string;
  body: string;
  onClick: (mode: GameMode) => void;
}) {
  return (
    <button
      className={`pixelx-mode-card ${active ? "is-active" : ""}`}
      onClick={() => onClick(mode)}
    >
      <span className="pixelx-mode-meta">{meta}</span>
      <strong>{title}</strong>
      <span>{body}</span>
    </button>
  );
}

function MainMenu({
  stats,
  gameMode,
  dailyChallenge,
  dailyBestScore,
  achievements,
  achievementProgress,
  onStartGame,
}: {
  stats: GameStats;
  gameMode: GameMode;
  dailyChallenge: DailyChallenge | null;
  dailyBestScore: number;
  achievements?: Achievement[];
  achievementProgress?: Map<string, AchievementProgress>;
  onStartGame: (mode: GameMode) => void;
}) {
  const [selectedMode, setSelectedMode] = useState<GameMode>(gameMode);
  const [showAchievements, setShowAchievements] = useState(false);

  return (
    <div className="pixelx-screen pixelx-menu">
      <div className="pixelx-starfield" />
      <section className="pixelx-menu-shell">
        <div className="pixelx-brand">
          <div className="pixelx-orbit-mark">
            <span />
            <i />
          </div>
          <div>
            <h1>异星幸存者</h1>
            <div className="pixelx-brand-meta">
              <p>ALIEN SURVIVOR</p>
              <span className="pixelx-version" title="Build version">
                {__APP_VERSION__}
              </span>
            </div>
          </div>
        </div>

        <div className="pixelx-menu-grid">
          <div className="pixelx-briefing pixelx-panel">
            <span className="pixelx-kicker">MISSION FEED</span>
            <h2>Hold the alien night.</h2>
            <p>
              Auto-fire, harvest XP, evolve your kit, and survive the pressure waves.
            </p>
            <div className="pixelx-stat-row">
              <span>{selectedMode === "daily" ? "TODAY BEST" : "BEST"}</span>
              <strong>
                {(selectedMode === "daily" ? dailyBestScore : stats.highScore).toLocaleString()}
              </strong>
            </div>
            <div className="pixelx-stat-row">
              <span>MODE</span>
              <strong>{selectedMode === "daily" ? "DAILY" : "CLASSIC"}</strong>
            </div>
          </div>

          <div className="pixelx-panel pixelx-mode-stack">
            <ModeCard
              mode="classic"
              active={selectedMode === "classic"}
              title="Classic Run"
              meta="SURVIVAL"
              body="Stable scaling, long-form build crafting."
              onClick={setSelectedMode}
            />
            <ModeCard
              mode="daily"
              active={selectedMode === "daily"}
              title={dailyChallenge?.name ?? "Daily Signal"}
              meta="TODAY"
              body={dailyChallenge?.description ?? "Seeded modifiers for today's leaderboard."}
              onClick={setSelectedMode}
            />
          </div>

          {dailyChallenge && (
            <div className="pixelx-panel pixelx-challenge">
              <span className="pixelx-kicker">DAILY MODIFIERS</span>
              <div className="pixelx-mod-list">
                {dailyChallenge.modifiers.map((modifier, index) => (
                  <span key={`${modifier.type}-${index}`}>{modifier.description}</span>
                ))}
              </div>
              <div className="pixelx-rewards">
                <span>SCORE x{dailyChallenge.rewards.scoreMultiplier.toFixed(1)}</span>
                <span>XP x{dailyChallenge.rewards.expMultiplier.toFixed(1)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="pixelx-actions">
          <PixelButton onClick={() => onStartGame(selectedMode)}>START RUN</PixelButton>
          {achievements && achievementProgress && (
            <PixelButton tone="secondary" onClick={() => setShowAchievements(true)}>
              ACHIEVEMENTS
            </PixelButton>
          )}
        </div>

        <div className="pixelx-controls">
          <span>WASD / ARROWS MOVE</span>
          <span>AUTO AIM FIRE</span>
          <span>ESC PAUSE</span>
        </div>
      </section>

      {showAchievements && achievements && achievementProgress && (
        <AchievementsPanel
          achievements={achievements}
          progress={achievementProgress}
          onClose={() => setShowAchievements(false)}
        />
      )}
    </div>
  );
}

function HUD({
  player,
  stats,
  gameMode,
}: {
  player: PixelUIProps["player"];
  stats: GameStats;
  gameMode: GameMode;
}) {
  const expNeeded = useMemo(() => getExpNeeded(player.level), [player.level]);
  const lifeCells = Array.from({ length: player.maxLives });
  const hudSlots = useMemo(() => getHudSlots(player), [player]);
  const radar = stats.combatHud;

  return (
    <div className="pixelx-hud">
      <div className="pixelx-hud-title" aria-hidden="true">
        <span>ALIEN SURVIVOR</span>
      </div>

      <div className="pixelx-hud-left pixelx-glass">
        <div className="pixelx-life-row">
          <span>LIFE</span>
          {lifeCells.map((_, index) => (
            <i key={index} className={index < player.lives ? "is-live" : ""} />
          ))}
        </div>
        <Meter value={player.health} max={player.maxHealth} tone="hp" label="HP" />
        {player.maxShield > 0 && (
          <Meter value={player.shield} max={player.maxShield} tone="shield" label="SHIELD" />
        )}
      </div>

      <div className="pixelx-hud-center pixelx-glass">
        <strong>{formatTime(stats.survivalTime)}</strong>
        <span>SCORE {stats.score.toLocaleString()}</span>
      </div>

      <div className="pixelx-hud-right pixelx-glass">
        <div><span>LV</span><strong>{player.level}</strong></div>
        <div><span>KILLS</span><strong>{stats.killCount}</strong></div>
        <div><span>RUN</span><strong>{gameMode.toUpperCase()}</strong></div>
      </div>

      <div className="pixelx-radar pixelx-glass" aria-hidden="true">
        <div className="pixelx-radar-screen">
          <i className="pixelx-radar-sweep" />
          <i className="pixelx-radar-player" />
          {(radar?.radarBlips ?? []).map((blip, index) => (
            <i
              key={`${blip.type}-${index}`}
              className={`pixelx-radar-blip pixelx-radar-${blip.threat}`}
              style={{
                left: `${50 + blip.x * 42}%`,
                top: `${50 + blip.y * 42}%`,
              }}
            />
          ))}
        </div>
        <div className="pixelx-radar-meta">
          <span>{radar?.bossActive ? "BOSS" : "RADAR"}</span>
          <strong>{radar?.enemyCount ?? 0}</strong>
        </div>
      </div>

      <div className="pixelx-loadout">
        {hudSlots.map((slot) => (
          <div
            key={slot.id}
            className={`pixelx-loadout-slot pixelx-slot-${slot.tone} ${slot.active ? "is-active" : ""}`}
          >
            <strong>{slot.label}</strong>
            <span>{slot.value}</span>
          </div>
        ))}
      </div>

      <div className="pixelx-xp-rail">
        <div style={{ width: `${Math.min(100, (player.exp / expNeeded) * 100)}%` }} />
        <span>XP {Math.floor(player.exp)} / {expNeeded}</span>
      </div>
    </div>
  );
}

function LevelUp({
  skillOptions,
  onSelectSkill,
}: {
  skillOptions: SkillEffect[];
  onSelectSkill: (skill: SkillEffect) => void;
}) {
  return (
    <div className="pixelx-overlay">
      <section className="pixelx-level-panel">
        <div className="pixelx-level-head">
          <span>LEVEL UP</span>
          <h2>Choose a mutation</h2>
        </div>
        <div className="pixelx-skill-grid">
          {skillOptions.map((skill) => (
            (() => {
              const evolutionLabel = getEvolutionLabel(skill);

              return (
                <button
                  key={skill.id}
                  className={`pixelx-skill-card rarity-${skill.rarity ?? "common"} ${skill.tags?.includes("evolution") ? "is-evolution" : ""}`}
                  onClick={() => onSelectSkill(skill)}
                >
                  <div className={`pixelx-skill-glyph skill-icon-${getSkillIconKind(skill)}`}>
                    <i />
                    <b />
                    <span>{getSkillGlyph(skill)}</span>
                  </div>
                  <div className="pixelx-skill-copy">
                    <span>{getRarityLabel(skill)} / {skill.type.toUpperCase()}</span>
                    <strong>{skill.name}</strong>
                    <p>{skill.getDescription ? skill.getDescription() : skill.description}</p>
                    {evolutionLabel && <em>{evolutionLabel}</em>}
                  </div>
                </button>
              );
            })()
          ))}
        </div>
      </section>
    </div>
  );
}

function GameOver({
  stats,
  player,
  isNewRecord,
  gameMode,
  dailyBestScore,
  onRestart,
}: {
  stats: GameStats;
  player: { level: number };
  isNewRecord: boolean;
  gameMode: GameMode;
  dailyBestScore: number;
  onRestart: () => void;
}) {
  return (
    <div className="pixelx-overlay">
      <section className="pixelx-gameover pixelx-panel">
        <span className="pixelx-kicker">{gameMode === "daily" ? "DAILY SIGNAL LOST" : "RUN TERMINATED"}</span>
        <h2>GAME OVER</h2>
        {isNewRecord && <strong className="pixelx-record">NEW RECORD</strong>}
        <div className="pixelx-result-grid">
          <div><span>SCORE</span><strong>{stats.score.toLocaleString()}</strong></div>
          <div><span>KILLS</span><strong>{stats.killCount}</strong></div>
          <div><span>TIME</span><strong>{formatTime(stats.survivalTime)}</strong></div>
          <div><span>LEVEL</span><strong>{player.level}</strong></div>
          <div><span>BEST</span><strong>{stats.highScore.toLocaleString()}</strong></div>
          {gameMode === "daily" && (
            <div><span>TODAY</span><strong>{dailyBestScore.toLocaleString()}</strong></div>
          )}
        </div>
        <PixelButton onClick={onRestart}>PLAY AGAIN</PixelButton>
      </section>
    </div>
  );
}

function PauseOverlay({ onResume }: { onResume: () => void }) {
  return (
    <div className="pixelx-overlay">
      <section className="pixelx-pause pixelx-panel">
        <span className="pixelx-kicker">SIGNAL HELD</span>
        <h2>PAUSED</h2>
        <PixelButton onClick={onResume}>CONTINUE</PixelButton>
      </section>
    </div>
  );
}

export function PixelUI({
  gameState,
  gameMode,
  stats,
  player,
  skillOptions,
  isNewRecord,
  onStartGame,
  onResume,
  onSelectSkill,
  onRestart,
  dailyChallenge,
  dailyBestScore,
  achievements,
  achievementProgress,
}: PixelUIProps) {
  if (gameState === "menu") {
    return (
      <MainMenu
        stats={stats}
        gameMode={gameMode}
        dailyChallenge={dailyChallenge}
        dailyBestScore={dailyBestScore}
        achievements={achievements}
        achievementProgress={achievementProgress}
        onStartGame={onStartGame}
      />
    );
  }

  if (gameState === "playing") {
    return <HUD player={player} stats={stats} gameMode={gameMode} />;
  }

  if (gameState === "paused") {
    return (
      <>
        <HUD player={player} stats={stats} gameMode={gameMode} />
        <PauseOverlay onResume={onResume} />
      </>
    );
  }

  if (gameState === "levelup") {
    return <LevelUp skillOptions={skillOptions} onSelectSkill={onSelectSkill} />;
  }

  if (gameState === "gameover") {
    return (
      <GameOver
        stats={stats}
        player={player}
        isNewRecord={isNewRecord}
        gameMode={gameMode}
        dailyBestScore={dailyBestScore}
        onRestart={onRestart}
      />
    );
  }

  return null;
}
