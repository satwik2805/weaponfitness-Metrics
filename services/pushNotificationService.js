// services/pushNotificationService.js
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import axios from 'axios';
import API_URL from '../config/api';

// Configure notification handler
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

/**
 * Register for push notifications and get the Expo push token
 */
export async function registerForPushNotificationsAsync() {
    let token;

    if (Constants.appOwnership === 'expo') {
        return null;
    }

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
            alert('Failed to get push token for push notification!');
            return;
        }

        try {
            const tokenData = await Notifications.getExpoPushTokenAsync({
                projectId: Constants.expoConfig?.extra?.eas?.projectId,
            });
            token = tokenData.data;
        } catch (error) {
            return null;
        }
    } else {
        alert('Must use physical device for Push Notifications');
    }

    return token;
}

/**
 * Save push token to backend for a trainee
 */
export async function savePushToken(traineeId, pushToken) {
    try {
        await axios.post(`${API_URL}/trainees/${traineeId}/push-token`, {
            push_token: pushToken,
        });
    } catch (error) {
        console.error('❌ Error saving push token:', error);
    }
}

/**
 * Schedule a local notification (for testing)
 */
export async function scheduleLocalNotification(title, body, seconds = 5) {
    await Notifications.scheduleNotificationAsync({
        content: {
            title: title,
            body: body,
            data: { data: 'goes here' },
        },
        trigger: { seconds: seconds },
    });
}

/**
 * Send an immediate local notification (for testing)
 */
export async function sendLocalNotification(title, body) {
    await Notifications.scheduleNotificationAsync({
        content: {
            title: title,
            body: body,
            data: { type: 'workout_reminder' },
        },
        trigger: null, // Send immediately
    });
}

/**
 * Add notification received listener
 */
export function addNotificationReceivedListener(callback) {
    return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add notification response listener (when user taps notification)
 */
export function addNotificationResponseListener(callback) {
    return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
}
