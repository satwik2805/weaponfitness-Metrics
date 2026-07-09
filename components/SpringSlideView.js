// components/SpringSlideView.js
import React, { useEffect, useRef } from 'react';
import { Animated, Platform } from 'react-native';

export default function SpringSlideView({ activeKey, children, style }) {
  const slideAnim = useRef(new Animated.Value(150)).current; // Start offset to the right
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Reset values to initial off-screen state
    slideAnim.setValue(150);
    fadeAnim.setValue(0);

    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,      // Spring control
        tension: 130,     // Bouncy spring
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      })
    ]).start();
  }, [activeKey]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }],
        }
      ]}
    >
      {children}
    </Animated.View>
  );
}
