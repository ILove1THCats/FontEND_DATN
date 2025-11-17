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
import { AuthService, CustomUser, Place } from '../services/authService';
import { Picker } from '@react-native-picker/picker';
import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid, Platform } from 'react-native';
import { ReviewService } from '../services/reviewService';

const HomeScreen = () => {
  // Khúc này là navigation và webview
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const webViewRef = useRef<WebView>(null);
  //Tiện ích
  const [searchText, setSearchText] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  //User
  const [currentUser, setCurrentUser] = useState<CustomUser | null>(null);
  const [amenity, setAmenity] = useState<string[]>([]);
  const [selectedAmenity, setSelectedAmenity] = useState("");
  const [isMyLocate, setIsMyLocate] = useState(false);
  //Đánh giá
  const [userReview, setUserReview] = useState("");
  const [reviews, setReviews] = useState<any[]>([]);
  const [isRouting, setIsRouting] = useState(false);
  const [liked, setLiked] = useState(0);
  const [rating, setRating] = useState(1);
  //GPS
  const [currentPosition, setCurrentPosition] = useState<{ lon: number, lat: number } | null>(null);

    useEffect(() => {
      const fetchUser = async () => {
        const user = await AuthService.getCurrentUser();
        const amenitY = await AuthService.amenityFetch();

        setAmenity(amenitY);
        setCurrentUser(user);
      };
      fetchUser();
    }, []);

  // ===== REQUEST LOCATION PERMISSION =====
  useEffect(() => {
    (async () => {
      const granted = await requestLocationPermission();

      if (!granted) {
        console.log("Không có quyền GPS");
        Alert.alert("Không có quyền GPS");
        return;
      }

      Geolocation.getCurrentPosition(
        (pos) => {
          setCurrentPosition({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          });
        },
        (err) => {
          console.log("GPS error:", err);
          Alert.alert("GPS error", err.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    })();
  }, []);

  // ==================== REQUEST PERMISSION ====================
  const requestLocationPermission = async () => {
    try {
      const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          
      ]);

      console.log("Permission result:", result);

      return (
        result[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED &&
        result[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED
      );
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  // ==================== LOGOUT ===============================
  const handleLogout = async () => {
    const result = await AuthService.signOut();
    if (result.success) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  };


  // ==================== SEARCHING ===============================
  const handleSelectAmenity = async (value: string) => {
    if (!currentPosition) {
      Alert.alert("Chưa có vị trí!")
      return;
    }
    if (!isMapReady) {
      Alert.alert("Map chưa sẵn sàng!");
      return;
    }

    console.log(currentPosition.lat, currentPosition.lon);

    setSelectedAmenity(value);
    try {
      const result = await AuthService.nearbyPlacesFetch(
      value,
      currentPosition.lat,
      currentPosition.lon,
      2000
    );
    
    console.log(result);
    if (result && webViewRef.current) {
      const js = `
      (() => {
        try {
          if (window.amenityLayer) {
            map.removeLayer(window.amenityLayer);
            window.amenityLayer.clearLayers();
          }

          if (window.routeLayer) {
            map.removeLayer(window.routeLayer);
          }

          window.amenityLayer = L.layerGroup().addTo(map);

          const places = ${JSON.stringify(result) || '[]'};

          places.forEach(p => {
            if (p.lat && p.long) {
              const marker = L.marker([p.lat, p.long])
                .addTo(window.amenityLayer)
                .bindPopup('<b>' + (p.name || "Địa điểm") + '</b>');

              marker.on("click", () => {
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: "AMENITY_MARKER_CLICK",
                    data: {
                      id: p.id,
                      name: p.name,
                      lat: p.lat,
                      lon: p.long
                    }
                  }));
                }
              });
            }
          });

          
        } catch(e) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: "DEBUG",
              msg: "inject error: " + e.message,
              stack: e.stack
            }));
        }
      })();
      true;
      `;
      webViewRef.current.injectJavaScript(js);
    }

    } catch (error) {
      console.error('Yippe bay màu rồi', error);
    }
  };

  //-------------------------------------------------------------------------- Tìm kiếm địa điểm sử dụng Nominatim (OpenStreetMap)
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
                type: 'AMENITY_MARKER_CLICK',
                success: true,
                data: {
                  id: 0,
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

  // ==================== USER LOCATETION ===============================
  const handleGoToMyLocation = () => {
    if (!currentPosition) {
      Alert.alert("Chưa lấy được vị trí của bạn!");
      return;
    }

    setIsMyLocate(true)
    if (!webViewRef.current) return;

    const { lat, lon } = currentPosition;

    // Inject JS vào WebView
    webViewRef.current.injectJavaScript(`
      (function() {
        try {
          // Xóa marker cũ nếu có
          if (window.myLocationMarker) {
            map.removeLayer(window.myLocationMarker);
          }

          // Thêm marker mới tại vị trí người dùng
          window.myLocationMarker = L.marker([${lat}, ${lon}], {
            icon: L.icon({
              iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
              iconSize: [30, 30],
              iconAnchor: [15, 30],
              popupAnchor: [0, -35] 
            })
          }).addTo(map)
          .bindPopup('<b>Vị trí của bạn</b>')
          .openPopup();

          // Di chuyển map đến vị trí người dùng và zoom
          map.setView([${lat}, ${lon}], 16);

          // Debug
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: "DEBUG",
              msg: "Đã di chuyển đến vị trí người dùng"
            }));
          }

        } catch(e) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: "DEBUG",
              msg: "Lỗi handleGoToMyLocation: " + e.message,
              stack: e.stack
            }));
          }
        }
      })();
      true;
    `);
  };

  // Reset bản đồ về vị trí mặc định
  const handleResetMap = () => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        (function() {
          try {
            map.setView([10.762622, 106.660172], 13);
            if (window.searchMarker) {
              map.removeLayer(window.searchMarker);
            }

            if (window.routeLayer) {
              map.removeLayer(window.routeLayer);
            }
          } catch(e) {
            console.error("Inject JS error:", e);
            alert("Lỗi JS: " + e.message);
          }
        })
        true;
      `);
    }
    setSearchText('');
    setSelectedLocation(null);
    setIsSearching(false);
    setIsRouting(false);
  };

  // ==================== REVIEWS ===============================
  const handleLike = async (userid:number, placeid:number) => {
    console.log("Yoyo yo: ", placeid, userid);
    const result = await ReviewService.upLike(placeid, userid);
    console.log(result);
  }

  const handleSubmitReview = async() => {
    if (!selectedLocation) {
      Alert.alert("Chọn địa điểm trước!");
      return;
    }

    if (!userReview.trim()) {
      Alert.alert("Bạn chưa nhập review!");
      return;
    }

    const newReview = {
      placeid: Number(selectedLocation.id),
      userid: Number(currentUser?.user_id),
      rating: Number(rating),
      comment: userReview,
    };

    await ReviewService.reviewUpdate(newReview);

    setUserReview("");

    Alert.alert("Thành công", "Cảm ơn bạn đã đánh giá!");
  };

  // ==================== WEBVIEW PROCESSING ===============================
  const handleWebViewMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'MAP_READY':
          setIsMapReady(true);
          console.log('Bản đồ đã sẵn sàng');
          break;

        case 'SEARCH_RESULT':
          setIsSearching(false);
          if (data.success) {
            console.log('Tìm thấy địa điểm:', data.location);
          } else {
            Alert.alert('Không tìm thấy', 'Không tìm thấy địa điểm bạn yêu cầu');
          }
          break;

        case 'ROUTE_INFO':
          if (selectedLocation) {
            setSelectedLocation((prev: any) => ({
              ...prev,
              distance_km: data.distance_km,
              time_h: data.time_h
            }));
          }
          break;

        case 'AMENITY_MARKER_CLICK':
            try {
              if (!currentPosition) {
                Alert.alert("Vị trí hiện tại chưa có!");
                break;
              }

              //TODO: Kiểm tra - đã kiểm tra
              const startLon = currentPosition.lon;
              const startLat = currentPosition.lat;
              const endLon = data.data.lon;
              const endLat = data.data.lat;
              const like = await ReviewService.getLike(data.data.id);
              const oldReview = await ReviewService.reviewFetch(data.data.id);
              
              console.log(oldReview);
              if (isMyLocate === false) {
                handleGoToMyLocation();
              }

              setReviews(oldReview);
              setLiked(like);
              setSelectedLocation(data.data);
              setIsRouting(true);
              const url = `http://10.0.2.2:3000/proxy?x1=${startLon}&y1=${startLat}&x2=${endLon}&y2=${endLat}`;

              if (webViewRef.current) {
                webViewRef.current.injectJavaScript(`
                  (function() {
                    try {
                      console.log("Fetching route from WFS...");
                      fetch('${url}')
                        .then(res => res.json())
                        .then(data => {
                          console.log("GeoJSON features count:", data.features ? data.features.length : 0);

                          if (!data.features || data.features.length === 0) {
                            alert("Không có tuyến đường trả về từ server");
                            return;
                          }

                          if (window.routeLayer) {
                            map.removeLayer(window.routeLayer);
                          }

                          window.routeLayer = L.geoJSON(data, {
                            style: { color: 'red', weight: 4 }
                          }).addTo(map);

                          map.fitBounds(window.routeLayer.getBounds());

                          if (window.ReactNativeWebView) {
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                              type: "ROUTE_INFO",
                              distance_km: data.total_distance_km,
                              time_h: data.total_time_h
                            }));
                          }
                        })
                        .catch(e => {
                          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DEBUG', msg: e.message }));
                          console.error("Fetch WFS error:", e);
                          alert("Lỗi fetch WFS: " + e.message);
                        });
                    } catch(e) {
                      console.error("Inject JS error:", e);
                      alert("Lỗi JS: " + e.message);
                    }
                  })();
                `);
              }
          } catch (error) {
            console.error('Lỗi AMENITY_MARKER_CLICK:', error);
            Alert.alert('Lỗi', 'Không thể vẽ tuyến đường');
          }
          break;
        default:
          console.log('Unknown message type:', data.type);

        case 'DEBUG':
          console.log('WebView DEBUG:', data.msg);
          break;
      } 
    } catch (error) {
      console.error('Lỗi xử lý message từ WebView:', error);
    }
  };

  // ==================================================================== HTML với dữ liệu địa điểm và chức năng tìm kiếm
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
        window.amenityLayer = L.layerGroup().addTo(map);
        
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
  
  //=========================================================================================== RETURNING =================================================================================
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {currentUser ? (
          <>
            <Text style={styles.welcomeText}>
              👋 Xin chào, {currentUser.full_name}!
            </Text>

            <View style={styles.buttonRow}>
              <Button
                title="Hồ sơ"
                onPress={() => navigation.navigate('Profile')}
              />
              <Button
                title="Đăng xuất"
                onPress={handleLogout}
                color="#FF3B30"
              />
            </View>
          </>
        ) : (
          <Button
            title="Đăng nhập"
            onPress={() => navigation.navigate('Login')}
          />
        )}
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

      <TouchableOpacity 
        style={styles.myLocationButton} 
        onPress={handleGoToMyLocation}
      >
        <Text style={styles.myLocationButtonText}>🚀</Text>
      </TouchableOpacity>
      
      {selectedLocation && !currentUser ? (
      <View style={styles.reviewContainer}>
        <Text style={styles.sectionTitle}>
          Đây là địa điểm: {selectedLocation?.name}
        </Text>
        <Text>
          Khoảng cách: {selectedLocation?.distance_km?.toFixed(2)} km
        </Text>
        <Text>
          Thời gian di chuyển: {selectedLocation?.time_h ? (selectedLocation.time_h * 60).toFixed(0) : 0} phút
        </Text>
      </View>
      ) : console.log("Chưa chọn!")}


      {isRouting ? (
        selectedLocation && currentUser &&(
          <View style={styles.reviewContainer}>
            {/* Góc trên: Bong bóng icon */}
            <View style={styles.reviewHeaderRight}>
              <TouchableOpacity style={styles.bubbleIcon} onPress={() => handleLike(Number(currentUser.user_id) , selectedLocation.id)}>
                <Text style={{ fontSize: 18 }}>⭐ {liked}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bubbleIcon} onPress={() => setIsRouting(false)}>
                <Text style={{ fontSize: 18 }}>❌</Text>
              </TouchableOpacity>
            </View>

            {/* Title */}
            <Text style={styles.sectionTitle}>
              Đánh giá địa điểm: {selectedLocation.name}
            </Text>
            <Text>
              Giờ mở cửa: 6h - 21h
            </Text>
            <Text>
              Khoảng cách: {selectedLocation?.distance_km?.toFixed(2)} km
            </Text>
            <Text>
              Thời gian di chuyển: {selectedLocation?.time_h ? (selectedLocation.time_h * 60).toFixed(0) : 0} phút (40km/h)
            </Text>
            {/* Ô nhập review */}
            <TextInput
              placeholder="Viết cảm nhận của bạn..."
              style={styles.reviewInput}
              multiline
              value={userReview}
              onChangeText={setUserReview}
            />

          <Picker
            selectedValue={rating}
            onValueChange={(value) => setRating(value)}
          >
            <Picker.Item label="1 sao" value={1} />
            <Picker.Item label="2 sao" value={2} />
            <Picker.Item label="3 sao" value={3} />
            <Picker.Item label="4 sao" value={4} />
            <Picker.Item label="5 sao" value={5} />
          </Picker>

            {/* Nút gửi */}
            <TouchableOpacity 
              style={styles.submitReviewButton}
              onPress={handleSubmitReview}
            >
              <Text style={styles.submitReviewText}>Gửi đánh giá</Text>
            </TouchableOpacity>

            {/* Danh sách review */}
            <ScrollView style={styles.reviewList}>
              {reviews.length === 0 ? (
                <Text style={styles.noReview}>Chưa có đánh giá nào.</Text>
              ) : (
                reviews.map((rev, index) => (
                  <View key={index} style={styles.reviewItem}>
                    <Text style={styles.reviewUser}>{rev.full_name}</Text>
                    {rev.rating ? (
                      <View style={{ flexDirection: "row", marginVertical: 4 }}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Text key={i} style={{ fontSize: 16 }}>
                            {i < rev.rating ? "⭐" : "☆"}
                          </Text>
                        ))}
                      </View> 
                    ) : null}
                    <Text style={styles.reviewContent}>{rev.comment}</Text>
                    <Text style={styles.reviewTime}>{rev.created_at}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        )
      ) : (
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Khám phá nhanh. BẠN MUỐN ĐI ĐÂU?</Text>
          <Text style={styles.sectionTitle}>-Tìm kiếm nhanh 2km xung quanh-</Text>
          <Picker 
            selectedValue={selectedAmenity} 
            onValueChange={(value) => handleSelectAmenity(value)}
          >
            <Picker.Item label="Chọn..." value="" />
            {amenity
              .filter(a => a)
              .map((original, index) => {
                const parts = original.split(/[_\s]+/);
                const lastPart = parts[parts.length - 1];
                const formatted = lastPart.charAt(0).toUpperCase() + lastPart.slice(1).toLowerCase();
                return (
                  <Picker.Item 
                    key={index}
                    label={formatted}
                    value={original}
                  />
                );
              })}
          </Picker>
        </View>
      )}
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
  myLocationButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 50,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
    zIndex: 999
  },
  myLocationButtonText: {
    fontSize: 24,
  },

  reviewContainer: {
  padding: 16,
  borderTopWidth: 1,
  borderColor: "#eee",
  backgroundColor: "#fff",
  marginBottom: 10
},

  reviewHeaderRight: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 10,
  },

  bubbleIcon: {
    backgroundColor: "#f3f3f3",
    padding: 8,
    borderRadius: 20,
    marginLeft: 8,
    elevation: 2
  },

  reviewInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: "top",
    backgroundColor: "#fafafa",
    marginBottom: 12
  },

  submitReviewButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16
  },

  submitReviewText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16
  },

  reviewList: {
    maxHeight: 180,
    marginTop: 10
  },

  reviewItem: {
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: "#f5f5f5"
  },

  reviewUser: {
    fontWeight: "bold",
    marginBottom: 4
  },

  reviewContent: {
    fontSize: 14,
    color: "#444"
  },

  reviewTime: {
    fontSize: 12,
    color: "#888",
    marginTop: 4
  },

  noReview: {
    fontStyle: "italic",
    color: "#999",
    textAlign: "center"
  },

  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(170, 10, 10, 1)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20
  }
});

export default HomeScreen;