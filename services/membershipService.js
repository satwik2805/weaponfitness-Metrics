import { api } from "../config/apiClient";

/**
 * Membership API Service
 */
export const membershipService = {
  /**
   * Get membership plan by ID
   */
  getMembership: async (membershipId) => {
    return api.get(`/memberships/${membershipId}`);
  },

  /**
   * Get all membership plans
   */
  getAllMemberships: async () => {
    return api.get("/memberships");
  },

  /**
   * Create a new membership plan
   */
  createMembership: async (membershipData) => {
    return api.post("/memberships", membershipData);
  },

  /**
   * Update membership plan
   */
  updateMembership: async (membershipId, membershipData) => {
    return api.put(`/memberships/${membershipId}`, membershipData);
  },

  /**
   * Delete membership plan
   */
  deleteMembership: async (membershipId) => {
    return api.delete(`/memberships/${membershipId}`);
  },
};
