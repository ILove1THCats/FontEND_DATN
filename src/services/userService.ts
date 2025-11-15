import AsyncStorage from "@react-native-async-storage/async-storage";

export interface User {
  user_id: number;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
}
const API_URL = "http://192.168.56.1:3000/api/users";

export const UserService = {

    getProfile: async () => {
        try {
            const userStr = await AsyncStorage.getItem("user");

            if (!userStr) return null; 

            const user:User = JSON.parse(userStr); 

            const response = await fetch(`${API_URL}/profile/${user.user_id}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            console.log(response);
            if (!response.ok) {
                console.log("Lỗi fetch profile");
            }

            const data = await response.json();

            return data;

            } catch (error) {
            return { success: false, error: "Lỗi kết nối server" };
        }
    },
};