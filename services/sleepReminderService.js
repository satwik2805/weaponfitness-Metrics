import { api } from "../config/apiClient";

/**
 * Sleep Reminder API Service
 */
export const sleepReminderService = {
    createReminder: async (reminderData) => {
        return api.post("/sleep-reminders/", reminderData);
    },

    getTraineeReminders: async (traineeId) => {
        return api.get(`/sleep-reminders/trainee/${traineeId}`);
    },

    toggleReminder: async (reminderId) => {
        return api.put(`/sleep-reminders/${reminderId}/toggle`);
    },
};
