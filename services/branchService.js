import { api } from "../config/apiClient";

/**
 * Branch API Service
 */
export const branchService = {
  /**
   * Get branch by ID
   */
  getBranch: async (branchId) => {
    return api.get(`/branches/${branchId}`);
  },

  /**
   * Get all branches
   */
  getAllBranches: async () => {
    return api.get("/branches");
  },

  /**
   * Create a new branch
   */
  createBranch: async (branchData) => {
    return api.post("/branches", branchData);
  },

  /**
   * Update branch
   */
  updateBranch: async (branchId, branchData) => {
    return api.put(`/branches/${branchId}`, branchData);
  },

  /**
   * Delete branch
   */
  deleteBranch: async (branchId) => {
    return api.delete(`/branches/${branchId}`);
  },
};
