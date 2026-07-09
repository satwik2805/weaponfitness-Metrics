import { Platform } from "react-native";

/**
 * API Configuration
 *
 * Set EXPO_PUBLIC_API_URL in your .env to point the app at the backend.
 * Expo (SDK 49+) inlines EXPO_PUBLIC_* variables at build time, so this
 * works on native and web without shipping any secrets.
 */
const getBaseUrl = () => {
    // 1. Explicit configuration (preferred, works everywhere)
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }

    // 2. Web Environment — same host as the page, backend on port 8000
    if (Platform.OS === 'web') {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        return `${protocol}//${hostname}:8000`;
    }

    // 3. Fallback for local development
    console.warn("⚠️ EXPO_PUBLIC_API_URL is not configured — falling back to http://localhost:8000");
    return "http://localhost:8000";
};

const BASE_URL = getBaseUrl().replace(/\/+$/, '');
console.log("🔧 API Base URL:", BASE_URL);
export default BASE_URL;
