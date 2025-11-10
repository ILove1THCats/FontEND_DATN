import AsyncStorage from "@react-native-async-storage/async-storage";


export interface CustomUser {
    id: string,
    email: string,
    role: 'user' | 'admin' // Dùng cái này phân quyền
}

export interface Review {
  review_id: number;
  place_id: number;
  user_id: number;
  rating: number;
  comment?: string;
  created_at: Date;
}

export interface Place {
  long: number;
  lat: number;
  operator: string;
  name: string;
}

type AuthResult = {
    success: boolean,
    error?: string,
    user?: CustomUser | null;
}

// Type guard để kiểm tra Firebase error
const isFirebaseAuthError = (error: unknown): error is { code: string; message: string } => {
    return typeof error === 'object' && error !== null && 'code' in error;
};


// services/authService.ts
const API_URL = "http://192.168.56.1:3000/api/users";
const API_URL1 = "http://192.168.56.1:3000/api/reviews";
const API_URL2 = "http://192.168.56.1:3000/api/places";
const API_URL3 = "http://192.168.56.1:3000/api/roads";

export const AuthService = {
    /**
     * Theo dõi trạng thái đăng nhập của người dùng.
     * @param listener Callback nhận về user hoặc null.
     * @returns Hàm hủy đăng ký listener.
     */
    onAuthStateChanged: (callback: (user: any) => void) => {
        AsyncStorage.getItem("user").then((user) => {
        callback(user ? JSON.parse(user) : null);
        });
        return () => {};
    },

    /**
     * Đăng nhập email và mật khẩu
     */
    signInWithEmail: async (email: string, password: string) => {
        try {
        const response = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        if (response.ok) {
            // Lưu token và user
            await AsyncStorage.setItem("token", data.token);
            await AsyncStorage.setItem("user", JSON.stringify(data.user));
            return { success: true, user: data.user };
        } else {
            return { success: false, error: data.message };
        }
        } catch (error) {
        return { success: false, error: "Lỗi kết nối server" };
        }
    },

    /**
     * Đăng ký tài khoản mới với email/password
     */
    signUpWithEmail: async (full_name: string, email: string, password: string) => {
        try {
        // Băm mật khẩu ngay trên server, nhưng nếu muốn làm tạm trên client có thể dùng bcryptjs
        const response = await fetch(`${API_URL}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
            full_name,
            email,
            password_hash: password,
            }),
        });

        if (!response.ok) {
            const err = await response.json();
            return { success: false, error: err.message || "Lỗi không xác định trong signUpWithEmail"};
        }

        const data = await response.json();
        return { success: true, user: data };
        } catch (error: any) {
        return { success: false, error: error.message };
        }
    },

    /**
     * Đăng xuất
     */
    signOut: async (): Promise<{ success: boolean; error?: string }> => {
    try {
        // Xóa token và thông tin user đã lưu trong bộ nhớ cục bộ
        await AsyncStorage.removeItem("token");
        await AsyncStorage.removeItem("user");

        // Có thể thêm delay nhỏ để đảm bảo dữ liệu bị xóa trước khi chuyển màn hình
        await new Promise<void>((r) => setTimeout(r, 100));

        return { success: true };
    } catch (error: any) {
        console.error("Lỗi đăng xuất:", error);
        return { success: false, error: error.message || "Lỗi khi đăng xuất" };
    }
    },

    /**
     * 🔹 Lấy user hiện tại từ bộ nhớ
     */
    getCurrentUser: async (): Promise<CustomUser | null> => {
        const userStr = await AsyncStorage.getItem("user");
        return userStr ? JSON.parse(userStr) : null;
    },

    /**
     * 🔹 Reset password (qua backend)
     * Gửi email yêu cầu đặt lại mật khẩu
     */
    resetPassword: async (email: string): Promise<{ success: boolean; error?: string }> => {
        try {
        const response = await fetch(`${API_URL}/reset-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });

        const data = await response.json();
        if (response.ok) {
            return { success: true };
        } else {
            return { success: false, error: data.message || "Không thể gửi email reset password" };
        }
        } catch (error: any) {
        return { success: false, error: error.message || "Lỗi kết nối server" };
        }
    },

    amenityFetch: async (): Promise<string[]> => {
        try {
            const response = await fetch(`${API_URL2}/amenity`, {
                method: "GET",
                headers: { "Content-Type": "application/json" }
            });

            if (!response.ok) {
                console.error("API amenity lỗi:", response.status);
                return [];
            }

            const data = await response.json();

            return Array.isArray(data) ? data.map((d: any) => d.amenity) : [];
        } catch (error) {
            console.error("Lỗi fetch amenity:", error);
            return [];
        }
    },

    placesFetch: async (amenity: string): Promise<Place[] | null> => {
        try {
            const response = await fetch(`${API_URL2}/amenity/${amenity}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" }
            });
            console.log("amenity =", amenity);

            if (!response.ok) {
                console.error("API place lỗi:", response.status);
                return null;
            }

            const data = await response.json();

            return Array.isArray(data) ? data : null;
        } catch (error) {
            console.error("Lỗi fetch review:", error);
            return null;
        }
    },

    nearbyPlacesFetch: async (amenity: string, lat: number, lon: number, radius: number = 2000): Promise<Place[] | null> => {
        try {
            console.log(amenity, lat, lon, radius);

            const url = `${API_URL2}/nearby?amenity=${amenity}&lon=${lon}&lat=${lat}&radius=${radius}`;
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) {
                console.error("API nearby lỗi:", response.status);
                return null;
            }

            return await response.json();
        } catch (error) {
            console.error("Lỗi nearbyPlacesFetch:", error);
            return null;
        }
    },
}