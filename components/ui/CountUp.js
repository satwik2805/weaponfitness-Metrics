import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import Text from './Text';

/**
 * Animated numeral — numbers that arrive, not appear. Eases out over ~900ms.
 *
 * <CountUp value={284} variant="statLg" />
 * <CountUp value={40497} format={(n) => `₹${n.toLocaleString('en-IN')}`} />
 */
export default function CountUp({
  value = 0,
  duration = 900,
  format = (n) => String(n),
  variant = 'statLg',
  color,
  style,
  ...rest
}) {
  const { reducedMotion } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  // Keep the latest formatter/duration in refs so the listener always uses the
  // current one — callers pass inline `format={(n)=>money(n)}` that changes
  // every render while `value` is stable (review R-009).
  const fmtRef = useRef(format);
  fmtRef.current = format;
  const durRef = useRef(duration);
  durRef.current = duration;
  const [display, setDisplay] = useState(() => format(0));

  useEffect(() => {
    if (reducedMotion) {
      setDisplay(fmtRef.current(value));
      return undefined;
    }
    const id = anim.addListener(({ value: v }) => {
      setDisplay(fmtRef.current(Math.round(v)));
    });
    Animated.timing(anim, {
      toValue: value,
      duration: durRef.current,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: false, // we read the value on the JS side
    }).start(() => setDisplay(fmtRef.current(value)));
    return () => anim.removeListener(id);
  }, [value, anim, reducedMotion]);

  return (
    <Text variant={variant} color={color} style={style} {...rest}>
      {display}
    </Text>
  );
}
