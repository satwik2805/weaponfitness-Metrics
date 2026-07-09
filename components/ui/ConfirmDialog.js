import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import Sheet from './Sheet';
import Button from './Button';
import Text from './Text';

/**
 * Promise-based confirmation — the app-wide replacement for Alert.alert
 * (which is a silent no-op on react-native-web; 146 call sites shipped
 * broken because of it).
 *
 *   const confirm = useConfirm();
 *   if (await confirm({
 *     title: 'Delete this plan?',
 *     message: 'Members on it keep access until their term ends.',
 *     confirmTitle: 'Delete',
 *     destructive: true,
 *   })) { … }
 *
 * Resolves true on confirm, false on cancel/dismiss. Never throws.
 */

const ConfirmContext = createContext(() => Promise.resolve(false));

export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null); // { title, message, … }
  const resolver = useRef(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      // If a dialog is somehow already open, cancel it first.
      resolver.current?.(false);
      resolver.current = resolve;
      setRequest(options || {});
    });
  }, []);

  const settle = useCallback((result) => {
    resolver.current?.(result);
    resolver.current = null;
    setRequest(null);
  }, []);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {request ? <ConfirmSheet request={request} onSettle={settle} /> : null}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);

function ConfirmSheet({ request, onSettle }) {
  const { colors, space, radius } = useTheme();
  const {
    title = 'Are you sure?',
    message,
    confirmTitle = 'Confirm',
    cancelTitle = 'Cancel',
    destructive = false,
    icon,
  } = request;

  return (
    <Sheet
      visible
      onClose={() => onSettle(false)}
      scroll={false}
      maxHeightPct={0.5}
      footer={
        <>
          <Button title={cancelTitle} variant="ghost" onPress={() => onSettle(false)} style={{ flex: 1 }} />
          <Button
            title={confirmTitle}
            variant={destructive ? 'danger' : 'primary'}
            hapticKind={destructive ? 'warning' : 'light'}
            onPress={() => onSettle(true)}
            style={{ flex: 2 }}
          />
        </>
      }
    >
      <View style={{ alignItems: 'center', paddingTop: space[5], paddingBottom: space[2] }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: radius.full,
            backgroundColor: destructive ? colors.dangerSoft : colors.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: space[4],
          }}
        >
          <Ionicons
            name={icon || (destructive ? 'trash-outline' : 'help-circle-outline')}
            size={26}
            color={destructive ? colors.danger : colors.accentBright}
          />
        </View>
        <Text variant="h3" align="center">{title}</Text>
        {message ? (
          <Text variant="body" color="textMuted" align="center" style={{ marginTop: space[2], maxWidth: 360 }}>
            {message}
          </Text>
        ) : null}
      </View>
    </Sheet>
  );
}
