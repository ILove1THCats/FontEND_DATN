// src/screens/ProfileScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ProfileScreenRouteProp } from '../types/navigation';

const ProfileScreen = ({ route }: ProfileScreenRouteProp) => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>This is {route.params.name}'s profile</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 18,
  },
});

export default ProfileScreen;