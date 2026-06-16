import { describe, expect, it } from "vitest";
import type { Player } from "../gameTypes";
import { GAME_CONFIG } from "../gameConfig";
import { GameDirector } from "../systems/GameDirector";
import { SkillSystem } from "../systems/SkillSystem";

function createPlayer(overrides: Partial<Player> = {}): Player {
  return {
    x: 0,
    y: 0,
    radius: GAME_CONFIG.PLAYER.RADIUS,
    health: GAME_CONFIG.PLAYER.INITIAL_HEALTH,
    maxHealth: GAME_CONFIG.PLAYER.INITIAL_HEALTH,
    lives: GAME_CONFIG.PLAYER.INITIAL_LIVES,
    maxLives: GAME_CONFIG.PLAYER.MAX_LIVES,
    exp: 0,
    level: 1,
    attackDamage: GAME_CONFIG.PLAYER.INITIAL_ATTACK_DAMAGE,
    attackSpeed: GAME_CONFIG.PLAYER.INITIAL_ATTACK_SPEED,
    attackRange: GAME_CONFIG.PLAYER.INITIAL_ATTACK_RANGE,
    bulletCount: GAME_CONFIG.PLAYER.INITIAL_BULLET_COUNT,
    shield: 0,
    maxShield: 0,
    moveSpeed: GAME_CONFIG.PLAYER.INITIAL_MOVE_SPEED,
    hasPierce: false,
    hasLifeSteal: false,
    bulletSizeMultiplier: 1,
    critChance: 0,
    critMultiplier: GAME_CONFIG.SKILLS.CRIT_MULTIPLIER_BASE,
    hasAOEExplosion: false,
    aoeDamage: 0,
    aoeRadius: 0,
    pierceCount: 0,
    pierceDamageReduction: 0.5,
    rareSkillSelections: {},
    skillAppearances: {},
    skillLevels: {},
    evolvedSkills: {},
    weapons: [],
    pickupRange: 80,
    ...overrides,
  };
}

describe("GameDirector", () => {
  it("creates distinct pressure phases with real spawn modifiers", () => {
    const director = new GameDirector();

    const arrival = director.getState(20, 1);
    const midPressure = director.getState(500, 7);
    const bossWarning = director.getState(120, 8);
    const onslaught = director.getState(930, 24);

    expect(arrival.phase).toBe("arrival");
    expect(arrival.spawnIntervalMultiplier).toBe(1);
    expect(midPressure.spawnCountMultiplier).toBeGreaterThan(arrival.spawnCountMultiplier);
    expect(midPressure.spawnIntervalMultiplier).toBeLessThan(arrival.spawnIntervalMultiplier);
    expect(bossWarning.phase).toBe("boss-warning");
    expect(bossWarning.enemyTypeBias.rusher).toBeGreaterThan(1);
    expect(onslaught.phase).toBe("onslaught");
    expect(onslaught.pressure).toBe(1);
  });

  it("rotates wave identity over survival time", () => {
    const director = new GameDirector();

    expect(director.getState(0, 1).wave).toBe("swarm");
    expect(director.getState(45, 1).wave).toBe("skirmish");
    expect(director.getState(90, 1).wave).toBe("artillery");
    expect(director.getState(135, 1).wave).toBe("armored");
    expect(director.getState(180, 1).wave).toBe("mixed");
  });

  it("accepts custom timing configuration for future level modes", () => {
    const director = new GameDirector({
      waveDuration: 10,
      pressureStartTime: 30,
      highPressureStartTime: 60,
      onslaughtStartTime: 90,
    });

    expect(director.getState(20, 1).phase).toBe("arrival");
    expect(director.getState(35, 1).phase).toBe("pressure");
    expect(director.getState(95, 1).phase).toBe("onslaught");
    expect(director.getState(10, 1).wave).toBe("skirmish");
  });
});

describe("SkillSystem evolutions", () => {
  it("prioritizes an available evolution in level-up options", () => {
    const skillSystem = new SkillSystem();
    const player = createPlayer({
      hasFrostShot: true,
      bulletCount: 2,
    });

    const options = skillSystem.getRandomSkills(player, 3);

    expect(options.some((skill) => skill.id === "frost_burst")).toBe(true);
  });

  it("records skill levels and evolved skill flags when applying an evolution", () => {
    const skillSystem = new SkillSystem();
    const player = createPlayer({
      hasFrostShot: true,
      bulletCount: 2,
    });

    const applied = skillSystem.applySkill("frost_burst", player);

    expect(applied).toBe(true);
    expect(player.evolvedSkills?.frost_burst).toBe(true);
    expect(player.skillLevels?.frost_burst).toBe(1);
    expect(player.bulletCount).toBe(3);
    expect(player.frostDamageBonus).toBeGreaterThan(0.2);
  });
});
