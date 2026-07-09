import React, { useState, useEffect } from "react";
import { View } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { Sheet, Input, Button, Text, Chip, SegmentedControl, useToast } from "./ui";
import { sleepService } from "../services/sleepService";
import { sleepReminderService } from "../services/sleepReminderService";
import { localNotificationService } from "../services/localNotificationService"; // Import local service
import { supabase } from "../config/supabase";

export default function SleepTrackingModal({ visible, onClose, traineeId, sleepLog = null }) {
    const { space } = useTheme();
    const toast = useToast();

    const [loading, setLoading] = useState(false);
    const [sleepStart, setSleepStart] = useState("22:00");
    const [sleepEnd, setSleepEnd] = useState("06:00");
    const [wokeUpCount, setWokeUpCount] = useState("0");
    const [rating, setRating] = useState(7);
    const [notes, setNotes] = useState("");
    const [totalHours, setTotalHours] = useState("8");
    const getTodayDate = () => {
        const now = new Date();
        return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    };
    const [sleepDate, setSleepDate] = useState(getTodayDate());
    const [sleepLogId, setSleepLogId] = useState(null);

    // Reminder state
    const [reminderActive, setReminderActive] = useState(false);
    const [reminderTime, setReminderTime] = useState("22:00");
    const [reminderId, setReminderId] = useState(null);

    // Load sleep log data when editing
    useEffect(() => {
        if (visible && sleepLog) {
            // Editing mode - load existing data
            setSleepLogId(sleepLog.id);
            setSleepDate(sleepLog.sleep_date);
            // Format time from "HH:MM:SS" or "HH:MM" to "HH:MM"
            if (sleepLog.sleep_start) {
                const startTime = sleepLog.sleep_start.toString().slice(0, 5);
                setSleepStart(startTime);
            }
            if (sleepLog.sleep_end) {
                const endTime = sleepLog.sleep_end.toString().slice(0, 5);
                setSleepEnd(endTime);
            }
            setWokeUpCount(sleepLog.woke_up_count?.toString() || "0");
            setRating(sleepLog.deep_sleep_rating || 7);
            setNotes(sleepLog.sleep_quality_notes || "");
            setTotalHours(sleepLog.total_hours?.toString() || "8");
        } else if (visible && !sleepLog) {
            // Create mode - reset to defaults
            setSleepLogId(null);
            setSleepStart("22:00");
            setSleepEnd("06:00");
            setWokeUpCount("0");
            setRating(7);
            setNotes("");
            setTotalHours("8");
            setSleepDate(getTodayDate());
        }
    }, [visible, sleepLog]);

    useEffect(() => {
        if (visible && traineeId) {
            fetchReminder();
        }
    }, [visible, traineeId]);

    const fetchReminder = async () => {
        try {
            const data = await sleepReminderService.getTraineeReminders(traineeId);
            if (data && data.length > 0) {
                const r = data[0];
                setReminderId(r.id);
                setReminderActive(r.is_active);
                setReminderTime(r.bedtime.slice(0, 5));
            }
        } catch (e) {
            if (__DEV__) console.error("Error fetching reminder:", e.message);
        }
    };

    const handleToggleReminder = async () => {
        if (!traineeId) return;
        try {
            if (reminderId) {
                // Determine new status (toggling logic)
                const newActiveState = !reminderActive;

                await sleepReminderService.toggleReminder(reminderId);
                setReminderActive(newActiveState);

                // LOCAL NOTIFICATION LOGIC
                if (newActiveState) {
                    // Re-enable: Request permission & schedule
                    const hasPerm = await localNotificationService.requestPermissions();
                    if (hasPerm) {
                        await localNotificationService.scheduleBedtimeReminder(reminderTime);
                    } else {
                        toast.show("Enable notifications in settings to receive reminders.", { kind: "warning" });
                    }
                } else {
                    // Disable: Cancel local
                    await localNotificationService.cancelReminders();
                }

                const status = newActiveState ? "enabled" : "disabled";
                toast.show(`Reminder ${status}!`, { kind: "success" });
            } else {
                // Create new
                // 1. Ask permission first
                const hasPerm = await localNotificationService.requestPermissions();
                if (!hasPerm) {
                    toast.show("Notifications are required for reminders.", { kind: "warning" });
                    // Proceeding to save in DB anyway, but user won't get push
                }

                const r = await sleepReminderService.createReminder({
                    trainee_id: traineeId,
                    bedtime: reminderTime,
                });
                setReminderId(r.id);
                setReminderActive(true);

                // 2. Schedule local
                if (hasPerm) {
                    await localNotificationService.scheduleBedtimeReminder(reminderTime);
                }

                toast.show("Reminder created and enabled!", { kind: "success" });
            }
        } catch (e) {
            if (__DEV__) console.error("Error toggling reminder:", e.message);
            toast.show("Failed to update reminder settings.", { kind: "error" });
        }
    };

    const handleUpdateReminderTime = async () => {
        if (!traineeId) return;

        // Basic validation for HH:MM format
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (!timeRegex.test(reminderTime)) {
            toast.show("Please enter time in HH:MM format (e.g., 22:00).", { kind: "error" });
            return;
        }

        try {
            const r = await sleepReminderService.createReminder({
                trainee_id: traineeId,
                bedtime: reminderTime,
            });
            setReminderId(r.id);
            setReminderActive(true);

            // LOCAL SCHEDULE UPDATE
            const hasPerm = await localNotificationService.requestPermissions();
            if (hasPerm) {
                await localNotificationService.scheduleBedtimeReminder(reminderTime);
            }

            toast.show("Bedtime reminder time updated!", { kind: "success" });
        } catch (e) {
            if (__DEV__) console.error("Error updating reminder time:", e.message);
            toast.show(e.message || "Failed to update reminder settings.", { kind: "error" });
        }
    };

    useEffect(() => {
        calculateHours();
    }, [sleepStart, sleepEnd]);

    const calculateHours = () => {
        try {
            const startParts = sleepStart.split(":").map(Number);
            const endParts = sleepEnd.split(":").map(Number);
            if (startParts.length !== 2 || endParts.length !== 2) return;
            let start = startParts[0] + startParts[1] / 60;
            let end = endParts[0] + endParts[1] / 60;
            let hours = end - start;
            if (hours < 0) hours += 24;
            setTotalHours(hours.toFixed(1).toString());
        } catch (e) {
            if (__DEV__) console.error("Error calculating hours:", e.message);
        }
    };

    const handleSave = async () => {
        if (!traineeId) {
            toast.show("We couldn't find this member. Please reopen and try again.", { kind: "error" });
            return;
        }

        setLoading(true);
        const isEditing = !!sleepLogId;

        try {
            const sleepData = {
                sleep_date: sleepDate,
                sleep_start: sleepStart && sleepStart.trim() !== "" ? sleepStart : null,
                sleep_end: sleepEnd && sleepEnd.trim() !== "" ? sleepEnd : null,
                total_hours: parseFloat(totalHours) || 0,
                woke_up_count: parseInt(wokeUpCount) || 0,
                deep_sleep_rating: rating || null,
                sleep_quality_notes: notes && notes.trim() !== "" ? notes.trim() : null,
            };

            if (isEditing) {
                await sleepService.updateSleepLog(sleepLogId, sleepData);
                toast.show("Sleep log updated.", { kind: "success" });
            } else {
                sleepData.trainee_id = traineeId;
                await sleepService.createSleepLog(sleepData);
                toast.show("Your sleep log for today has been recorded.", { kind: "success" });
            }
            onClose();
        } catch (error) {
            if (__DEV__) console.error(isEditing ? "Update sleep error:" : "Save sleep error:", error.message);
            const errorMsg = error.message || (isEditing ? "Couldn't update the sleep log." : "Couldn't save the sleep log.");
            toast.show(errorMsg, { kind: "error" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Sheet
            visible={visible}
            onClose={onClose}
            title={sleepLogId ? "Edit Sleep Log" : "Track Sleep"}
            subtitle="Log last night and tune your bedtime reminder."
            footer={
                <Button
                    title={sleepLogId ? "Update Log" : "Save Log"}
                    icon="checkmark"
                    loading={loading}
                    onPress={handleSave}
                    fullWidth
                />
            }
        >
            <Text variant="label" color="textMuted" style={{ marginBottom: space[3] }}>
                Sleep Window
            </Text>
            <View style={{ flexDirection: "row", gap: space[3], marginBottom: space[4] }}>
                <Input
                    label="Bed Time"
                    value={sleepStart}
                    onChangeText={setSleepStart}
                    placeholder="22:00"
                    style={{ flex: 1 }}
                />
                <Input
                    label="Wake Time"
                    value={sleepEnd}
                    onChangeText={setSleepEnd}
                    placeholder="06:00"
                    style={{ flex: 1 }}
                />
            </View>

            <View style={{ flexDirection: "row", gap: space[3], marginBottom: space[5] }}>
                <Input
                    label="Times Woken Up"
                    value={wokeUpCount}
                    onChangeText={setWokeUpCount}
                    keyboardType="numeric"
                    placeholder="0"
                    style={{ flex: 1 }}
                />
                <Input
                    label="Total Hours"
                    value={totalHours}
                    editable={false}
                    placeholder="8.0"
                    style={{ flex: 1 }}
                />
            </View>

            <Text variant="label" color="textMuted" style={{ marginBottom: space[3] }}>
                Sleep Quality (1-10)
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space[2], marginBottom: space[5] }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <Chip
                        key={num}
                        label={String(num)}
                        selected={rating === num}
                        onPress={() => setRating(num)}
                    />
                ))}
            </View>

            <Input
                label="Experience / Notes"
                value={notes}
                onChangeText={setNotes}
                placeholder="How did you feel when you woke up?"
                multiline
                numberOfLines={4}
                inputStyle={{ height: 100 }}
                style={{ marginBottom: space[5] }}
            />

            <Text variant="label" color="textMuted" style={{ marginBottom: space[3] }}>
                Sleep Reminders
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space[3], marginBottom: space[3] }}>
                <View style={{ flex: 1 }}>
                    <Text variant="h4">Bedtime Reminder</Text>
                    <Text variant="bodySm" color="textMuted" style={{ marginTop: 2 }}>
                        Get notified when it's time to sleep
                    </Text>
                </View>
                <SegmentedControl
                    segments={["Off", "On"]}
                    selectedIndex={reminderActive ? 1 : 0}
                    onChange={handleToggleReminder}
                    style={{ width: 120 }}
                />
            </View>

            {reminderActive && (
                <View style={{ flexDirection: "row", gap: space[3], alignItems: "flex-end", marginTop: space[2] }}>
                    <Input
                        label="Reminder Time"
                        value={reminderTime}
                        onChangeText={setReminderTime}
                        placeholder="22:00"
                        style={{ flex: 1 }}
                    />
                    <Button title="Update" variant="secondary" onPress={handleUpdateReminderTime} />
                </View>
            )}
        </Sheet>
    );
}
