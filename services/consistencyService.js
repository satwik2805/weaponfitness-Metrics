import { api } from "../config/apiClient";

export const consistencyService = {
    getStats: async (traineeId) => {
        return api.get(`/consistency/stats/${traineeId}`);
    },
};
