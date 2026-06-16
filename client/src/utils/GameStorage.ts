import type { GameMode } from "../gameTypes";

/**
 * 游戏数据持久化工具
 */

const STORAGE_KEY = "alien_survivor_data";

export interface SavedGameData {
  highScore: number;
  totalKills: number;
  totalGamesPlayed: number;
  longestSurvivalTime: number;
  lastPlayed: number;
  dailyBestByDate: Record<string, number>;
  settings: {
    volume: number;
    quality: "low" | "medium" | "high";
    showPerformance: boolean;
    autoFullscreen: boolean;
  };
}

const DEFAULT_DATA: SavedGameData = {
  highScore: 0,
  totalKills: 0,
  totalGamesPlayed: 0,
  longestSurvivalTime: 0,
  lastPlayed: 0,
  dailyBestByDate: {},
  settings: {
    volume: 0.7,
    quality: "medium",
    showPerformance: false,
    autoFullscreen: true,
  },
};

function mergeSavedData(raw: unknown): SavedGameData {
  const parsed = raw && typeof raw === "object" ? raw as Partial<SavedGameData> : {};

  return {
    ...DEFAULT_DATA,
    ...parsed,
    dailyBestByDate: {
      ...DEFAULT_DATA.dailyBestByDate,
      ...(parsed.dailyBestByDate ?? {}),
    },
    settings: {
      ...DEFAULT_DATA.settings,
      ...(parsed.settings ?? {}),
    },
  };
}

export class GameStorage {
  /**
   * 加载游戏数据
   */
  static load(): SavedGameData {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return mergeSavedData(JSON.parse(data));
      }
    } catch (error) {
      console.error("Failed to load game data:", error);
    }
    return mergeSavedData(null);
  }

  /**
   * 保存游戏数据
   */
  static save(data: SavedGameData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save game data:", error);
    }
  }

  /**
   * 更新最高分
   */
  static updateHighScore(score: number): boolean {
    const data = this.load();
    if (score > data.highScore) {
      data.highScore = score;
      data.lastPlayed = Date.now();
      this.save(data);
      return true; // 返回true表示创造了新纪录
    }
    return false;
  }

  /**
   * 记录游戏结束
   */
  static recordGameEnd(
    score: number,
    kills: number,
    survivalTime: number,
    mode: GameMode = "classic",
    challengeId?: string
  ): boolean {
    const data = this.load();
    let isNewRecord = false;

    if (score > data.highScore) {
      data.highScore = score;
      isNewRecord = true;
    }

    data.totalKills += kills;
    data.totalGamesPlayed += 1;

    if (survivalTime > data.longestSurvivalTime) {
      data.longestSurvivalTime = survivalTime;
    }

    if (mode === "daily" && challengeId) {
      const previousDailyBest = data.dailyBestByDate[challengeId] ?? 0;
      data.dailyBestByDate[challengeId] = Math.max(previousDailyBest, score);
    }

    data.lastPlayed = Date.now();
    this.save(data);

    return isNewRecord;
  }

  /**
   * 重置所有数据
   */
  static reset(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Failed to reset game data:", error);
    }
  }

  /**
   * 获取统计信息
   */
  static getStats(): SavedGameData {
    return this.load();
  }
}
