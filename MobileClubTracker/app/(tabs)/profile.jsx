import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { logoutUser } from "../../utils/auth";

export default function Profile() {
    const router = useRouter();

    const handleLogout = async () => {
        await logoutUser();
        router.replace("/login");
    };

    return (
        <View style={{ padding: 20 }}>
            <Text>Profile</Text>

            <Pressable onPress={handleLogout}>
                <Text style={{ color: "red", marginTop: 20 }}>
                    Logout
                </Text>
            </Pressable>
        </View>
    );
}