import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../context/ThemeContext' 


const ThemedView = ({ style, safe = false, ...props }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  if (!safe) {
    return (
      <View
        style={[{ backgroundColor: theme.background }, style]}
        {...props}
      />
    );
  }

  return (
    <View
      style={[
        {
          backgroundColor: theme.background,
          paddingTop: insets.top,
          // paddingBottom: insets.bottom,
        },
        style,
      ]}
      {...props}
    />
  );
};

export default ThemedView;