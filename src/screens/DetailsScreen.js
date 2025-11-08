import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

const DetailsScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Đây là trang chi tiết</Text>
      <Button
        title="Quay lại trang chủ"
        onPress={() => navigation.navigate('Home')}
      />
      <Button
        title="Quay lại"
        onPress={() => navigation.goBack()}
        color="#841584"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
    marginBottom: 20,
  },
});

export default DetailsScreen;

// // Chuyển hướng với params
// navigation.navigate('Details', {
//   itemId: 86,
//   title: 'Chi tiết bản đồ',
// });

// // Nhận params ở màn hình đích
// const DetailsScreen = ({ route, navigation }) => {
//   const { itemId, title } = route.params;
  
//   return (
//     <View>
//       <Text>ID: {itemId}</Text>
//       <Text>Title: {title}</Text>
//     </View>
//   );
// };
// // Quay lại màn hình trước
// navigation.goBack();

// // Quay về màn hình đầu tiên trong stack
// navigation.popToTop();

// // Thay thế màn hình hiện tại
// navigation.replace('Map');

// // Đẩy màn hình mới (luôn tạo mới)
// navigation.push('Details');