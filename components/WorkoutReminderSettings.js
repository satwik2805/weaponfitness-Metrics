// components/WorkoutReminderSettings.js
import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Switch,
    ActivityIndicator,
    Platform,
    TextInput,
    ScrollView
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '../config/apiClient';
import { useTheme } from '../context/ThemeContext';
import { useToast } from './ui';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';

const DAYS_OF_WEEK = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
];

const WorkoutReminderSettings = ({ traineeId }) => {
    const { colors } = useTheme();
    const toast = useToast();
    const [reminders, setReminders] = useState([]);
    const [sleepReminders, setSleepReminders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [selectedTime, setSelectedTime] = useState(new Date());
    const [selectedDays, setSelectedDays] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [isCreatingSleep, setIsCreatingSleep] = useState(false);
    const [reminderMessage, setReminderMessage] = useState('');

    const SUGGESTED_MESSAGES = [
        "Knock knock! Who's there? Your gains. 🚪💪",
        "Your gym shoes called... they're feeling lonely. 👟❤️",
        "If you can wait for a delivery, you can give 20 mins to your muscles. 📦💨",
        "Time for a health 'delivery'! No tip required. 🛵🏋️‍♂️",
        "Legend says if you skip today, your dumbbells will miss you. 💔🦾",
        "Workout loading... ██████▒▒▒▒ ⏳🔥",
        "Don't let your gym membership be a 'donation'! 💸💪",
        "Hungry for progress? Order a workout now! 🍽️🏋️‍♀️",
        "Stressing won't burn calories. Squats will! 🍑🔥",
    ];

    // Manual Input State
    const [showManualInput, setShowManualInput] = useState(Platform.OS === 'web');
    const [manualTimeText, setManualTimeText] = useState('');
    const [manualAmPm, setManualAmPm] = useState('AM');

    useEffect(() => {
        if (traineeId) {
            fetchAllData();
        }
    }, [traineeId]);

    const fetchAllData = async () => {
        setLoading(true);
        await Promise.all([fetchReminders(), fetchSleepReminders()]);
        setLoading(false);
    };

    const fetchReminders = async () => {
        try {
            const data = await api.get(`/workout-reminders/trainee/${traineeId}`);
            setReminders(data || []);
        } catch (error) {
            if (__DEV__) console.error('Error fetching reminders:', error.message);
        }
    };

    const fetchSleepReminders = async () => {
        try {
            const data = await api.get(`/sleep-reminders/trainee/${traineeId}`);
            setSleepReminders(data || []);
        } catch (error) {
            if (__DEV__) console.error('Error fetching sleep reminders:', error.message);
        }
    };

    const createReminder = async () => {
        try {
            let timeString;
            if (showManualInput) {
                if (!manualTimeText || !manualTimeText.includes(':')) {
                    toast.show('Please enter the time in HH:MM format.', { kind: 'error' });
                    return;
                }
                const [h, m] = manualTimeText.split(':');
                let hour = parseInt(h);
                const minute = parseInt(m);
                if (manualAmPm === 'PM' && hour < 12) hour += 12;
                if (manualAmPm === 'AM' && hour === 12) hour = 0;
                timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
            } else {
                timeString = `${selectedTime.getHours().toString().padStart(2, '0')}:${selectedTime.getMinutes().toString().padStart(2, '0')}:00`;
            }

            const reminderData = {
                trainee_id: traineeId,
                reminder_time: timeString,
                days_of_week: selectedDays.length > 0 ? selectedDays.join(',') : null,
                message: reminderMessage || 'Time for your workout!',
                is_active: true,
            };

            await api.post(`/workout-reminders/`, reminderData);
            toast.show('Workout reminder created.', { kind: 'success' });
            setIsCreating(false);
            fetchReminders();
        } catch (error) {
            if (__DEV__) console.error('Error creating reminder:', error.message);
            toast.show('Could not create the reminder. Please try again.', { kind: 'error' });
        }
    };

    const createSleepReminder = async () => {
        try {
            let timeString;
            if (showManualInput) {
                const [h, m] = manualTimeText.split(':');
                let hour = parseInt(h);
                const minute = parseInt(m);
                if (manualAmPm === 'PM' && hour < 12) hour += 12;
                if (manualAmPm === 'AM' && hour === 12) hour = 0;
                timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
            } else {
                timeString = `${selectedTime.getHours().toString().padStart(2, '0')}:${selectedTime.getMinutes().toString().padStart(2, '0')}:00`;
            }

            await api.post(`/sleep-reminders/`, {
                trainee_id: traineeId,
                bedtime: timeString
            });
            toast.show('Sleep reminder created.', { kind: 'success' });
            setIsCreatingSleep(false);
            fetchSleepReminders();
        } catch (error) {
            if (__DEV__) console.error('Error creating sleep reminder:', error.message);
            toast.show('Could not create the sleep reminder. Please try again.', { kind: 'error' });
        }
    };

    const toggleReminder = async (reminderId) => {
        try {
            await api.post(`/workout-reminders/${reminderId}/toggle`);
            fetchReminders();
        } catch (error) {
            if (__DEV__) console.error('Error toggling reminder:', error.message);
        }
    };

    const toggleSleepReminder = async (reminderId) => {
        try {
            await api.put(`/sleep-reminders/${reminderId}/toggle`);
            fetchSleepReminders();
        } catch (error) {
            if (__DEV__) console.error('Error toggling sleep reminder:', error.message);
        }
    };

    const deleteReminder = async (reminderId) => {
        try {
            await api.delete(`/workout-reminders/${reminderId}`);
            toast.show("Reminder deleted.", { kind: 'success' });
            fetchReminders();
        } catch (error) {
            if (__DEV__) console.error('Error deleting reminder:', error.message);
            toast.show("Could not delete the reminder. Please try again.", { kind: 'error' });
        }
    };

    const onTimeChange = (event, selectedDate) => {
        const currentDate = selectedDate || selectedTime;
        setShowTimePicker(Platform.OS === 'ios');
        setSelectedTime(currentDate);
    };

    const toggleDay = (day) => {
        setSelectedDays((prev) =>
            prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
        );
    };

    const formatTime = (timeString) => {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    };

    const styles = useMemo(() => createStyles(colors), [colors]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={styles.loadingText}>Loading reminders...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Workout Reminders</Text>
                    <Text style={styles.subtitle}>Get supportive nudges like Swiggy! ✨</Text>
                </View>
                <TouchableOpacity
                    style={[styles.addButton, isCreating && { backgroundColor: colors.error }]}
                    onPress={() => setIsCreating(!isCreating)}
                >
                    <Feather name={isCreating ? "x" : "plus"} size={20} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Create New Reminder */}
            {isCreating && (
                <ScrollView style={styles.createCard} showsVerticalScrollIndicator={false}>
                    <Text style={styles.sectionLabel}>Time Preference</Text>
                    <View style={styles.timeSelectionRow}>
                        {Platform.OS !== 'web' && (
                            <TouchableOpacity
                                style={[styles.modeButton, !showManualInput && styles.modeButtonActive]}
                                onPress={() => setShowManualInput(false)}
                            >
                                <Text style={[styles.modeButtonText, !showManualInput && styles.modeButtonTextActive]}>Clock</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[styles.modeButton, showManualInput && styles.modeButtonActive]}
                            onPress={() => setShowManualInput(true)}
                        >
                            <Text style={[styles.modeButtonText, showManualInput && styles.modeButtonTextActive]}>Manual</Text>
                        </TouchableOpacity>
                    </View>

                    {showManualInput ? (
                        <View style={styles.manualInputContainer}>
                            <TextInput
                                style={styles.manualTimeInput}
                                placeholder="07:30"
                                placeholderTextColor={colors.textSecondary}
                                value={manualTimeText}
                                onChangeText={setManualTimeText}
                                keyboardType="numbers-and-punctuation"
                            />
                            <View style={styles.amPmContainer}>
                                <TouchableOpacity
                                    style={[styles.amPmButton, manualAmPm === 'AM' && styles.amPmButtonActive]}
                                    onPress={() => setManualAmPm('AM')}
                                >
                                    <Text style={[styles.amPmText, manualAmPm === 'AM' && styles.amPmTextActive]}>AM</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.amPmButton, manualAmPm === 'PM' && styles.amPmButtonActive]}
                                    onPress={() => setManualAmPm('PM')}
                                >
                                    <Text style={[styles.amPmText, manualAmPm === 'PM' && styles.amPmTextActive]}>PM</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <>
                            <TouchableOpacity
                                style={styles.timeDisplayBox}
                                onPress={() => setShowTimePicker(true)}
                            >
                                <Text style={styles.timeDisplayText}>
                                    {selectedTime.toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </Text>
                            </TouchableOpacity>

                            {showTimePicker && (
                                <DateTimePicker
                                    value={selectedTime}
                                    mode="time"
                                    is24Hour={false}
                                    display="default"
                                    onChange={onTimeChange}
                                />
                            )}
                        </>
                    )}

                    <Text style={styles.sectionLabel}>Repeat Days</Text>
                    <View style={styles.daysContainer}>
                        {DAYS_OF_WEEK.map((day) => (
                            <TouchableOpacity
                                key={day}
                                style={[
                                    styles.dayCircle,
                                    selectedDays.includes(day) && styles.dayCircleSelected,
                                    { borderColor: colors.border }
                                ]}
                                onPress={() => toggleDay(day)}
                            >
                                <Text
                                    style={[
                                        styles.dayText,
                                        selectedDays.includes(day) && styles.dayTextSelected,
                                    ]}
                                >
                                    {day.substring(0, 1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.sectionLabel}>Choose a Nudge</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsScroll}>
                        {SUGGESTED_MESSAGES.map((msg, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.suggestionChip,
                                    reminderMessage === msg && styles.suggestionChipActive,
                                    { borderColor: colors.border }
                                ]}
                                onPress={() => setReminderMessage(msg)}
                            >
                                <Text style={[
                                    styles.suggestionText,
                                    reminderMessage === msg && styles.suggestionTextActive
                                ]}>{msg}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <TextInput
                        style={styles.customMessageInput}
                        placeholder="Or write your own supportive quote..."
                        placeholderTextColor={colors.textSecondary}
                        value={reminderMessage}
                        onChangeText={setReminderMessage}
                        multiline
                    />

                    <TouchableOpacity
                        style={styles.createBtn}
                        onPress={createReminder}
                    >
                        <Text style={styles.createBtnText}>Activate Reminder</Text>
                    </TouchableOpacity>
                </ScrollView>
            )
            }

            {/* List of Reminders */}
            <ScrollView style={styles.remindersList} showsVerticalScrollIndicator={false}>

                {/* WORKOUT SECTION */}
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionLabel}>Workout Schedule</Text>
                    {!isCreating && (
                        <TouchableOpacity onPress={() => { setIsCreating(true); setIsCreatingSleep(false); }}>
                            <Feather name="plus-circle" size={18} color={colors.accent} />
                        </TouchableOpacity>
                    )}
                </View>

                {reminders.length === 0 ? (
                    <Text style={styles.emptyMsg}>No workout reminders set.</Text>
                ) : (
                    reminders.map((reminder) => (
                        <View key={reminder.id} style={styles.reminderItem}>
                            <View style={styles.reminderMain}>
                                <View style={styles.timeBox}>
                                    <Text style={styles.reminderTimeText}>{formatTime(reminder.reminder_time)}</Text>
                                    <View style={styles.daysRow}>
                                        {reminder.days_of_week ? reminder.days_of_week.split(',').map((day) => (
                                            <Text key={day} style={styles.miniDayText}>{day.trim().substring(0, 1)}</Text>
                                        )) : <Text style={styles.miniDayText}>Daily</Text>}
                                    </View>
                                </View>
                                <Switch
                                    value={reminder.is_active}
                                    onValueChange={() => toggleReminder(reminder.id)}
                                    trackColor={{ false: colors.border, true: colors.accent }}
                                    thumbColor="#fff"
                                />
                            </View>
                            <Text style={styles.reminderMsg}>{reminder.message}</Text>
                        </View>
                    ))
                )}

                {/* SLEEP SECTION */}
                <View style={[styles.sectionHeaderRow, { marginTop: 30 }]}>
                    <Text style={styles.sectionLabel}>Sleep Schedule</Text>
                    {!isCreatingSleep && (
                        <TouchableOpacity onPress={() => { setIsCreatingSleep(true); setIsCreating(false); }}>
                            <Feather name="plus-circle" size={18} color="#00E5FF" />
                        </TouchableOpacity>
                    )}
                </View>

                {isCreatingSleep && (
                    <View style={styles.createCard}>
                        <Text style={styles.smallLabel}>Set Bedtime</Text>
                        {/* Reuse time selection logic or simplified version */}
                        <TouchableOpacity style={styles.timeDisplayBox} onPress={() => setShowTimePicker(true)}>
                            <Text style={styles.timeDisplayText}>
                                {selectedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.createBtn, { backgroundColor: '#00E5FF' }]} onPress={createSleepReminder}>
                            <Text style={styles.createBtnText}>Set Bedtime Reminder</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setIsCreatingSleep(false)} style={{ marginTop: 10, alignItems: 'center' }}>
                            <Text style={{ color: colors.textSecondary }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {sleepReminders.length === 0 ? (
                    <Text style={styles.emptyMsg}>No sleep reminders set.</Text>
                ) : (
                    sleepReminders.map((reminder) => (
                        <View key={reminder.id} style={[styles.reminderItem, { borderColor: 'rgba(0,229,255,0.3)' }]}>
                            <View style={styles.reminderMain}>
                                <View style={styles.timeBox}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Feather name="moon" size={18} color="#00E5FF" />
                                        <Text style={styles.reminderTimeText}>{formatTime(reminder.bedtime)}</Text>
                                    </View>
                                    <Text style={styles.miniDayText}>Daily Bedtime</Text>
                                </View>
                                <Switch
                                    value={reminder.is_active}
                                    onValueChange={() => toggleSleepReminder(reminder.id)}
                                    trackColor={{ false: colors.border, true: '#00E5FF' }}
                                    thumbColor="#fff"
                                />
                            </View>
                        </View>
                    ))
                )}

                <View style={{ height: 100 }} />
            </ScrollView>
        </View >
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
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: colors.textSecondary,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: colors.primaryLight,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    title: {
        fontSize: 22,
        fontWeight: '900',
        color: colors.text,
    },
    subtitle: {
        fontSize: 12,
        color: colors.accent,
        fontWeight: '600',
        marginTop: 2,
    },
    addButton: {
        backgroundColor: colors.accent,
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    createCard: {
        backgroundColor: colors.card,
        padding: 20,
        margin: 15,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.border,
        maxHeight: '80%',
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '800',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
        marginTop: 10,
    },
    timeSelectionRow: {
        flexDirection: 'row',
        backgroundColor: colors.inputBackground,
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
    },
    modeButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    modeButtonActive: {
        backgroundColor: colors.primaryLight,
    },
    modeButtonText: {
        color: colors.textSecondary,
        fontWeight: '700',
        fontSize: 14,
    },
    modeButtonTextActive: {
        color: colors.accent,
    },
    manualInputContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    manualTimeInput: {
        flex: 2,
        backgroundColor: colors.inputBackground,
        borderRadius: 16,
        padding: 18,
        fontSize: 24,
        fontWeight: '900',
        color: colors.text,
        textAlign: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    amPmContainer: {
        flex: 1,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },
    amPmButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.inputBackground,
    },
    amPmButtonActive: {
        backgroundColor: colors.accent,
    },
    amPmText: {
        fontSize: 14,
        fontWeight: '900',
        color: colors.textSecondary,
    },
    amPmTextActive: {
        color: colors.primary,
    },
    timeDisplayBox: {
        backgroundColor: colors.inputBackground,
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    timeDisplayText: {
        fontSize: 32,
        fontWeight: '900',
        color: colors.accent,
    },
    daysContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    dayCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayCircleSelected: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    dayText: {
        fontSize: 12,
        fontWeight: '800',
        color: colors.textSecondary,
    },
    dayTextSelected: {
        color: colors.primary,
    },
    suggestionsScroll: {
        marginBottom: 12,
    },
    suggestionChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 10,
        backgroundColor: colors.inputBackground,
    },
    suggestionChipActive: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    suggestionText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
    },
    suggestionTextActive: {
        color: colors.primary,
    },
    customMessageInput: {
        backgroundColor: colors.inputBackground,
        borderRadius: 16,
        padding: 16,
        fontSize: 15,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border,
        minHeight: 80,
        textAlignVertical: 'top',
        marginBottom: 20,
    },
    createBtn: {
        backgroundColor: colors.accent,
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    createBtnText: {
        color: colors.primary,
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
    },
    remindersList: {
        padding: 15,
    },
    emptyMsg: {
        textAlign: 'center',
        color: colors.textSecondary,
        fontSize: 15,
        marginTop: 40,
        lineHeight: 22,
    },
    reminderItem: {
        backgroundColor: colors.card,
        padding: 20,
        borderRadius: 24,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    reminderMain: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    timeBox: {
        flex: 1,
    },
    reminderTimeText: {
        fontSize: 26,
        fontWeight: '900',
        color: colors.text,
    },
    daysRow: {
        flexDirection: 'row',
        marginTop: 6,
        gap: 6,
    },
    miniDayText: {
        fontSize: 11,
        fontWeight: '800',
        color: colors.accent,
        backgroundColor: colors.accentGlow,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    reminderMsg: {
        fontSize: 15,
        color: colors.textSecondary,
        lineHeight: 20,
        fontStyle: 'italic',
        marginBottom: 16,
    },
    trashBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 10,
        backgroundColor: 'rgba(255, 61, 0, 0.1)',
        borderRadius: 8,
    },
    trashBtnText: {
        color: colors.error,
        fontSize: 12,
        fontWeight: '800',
    },
});

export default WorkoutReminderSettings;

