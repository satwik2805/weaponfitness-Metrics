// components/WorkoutTracker.js
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    TextInput,
} from 'react-native';
import axios from 'axios';
import API_URL from '../config/api';
import { useTheme } from '../context/ThemeContext';
import { useMemo } from 'react';



const WorkoutTracker = ({ traineeId, todaysWorkouts = [] }) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [workoutLogs, setWorkoutLogs] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState(null);
    const [notes, setNotes] = useState('');
    const [duration, setDuration] = useState('');

    useEffect(() => {
        fetchWorkoutData();
    }, [traineeId]);

    const fetchWorkoutData = async () => {
        try {
            setLoading(true);

            // Fetch workout logs
            const logsResponse = await axios.get(
                `${API_URL}/workout-logs/trainee/${traineeId}?limit=30`
            );
            setWorkoutLogs(logsResponse.data);

            // Fetch stats
            const statsResponse = await axios.get(
                `${API_URL}/workout-logs/trainee/${traineeId}/stats?days=30`
            );
            setStats(statsResponse.data);
        } catch (error) {
            console.error('Error fetching workout data:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateWorkoutLog = async (logId) => {
        try {
            const updateData = {};
            if (notes) updateData.notes = notes;
            if (duration) updateData.duration_minutes = parseInt(duration);

            await axios.put(`${API_URL}/workout-logs/${logId}`, updateData);

            // Refresh data
            fetchWorkoutData();
            setSelectedLog(null);
            setNotes('');
            setDuration('');
        } catch (error) {
            console.error('Error updating workout log:', error);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const renderNotes = (notes) => {
        if (!notes) return null;
        if (notes.startsWith("CHECKED_EXERCISES_V2:")) {
            try {
                let jsonStr = notes.replace("CHECKED_EXERCISES_V2:", "");

                // Cleanup: If there is a " | " after the JSON, take only the JSON part
                if (jsonStr.includes(" | ")) {
                    jsonStr = jsonStr.split(" | ")[0];
                }

                const rawData = JSON.parse(jsonStr);
                // Handle both simple array (old V2) and new object structure
                const data = Array.isArray(rawData) ? rawData : (rawData.exercises || []);
                const extraInfo = rawData.id_info ? ` (${rawData.id_info})` : "";

                return (
                    <View style={{ marginTop: 5 }}>
                        <Text style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>
                            Completed Exercises{extraInfo}:
                        </Text>
                        {data.map((item, idx) => (
                            <Text key={idx} style={{ fontSize: 12, color: '#666', marginLeft: 10 }}>
                                • Exercise #{item.idx + 1}: {item.reps} reps
                            </Text>
                        ))}
                    </View>
                );
            } catch (e) {
                console.log("Parsing error in history:", e, notes);
                return <Text style={styles.logNotes}>Notes: {notes}</Text>;
            }
        } else if (notes.startsWith("CHECKED_EXERCISES:")) {
            try {
                // Legacy format support
                const data = JSON.parse(notes.replace("CHECKED_EXERCISES:", ""));
                return (
                    <View style={{ marginTop: 5 }}>
                        <Text style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>Completed Exercises:</Text>
                        {data.map((idx, i) => (
                            <Text key={i} style={{ fontSize: 12, color: '#666', marginLeft: 10 }}>
                                • Exercise #{idx + 1}
                            </Text>
                        ))}
                    </View>
                );
            } catch (e) {
                return <Text style={styles.logNotes}>Notes: {notes}</Text>;
            }
        }
        return <Text style={styles.logNotes}>Notes: {notes}</Text>;
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={styles.loadingText}>Loading workout data...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            {/* Today's Assigned Workouts Section */}
            {todaysWorkouts.length > 0 && (
                <View style={styles.logsContainer}>
                    <Text style={styles.logsTitle}>Today's Assigned Workouts</Text>
                    {todaysWorkouts.map((w) => (
                        <View key={w.id} style={[styles.logCard, { borderLeftWidth: 5, borderLeftColor: w.isCompleted ? '#4CAF50' : '#FFC107' }]}>
                            <View style={styles.logHeader}>
                                <Text style={styles.logDate}>{w.name}</Text>
                                {w.isCompleted ? (
                                    <View style={[styles.autoTag, { backgroundColor: '#E8F5E9' }]}>
                                        <Text style={[styles.autoTagText, { color: '#2E7D32' }]}>Completed</Text>
                                    </View>
                                ) : (
                                    <View style={[styles.autoTag, { backgroundColor: '#FFF8E1' }]}>
                                        <Text style={[styles.autoTagText, { color: '#FFA000' }]}>Planned</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.logNotes}>{w.instructions ? w.instructions.split('\n')[0] : "Check Home tab for details"}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Stats Section */}
            {stats && (
                <View style={styles.statsContainer}>
                    <Text style={styles.statsTitle}>30-Day Workout Stats</Text>
                    <View style={styles.statsGrid}>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{stats.total_workouts}</Text>
                            <Text style={styles.statLabel}>Total Workouts</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>
                                {stats.workouts_per_week.toFixed(1)}
                            </Text>
                            <Text style={styles.statLabel}>Per Week</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>
                                {stats.average_duration_minutes.toFixed(0)}
                            </Text>
                            <Text style={styles.statLabel}>Avg Minutes</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Workout Logs */}
            <View style={styles.logsContainer}>
                <Text style={styles.logsTitle}>Workout History</Text>
                {workoutLogs.length === 0 ? (
                    <Text style={styles.emptyText}>No workout logs yet</Text>
                ) : (
                    workoutLogs.map((log) => (
                        <View key={log.id} style={styles.logCard}>
                            <View style={styles.logHeader}>
                                <Text style={styles.logDate}>{formatDate(log.workout_date)}</Text>
                                {log.auto_tracked && (
                                    <View style={styles.autoTag}>
                                        <Text style={styles.autoTagText}>Auto-tracked</Text>
                                    </View>
                                )}
                            </View>

                            {log.duration_minutes && (
                                <Text style={styles.logDuration}>
                                    Duration: {log.duration_minutes} minutes
                                </Text>
                            )}

                            {log.notes && renderNotes(log.notes)}

                            {selectedLog === log.id ? (
                                <View style={styles.editForm}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Duration (minutes)"
                                        value={duration}
                                        onChangeText={setDuration}
                                        keyboardType="numeric"
                                    />
                                    <TextInput
                                        style={[styles.input, styles.notesInput]}
                                        placeholder="Add notes..."
                                        value={notes}
                                        onChangeText={setNotes}
                                        multiline
                                    />
                                    <View style={styles.buttonRow}>
                                        <TouchableOpacity
                                            style={styles.saveButton}
                                            onPress={() => updateWorkoutLog(log.id)}
                                        >
                                            <Text style={styles.buttonText}>Save</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.cancelButton}
                                            onPress={() => {
                                                setSelectedLog(null);
                                                setNotes('');
                                                setDuration('');
                                            }}
                                        >
                                            <Text style={styles.buttonText}>Cancel</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.editButton}
                                    onPress={() => {
                                        setSelectedLog(log.id);
                                        setNotes(log.notes || '');
                                        setDuration(log.duration_minutes?.toString() || '');
                                    }}
                                >
                                    <Text style={styles.editButtonText}>Add Details</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ))
                )}
            </View>
        </ScrollView>
    );
};

const createStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: colors.textSecondary,
    },
    statsContainer: {
        backgroundColor: colors.card,
        padding: 20,
        margin: 15,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: colors.border,
    },
    statsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: colors.text,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
        padding: 10,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.accent,
    },
    statLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 5,
        textAlign: 'center',
    },
    logsContainer: {
        padding: 15,
    },
    logsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: colors.text,
    },
    emptyText: {
        textAlign: 'center',
        color: colors.textSecondary,
        fontSize: 16,
        marginTop: 20,
    },
    logCard: {
        backgroundColor: colors.card,
        padding: 15,
        borderRadius: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    logHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    logDate: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
    },
    autoTag: {
        backgroundColor: colors.accent + '20',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    autoTagText: {
        fontSize: 10,
        color: colors.accent,
        fontWeight: '600',
    },
    logDuration: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 5,
    },
    logNotes: {
        fontSize: 14,
        color: colors.textSecondary,
        fontStyle: 'italic',
    },
    editForm: {
        marginTop: 10,
    },
    input: {
        backgroundColor: colors.inputBackground,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
        fontSize: 14,
    },
    notesInput: {
        height: 80,
        textAlignVertical: 'top',
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    saveButton: {
        flex: 1,
        backgroundColor: colors.accent,
        padding: 12,
        borderRadius: 8,
        marginRight: 5,
        alignItems: 'center',
    },
    cancelButton: {
        flex: 1,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 12,
        borderRadius: 8,
        marginLeft: 5,
        alignItems: 'center',
    },
    buttonText: {
        color: colors.buttonText || '#000',
        fontWeight: 'bold',
    },
    editButton: {
        marginTop: 10,
        padding: 10,
        backgroundColor: colors.inputBackground,
        borderWidth: 1,
        borderColor: colors.accent,
        borderRadius: 8,
        alignItems: 'center',
    },
    editButtonText: {
        color: colors.accent,
        fontSize: 14,
        fontWeight: '600',
    },
});

export default WorkoutTracker;
