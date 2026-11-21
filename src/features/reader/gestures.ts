export const READER_GESTURE_EDGE_GUARD = 24;
const READER_SWIPE_EDGE_GUARD = 44;

export type ReaderGestureAction = "previous" | "next" | "menu";

export type ReaderGesture = {
  width: number;
  startX: number;
  deltaX: number;
  deltaY: number;
  maxMovement: number;
  duration: number;
  maxTouches: number;
};

export function getReaderGestureAction(gesture: ReaderGesture): ReaderGestureAction | null {
  const { width, startX, deltaX, deltaY, maxMovement, duration, maxTouches } = gesture;
  if (width <= READER_GESTURE_EDGE_GUARD * 2 || maxTouches !== 1 ||
      startX <= READER_GESTURE_EDGE_GUARD || startX >= width - READER_GESTURE_EDGE_GUARD) {
    return null;
  }

  const horizontal = Math.abs(deltaX);
  const vertical = Math.abs(deltaY);
  if (horizontal >= 56 && vertical <= 80 && horizontal >= vertical * 1.35) {
    if (startX <= READER_SWIPE_EDGE_GUARD || startX >= width - READER_SWIPE_EDGE_GUARD) {
      return null;
    }
    return deltaX < 0 ? "next" : "previous";
  }
  if (Math.max(horizontal, vertical, maxMovement) > 12 || duration > 500) {
    return null;
  }
  if (startX < width * 0.36) {
    return "previous";
  }
  if (startX >= width * 0.64) {
    return "next";
  }
  return "menu";
}
