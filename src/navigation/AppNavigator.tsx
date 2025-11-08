// src/navigation/AppNavigator.tsx
import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ReviewScreen from '../screens/ReviewScreen';

const RootStack = createNativeStackNavigator({
  screens: {
    Login: {
      screen: LoginScreen,
      options: {
        title: 'Đăng nhập',
        headerShown: false
      }
    },
    SignUp: {
      screen: SignUpScreen,
      options: {title: 'Đăng ký'}
    },
    ForgotPassword: {
      screen: ForgotPasswordScreen,
      options: { title: 'Quên mật khẩu' }
    },
    Home: {
      screen: HomeScreen,
      options: { 
        title: 'TravelMap',
        headerBackVisible: false 
       } 
    },
    Profile: {
      screen: ProfileScreen,
      options: { title: 'Profile' }
    },
    Review: {
      screen: ReviewScreen,
    }
  },
  initialRouteName: 'Login',
});

export const Navigation = createStaticNavigation(RootStack);