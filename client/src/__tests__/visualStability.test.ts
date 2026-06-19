import { afterEach, describe, expect, it, vi } from "vitest";
import { AnimatedSpriteRenderer, type AnimatedSpriteFrame } from "../systems/AnimatedSpriteRenderer";
import { BACKGROUND_ECOLOGY } from "../utils/BackgroundEcologyConfig";
import { CombatEffectRenderer } from "../utils/CombatEffectRenderer";

interface ListenerCall {
  type: string;
  handler: EventListenerOrEventListenerObject;
  capture: boolean;
}

function getCapture(options?: boolean | AddEventListenerOptions): boolean {
  return typeof options === "boolean" ? options : Boolean(options?.capture);
}

function createListenerRecorder() {
  const addCalls: ListenerCall[] = [];
  const removeCalls: ListenerCall[] = [];

  return {
    addCalls,
    removeCalls,
    addEventListener(
      type: string,
      handler: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ) {
      addCalls.push({ type, handler, capture: getCapture(options) });
    },
    removeEventListener(
      type: string,
      handler: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ) {
      removeCalls.push({ type, handler, capture: getCapture(options) });
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("background ecology configuration", () => {
  it("keeps plants, minerals, and terrain on varied non-uniform grids", () => {
    expect(BACKGROUND_ECOLOGY.terrain.cell).toBeLessThan(BACKGROUND_ECOLOGY.moss.cell);
    expect(BACKGROUND_ECOLOGY.moss.cell).toBeLessThan(BACKGROUND_ECOLOGY.microGrowth.cell);
    expect(BACKGROUND_ECOLOGY.midground.cell).not.toBe(BACKGROUND_ECOLOGY.moss.cell);

    expect(BACKGROUND_ECOLOGY.midground.maxFootprint).toBeGreaterThan(
      BACKGROUND_ECOLOGY.midground.minFootprint * 3
    );
    expect(BACKGROUND_ECOLOGY.distantCrystals.maxHeight).toBeGreaterThan(
      BACKGROUND_ECOLOGY.distantCrystals.minHeight * 4
    );
    expect(BACKGROUND_ECOLOGY.distantRocks.maxCount).toBeGreaterThan(
      BACKGROUND_ECOLOGY.distantRocks.minCount + 6
    );
  });

  it("keeps decorative density sparse enough to avoid screen-door artifacts", () => {
    expect(BACKGROUND_ECOLOGY.terrain.activeThreshold).toBeGreaterThanOrEqual(0.68);
    expect(BACKGROUND_ECOLOGY.moss.activeThreshold).toBeGreaterThanOrEqual(0.6);
    expect(BACKGROUND_ECOLOGY.microGrowth.activeThreshold).toBeGreaterThanOrEqual(0.64);
    expect(BACKGROUND_ECOLOGY.midground.activeThreshold).toBeGreaterThanOrEqual(0.56);
    expect(BACKGROUND_ECOLOGY.microGrowth.maxSprouts).toBeLessThanOrEqual(5);
  });
});

describe("player animation layering", () => {
  it("keeps shooting in the upper body while the legs follow movement", () => {
    const renderer = new AnimatedSpriteRenderer() as unknown as {
      getPlayerFrame: (
        time: number,
        isMoving: boolean,
        state: "idle" | "move" | "attack" | "hit" | "death"
      ) => AnimatedSpriteFrame;
    };

    const movingStanding = renderer.getPlayerFrame(0.02, true, "move");
    const movingWide = renderer.getPlayerFrame(0.3, true, "move");
    const movingStandingAgain = renderer.getPlayerFrame(0.52, true, "move");
    const movingAttackStanding = renderer.getPlayerFrame(0.02, true, "attack");
    const movingAttackWide = renderer.getPlayerFrame(0.3, true, "attack");
    const movingHitWide = renderer.getPlayerFrame(0.3, true, "hit");
    const standingAttack = renderer.getPlayerFrame(0.2, false, "attack");
    const standingIdle = renderer.getPlayerFrame(0.2, false, "idle");

    expect(movingAttackStanding.pixels.slice(7)).toEqual(movingStanding.pixels.slice(7));
    expect(movingAttackWide.pixels.slice(7)).toEqual(movingWide.pixels.slice(7));
    expect(movingHitWide.pixels.slice(7)).toEqual(movingWide.pixels.slice(7));
    expect(movingAttackStanding.pixels.slice(0, 7)).not.toEqual(movingStanding.pixels.slice(0, 7));
    expect(standingAttack.pixels.slice(7)).toEqual(standingIdle.pixels.slice(7));
    expect(movingStanding.pixels.slice(7)).toEqual(standingIdle.pixels.slice(7));
    expect(movingStanding.pixels[9]).not.toEqual(movingWide.pixels[9]);
    expect(movingStandingAgain.pixels[9]).toEqual(movingStanding.pixels[9]);
  });
});

describe("frozen enemy rendering", () => {
  it("keeps the pixel frost glaze inside the enemy footprint", () => {
    const lineTo = vi.fn();
    const moveTo = vi.fn();
    const closePath = vi.fn();
    const fillRect = vi.fn();
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo,
      lineTo,
      closePath,
      fill: vi.fn(),
      fillRect,
      stroke: vi.fn(),
      imageSmoothingEnabled: true,
      lineJoin: "round",
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
    } as unknown as CanvasRenderingContext2D;

    CombatEffectRenderer.drawFrozenEnemyOverlay(ctx, 100, 100, 20, Date.now() + 1000);

    const points = [...moveTo.mock.calls, ...lineTo.mock.calls] as Array<[number, number]>;
    expect(points.every(([px]) => px >= 82 && px <= 118)).toBe(true);
    expect(points.every(([, py]) => py >= 82 && py <= 116)).toBe(true);
    expect(closePath).toHaveBeenCalledTimes(4);
    expect(fillRect).toHaveBeenCalledTimes(2);
  });
});

describe("EnhancedVirtualJoystick cleanup", () => {
  it("removes the same listener references it registered", async () => {
    vi.resetModules();

    const windowRecorder = createListenerRecorder();
    const canvasRecorder = createListenerRecorder();
    const fakeWindow = {
      innerWidth: 1280,
      innerHeight: 720,
      devicePixelRatio: 1,
      addEventListener: windowRecorder.addEventListener,
      removeEventListener: windowRecorder.removeEventListener,
      dispatchEvent: vi.fn(),
    };
    const fakeCanvas = {
      width: 1280,
      height: 720,
      addEventListener: canvasRecorder.addEventListener,
      removeEventListener: canvasRecorder.removeEventListener,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }),
    };

    vi.stubGlobal("window", fakeWindow);
    vi.stubGlobal("navigator", {
      userAgent: "vitest desktop",
      maxTouchPoints: 0,
      vibrate: vi.fn(),
    });
    vi.stubGlobal("CustomEvent", class CustomEvent<T = unknown> extends Event {
      detail: T;

      constructor(type: string, eventInitDict?: CustomEventInit<T>) {
        super(type, eventInitDict);
        this.detail = eventInitDict?.detail as T;
      }
    });

    const { EnhancedVirtualJoystick } = await import("../utils/EnhancedVirtualJoystick");
    const joystick = new EnhancedVirtualJoystick(fakeCanvas as unknown as HTMLCanvasElement);

    joystick.destroy();

    for (const removeCall of canvasRecorder.removeCalls) {
      expect(canvasRecorder.addCalls).toContainEqual(removeCall);
    }

    const deviceRemove = windowRecorder.removeCalls.find((call) => call.type === "devicechange");
    expect(deviceRemove).toBeDefined();
    expect(windowRecorder.addCalls).toContainEqual(deviceRemove);
  });
});
