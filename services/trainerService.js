import { api } from "../config/apiClient";

/**
 * Trainer API Service
 */
export const trainerService = {
  /**
   * Get trainer by ID
   */
  getTrainer: async (trainerId) => {
    return api.get(`/trainers/${trainerId}`);
  },

  /**
   * Get all trainers
   */
  getAllTrainers: async () => {
    return api.get("/trainers");
  },

  /**
   * Create a new trainer
   */
  createTrainer: async (trainerData) => {
    return api.post("/trainers", trainerData);
  },

  /**
   * Update trainer
   */
  updateTrainer: async (trainerId, trainerData) => {
    return api.put(`/trainers/${trainerId}`, trainerData);
  },

  /**
   * Delete trainer
   */
  deleteTrainer: async (trainerId) => {
    return api.delete(`/trainers/${trainerId}`);
  },
};
