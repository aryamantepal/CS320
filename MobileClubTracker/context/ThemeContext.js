import React, {
    createContext,
    useContext,
    useState,
    useMemo,
    useEffect,
} from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "../constants/Colors";

const ThemeContext = createContext(null);
const DARK_MODE_KEY = "darkMode";

export function ThemeProvider({ children }) {
    const systemScheme = useColorScheme();
    // Until AsyncStorage hydrates, fall back to the device's color scheme so
    // the very first frame doesn't flash the wrong palette.
    const [isDarkMode, _setIsDarkMode] = useState(systemScheme === "dark");
    const [hydrated, setHydrated] = useState(false);

    // Hydrate the persisted preference once on mount. After this, changes
    // are written through immediately by `setIsDarkMode` below.
    useEffect(() => {
        (async () => {
            try {
                const stored = await AsyncStorage.getItem(DARK_MODE_KEY);
                if (stored === "true") _setIsDarkMode(true);
                else if (stored === "false") _setIsDarkMode(false);
            } catch {
                // ignore — fall back to system scheme
            } finally {
                setHydrated(true);
            }
        })();
    }, []);

    const setIsDarkMode = (next) => {
        _setIsDarkMode((prev) => {
            const value = typeof next === "function" ? next(prev) : next;
            // Fire-and-forget persistence. A failure here only loses the
            // preference for the next launch — not worth blocking the UI.
            AsyncStorage.setItem(DARK_MODE_KEY, String(value)).catch(() => {});
            return value;
        });
    };

    const theme = useMemo(() => {
        return {
            ...Colors,
            ...(isDarkMode ? Colors.dark : Colors.light),
        };
    }, [isDarkMode]);

    return (
        <ThemeContext.Provider
            value={{ theme, isDarkMode, setIsDarkMode, hydrated }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error("useTheme must be used within ThemeProvider");
    }

    return context;
}
