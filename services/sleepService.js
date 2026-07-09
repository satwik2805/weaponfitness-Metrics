import { api } from "../config/apiClient";

/**
 * Sleep API Service
 */
export const sleepService = {
  createSleepLog: async (sleepData) => {
    return api.post("/sleep/", sleepData);
  },

  getSleepLog: async (sleepId) => {
    return api.get(`/sleep/${sleepId}`);
  },

  getTraineeSleepLogs: async (traineeId) => {
    return api.get(`/sleep/trainee/${traineeId}`);
  },

  updateSleepLog: async (sleepId, sleepData) => {
    return api.put(`/sleep/${sleepId}`, sleepData);
  },

  deleteSleepLog: async (sleepId) => {
    return api.delete(`/sleep/${sleepId}`);
  },
};
