// components/ConfettiCelebration.js
import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function Particle({ color, x, y, angle, speed, size }) {
  const animX = useRef(new Animated.Value(x)).current;
  const animY = useRef(new Animated.Value(y)).current;
  const animOpacity = useRef(new Animated.Value(1)).current;
  const animScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animate particle outwards and down (gravity simulation)
    const duration = 1200 + Math.random() * 600;
    const destX = x + Math.cos(angle) * speed * 250;
    const destY = y + Math.sin(angle) * speed * 200 + (SCREEN_HEIGHT * 0.4); // Fall down screen

    Animated.parallel([
      Animated.timing(animX, {
        toValue: destX,
        duration,
        useNativeDriver: Platform.OS !== 'web', // Native animated driver works fine on native, fall back on web
      }),
      Animated.timing(animY, {
        toValue: destY,
        duration,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(animOpacity, {
        toValue: 0,
        duration: duration * 0.8,
        delay: duration * 0.2,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(animScale, {
        toValue: 0.2,
        duration,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: animOpacity,
        transform: [
          { translateX: animX },
          { translateY: animY },
          { scale: animScale },
        ],
      }}
    />
  );
}

export default function ConfettiCelebration({ active, onComplete }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    // Colors matching brand highlights (gold, warning orange, red/orange accent)
    const colors = [
      '#2B7FE8', // Brand Accent (blue)
      '#7DB8FF', // Light Blue
      '#4D9FFF', // Medium Blue
      '#FFB020', // Warning Orange
      '#FFFFFF', // Sparks
    ];

    const startX = SCREEN_WIDTH / 2;
    const startY = SCREEN_HEIGHT * 0.72; // Outwards from above the modal finish button

    // Generate 45 particles in a fan-out trajectory
    const newParticles = Array.from({ length: 45 }).map((_, i) => {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI; // Fan upwards (-180 to 0 degrees)
      const speed = 0.6 + Math.random() * 1.6;
      const size = 6 + Math.random() * 8;
      const color = colors[Math.floor(Math.random() * colors.length)];
      return { id: i, color, x: startX, y: startY, angle, speed, size };
    });

    setParticles(newParticles);

    const timer = setTimeout(() => {
      onComplete?.();
    }, 1800);

    return () => clearTimeout(timer);
  }, [active]);

  if (!active || particles.length === 0) return null;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999999,
        overflow: 'hidden',
      }}
    >
      {particles.map((p) => (
        <Particle key={p.id} {...p} />
      ))}
    </View>
  );
}
