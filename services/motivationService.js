import { api } from "../config/apiClient";

export const motivationService = {
    getQuote: async () => {
        try {
            return await api.get("/motivation/quote");
        } catch (error) {
            return {
                greeting: "Welcome Back!",
                quote: "Consistency is the key to progress.",
                author: "Weapon Fitness"
            };
        }
    }
};
