import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../context/ThemeContext";

export default function RankDashCard({ gamification }) {
    const { colors, fonts, space, radius } = useTheme();
    if (!gamification) return null;

    const { level, xp_in_level, xp_needed_for_level } = gamification;
    const progress = Math.min((xp_in_level / xp_needed_for_level), 1);
    const percent = Math.round(progress * 100);

    return (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.headerRow}>
                <Text style={[styles.label, { color: colors.textMuted, fontFamily: fonts.semibold }]}>CURRENT RANK</Text>
                <Text style={[styles.levelText, { color: colors.accent, fontFamily: fonts.display }]}>Lvl {level}</Text>
                <Text style={[styles.daysText, { color: colors.text, fontFamily: fonts.semibold }]}>{Math.round(xp_in_level)} / {xp_needed_for_level} XP</Text>
            </View>

            <View style={[styles.progressBg, { backgroundColor: colors.surfaceSunken }]}>
                <LinearGradient
                    colors={[colors.accent, colors.accentBright]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressFill, { width: `${percent}%` }]}
                />
            </View>

            <Text style={[styles.footerText, { color: colors.textFaint, fontFamily: fonts.regular }]}>
                Keep hitting your Daily Trifecta to level up!
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 15,
    },
    label: {
        fontSize: 10,
        letterSpacing: 1,
        marginRight: 10,
    },
    levelText: {
        fontSize: 24,
        marginRight: 'auto',
    },
    daysText: {
        fontSize: 12,
    },
    progressBg: {
        height: 10,
        borderRadius: 5,
        overflow: 'hidden',
        marginBottom: 10,
    },
    progressFill: {
        height: '100%',
        borderRadius: 5,
    },
    footerText: {
        fontSize: 10,
        textAlign: 'center',
        fontStyle: 'italic',
    }
});
