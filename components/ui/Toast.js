import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import Text from './Text';
import { haptic } from './haptics';

const KINDS = {
  success: { icon: 'checkmark-circle', color: 'success', haptic: 'success' },
  error: { icon: 'alert-circle', color: 'danger', haptic: 'error' },
  warning: { icon: 'warning', color: 'warning', haptic: 'warning' },
  info: { icon: 'information-circle', color: 'info', haptic: 'light' },
};

const ToastContext = createContext({ show: () => {} });

/**
 * Global toast layer. Mount once in App; fire from anywhere:
 *
 *   const toast = useToast();
 *   toast.show("Workout saved", { kind: 'success' });
 *
 * One toast at a time (a new one replaces the current), auto-dismiss,
 * tap to dismiss, announced to assistive tech.
 */
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null); // { id, message, kind }
  const timer = useRef(null);

  const show = useCallback((message, { kind = 'info', duration = 3200 } = {}) => {
    if (timer.current) clearTimeout(timer.current);
    haptic(KINDS[kind]?.haptic || 'light');
    setToast({ id: Date.now(), message, kind });
    timer.current = setTimeout(() => setToast(null), duration);
  }, []);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setToast(null);
  }, []);

  useEffect(() => () => timer.current && clearTimeout(timer.current), []);

  const value = useMemo(() => ({ show, hide }), [show, hide]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? <ToastView key={toast.id} toast={toast} onDismiss={hide} /> : null}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

function ToastView({ toast, onDismiss }) {
  const { colors, radius, space, zIndex, motion, elevation } = useTheme();
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(0)).current;
  const kind = KINDS[toast.kind] || KINDS.info;

  useEffect(() => {
    Animated.spring(slide, { toValue: 1, friction: 10, tension: 120, useNativeDriver: true }).start();
  }, [slide]);

  return (
    <Animated.View
      pointerEvents="box-none"
      accessibilityLiveRegion="polite"
      style={{
        position: 'absolute',
        top: insets.top + space[2],
        left: space[4],
        right: space[4],
        zIndex: zIndex.toast,
        alignItems: 'center',
        opacity: slide,
        transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }],
      }}
    >
      <Pressable
        accessibilityRole="alert"
        onPress={onDismiss}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: space[3],
            maxWidth: 480,
            width: '100%',
            backgroundColor: colors.surfaceRaised,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.borderStrong,
            paddingHorizontal: space[4],
            paddingVertical: space[3],
          },
          elevation[3],
        ]}
      >
        <Ionicons name={kind.icon} size={20} color={colors[kind.color]} />
        <Text variant="body" style={{ flex: 1 }} numberOfLines={3}>
          {toast.message}
        </Text>
        <Ionicons name="close" size={16} color={colors.textFaint} />
      </Pressable>
    </Animated.View>
  );
}
