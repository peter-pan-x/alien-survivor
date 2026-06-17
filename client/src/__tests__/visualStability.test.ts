import { afterEach, describe, expect, it, vi } from "vitest";
import { BACKGROUND_ECOLOGY } from "../utils/BackgroundEcologyConfig";

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
