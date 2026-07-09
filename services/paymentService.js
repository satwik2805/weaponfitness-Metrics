import { api } from "../config/apiClient";

/**
 * Payment API Service
 */
export const paymentService = {
  /**
   * Get payment by ID
   */
  getPayment: async (paymentId) => {
    return api.get(`/payments/${paymentId}`);
  },

  /**
   * Get all payments
   */
  getAllPayments: async () => {
    return api.get("/payments");
  },

  /**
   * Create a new payment
   */
  createPayment: async (paymentData) => {
    return api.post("/payments", paymentData);
  },

  /**
   * Update payment
   */
  updatePayment: async (paymentId, paymentData) => {
    return api.put(`/payments/${paymentId}`, paymentData);
  },

  /**
   * Delete payment
   */
  deletePayment: async (paymentId) => {
    return api.delete(`/payments/${paymentId}`);
  },
};
