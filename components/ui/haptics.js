/**
 * Haptic feedback, safely no-op'd on web.
 * Usage: haptic('light' | 'medium' | 'success' | 'warning' | 'error' | 'selection')
 */
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export const haptic = (kind = 'light') => {
  if (Platform.OS === 'web') return;
  try {
    switch (kind) {
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'selection':
        Haptics.selectionAsync();
        break;
      default:
        break;
    }
  } catch (e) {
    // haptics are garnish — never let them throw
  }
};
