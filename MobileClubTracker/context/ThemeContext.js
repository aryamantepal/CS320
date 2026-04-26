import React, {
    createContext,
    useContext,
    useState,
    useMemo,
} from "react";
import { useColorScheme } from "react-native";
import Colors from "../constants/Colors";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
    const systemScheme = useColorScheme();

    const [isDarkMode, setIsDarkMode] = useState(
        systemScheme === "dark"
    );

    const theme = useMemo(() => {
        return {
            ...Colors,
            ...(isDarkMode ? Colors.dark : Colors.light),
        };
    }, [isDarkMode]);

    return (
        <ThemeContext.Provider
            value={{ theme, isDarkMode, setIsDarkMode }}
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