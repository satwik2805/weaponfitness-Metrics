import { supabase } from '../config/supabase';
import { Alert } from 'react-native';

/**
 * Checks the rate limit for a specific action path.
 * 
 * @param {string} path - The path to check against (e.g., '/login', '/attendance', '/default')
 * @param {string} action - Descriptive action name for logging (default: 'check_limit')
 * @returns {Promise<{allowed: boolean, remaining: number|null, error: any}>}
 */
export const checkRateLimit = async (path, action = 'check_limit') => {
    try {
        const { data: rlData, error: rlError } = await supabase.functions.invoke('rate-limit-demo', {
            body: { action },
            headers: { 'x-action-path': path }
        });

        if (rlError) {
            console.log(`[RateLimit] Blocked or Error on ${path}:`, rlError);
            const messages = {
                '/login': "Too many login attempts. Please wait a moment.",
                '/otp': "Too many OTP requests. Please wait.",
                '/signup': "Too many registration attempts. Please try again later.",
                '/attendance': "Too many scan attempts. Please wait.",
                '/booking': "Too many booking attempts. Please wait.",
                '/feedback': "You are submitting feedback too quickly. Please wait.",
                '/create_group': "Too many groups created. Please wait a while.",
                '/create_diet': "Too many diet templates created. Settle down!",
                '/create_workout': "Too many workout templates created fast. Take a break!",
                '/assign_workout': "Assignment limit reached. Please wait a minute.",
                '/assign_diet': "Diet assignment limit reached. Please wait a minute.",
                '/admin_write': "Too many admin updates. Rate limit exceeded.",
                'default': "Too many requests. Please try again later."
            };

            const message = messages[path] || messages['default'];

            Alert.alert("Rate Limit Exceeded", message);

            return { allowed: false, remaining: 0, error: rlError };
        }

        // Success
        return {
            allowed: true,
            remaining: (rlData && typeof rlData.remaining === 'number') ? rlData.remaining : null,
            error: null
        };

    } catch (err) {
        console.error("[RateLimit] Exception:", err);
        // Fail safe: If the check fails (e.g. network error), currently we might choose to allow or block. 
        // Blocking is safer for security, allowing is better for UX if usage is low.
        // Here we strictly block on error to be safe, but you might want to change this policy.
        Alert.alert("Error", "Could not verify request limit. Please check connection.");
        return { allowed: false, remaining: null, error: err };
    }
};
