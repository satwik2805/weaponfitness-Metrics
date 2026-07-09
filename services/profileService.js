import { api } from "../config/apiClient";

/**
 * Profile API Service
 */
export const profileService = {
  /**
   * Get profile by ID
   */
  getProfile: async (profileId) => {
    return api.get(`/profiles/${profileId}`);
  },

  /**
   * Get all profiles
   */
  getAllProfiles: async () => {
    return api.get("/profiles");
  },

  /**
   * Create a new profile
   */
  createProfile: async (profileData) => {
    return api.post("/profiles", profileData);
  },

  /**
   * Update profile
   */
  updateProfile: async (profileId, profileData) => {
    return api.put(`/profiles/${profileId}`, profileData);
  },

  /**
   * Delete profile
   */
  deleteProfile: async (profileId) => {
    return api.delete(`/profiles/${profileId}`);
  },
};
