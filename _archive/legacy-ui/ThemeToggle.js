import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = ({ style }) => {
    const { isDark, toggleTheme, colors } = useTheme();

    return (
        <TouchableOpacity
            onPress={toggleTheme}
            style={[
                styles.container,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
                style
            ]}
        >
            <Ionicons
                name={isDark ? "sunny" : "moon"}
                size={24}
                color={colors.text}
            />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 8,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default ThemeToggle;
