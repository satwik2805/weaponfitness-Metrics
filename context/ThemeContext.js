import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeTheme } from '../theme';

const STORAGE_KEY = 'theme';

const ThemeContext = createContext({ ...makeTheme(true), reducedMotion: false });

export const ThemeProvider = ({ children }) => {
    const [isDark, setIsDark] = useState(true);
    const [reducedMotion, setReducedMotion] = useState(false);

    useEffect(() => {
        const loadTheme = async () => {
            try {
                const savedTheme = await AsyncStorage.getItem(STORAGE_KEY);
                if (savedTheme !== null) {
                    setIsDark(savedTheme === 'dark');
                }
            } catch (e) {
                // first launch / storage unavailable — keep the dark default
            }
        };
        loadTheme();
    }, []);

    // Respect the OS "Reduce Motion" setting so animation primitives can
    // short-circuit (review R-018).
    useEffect(() => {
        let mounted = true;
        AccessibilityInfo.isReduceMotionEnabled?.()
            .then((v) => mounted && setReducedMotion(!!v))
            .catch(() => {});
        const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) => setReducedMotion(!!v));
        return () => {
            mounted = false;
            sub?.remove?.();
        };
    }, []);

    const toggleTheme = useCallback((e) => {
        const performToggle = () => {
            setIsDark(prev => {
                const next = !prev;
                AsyncStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light').catch(() => {});
                return next;
            });
        };

        if (Platform.OS === 'web' && document.startViewTransition) {
            let x = window.innerWidth / 2;
            let y = window.innerHeight / 2;

            if (e && e.nativeEvent) {
                x = e.nativeEvent.clientX || e.nativeEvent.pageX || x;
                y = e.nativeEvent.clientY || e.nativeEvent.pageY || y;
            } else if (e && e.clientX) {
                x = e.clientX;
                y = e.clientY;
            }

            const endRadius = Math.hypot(
                Math.max(x, window.innerWidth - x),
                Math.max(y, window.innerHeight - y)
            );

            const style = document.createElement('style');
            style.id = 'theme-transition-style';
            style.textContent = `
              ::view-transition-old(root),
              ::view-transition-new(root) {
                animation: none;
                mix-blend-mode: normal;
              }
              ::view-transition-old(root) {
                z-index: 1;
              }
              ::view-transition-new(root) {
                z-index: 9999;
                clip-path: circle(0px at ${x}px ${y}px);
                animation: theme-reveal 0.65s cubic-bezier(0.4, 0, 0.2, 1) forwards;
              }
              @keyframes theme-reveal {
                to {
                  clip-path: circle(${endRadius}px at ${x}px ${y}px);
                }
              }
            `;
            document.getElementById('theme-transition-style')?.remove();
            document.head.appendChild(style);

            document.startViewTransition(performToggle);
        } else {
            performToggle();
        }
    }, []);

    // Full token set (colors, space, radius, type, motion, elevation, …) plus
    // the legacy { colors, isDark, toggleTheme } shape — pre-design-system
    // screens keep working untouched.
    const theme = useMemo(() => ({
        ...makeTheme(isDark),
        toggleTheme,
        reducedMotion,
    }), [isDark, toggleTheme, reducedMotion]);

    return (
        <ThemeContext.Provider value={theme}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
