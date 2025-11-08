import React from 'react';
import { View, StyleSheet } from 'react-native';
import WebView from 'react-native-webview';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const MapScreen = ({ navigation }) => {
    React.useLayoutEffect(() => {
        navigation.setOptions({
        headerRight: () => (
            <Button
            onPress={() => navigation.navigate('Details')}
            title="Chi tiết"
            color="#000"
            />
        ),
        });
    }, [navigation]);

    
    const Tab = createBottomTabNavigator();

    const TabNavigator = () => (
    <Tab.Navigator>
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Map" component={MapScreen} />
        <Tab.Screen name="Details" component={DetailsScreen} />
    </Tab.Navigator>
    );

    return (
        <View style={styles.container}>
        <WebView
            originWhitelist={['*']}
            source={require('../../assets/map.html')}
            style={styles.mapView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowFileAccess={true}
        />
        <TabNavigator/>
        
        </View>
    );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapView: {
    flex: 1,
  },
});

export default MapScreen;