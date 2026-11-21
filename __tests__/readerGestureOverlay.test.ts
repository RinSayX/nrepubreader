import { createElement } from "react";
import { PanResponder, View } from "react-native";
import type { GestureResponderEvent, PanResponderCallbacks, PanResponderGestureState } from "react-native";

import { ReaderGestureOverlay } from "@/features/reader/components/ReaderGestureOverlay";
import { READER_GESTURE_EDGE_GUARD } from "@/features/reader/gestures";

const { create, act } = jest.requireActual("react-test-renderer");

const gesture: PanResponderGestureState = {
  stateID: 1, moveX: 200, moveY: 200, x0: 200, y0: 200,
  dx: 0, dy: 0, vx: 0, vy: 0, numberActiveTouches: 1, _accountsForMovesUpTo: 0
};

function touch(startX: number) {
  return { nativeEvent: { locationX: startX - READER_GESTURE_EDGE_GUARD, touches: [{}] } } as unknown as GestureResponderEvent;
}

describe("reader gesture overlay", () => {
  let tree: ReturnType<typeof create>;
  let handlers: PanResponderCallbacks;
  const onAction = jest.fn();

  beforeEach(() => {
    onAction.mockClear();
    jest.spyOn(PanResponder, "create").mockImplementation((config) => {
      handlers = config;
      return { panHandlers: {} };
    });
    act(() => {
      tree = create(createElement(ReaderGestureOverlay, {
        onAction, menuLabel: "Menu", previousLabel: "Previous", nextLabel: "Next"
      }));
    });
    act(() => {
      tree.root.findByType(View).props.onLayout({ nativeEvent: { layout: { width: 400 - READER_GESTURE_EDGE_GUARD * 2 } } });
    });
  });

  afterEach(() => {
    act(() => tree.unmount());
    jest.restoreAllMocks();
  });

  it.each([[25, "previous"], [100, "previous"], [200, "menu"], [300, "next"], [375, "next"]])("dispatches one action for a tap at %s", (startX, action) => {
    const event = touch(startX as number);

    act(() => {
      handlers.onPanResponderGrant?.(event, gesture);
      handlers.onPanResponderRelease?.(event, gesture);
    });

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith(action);
  });

  it("keeps a center swipe from becoming a menu tap", () => {
    const event = touch(200);
    const swipe = { ...gesture, dx: -100 };

    act(() => {
      handlers.onPanResponderGrant?.(event, gesture);
      handlers.onPanResponderMove?.(event, swipe);
      handlers.onPanResponderRelease?.(event, swipe);
    });

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith("next");
  });

  it("ignores a multi-touch gesture even if only one finger remains at release", () => {
    const event = touch(200);

    act(() => {
      handlers.onPanResponderGrant?.(event, gesture);
      handlers.onPanResponderStart?.(event, { ...gesture, numberActiveTouches: 2 });
      handlers.onPanResponderRelease?.(event, gesture);
    });

    expect(onAction).not.toHaveBeenCalled();
  });

  it("does not mistake dragging out and back for a tap", () => {
    const event = touch(200);

    act(() => {
      handlers.onPanResponderGrant?.(event, gesture);
      handlers.onPanResponderMove?.(event, { ...gesture, dy: 50 });
      handlers.onPanResponderRelease?.(event, gesture);
    });

    expect(onAction).not.toHaveBeenCalled();
  });
});
