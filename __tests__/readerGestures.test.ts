import { getReaderGestureAction } from "@/features/reader/gestures";
import type { ReaderGesture } from "@/features/reader/gestures";

const tap: ReaderGesture = {
  width: 400,
  startX: 200,
  deltaX: 0,
  deltaY: 0,
  duration: 80,
  maxMovement: 0,
  maxTouches: 1
};

describe("reader gestures", () => {
  it.each([320, 400, 768])("separates previous, menu and next tap zones at width %i", (width) => {
    expect(getReaderGestureAction({ ...tap, width, startX: width * 0.25 })).toBe("previous");
    expect(getReaderGestureAction({ ...tap, width, startX: width * 0.5 })).toBe("menu");
    expect(getReaderGestureAction({ ...tap, width, startX: width * 0.75 })).toBe("next");
  });

  it("does not overlap the tap zone boundaries", () => {
    expect(getReaderGestureAction({ ...tap, startX: 400 * 0.36 - 0.01 })).toBe("previous");
    expect(getReaderGestureAction({ ...tap, startX: 400 * 0.36 })).toBe("menu");
    expect(getReaderGestureAction({ ...tap, startX: 400 * 0.64 - 0.01 })).toBe("menu");
    expect(getReaderGestureAction({ ...tap, startX: 400 * 0.64 })).toBe("next");
  });

  it.each([0, 12, 24, 376, 388, 400])("keeps position %i available to system edge gestures", (startX) => {
    expect(getReaderGestureAction({ ...tap, startX })).toBeNull();
    expect(getReaderGestureAction({ ...tap, startX, deltaX: -100, maxMovement: 100 })).toBeNull();
  });

  it("extends page taps closer to both screen edges", () => {
    for (const startX of [25, 35, 44]) {
      expect(getReaderGestureAction({ ...tap, startX })).toBe("previous");
    }
    for (const startX of [356, 365, 375]) {
      expect(getReaderGestureAction({ ...tap, startX })).toBe("next");
    }
  });

  it("retains the wider system gesture guard for swipes", () => {
    for (const startX of [25, 44, 356, 375]) {
      expect(getReaderGestureAction({ ...tap, startX, deltaX: -100, maxMovement: 100 })).toBeNull();
      expect(getReaderGestureAction({ ...tap, startX, deltaX: 100, maxMovement: 100 })).toBeNull();
    }
    expect(getReaderGestureAction({ ...tap, startX: 45, deltaX: -100, maxMovement: 100 })).toBe("next");
    expect(getReaderGestureAction({ ...tap, startX: 355, deltaX: 100, maxMovement: 100 })).toBe("previous");
  });

  it("recognizes horizontal swipes through the center instead of opening the menu", () => {
    expect(getReaderGestureAction({ ...tap, deltaX: -100, maxMovement: 100 })).toBe("next");
    expect(getReaderGestureAction({ ...tap, deltaX: 100, maxMovement: 100 })).toBe("previous");
  });

  it("uses swipe direction rather than the initial page-tap zone", () => {
    expect(getReaderGestureAction({ ...tap, startX: 100, deltaX: -80, maxMovement: 80 })).toBe("next");
    expect(getReaderGestureAction({ ...tap, startX: 300, deltaX: 80, maxMovement: 80 })).toBe("previous");
  });

  it("ignores vertical drags, short drags, and movement that returns to its origin", () => {
    expect(getReaderGestureAction({ ...tap, deltaY: 100, maxMovement: 100 })).toBeNull();
    expect(getReaderGestureAction({ ...tap, deltaX: -30, maxMovement: 30 })).toBeNull();
    expect(getReaderGestureAction({ ...tap, maxMovement: 40 })).toBeNull();
    expect(getReaderGestureAction({ ...tap, deltaX: 60, deltaY: 60, maxMovement: 60 })).toBeNull();
  });

  it("ignores long presses, multi-touch, and unavailable viewport widths", () => {
    expect(getReaderGestureAction({ ...tap, duration: 600 })).toBeNull();
    expect(getReaderGestureAction({ ...tap, maxTouches: 2 })).toBeNull();
    expect(getReaderGestureAction({ ...tap, width: 0 })).toBeNull();
    expect(getReaderGestureAction({ ...tap, width: 48 })).toBeNull();
  });

  it("supports repeated taps and swipes without a gesture cooldown", () => {
    for (let index = 0; index < 10; index += 1) {
      expect(getReaderGestureAction({ ...tap, startX: 300 })).toBe("next");
      expect(getReaderGestureAction({ ...tap, deltaX: -100, maxMovement: 100 })).toBe("next");
    }
  });
});
