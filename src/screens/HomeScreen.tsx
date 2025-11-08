// src/screens/HomeScreen.tsx
import React, { useRef, useState, useEffect } from 'react';
import { 
  View, 
  Button, 
  TouchableOpacity, 
  StyleSheet, 
  Text, 
  Alert,
  TextInput,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import WebView from 'react-native-webview';
import { HomeScreenNavigationProp } from '../types/navigation';
import { AuthService, CustomUser } from '../services/authService';
import { Picker } from '@react-native-picker/picker';

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const webViewRef = useRef<WebView>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [currentUser, setCurrentUser] = useState<CustomUser | null>(null);
  const [amenity, setAmenity] = useState<string[]>([]);
  const [selectedAmenity, setSelectedAmenity] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      const user = await AuthService.getCurrentUser();
      const amenitY = await AuthService.amenityFetch();
      setAmenity(amenitY);
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    const result = await AuthService.signOut();
    if (result.success) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  };

  // Xử lý message từ WebView
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'MAP_READY':
          setIsMapReady(true);
          console.log('Bản đồ đã sẵn sàng');
          break;
          
        case 'MARKER_CLICK':
          setSelectedLocation(data.data);
          Alert.alert(
            data.data.name,
            `${data.data.description}\n\n⭐ Đánh giá: ${data.data.rating}/5`,
            [
              { text: 'OK', style: 'default' },
              { 
                text: 'Xem chi tiết', 
                onPress: () => navigation.navigate('Profile', { name: data.data.name })
              }
            ]
          );
          break;

        case 'SEARCH_RESULT':
          setIsSearching(false);
          if (data.success) {
            console.log('Tìm thấy địa điểm:', data.location);
          } else {
            Alert.alert('Không tìm thấy', 'Không tìm thấy địa điểm bạn yêu cầu');
          }
          break;
          
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Lỗi xử lý message từ WebView:', error);
    }
  };

  const handleSelectAmenity = () => {

  }

  // Tìm kiếm địa điểm sử dụng Nominatim (OpenStreetMap)
  const handleSearch = async () => {
    if (!searchText.trim()) return;
    
    setIsSearching(true);
    
    try {
      // Sử dụng Nominatim API để geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchText)}&limit=1`,
        {
          headers: {
            "User-Agent": "HCMGuide/1.0 (abc@gmail.com)",
            "Accept-Language": "vi" 
          }
        }
      );

      if (!response.ok) {
        // Đọc nội dung lỗi dưới dạng text để debug
        const errorText = await response.text(); 
        console.error('Lỗi HTTP Nominatim:', response.status, errorText);
        // Ném ra một lỗi để khối catch xử lý
        throw new Error(`Yêu cầu Nominatim thất bại với mã: ${response.status}`);
      }

      const data = await response.json();
      
      if (data && data.length > 0) {
        const location = data[0];
        const lat = parseFloat(location.lat);
        const lon = parseFloat(location.lon);
        
        // Di chuyển map đến vị trí tìm được
        if (webViewRef.current) {
          webViewRef.current.injectJavaScript(`
            // Xóa các marker cũ
            if (window.searchMarker) {
              map.removeLayer(window.searchMarker);
            }
            
            // Di chuyển map đến vị trí mới
            map.setView([${lat}, ${lon}], 15);
            
            // Thêm marker mới
            window.searchMarker = L.marker([${lat}, ${lon}])
              .addTo(map)
              .bindPopup('<b>${location.display_name}</b>')
              .openPopup();
            
            // Thông báo kết quả
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'SEARCH_RESULT',
                success: true,
                location: {
                  name: '${location.display_name.split(',')[0]}',
                  lat: ${lat},
                  lon: ${lon},
                  address: '${location.display_name}'
                }
              }));

            }
            true;
          `);
        }
      } else {
        setIsSearching(false);
        Alert.alert('Không tìm thấy', 'Không tìm thấy địa điểm bạn yêu cầu');
      }
    } catch (error) {
      setIsSearching(false);
      console.error('Lỗi tìm kiếm:', error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi tìm kiếm');
    }
  };

  // Tìm kiếm trong danh sách địa điểm có sẵn
  const handleLocalSearch = () => {
    if (webViewRef.current && searchText.trim()) {
      webViewRef.current.injectJavaScript(`
        const keyword = "${searchText.trim().toLowerCase()}";
        const foundLocations = window.locations.filter(loc => 
          loc.name.toLowerCase().includes(keyword) ||
          loc.description.toLowerCase().includes(keyword)
        );
        
        if (foundLocations.length > 0) {
          // Di chuyển đến location đầu tiên tìm được
          const firstLocation = foundLocations[0];
          map.setView([firstLocation.lat, firstLocation.lng], 15);
          
          // Mở popup của location đó
          if (window.locationMarkers && window.locationMarkers[firstLocation.id]) {
            window.locationMarkers[firstLocation.id].openPopup();
          }
          
          // Thông báo kết quả
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'SEARCH_RESULT',
              success: true,
              location: firstLocation
            }));
          }
        } else {
          // Không tìm thấy trong danh sách local
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'SEARCH_RESULT', 
              success: false,
              message: 'Không tìm thấy địa điểm trong danh sách'
            }));
          }
        }
        true;
      `);
    }
  };

  // Reset bản đồ về vị trí mặc định
  const handleResetMap = () => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        map.setView([10.762622, 106.660172], 13);
        // Xóa search marker nếu có
        if (window.searchMarker) {
          map.removeLayer(window.searchMarker);
        }
        true;
      `);
    }
    setSearchText('');
    setSelectedLocation(null);
    setIsSearching(false);
  };

  // HTML với dữ liệu địa điểm và chức năng tìm kiếm
  const mapHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>
        body { margin: 0; padding: 0; }
        #map { width: 100%; height: 100vh; }
        .location-popup { min-width: 200px; }
        .location-name { font-weight: bold; margin-bottom: 5px; }
        .location-rating { color: #ff9529; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        // Khởi tạo bản đồ
        const map = L.map('map').setView([10.762622, 106.660172], 13);
        
        // Thêm tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        const roadsLayer = L.tileLayer.wms(
          "http://192.168.56.1:8080/geoserver/Roads_guide/wms",
          {
            layers: "Roads_guide:roads",
            format: "image/png",
            transparent: true
          }
        )

        const placesLayer = L.tileLayer.wms(
          "http://192.168.56.1:8080/geoserver/Roads_guide/wms",
          {
            layers: "Roads_guide:places",
            format: "image/png",
            transparent: true
          }
        )
        
        // Dữ liệu địa điểm
        const locations = [
          {
            id: 1,
            name: "Chợ Bến Thành",
            lat: 10.7720,
            lng: 106.6983,
            description: "Chợ truyền thống nổi tiếng ở Sài Gòn",
            rating: 4.5,
            type: "market"
          },
          {
            id: 2, 
            name: "Dinh Độc Lập",
            lat: 10.7776,
            lng: 106.6954,
            description: "Di tích lịch sử quan trọng",
            rating: 4.7,
            type: "historical"
          },
          {
            id: 3,
            name: "Nhà thờ Đức Bà",
            lat: 10.7798,
            lng: 106.6990,
            description: "Nhà thờ cổ kiến trúc Pháp", 
            rating: 4.6,
            type: "religious"
          },
          {
            id: 4,
            name: "Bưu điện Thành phố",
            lat: 10.7792, 
            lng: 106.6995,
            description: "Công trình kiến trúc cổ điển",
            rating: 4.4,
            type: "historical"
          },
          {
            id: 5,
            name: "Phố đi bộ Nguyễn Huệ", 
            lat: 10.7733,
            lng: 106.7030,
            description: "Không gian văn hóa và giải trí",
            rating: 4.3,
            type: "entertainment"
          }
        ];
        
        // Lưu locations ra global để sử dụng trong search
        window.locations = locations;
        window.locationMarkers = {};
        
        // Thêm markers cho các địa điểm
        locations.forEach(location => {
          const marker = L.marker([location.lat, location.lng])
            .addTo(map)
            .bindPopup(\`
              <div class="location-popup">
                <div class="location-name">\${location.name}</div>
                <div>\${location.description}</div>
                <div class="location-rating">⭐ \${location.rating}/5</div>
              </div>
            \`);
          
          // Lưu marker để có thể truy cập sau
          window.locationMarkers[location.id] = marker;
          
          // Thêm sự kiện click
          marker.on('click', function() {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'MARKER_CLICK',
                data: location
              }));
            }
          });
        });
        
        // Thông báo khi map ready
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'MAP_READY',
            message: 'Bản đồ đã sẵn sàng'
          }));
        }
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {currentUser && (
          <Text style={styles.welcomeText}>
            👋 Xin chào, {currentUser.email}!
          </Text>
        )}
        
        <View style={styles.buttonRow}>
          <Button 
            title='Đánh giá'
            onPress={() => navigation.navigate('Review')}/>

          <Button
            title="Hồ sơ"
            onPress={() => navigation.navigate('Profile', { name: 'Jane' })}
          />
          
          <Button
            title="Đăng xuất"
            onPress={handleLogout}
            color="#FF3B30"
          />
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm địa điểm..."
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity 
          style={[styles.searchButton, isSearching && styles.disabledButton]} 
          onPress={handleSearch}
          disabled={isSearching}
        >
          {isSearching ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.searchButtonText}>🔍</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.resetButton} onPress={handleResetMap}>
          <Text style={styles.resetButtonText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Map Container */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: mapHTML }}
          style={styles.map}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onMessage={handleWebViewMessage}
          onError={(error) => console.error('WebView error:', error)}
          onLoadEnd={() => console.log('WebView load completed')}
        />
        
        {!isMapReady && (
          <View style={styles.loadingOverlay}>
            <Text style={styles.loadingText}>Đang tải bản đồ...</Text>
          </View>
        )}
      </View>

      {/* Selected Location Info */}
      {selectedLocation && (
        <View style={styles.locationInfo}>
          <Text style={styles.locationName}>{selectedLocation.name}</Text>
          <Text style={styles.locationDescription}>{selectedLocation.description}</Text>
          <Text style={styles.locationRating}>⭐ {selectedLocation.rating}/5</Text>
        </View>
      )}
      {/* <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Đánh giá</Text>
      </View> */}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Khám phá nhanh. BẠN ĐANG TÌM GÌ?</Text>
        <Picker selectedValue={setSelectedAmenity} onValueChange={handleSelectAmenity}>
          <Picker.Item label='Chọn...' value=""/>
          {amenity
            .filter(a => a) // loại null/undefined
            .map(a => {
              // tách chuỗi theo dấu gạch dưới hoặc dấu cách
              const parts = a.split(/[_\s]+/); 
              // lấy phần cuối (ví dụ 'Hotel' từ 'Love_Hotel')
              const lastPart = parts[parts.length - 1];
              // viết hoa chữ cái đầu
              return lastPart.charAt(0).toUpperCase() + lastPart.slice(1).toLowerCase();
            })
            .map((a, index) => (
              <Picker.Item key={index} label={a} value={a} />
            ))}
        </Picker>
        {/* <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => {
              if (webViewRef.current) {
                webViewRef.current.injectJavaScript(`
                  map.setView([10.7720, 106.6983], 15);
                  if (window.locationMarkers[1]) {
                    window.locationMarkers[1].openPopup();
                  }
                  true;
                `);
              }
            }}
          >
            <Text style={styles.quickActionText}>🏪 Chợ Bến Thành</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => {
              if (webViewRef.current) {
                webViewRef.current.injectJavaScript(`
                  map.setView([10.7776, 106.6954], 15);
                  if (window.locationMarkers[2]) {
                    window.locationMarkers[2].openPopup();
                  }
                  true;
                `);
              }
            }}
          >
            <Text style={styles.quickActionText}>🏛️ Dinh Độc Lập</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => {
              if (webViewRef.current) {
                webViewRef.current.injectJavaScript(`
                  map.setView([10.7798, 106.6990], 15);
                  if (window.locationMarkers[3]) {
                    window.locationMarkers[3].openPopup();
                  }
                  true;
                `);
              }
            }}
          >
            <Text style={styles.quickActionText}>⛪ Nhà thờ Đức Bà</Text>
          </TouchableOpacity>
        </ScrollView> */}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 50,
    minHeight: 44,
  },
  disabledButton: {
    opacity: 0.6,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  resetButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 50,
    minHeight: 44,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  locationInfo: {
    padding: 16,
    backgroundColor: '#f0f8ff',
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
  },
  locationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  locationDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  locationRating: {
    fontSize: 14,
    color: '#FF9529',
    fontWeight: '500',
  },
  quickActions: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  quickActionButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default HomeScreen;