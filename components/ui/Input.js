import React, { useState, forwardRef } from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import Text from './Text';

/**
 * Field: label + input + validation. Focus ring, error state with human copy,
 * secure-entry toggle, leading icon.
 *
 * <Input label="Email" icon="mail-outline" error={errors.email} … />
 */
const Input = forwardRef(function Input(
  {
    label,
    icon,
    error,
    helper,
    secureTextEntry,
    style,
    inputStyle,
    onFocus,
    onBlur,
    ...rest
  },
  ref
) {
  const { colors, radius, space, type, fonts } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureTextEntry);

  const borderColor = error ? colors.danger : focused ? colors.focus : colors.border;

  return (
    <View style={style}>
      {label ? (
        <Text variant="label" color="textMuted" style={{ marginBottom: space[2] }}>
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: focused ? colors.inputBgFocused : colors.inputBg,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor,
          paddingHorizontal: space[4],
          height: 52,
          gap: space[3],
        }}
      >
        {icon ? (
          <Ionicons name={icon} size={18} color={error ? colors.danger : focused ? colors.text : colors.textFaint} />
        ) : null}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={colors.textFaint}
          secureTextEntry={hidden}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          style={[
            {
              flex: 1,
              color: colors.text,
              fontFamily: fonts.regular,
              fontSize: type.body.fontSize,
              paddingVertical: 0,
              ...(rest.multiline ? { textAlignVertical: 'top', paddingTop: space[3] } : null),
            },
            // RN-web: kill the default focus outline; the border is the ring
            { outlineStyle: 'none' },
            inputStyle,
          ]}
          {...rest}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            onPress={() => setHidden(!hidden)}
            hitSlop={8}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={18} color={colors.textFaint} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[1], marginTop: space[2] }}>
          <Ionicons name="alert-circle" size={13} color={colors.danger} />
          <Text variant="bodySm" color="danger">{error}</Text>
        </View>
      ) : helper ? (
        <Text variant="bodySm" color="textFaint" style={{ marginTop: space[2] }}>{helper}</Text>
      ) : null}
    </View>
  );
});

export default Input;
