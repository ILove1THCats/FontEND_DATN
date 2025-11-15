// src/screens/ProfileScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { User, UserService } from '../services/userService';

const ProfileScreen = () => {
  const [userInformation, setUserInformation] = useState<User>();

  useEffect (() => {
    const userInfo = async() => { 
      const info = await UserService.getProfile();

      setUserInformation(info);
    }
    userInfo();
  }, []);

  return (
    <View style={styles.container}>
      {userInformation ? (
        <View style={styles.card}>
          <Text style={styles.title}>{userInformation.full_name}</Text>
          <Text style={styles.subtitle}>Thông tin người dùng</Text>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{userInformation.email}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Cấp độ quản trị:</Text>
            <Text style={styles.value}>{userInformation.role}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Ngày tạo:</Text>
            <Text style={styles.value}>
              {new Date(userInformation.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.loading}>Loading...</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  text: {
    fontSize: 18,
  },
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "90%",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 16,
    elevation: 4, // Android shadow
    shadowColor: "#000", // iOS shadow
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
    color: "#333",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    color: "#777",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#555",
  },
  value: {
    fontSize: 16,
    color: "#333",
    maxWidth: "60%",
    textAlign: "right",
  },
  loading: {
    fontSize: 18,
    color: "#666",
  }
});

export default ProfileScreen;