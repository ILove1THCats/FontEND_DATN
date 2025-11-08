// import { User as FirebaseUser1 } from "@react-native-google-signin/google-signin";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

export type RootStackParamList = {
    Login: undefined;
    SignUp: undefined;
    ForgotPassword: undefined;
    Home: undefined;
    Profile: { name: string };
    Admin: undefined;
    Review: undefined
    // MapDetail: { location: any};
}


export type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;
export type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;
export type SignUpScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SignUp'>;
export type ProfileScreenRouteProp = {route: {params: { name: string }}};

// export type FirebaseUser = FirebaseUser1;