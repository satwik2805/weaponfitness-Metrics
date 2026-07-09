import { api } from "../config/apiClient";

/**
 * Attendance API Service
 */
export const attendanceService = {
  getAttendance: async (attendanceId) => {
    return api.get(`/attendance/${attendanceId.trim()}`);
  },

  getAllAttendance: async () => {
    return api.get("/attendance/");
  },

  createAttendance: async (attendanceData) => {
    // No offline mock: a failed check-in must reject so the UI can show a real
    // error state. apiClient already throws a descriptive Error (network or
    // backend `detail`); add check-in context and propagate.
    try {
      return await api.post("/attendance/", attendanceData);
    } catch (error) {
      throw new Error(
        `Check-in failed: ${error?.message || "could not reach the server"}. Your attendance was NOT recorded — please try again.`
      );
    }
  },

  updateAttendance: async (attendanceId, attendanceData) => {
    return api.put(`/attendance/${attendanceId.trim()}`, attendanceData);
  },

  deleteAttendance: async (attendanceId) => {
    return api.delete(`/attendance/${attendanceId.trim()}`);
  },

  /**
   * ✅ Mark trainee as absent (shifts workout)
   */
  markAbsent: async (traineeId) => {
    try {
      const cleanId = traineeId.trim();   // <<< FIX


      const response = await api.post(`/attendance/absent/${cleanId}`);

      return response;

    } catch (error) {
      console.error("❌ markAbsent failed:", error.message);
      throw error;
    }
  },

  /**
   * Mark trainer absent
   */
  markTrainerAbsent: async (trainerId) => {
    return api.post(`/attendance/trainer/absent/${trainerId.trim()}`);
  },
};
