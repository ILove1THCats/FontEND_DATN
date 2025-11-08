// /**
//  * Sample React Native App
//  * https://github.com/facebook/react-native
//  *
//  * @format
//  */

import { NewAppScreen } from '@react-native/new-app-screen';
import { StatusBar, StyleSheet, useColorScheme, View, Text, Button, TouchableOpacity, Image} from 'react-native';
import React, {Component, useRef} from 'react';
// import WebView from 'react-native-webview';
import { Navigation } from './src/navigation/AppNavigator';

function App() {
  return (
    // <View style={styles.container}>
    //   <WebView
    //     originWhitelist={['*']}
    //     source={require('./assets/map.html')}
    //     style={styles.mapView}
    //     javaScriptEnabled={true}
    //     domStorageEnabled={true}
    //     allowFileAccess={true}
    //   />
    // </View>
    <Navigation />
  );
}

export default App;
