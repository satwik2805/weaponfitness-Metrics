import 'dotenv/config';

export default {
  expo: {
    name: "Weapon Fitness",
    slug: "Weapon_Fitness_App",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    scheme: "weaponfitness",

    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#8B0000"
    },

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.weaponfitness.app",
      infoPlist: {
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: ["weaponfitness"]
          }
        ]
      }
    },

    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#8B0000"
      },
      package: "com.weaponfitness.app",
      intentFilters: [
        {
          action: "VIEW",
          data: [{ scheme: "weaponfitness" }],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ]
    },

    web: {
      favicon: "./assets/favicon.png"
    },

    plugins: ["expo-camera", "expo-notifications", "expo-font"],

    extra: {
      eas: {
        projectId: "332e8b43-775c-4e45-9027-f61513a969c2"
      },

      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
    }
  }
};
