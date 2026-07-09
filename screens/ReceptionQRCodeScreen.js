// screens/ReceptionQRCodeScreen.js
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { Button, ErrorState, IconButton, ProgressRing, Skeleton, Surface, Text } from '../components/ui';
import { api } from '../config/apiClient';

/**
 * Front-desk check-in code. The QR is a SIGNED, ROTATING token from the
 * backend (HMAC over branch + 30s window) — the old static string could be
 * screenshotted once and replayed forever (audit WF-010). Members scan it
 * with the in-app scanner; the server validates the window and signature.
 */
export default function ReceptionQRCodeScreen({ navigation }) {
  const { colors, space, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [token, setToken] = useState(null);
  const [expiresIn, setExpiresIn] = useState(30);
  const [remaining, setRemaining] = useState(30);
  const [error, setError] = useState(null);
  const timer = useRef(null);

  const fetchToken = useCallback(async () => {
    try {
      const data = await api.get('/attendance/qr-token');
      setToken(data.token);
      const ttl = data.expires_in_seconds || 30;
      setExpiresIn(ttl);
      setRemaining(ttl);
      setError(null);
    } catch (err) {
      setError(err);
      setToken(null);
    }
  }, []);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  // countdown + auto-rotate
  useEffect(() => {
    if (!token) return undefined;
    timer.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          fetchToken();
          return expiresIn;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(timer.current);
  }, [token, expiresIn, fetchToken]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        paddingTop: insets.top + space[3],
        paddingHorizontal: space[5],
        paddingBottom: Math.max(insets.bottom, space[5]),
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
        <IconButton icon="arrow-back" variant="ghost" accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        <Text variant="h3">Member check-in</Text>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[6] }}>
        {error ? (
          <ErrorState
            title="Couldn't generate the code"
            detail={error.message}
            onRetry={fetchToken}
          />
        ) : !token ? (
          <Skeleton height={264} width={264} radius={28} />
        ) : (
          <>
            <Surface level={2} pad={6} radius="xl">
              {/* white tile so any phone camera reads it in any theme */}
              <View style={{ backgroundColor: '#FFFFFF', padding: space[4], borderRadius: 16 }}>
                <QRCode value={token} size={216} backgroundColor="#FFFFFF" color="#0A0A0B" />
              </View>
            </Surface>

            <View style={{ alignItems: 'center', gap: space[2] }}>
              <ProgressRing
                progress={remaining / expiresIn}
                size={56}
                strokeWidth={5}
                valueText={`${remaining}`}
                color={remaining <= 5 ? 'warning' : 'accent'}
              />
              <Text variant="bodySm" color="textFaint">
                Code rotates automatically — screenshots won't work.
              </Text>
            </View>
          </>
        )}
      </View>

      <View style={{ gap: space[3] }}>
        <Text variant="body" color="textMuted" align="center">
          Members scan this with the app's check-in scanner.
        </Text>
        <Button
          title="Today's attendance"
          variant="secondary"
          icon="list-outline"
          onPress={() => navigation.navigate('AttendanceList')}
        />
      </View>
    </View>
  );
}
