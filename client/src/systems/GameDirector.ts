import type { EnemyType } from "../gameTypes";

export interface GameDirectorState {
  phase: "arrival" | "pressure" | "boss-warning" | "onslaught";
  wave: "swarm" | "skirmish" | "artillery" | "armored" | "mixed";
  spawnCountMultiplier: number;
  spawnIntervalMultiplier: number;
  enemyTypeBias: Partial<Record<EnemyType, number>>;
  pressure: number;
  label: string;
}

export interface GameDirectorConfig {
  waveDuration: number;
  pressureStartTime: number;
  highPressureStartTime: number;
  onslaughtStartTime: number;
  bossWarningLevelRemainder: number;
  bossWarningWindow: number;
}

const DEFAULT_DIRECTOR_CONFIG: GameDirectorConfig = {
  waveDuration: 45,
  pressureStartTime: 180,
  highPressureStartTime: 480,
  onslaughtStartTime: 900,
  bossWarningLevelRemainder: 8,
  bossWarningWindow: 2,
};

export class GameDirector {
  private config: GameDirectorConfig;

  constructor(config: Partial<GameDirectorConfig> = {}) {
    this.config = {
      ...DEFAULT_DIRECTOR_CONFIG,
      ...config,
    };
  }

  public getState(survivalTime: number, playerLevel: number): GameDirectorState {
    const wave = this.getWave(survivalTime);

    if (this.isBossWarningLevel(playerLevel)) {
      return {
        phase: "boss-warning",
        wave: "mixed",
        spawnCountMultiplier: 1.35,
        spawnIntervalMultiplier: 0.86,
        enemyTypeBias: {
          rusher: 1.35,
          shooter: 1.3,
          elite: 1.2,
          bigeye: 1.2,
        },
        pressure: 0.75,
        label: "BOSS SIGNAL",
      };
    }

    if (survivalTime >= this.config.onslaughtStartTime) {
      return {
        phase: "onslaught",
        wave,
        spawnCountMultiplier: 1.65,
        spawnIntervalMultiplier: 0.78,
        enemyTypeBias: this.getWaveBias(wave, 1.25),
        pressure: 1,
        label: "ONSLAUGHT",
      };
    }

    if (survivalTime >= this.config.highPressureStartTime) {
      return {
        phase: "pressure",
        wave,
        spawnCountMultiplier: 1.35,
        spawnIntervalMultiplier: 0.86,
        enemyTypeBias: this.getWaveBias(wave, 1.15),
        pressure: 0.72,
        label: "PRESSURE WAVE",
      };
    }

    if (survivalTime >= this.config.pressureStartTime) {
      return {
        phase: "pressure",
        wave,
        spawnCountMultiplier: 1.18,
        spawnIntervalMultiplier: 0.94,
        enemyTypeBias: this.getWaveBias(wave, 1),
        pressure: 0.55,
        label: "RISING THREAT",
      };
    }

    return {
      phase: "arrival",
      wave,
      spawnCountMultiplier: 1,
      spawnIntervalMultiplier: 1,
      enemyTypeBias: this.getWaveBias(wave, 0.75),
      pressure: 0.2,
      label: "FIRST CONTACT",
    };
  }

  private getWave(survivalTime: number): GameDirectorState["wave"] {
    const waveIndex = Math.floor(survivalTime / this.config.waveDuration) % 5;
    return ["swarm", "skirmish", "artillery", "armored", "mixed"][waveIndex] as GameDirectorState["wave"];
  }

  private isBossWarningLevel(playerLevel: number): boolean {
    const levelRemainder = playerLevel % 10;
    return (
      playerLevel > 0 &&
      levelRemainder >= this.config.bossWarningLevelRemainder &&
      levelRemainder < this.config.bossWarningLevelRemainder + this.config.bossWarningWindow
    );
  }

  private getWaveBias(
    wave: GameDirectorState["wave"],
    intensity: number
  ): Partial<Record<EnemyType, number>> {
    const boost = (value: number) => 1 + (value - 1) * intensity;

    switch (wave) {
      case "swarm":
        return { swarm: boost(1.7), spider: boost(1.35), frog: boost(1.15) };
      case "skirmish":
        return { rusher: boost(1.45), spider: boost(1.25), crab: boost(1.15) };
      case "artillery":
        return { shooter: boost(1.7), bigeye: boost(1.4), swarm: boost(0.75) };
      case "armored":
        return { crab: boost(1.65), elite: boost(1.45), rusher: boost(1.15) };
      case "mixed":
      default:
        return { swarm: boost(1.15), rusher: boost(1.15), shooter: boost(1.15), crab: boost(1.1) };
    }
  }
}
