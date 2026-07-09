import { api } from "../config/apiClient";

/**
 * Trainee API Service
 */
export const traineeService = {
  /**
   * Get trainee by ID
   */
  getTrainee: async (traineeId) => {
    return api.get(`/trainees/${traineeId}`);
  },

  /**
   * Get all trainees
   */
  getAllTrainees: async () => {
    return api.get("/trainees");
  },

  /**
   * Create a new trainee
   */
  createTrainee: async (traineeData) => {
    return api.post("/trainees", traineeData);
  },

  /**
   * Update trainee
   */
  updateTrainee: async (traineeId, traineeData) => {
    return api.put(`/trainees/${traineeId}`, traineeData);
  },

  /**
   * Delete trainee
   */
  deleteTrainee: async (traineeId) => {
    return api.delete(`/trainees/${traineeId}`);
  },

  /**
   * Get gamification stats (XP, Level, Consistency, etc.)
   */
  getGamificationStats: async (traineeId, todayDate = null) => {
    const dateParam = todayDate ? `&today_date=${todayDate}` : "";
    return api.get(`/api/gamification/stats?trainee_id=${traineeId}${dateParam}`);
  },
};
