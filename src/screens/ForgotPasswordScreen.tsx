import { StackNavigationProp } from "@react-navigation/stack";
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { RootStackParamList } from "../types/navigation";
import { useNavigation } from "@react-navigation/native";
import { AuthService } from "../services/authService";

type ForgotPasswordNavigationProp = StackNavigationProp<RootStackParamList, 'ForgotPassword'>;

const ForgotPasswordScreen = () => {
  const navigation = useNavigation<ForgotPasswordNavigationProp>();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (email.trim() === "") return;
    setSubmitted(true);

    await AuthService.resetPassword(email);
  };

  const handleReturn = () => {
    navigation.replace("Login");
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Quên mật khẩu</Text>
        <Text style={styles.subtitle}>
          Nhập địa chỉ email của bạn để nhận liên kết đặt lại mật khẩu.
        </Text>

        {!submitted ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Nhập email của bạn"
              placeholderTextColor="#7B7B7B"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <TouchableOpacity style={styles.button} onPress={handleSubmit}>
              <Text style={styles.buttonText}>Gửi liên kết khôi phục</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.successBox}>
            <Text style={styles.successText}>✅ Đã gửi email!</Text>
            <Text style={styles.successDesc}>
              Vui lòng kiểm tra hộp thư của bạn để tiếp tục đặt lại mật khẩu.
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.backLink} onPress={handleReturn}>
          <Text style={styles.backText}>← Quay lại đăng nhập</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default ForgotPasswordScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fbff", // trắng pha xanh rất nhẹ
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#fff",
    width: "100%",
    borderRadius: 20,
    padding: 25,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: "#1976d2", // xanh dương chính
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    textAlign: "center",
    color: "#555",
    marginBottom: 25,
    fontSize: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: "#90caf9",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: "#f9f9f9",
  },
  button: {
    backgroundColor: "#2196f3",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  successBox: {
    alignItems: "center",
  },
  successText: {
    color: "#2196f3",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 6,
  },
  successDesc: {
    color: "#555",
    textAlign: "center",
  },
  backLink: {
    marginTop: 25,
    alignItems: "center",
  },
  backText: {
    color: "#1976d2",
    fontWeight: "500",
  },
});
