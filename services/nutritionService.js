import { api } from "../config/apiClient";

/**
 * Nutrition API Service
 */
export const nutritionService = {
    /**
     * Log a food item
     */
    logNutrition: async (logData) => {
        return api.post("/nutrition/log", logData);
    },

    /**
     * Get daily nutrition summary (totals + goals + logs)
     */
    getDailySummary: async (traineeId, date = null) => {
        // No mock fallback: if the API fails this rejects, and callers render
        // their real empty/error states instead of fabricated totals.
        let url = `/nutrition/daily/${traineeId}`;
        if (date) url += `?query_date=${date}`;
        return api.get(url);
    },

    /**
     * Get logs for a specific date
     */
    getLogs: async (traineeId, date = null) => {
        let url = `/nutrition/logs/${traineeId}`;
        if (date) url += `?log_date=${date}`;
        return api.get(url);
    },

    /**
     * Set or update nutrient goals
     */
    setGoals: async (goalData) => {
        return api.post("/nutrition/goals", goalData);
    },

    /**
     * Get current goals
     */
    getGoals: async (traineeId) => {
        return api.get(`/nutrition/goals/${traineeId}`);
    },

    /**
     * Parse natural language nutrition text
     */
    parseNutrition: async (text) => {
        return api.post("/nutrition/parse", { text });
    },

    /**
     * Save daily reflection (quality + notes)
     */
    saveDailyLog: async (logData) => {
        return api.post("/nutrition/daily-log", logData);
    },

    /**
     * Detect food from image (Computer Vision)
     */
    detectFood: async (formData) => {
        // No mock fallback: a failed scan must FAIL, with the manual log as
        // the honest path. (This used to return the same three invented
        // meals for any photo whenever the CV API was unreachable.)
        try {
            return await api.post("/nutrition/detect", formData);
        } catch (error) {
            throw new Error(
                "Food recognition isn't available right now — add the meal manually and it still counts toward your day."
            );
        }
    },

    /**
     * Get the food database library
     */
    getFoodLibrary: async () => {
        return api.get("/nutrition/library");
    }
};
