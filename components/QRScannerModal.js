import React, { useEffect, useState } from 'react';
import { Modal, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Button, EmptyState, IconButton, Text } from './ui';

/**
 * QR check-in scanner. Full-screen camera (a bottom sheet can't hold a live
 * camera viewport), but composed entirely from design-system primitives +
 * tokens — no raw StyleSheet, hex, or platform touchables. A framed reticle guides
 * the scan; the scrim + copy use the over-photo colour roles.
 */
export default function QRScannerModal({ visible, onClose, onScan }) {
  const { colors, space, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (visible) setScanned(false);
  }, [visible]);

  if (!permission) return null;

  // permission not yet granted — ask, on a clean themed surface
  if (!permission.granted) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={{ flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: colors.surfaceRaised,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              paddingHorizontal: space[5],
              paddingTop: space[5],
              paddingBottom: Math.max(insets.bottom, space[5]),
            }}
          >
            <EmptyState
              icon="camera-outline"
              title="Camera access needed"
              body="Allow camera access to scan the check-in QR at the front desk."
            />
            <View style={{ gap: space[3], marginTop: space[2] }}>
              <Button title="Allow camera" icon="camera" onPress={requestPermission} />
              <Button title="Not now" variant="ghost" onPress={onClose} />
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={(data) => {
            if (!scanned) {
              setScanned(true);
              onScan(data.data);
            }
          }}
        />

        {/* overlay chrome */}
        <View style={{ position: 'absolute', inset: 0 }} pointerEvents="box-none">
          {/* header */}
          <View
            style={{
              position: 'absolute',
              top: insets.top + space[2],
              left: space[4],
              right: space[4],
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text variant="h4" color="textOnPhoto">Scan to check in</Text>
            <IconButton icon="close" variant="ghost" color={colors.textOnPhoto} accessibilityLabel="Close scanner" onPress={onClose} />
          </View>

          {/* reticle */}
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                width: 240,
                height: 240,
                borderRadius: radius.xl,
                borderWidth: 3,
                borderColor: colors.textOnPhoto,
              }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[6] }}>
              <Ionicons name="qr-code-outline" size={16} color={colors.textOnPhotoMuted} />
              <Text variant="bodySm" color="textOnPhotoMuted">
                Point at the QR on the front-desk screen
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
