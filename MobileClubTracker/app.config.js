export default {
  expo: {
    name: "MobileClubTracker",
    slug: "MobileClubTracker",
    scheme: "mobileclubtracker",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: { 
        supportsTablet: true ,
        infoPlist: {
            NSCalendarUsageDescription:
                "Club Tracker uses your calendar to save event dates so you never miss a club event.",
        },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true
    },
    web: { favicon: "./assets/favicon.png" },
    plugins: [
        "expo-router",
        "expo-calendar",
        "expo-notifications",
        "@react-native-community/datetimepicker"
    ],
    extra: {
      apiUrl: process.env.API_URL,  // ← no quotes, reads from .env
      eas: {
        projectId:  "40c1c2fe-51da-499c-a2d0-452f67e2b216" // ← no quotes, reads from .env
      }
    },
    owner: "mirziya" // ← no quotes, reads from .env
  },
};