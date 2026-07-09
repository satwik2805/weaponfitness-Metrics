import React from 'react';
import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../context/ThemeContext';
import { Button, Sheet, Text } from './ui';

export default function QRCodeModal({ visible, onClose }) {
  const { space, radius } = useTheme();

  const qrValue = 'ATTENDANCE_GATE_QR';

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Scan to mark attendance"
      subtitle="Members scan this with their app"
      footer={<Button title="Close" variant="secondary" onPress={onClose} fullWidth />}
    >
      <View style={{ alignItems: 'center', paddingVertical: space[4] }}>
        {/* QR codes require a solid white quiet-zone to scan reliably */}
        <View style={{ padding: space[5], backgroundColor: '#FFFFFF', borderRadius: radius.lg }}>
          <QRCode value={qrValue} size={220} backgroundColor="transparent" />
        </View>
        <Text variant="bodySm" color="textMuted" align="center" style={{ marginTop: space[4], maxWidth: 260 }}>
          Hold the code steady inside the member's scanner frame.
        </Text>
      </View>
    </Sheet>
  );
}
