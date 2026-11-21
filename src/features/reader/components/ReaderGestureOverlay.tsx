import { useMemo, useRef } from "react";
import { PanResponder, StyleSheet, View } from "react-native";

import { getReaderGestureAction, READER_GESTURE_EDGE_GUARD } from "@/features/reader/gestures";
import type { ReaderGestureAction } from "@/features/reader/gestures";

export function ReaderGestureOverlay({ onAction, menuLabel, previousLabel, nextLabel }: {
  onAction: (action: ReaderGestureAction) => void;
  menuLabel: string;
  previousLabel: string;
  nextLabel: string;
}) {
  const widthRef = useRef(0);
  const touchRef = useRef({ startX: 0, startedAt: 0, maxMovement: 0, maxTouches: 1 });
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => {
      touchRef.current = {
        startX: event.nativeEvent.locationX + READER_GESTURE_EDGE_GUARD,
        startedAt: Date.now(),
        maxMovement: 0,
        maxTouches: event.nativeEvent.touches.length
      };
    },
    onPanResponderMove: (_event, gesture) => {
      touchRef.current.maxMovement = Math.max(touchRef.current.maxMovement, Math.abs(gesture.dx), Math.abs(gesture.dy));
      touchRef.current.maxTouches = Math.max(touchRef.current.maxTouches, gesture.numberActiveTouches);
    },
    onPanResponderStart: (_event, gesture) => {
      touchRef.current.maxTouches = Math.max(touchRef.current.maxTouches, gesture.numberActiveTouches);
    },
    onPanResponderRelease: (_event, gesture) => {
      const touch = touchRef.current;
      const action = getReaderGestureAction({
        width: widthRef.current,
        startX: touch.startX,
        deltaX: gesture.dx,
        deltaY: gesture.dy,
        maxMovement: touch.maxMovement,
        duration: Date.now() - touch.startedAt,
        maxTouches: touch.maxTouches
      });
      if (action) {
        onAction(action);
      }
    },
    onPanResponderTerminationRequest: () => true,
    onPanResponderTerminate: () => { touchRef.current.maxTouches = 0; }
  }), [onAction]);

  return (
    <View
      {...responder.panHandlers}
      accessible
      accessibilityRole="button"
      accessibilityLabel={menuLabel}
      accessibilityActions={[
        { name: "activate", label: menuLabel },
        { name: "decrement", label: previousLabel },
        { name: "increment", label: nextLabel }
      ]}
      onAccessibilityAction={(event) => {
        const action = event.nativeEvent.actionName;
        if (action === "activate") onAction("menu");
        if (action === "decrement") onAction("previous");
        if (action === "increment") onAction("next");
      }}
      onLayout={(event) => { widthRef.current = event.nativeEvent.layout.width + READER_GESTURE_EDGE_GUARD * 2; }}
      style={styles.touchArea}
    />
  );
}

const styles = StyleSheet.create({
  touchArea: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: READER_GESTURE_EDGE_GUARD,
    right: READER_GESTURE_EDGE_GUARD
  }
});
