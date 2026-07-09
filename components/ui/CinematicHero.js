import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { HeroBackdrop } from './Cinematic';
import CountUp from './CountUp';
import { IconButton } from './Button';
import Reveal from './Reveal';
import Text from './Text';

/**
 * The dashboard masthead — one component instead of ~80 copy-pasted lines in
 * every dashboard (review R-007/R-017). Photo hero with an eyebrow, a poster
 * name, an always-substantive headline metric that counts in, and theme/
 * refresh controls. Over-photo text uses the `textOnPhoto*` roles so it's
 * correct in both themes.
 *
 * <CinematicHero
 *   source={require('../../assets/photos/strength.jpg')}
 *   eyebrow="GOOD MORNING" title="Fortimark"
 *   metric={{ value: 284, label: 'active members', format }}
 *   scrollY={scrollY} onToggleTheme={fn} onRefresh={fn}
 * />
 */
export default function CinematicHero({
  source,
  eyebrow,
  title,
  metric, // { value:number, label:string, format?:fn, suffix?:string }
  scrollY,
  height,
  onToggleTheme,
  onRefresh,
  rightSlot,
  darkness = 0.42,
}) {
  const { colors, space, fonts, layout, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <HeroBackdrop source={source} height={height ?? layout.heroHeight} scrollY={scrollY} darkness={darkness} maxWidth={layout.contentMaxWidth}>
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + space[4],
          paddingHorizontal: layout.gutter,
          paddingBottom: space[5],
          maxWidth: layout.contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* top row: eyebrow + name, controls */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Reveal index={0} distance={14} style={{ flex: 1 }}>
            {eyebrow ? (
              <Text variant="labelSm" color="textOnPhotoMuted" style={{ letterSpacing: 3 }}>
                {eyebrow}
              </Text>
            ) : null}
            <Text
              numberOfLines={1}
              style={{ fontFamily: fonts.display, fontSize: 40, lineHeight: 44, letterSpacing: -1, color: colors.textOnPhoto, marginTop: 2 }}
            >
              {title || ' '}
            </Text>
          </Reveal>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], marginLeft: space[3] }}>
            {onToggleTheme ? (
              <IconButton
                icon={isDark ? 'sunny-outline' : 'moon-outline'}
                variant="ghost"
                color={colors.textOnPhoto}
                accessibilityLabel="Toggle theme"
                onPress={onToggleTheme}
              />
            ) : null}
            {onRefresh ? (
              <IconButton icon="refresh-outline" variant="ghost" color={colors.textOnPhoto} accessibilityLabel="Refresh" onPress={onRefresh} />
            ) : null}
            {rightSlot}
          </View>
        </View>

        {/* headline metric */}
        {metric ? (
          <Reveal index={1}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space[3] }}>
              <CountUp
                value={metric.value || 0}
                format={metric.format}
                style={{ fontFamily: fonts.display, fontSize: 64, lineHeight: 64, letterSpacing: -2, color: colors.textOnPhoto }}
              />
              {metric.label ? (
                <Text variant="label" color="textOnPhotoMuted" style={{ marginBottom: 10, maxWidth: 150 }}>
                  {metric.label}
                </Text>
              ) : null}
            </View>
          </Reveal>
        ) : null}
      </View>
    </HeroBackdrop>
  );
}
