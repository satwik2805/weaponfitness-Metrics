import React, { useEffect, useRef } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import Text from './Text';
import { IconButton } from './Button';

/**
 * The modal shell every dialog in the app goes through: bottom sheet on
 * phones, centered card on wide screens. Backdrop fade + content slide,
 * drag handle, title row with close, scrollable body, keyboard-safe.
 *
 * <Sheet visible={open} onClose={…} title="Assign workout">…</Sheet>
 */
export default function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  scroll = true,
  maxHeightPct = 0.88,
  style,
}) {
  const { colors, radius, space, motion, elevation, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const wide = width >= 640;
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(anim, { toValue: 1, friction: 11, tension: 110, useNativeDriver: true }).start();
    } else {
      anim.setValue(0);
    }
  }, [visible, anim]);

  if (!visible) return null;

  const body = scroll ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: space[5], paddingBottom: space[5] }}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1, paddingHorizontal: space[5], paddingBottom: space[5] }}>{children}</View>
  );

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* backdrop */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.scrim, opacity: anim },
            Platform.select({
              web: {
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              },
              default: {},
            }),
          ]}
        >
          <Pressable accessibilityLabel="Close" style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>

        {/* panel */}
        <View pointerEvents="box-none" style={{ flex: 1, justifyContent: wide ? 'center' : 'flex-end', alignItems: 'center' }}>
          <Animated.View
            style={[
              {
                width: wide ? Math.min(560, width - space[6] * 2) : '100%',
                maxHeight: height * maxHeightPct,
                backgroundColor: colors.surfaceRaised,
                borderTopLeftRadius: radius.xl,
                borderTopRightRadius: radius.xl,
                borderBottomLeftRadius: wide ? radius.xl : 0,
                borderBottomRightRadius: wide ? radius.xl : 0,
                borderWidth: 1,
                borderColor: colors.border,
                paddingBottom: wide ? 0 : insets.bottom,
                opacity: anim,
                transform: [
                  { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [wide ? 24 : 64, 0] }) },
                ],
              },
              elevation[4],
              style,
            ]}
          >
            {/* drag handle (phones) */}
            {!wide && (
              <View style={{ alignItems: 'center', paddingTop: space[2] }}>
                <View style={{ width: 36, height: 4, borderRadius: radius.full, backgroundColor: colors.borderStrong }} />
              </View>
            )}

            {/* header */}
            {(title || subtitle) && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  paddingHorizontal: space[5],
                  paddingTop: space[4],
                  paddingBottom: space[3],
                  gap: space[3],
                }}
              >
                <View style={{ flex: 1 }}>
                  {title ? <Text variant="h3">{title}</Text> : null}
                  {subtitle ? (
                    <Text variant="bodySm" color="textMuted" style={{ marginTop: 2 }}>
                      {subtitle}
                    </Text>
                  ) : null}
                </View>
                <IconButton icon="close" variant="ghost" size={32} iconSize={20} accessibilityLabel="Close" onPress={onClose} />
              </View>
            )}

            {body}

            {footer ? (
              <View
                style={{
                  paddingHorizontal: space[5],
                  paddingVertical: space[4],
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                  flexDirection: 'row',
                  gap: space[3],
                }}
              >
                {footer}
              </View>
            ) : null}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
