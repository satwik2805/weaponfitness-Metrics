import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome5 } from "@expo/vector-icons";
import { consistencyService } from "../services/consistencyService";
import { useTheme } from "../context/ThemeContext";

const { width } = Dimensions.get("window");

// --- Helper: Circular Progress ---
const CircularProgress = ({ size, strokeWidth, progress, color, bgStroke, icon, label, glowColor, themeFonts }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress ? circumference : 0);

    return (
        <View style={{ alignItems: "center", justifyContent: "center", marginHorizontal: 8 }}>
            <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
                <Svg width={size} height={size}>
                    {/* Background Circle */}
                    <Circle
                        stroke={bgStroke}
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        strokeWidth={strokeWidth}
                    />
                    {/* Progress Circle */}
                    <Circle
                        stroke={color}
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        rotation="-90"
                        origin={`${size / 2}, ${size / 2}`}
                    />
                </Svg>
                {/* Icon in Center */}
                <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
                    {icon}
                </View>
            </View>
            <Text style={[styles.ringLabel, { color: glowColor || color, fontFamily: themeFonts.semibold }]}>{label}</Text>
        </View>
    );
};

export default function TrifectaDashboard({ traineeId }) {
    const { colors, fonts, space, radius } = useTheme();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        if (!traineeId) return;
        try {
            const data = await consistencyService.getStats(traineeId);
            setStats(data);
        } catch (e) {
            console.log("Error fetching consistency stats", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 60000);
        return () => clearInterval(interval);
    }, [traineeId]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.accent} />
            </View>
        );
    }

    if (!stats) return null;

    const { daily = {}, weekly: weeklyRaw } = stats;
    const weekly = weeklyRaw || { count: 0, days: [] };
    if (!Array.isArray(weekly.days)) weekly.days = [];
    const gymMet = daily.attendance;
    const workoutMet = daily.workout;
    const sleepMet = daily.sleep;

    const days = ["M", "T", "W", "T", "F", "S", "S"];
    const missionProgressPercent = (weekly.count / 5) * 100;

    return (
        <View style={styles.container}>
            {/* --- TRIFECTA CARD --- */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.accent }]}>
                <View style={[styles.cardHeader, { backgroundColor: colors.accentSoft, borderBottomColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.text, fontFamily: fonts.display }]}>DAILY TRIFECTA</Text>
                </View>

                {/* Rings */}
                <View style={styles.ringsRow}>
                    <CircularProgress
                        size={70}
                        strokeWidth={6}
                        progress={gymMet}
                        color={colors.accent}
                        glowColor={colors.accentBright}
                        bgStroke={colors.borderStrong}
                        icon={<FontAwesome5 name="dumbbell" size={20} color={gymMet ? colors.text : colors.textMuted} />}
                        label="GYM"
                        themeFonts={fonts}
                    />
                    <CircularProgress
                        size={70}
                        strokeWidth={6}
                        progress={workoutMet}
                        color="#FFD700"
                        glowColor="#FFE44D"
                        bgStroke={colors.borderStrong}
                        icon={<FontAwesome5 name="running" size={20} color={workoutMet ? colors.text : colors.textMuted} />}
                        label="WORKOUT"
                        themeFonts={fonts}
                    />
                    <CircularProgress
                        size={70}
                        strokeWidth={6}
                        progress={sleepMet}
                        color="#00E5FF"
                        glowColor="#4DFFFF"
                        bgStroke={colors.borderStrong}
                        icon={<FontAwesome5 name="moon" size={20} color={sleepMet ? colors.text : colors.textMuted} />}
                        label="SLEEP"
                        themeFonts={fonts}
                    />
                </View>

                {/* 7-Day Consistency Timeline */}
                <Text style={[styles.sectionLabel, { color: colors.textMuted, fontFamily: fonts.semibold }]}>7-DAY CONSISTENCY</Text>
                <View style={styles.timelineRow}>
                    {/* Line Background */}
                    <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                    {/* Progress Line */}
                    <View style={[styles.timelineLineActive, { backgroundColor: colors.accent, width: `${(weekly.count / 7) * 100}%` }]} />

                    {/* Dots */}
                    <View style={styles.dotsContainer}>
                        {weekly.days.map((dayData, idx) => (
                            <View key={idx} style={{ alignItems: 'center', width: 25 }}>
                                <View style={[
                                    styles.dot,
                                    { backgroundColor: colors.surfaceSunken, borderColor: colors.border },
                                    dayData.is_met && [styles.dotActive, { borderColor: colors.accent, backgroundColor: colors.accentSoft, shadowColor: colors.accent }],
                                ]}>
                                    {dayData.is_met && <View style={[styles.dotInner, { backgroundColor: colors.accent }]} />}
                                </View>
                                <Text style={[styles.dotLabel, { color: colors.textFaint, fontFamily: fonts.semibold }]}>{days[idx]}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Mission Status Bar */}
                <View style={styles.missionContainer}>
                    <View style={[styles.missionBarBg, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}>
                        <LinearGradient
                            colors={[colors.accent, colors.accentBright]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.missionBarFill, { shadowColor: colors.accent, width: `${Math.min(missionProgressPercent, 100)}%` }]}
                        />
                        <Text style={[styles.missionText, { color: colors.text, fontFamily: fonts.display }]}>
                            MISSION STATUS: {Math.round(missionProgressPercent)}% ({weekly.count}/5 DAYS) ACHIEVED
                        </Text>
                    </View>
                </View>

            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
    },
    loadingContainer: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 5,
    },
    cardHeader: {
        borderBottomWidth: 1,
        paddingBottom: 10,
        marginBottom: 20,
        marginHorizontal: -20,
        marginTop: -20,
        paddingTop: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 14,
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    ringsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 25,
    },
    ringLabel: {
        fontSize: 10,
        marginTop: 8,
        letterSpacing: 1,
    },
    sectionLabel: {
        fontSize: 10,
        textAlign: 'center',
        letterSpacing: 1,
        marginBottom: 15,
    },
    timelineRow: {
        position: 'relative',
        height: 40,
        justifyContent: 'center',
        marginBottom: 15,
    },
    timelineLine: {
        position: 'absolute',
        height: 2,
        left: 10,
        right: 10,
        top: 14,
    },
    timelineLineActive: {
        position: 'absolute',
        height: 2,
        left: 10,
        top: 14,
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 0,
    },
    dot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    dotActive: {
        shadowOpacity: 0.5,
        shadowRadius: 5,
    },
    dotInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    dotLabel: {
        fontSize: 9,
        marginTop: 6,
    },
    missionContainer: {
        marginTop: 10,
    },
    missionBarBg: {
        height: 30,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        justifyContent: 'center',
        position: 'relative',
    },
    missionBarFill: {
        height: '100%',
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    missionText: {
        position: 'absolute',
        width: '100%',
        textAlign: 'center',
        color: '#fff',
        fontSize: 10,
        letterSpacing: 1,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowRadius: 3,
    },
});
