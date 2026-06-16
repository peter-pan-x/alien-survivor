import { beforeEach, describe, expect, it, vi } from "vitest";
import { DailyChallenge, DailyChallengeSystem } from "../systems/DailyChallengeSystem";
import { GameStorage } from "../utils/GameStorage";

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

beforeEach(() => {
  vi.stubGlobal("localStorage", new MemoryStorage());
});

describe("DailyChallengeSystem", () => {
  it("generates a stable challenge for the same date", () => {
    const first = new DailyChallengeSystem().generateTodaysChallenge();
    const second = new DailyChallengeSystem().generateTodaysChallenge();

    expect(second).toEqual(first);
  });

  it("applies generated modifiers to matching values only", () => {
    const system = new DailyChallengeSystem();
    const challenge = system.generateTodaysChallenge();
    const activeModifier = challenge.modifiers[0];

    expect(system.applyChallengeModifiers(10, activeModifier.type)).toBe(
      10 * activeModifier.value
    );

    const inactiveType = (
      ["enemy_speed", "player_damage", "exp_rate", "special_enemy", "boss_frequency"] as const
    ).find((type) => !challenge.modifiers.some((modifier) => modifier.type === type));

    if (inactiveType) {
      expect(system.applyChallengeModifiers(10, inactiveType)).toBe(10);
    }
  });

  it("applies all supported modifier types independently", () => {
    const system = new DailyChallengeSystem();
    const challenge: DailyChallenge = {
      id: "test-day",
      name: "Modifier Lab",
      description: "All modifier types are active.",
      difficulty: "extreme",
      modifiers: [
        { type: "enemy_speed", value: 1.5, description: "enemy speed" },
        { type: "player_damage", value: 2, description: "player damage" },
        { type: "exp_rate", value: 1.25, description: "exp rate" },
        { type: "special_enemy", value: 1.75, description: "enemy health" },
        { type: "boss_frequency", value: 0.5, description: "boss interval" },
      ],
      rewards: { scoreMultiplier: 1.4, expMultiplier: 1.25 },
    };

    (system as unknown as { currentChallenge: DailyChallenge }).currentChallenge = challenge;

    expect(system.applyChallengeModifiers(10, "enemy_speed")).toBe(15);
    expect(system.applyChallengeModifiers(10, "player_damage")).toBe(20);
    expect(system.applyChallengeModifiers(8, "exp_rate")).toBe(10);
    expect(system.applyChallengeModifiers(20, "special_enemy")).toBe(35);
    expect(system.applyChallengeModifiers(10, "boss_frequency")).toBe(5);
    expect(system.getScoreMultiplier()).toBe(1.4);
    expect(system.getExpMultiplier()).toBe(1.25);
  });
});

describe("GameStorage", () => {
  it("records aggregate stats and daily best scores without lowering the daily record", () => {
    const firstIsRecord = GameStorage.recordGameEnd(120, 8, 91, "daily", "2026-06-15");
    const secondIsRecord = GameStorage.recordGameEnd(80, 4, 42, "daily", "2026-06-15");

    const data = GameStorage.load();

    expect(firstIsRecord).toBe(true);
    expect(secondIsRecord).toBe(false);
    expect(data.highScore).toBe(120);
    expect(data.totalKills).toBe(12);
    expect(data.totalGamesPlayed).toBe(2);
    expect(data.longestSurvivalTime).toBe(91);
    expect(data.dailyBestByDate["2026-06-15"]).toBe(120);
  });

  it("migrates old saves with new settings and daily challenge fields", () => {
    globalThis.localStorage.setItem(
      "alien_survivor_data",
      JSON.stringify({
        highScore: 50,
        totalKills: 3,
        totalGamesPlayed: 1,
        longestSurvivalTime: 22,
        lastPlayed: 1,
      })
    );

    const data = GameStorage.load();

    expect(data.highScore).toBe(50);
    expect(data.dailyBestByDate).toEqual({});
    expect(data.settings.quality).toBe("medium");
    expect(data.settings.autoFullscreen).toBe(true);
  });

  it("does not write daily records for classic runs", () => {
    GameStorage.recordGameEnd(70, 5, 40, "classic", "2026-06-15");

    const data = GameStorage.load();

    expect(data.highScore).toBe(70);
    expect(data.dailyBestByDate["2026-06-15"]).toBeUndefined();
  });
});
