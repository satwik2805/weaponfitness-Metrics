import { api } from "../config/apiClient";

/**
 * Trainer Attendance API Service
 */
export const trainerAttendanceService = {
    getAttendance: async (attendanceId) => {
        return api.get(`/trainer-attendance/${attendanceId.trim()}`);
    },

    getAllAttendance: async () => {
        return api.get("/trainer-attendance/");
    },

    /**
     * Mark trainer as present for a date
     */
    markPresent: async (trainerId, date = new Date().toISOString().split('T')[0]) => {
        if (!trainerId) throw new Error("Trainer ID is required");
        const cleanId = String(trainerId).trim();
        return api.post("/trainer-attendance/", {
            trainer_id: cleanId,
            attendance_date: date,
            is_present: true
        });
    },

    /**
     * Mark trainer as absent (shifts group workouts)
     */
    markAbsent: async (trainerId) => {
        try {
            if (!trainerId) throw new Error("Trainer ID is required");
            const cleanId = String(trainerId).trim();
            const endpoint = `/trainer-attendance/absent/${cleanId}`;
            const response = await api.post(endpoint, {}); // Pass empty body
            return response;
        } catch (error) {
            console.error("❌ markTrainerAbsent failed:", error.message);
            throw error;
        }
    },
};
