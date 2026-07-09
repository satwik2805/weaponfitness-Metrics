import React, { useRef, useState } from 'react';
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { Button, IconButton, Input, Text, useToast } from '../components/ui';
import { LogoMark } from '../components/brand/Logo';
import { supabase } from '../config/supabase';

/**
 * Sign in. Composition: a sharp photo band carries the brand lockup; the form
 * rises over it on a clean themed surface (legible inputs in both themes).
 * Errors are inline and human — never a silent failure, never a platform
 * Alert (a no-op on web). On success: navigation.replace('Loading') resolves
 * the role and routes.
 */

const EMAIL_RE = /^\S+@\S+\.\S+$/;

// Supabase error → copy a human can act on.
function friendlyAuthError(error) {
  const msg = (error?.message || '').toLowerCase();
  if (msg.includes('invalid login credentials')) {
    return "That email and password don't match our records. Check both and try again.";
  }
  if (msg.includes('email not confirmed')) {
    return "This email hasn't been confirmed yet. Check your inbox for the confirmation link.";
  }
  if (msg.includes('failed to fetch') || msg.includes('network') || error?.name === 'TypeError' || error?.name === 'AuthRetryableFetchError') {
    return "We can't reach the server right now. Check your connection and try again.";
  }
  return error?.message || 'Something went wrong signing you in. Please try again.';
}

export default function LoginScreen({ navigation }) {
  const { colors, space, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const passwordRef = useRef(null);

  // Photo band ~42% of the viewport, bounded so it reads well on any screen.
  const bandHeight = Math.max(260, Math.min(height * 0.42, 420));

  const validate = () => {
    const errs = {};
    if (!(email || '').trim()) errs.email = 'Enter your email.';
    else if (!EMAIL_RE.test((email || '').trim())) errs.email = "That doesn't look like an email address.";
    if (!password) errs.password = 'Enter your password.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async () => {
    setFormError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: (email || '').trim(), password });
      if (error) {
        setFormError(friendlyAuthError(error));
        return;
      }
      if (data?.session) {
        navigation.replace('Loading');
        return;
      }
      // Rare: no error but no session — re-check once before giving up.
      await new Promise((r) => setTimeout(r, 500));
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigation.replace('Loading');
      } else {
        setFormError("We couldn't start your session. Please try again.");
      }
    } catch (err) {
      setFormError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setFormError(null);
    if (!(email || '').trim() || !EMAIL_RE.test((email || '').trim())) {
      setFieldErrors({ email: 'Enter your email above first, then tap "Forgot password" again.' });
      return;
    }
    setResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail((email || '').trim());
      if (error) {
        setFormError(friendlyAuthError(error));
      } else {
        toast.show(`Password reset link sent to ${(email || '').trim()}.`, { kind: 'success' });
      }
    } catch (err) {
      setFormError(friendlyAuthError(err));
    } finally {
      setResetting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── PHOTO BAND ── */}
          <View style={{ height: bandHeight }}>
            <ImageBackground
              source={require('../assets/photos/athlete-rope.jpg')}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
            {/* brand tint + a fade only at the band's base, into the form surface */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(229,9,20,0.10)' }]} />
            <LinearGradient
              colors={['rgba(5,5,6,0.45)', 'rgba(5,5,6,0.10)', colors.bg]}
              locations={[0, 0.5, 1]}
              style={StyleSheet.absoluteFill}
            />

            <View style={{ position: 'absolute', top: insets.top + space[2], left: space[4] }}>
              <IconButton
                icon="arrow-back"
                variant="ghost"
                color="#FFFFFF"
                accessibilityLabel="Back to welcome"
                onPress={() => navigation.goBack()}
              />
            </View>

            {/* lockup anchored to the band base */}
            <View style={{ position: 'absolute', left: space[6], right: space[6], bottom: space[6], maxWidth: 560, width: '100%', alignSelf: 'center' }}>
              <LogoMark size={52} />
              <Text variant="h1" style={{ color: '#FFFFFF', marginTop: space[4] }}>
                Welcome back
              </Text>
              <Text variant="body" style={{ color: 'rgba(255,255,255,0.78)', marginTop: space[1] }}>
                Sign in to pick up where you left off.
              </Text>
            </View>
          </View>

          {/* ── FORM SURFACE, rising over the band ── */}
          <View
            style={{
              flex: 1,
              marginTop: -radius.xl,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              backgroundColor: colors.bg,
              paddingTop: space[7],
            }}
          >
            <View style={{ paddingHorizontal: space[6], maxWidth: 560, width: '100%', alignSelf: 'center', flex: 1, paddingBottom: space[8] }}>
              {formError ? (
                <View
                  accessibilityLiveRegion="polite"
                  style={{
                    flexDirection: 'row',
                    gap: space[3],
                    alignItems: 'flex-start',
                    backgroundColor: colors.dangerSoft,
                    borderWidth: 1,
                    borderColor: colors.danger,
                    borderRadius: 14,
                    padding: space[4],
                    marginBottom: space[5],
                  }}
                >
                  <Ionicons name="alert-circle" size={18} color={colors.danger} style={{ marginTop: 1 }} />
                  <Text variant="bodySm" style={{ flex: 1 }}>
                    {formError}
                  </Text>
                </View>
              ) : null}

              <View style={{ gap: space[5] }}>
                <Input
                  label="Email"
                  icon="mail-outline"
                  placeholder="you@gym.com"
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    if (fieldErrors.email) setFieldErrors((e) => ({ ...e, email: undefined }));
                  }}
                  error={fieldErrors.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
                <Input
                  ref={passwordRef}
                  label="Password"
                  icon="lock-closed-outline"
                  placeholder="Your password"
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v);
                    if (fieldErrors.password) setFieldErrors((e) => ({ ...e, password: undefined }));
                  }}
                  error={fieldErrors.password}
                  secureTextEntry
                  autoComplete="current-password"
                  textContentType="password"
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                />

                <Button title="Sign in" size="lg" fullWidth loading={loading} onPress={handleLogin} />

                <Pressable
                  onPress={handleForgotPassword}
                  disabled={resetting}
                  accessibilityRole="button"
                  style={{ alignSelf: 'center', padding: space[2] }}
                >
                  <Text variant="bodySm" color={resetting ? 'textFaint' : 'textMuted'}>
                    {resetting ? 'Sending reset link…' : 'Forgot password?'}
                  </Text>
                </Pressable>
              </View>

              <View style={{ flex: 1, minHeight: space[6] }} />

              <Text variant="bodySm" color="textFaint" align="center">
                No account yet? Your gym creates it for you — ask at the front desk.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
