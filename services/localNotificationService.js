import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export const localNotificationService = {
    /**
     * Configure the global notification handler.
     * Call this early in the app lifecycle (e.g. App.js).
     */
    configure: () => {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: false,
            }),
        });
    },

    /**
     * Request permissions to send notifications.
     * Returns true if granted.
     */
    requestPermissions: async () => {
        if (Platform.OS === 'web') return false; // Web push not supported this way

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') {
                return false;
            }
            return true;
        }

        // Simulators/Emulators
        return true;
    },

    /**
     * Schedule the daily bedtime reminder.
     * @param {string} timeString - "HH:mm" (24-hour format)
     */
    scheduleBedtimeReminder: async (timeString) => {
        if (Platform.OS === 'web') return;

        const [hours, minutes] = timeString.split(':').map(Number);

        // 1. Cancel any existing bedtime reminders to avoid duplicates
        await Notifications.cancelAllScheduledNotificationsAsync();

        // 2. Schedule new
        // Note: 'hour' and 'minute' in trigger objects for daily frequency
        const trigger = {
            channelId: 'default',
            hour: hours,
            minute: minutes,
            repeats: true,
        };


        await Notifications.scheduleNotificationAsync({
            content: {
                title: "Bedtime Reminder 🌙",
                body: "Time to wind down! Quality sleep builds strength. 💪",
                sound: true,
            },
            trigger,
        });
    },

    /**
     * Cancel all notifications (e.g. if user disables reminders)
     */
    cancelReminders: async () => {
        if (Platform.OS === 'web') return;
        await Notifications.cancelAllScheduledNotificationsAsync();
    }
};
