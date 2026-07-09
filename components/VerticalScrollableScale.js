import React, { useRef, useEffect, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './ui';
import { useTheme } from '../context/ThemeContext';

export default function VerticalScrollableScale({ value, onChange, min, max, unit, secondaryConverter, onSave }) {
  const { colors, space } = useTheme();
  const scrollViewRef = useRef(null);
  const containerHeight = 155;
  const [localValue, setLocalValue] = useState(value);
  const isInitial = useRef(true);

  const tickHeight = 8;
  
  // Calculate scroll offset for a given value (high numbers at the top)
  const getOffsetForValue = (val) => {
    const relativeVal = max - val;
    return relativeVal * tickHeight;
  };

  // Calculate value for a given scroll offset
  const getValueForOffset = (offset) => {
    const relativeVal = offset / tickHeight;
    let val = max - relativeVal;
    if (val < min) val = min;
    if (val > max) val = max;
    return Math.round(val);
  };

  // Sync scroll position when parent value changes
  useEffect(() => {
    if (value !== localValue || isInitial.current) {
      setLocalValue(value);
      const offset = getOffsetForValue(value);
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: offset, animated: !isInitial.current });
        isInitial.current = false;
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [value]);

  const handleScroll = (event) => {
    const y = event.nativeEvent.contentOffset.y;
    const newVal = getValueForOffset(y);
    if (newVal !== localValue) {
      setLocalValue(newVal);
      onChange(newVal);
    }
  };

  const adjustValue = (amount) => {
    const newVal = Math.max(min, Math.min(max, value + amount));
    onChange(newVal);
  };

  // Pre-calculate ticks (ordered from max down to min)
  const ticks = [];
  for (let i = max; i >= min; i--) {
    ticks.push(i);
  }

  const paddingTop = containerHeight / 2 - tickHeight / 2;
  const paddingBottom = containerHeight / 2 - tickHeight / 2;

  return (
    <View 
      style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center',
        paddingVertical: 12,
        backgroundColor: colors.inputBg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        marginVertical: 8,
        width: '100%',
        alignSelf: 'center',
        maxWidth: 320,
      }}
    >
      {/* Left side: display of value */}
      <View style={{ width: 125, alignItems: 'center', justifyContent: 'center', paddingRight: space[2] }}>
        <Text style={{ fontSize: 26, fontWeight: 'bold', color: colors.accentBright }}>
          {localValue}
        </Text>
        <Text variant="bodySm" color="textMuted" style={{ fontWeight: '600', marginTop: 1 }}>
          {unit}
        </Text>
        {secondaryConverter && (
          <Text variant="caption" color="textMuted" style={{ marginTop: 6, fontSize: 11, textAlign: 'center', lineHeight: 14 }}>
            {secondaryConverter(localValue)}
          </Text>
        )}
      </View>

      {/* Middle: vertical scale */}
      <View style={{ width: 85, height: containerHeight, position: 'relative', overflow: 'hidden' }}>
        {/* Center Pointer */}
        <View 
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: 2,
            backgroundColor: colors.accentBright,
            zIndex: 10,
            transform: [{ translateY: -1 }],
            borderRadius: 1,
          }}
        />

        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          snapToInterval={tickHeight}
          decelerationRate="fast"
          contentContainerStyle={{
            paddingTop: paddingTop,
            paddingBottom: paddingBottom,
          }}
        >
          {ticks.map((t) => {
            const isMajor = t % 10 === 0;
            const isMedium = t % 5 === 0;
            
            return (
              <Pressable
                key={t}
                onPress={() => onChange(t)}
                style={{ 
                  height: tickHeight, 
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                }}
              >
                {/* Tick mark */}
                <View 
                  style={{
                    height: isMajor ? 2 : 1,
                    width: isMajor ? 22 : (isMedium ? 14 : 9),
                    backgroundColor: isMajor ? colors.textMuted : colors.borderStrong,
                    borderRadius: 1,
                  }}
                />
                {/* Number label for major ticks */}
                {isMajor ? (
                  <Text style={{ fontSize: 9, color: colors.textMuted, marginLeft: 6, fontWeight: '600', width: 25 }}>
                    {t}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Right side: buttons for plus, minus, and checkmark */}
      <View style={{ gap: space[3], paddingLeft: space[2], alignItems: 'center' }}>
        <Pressable
          onPress={() => adjustValue(1)}
          accessibilityRole="button"
          accessibilityLabel="Increase value"
          style={({ pressed }) => ({
            padding: space[2],
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Ionicons name="add-circle-outline" size={28} color={colors.textMuted} />
        </Pressable>
        <Pressable
          onPress={() => adjustValue(-1)}
          accessibilityRole="button"
          accessibilityLabel="Decrease value"
          style={({ pressed }) => ({
            padding: space[2],
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Ionicons name="remove-circle-outline" size={28} color={colors.textMuted} />
        </Pressable>

        {onSave && (
          <Pressable
            onPress={onSave}
            accessibilityRole="button"
            accessibilityLabel="Confirm and save"
            style={({ pressed }) => ({
              padding: space[2],
              opacity: pressed ? 0.6 : 1,
              marginTop: space[1],
            })}
          >
            <Ionicons name="checkmark-circle" size={32} color={colors.successBright || '#4CD964'} />
          </Pressable>
        )}
      </View>
    </View>
  );
}
