import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

// Only import maps on native platforms
let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
let PROVIDER_GOOGLE: any = null;
let Location: any = null;
let io: any = null;
let Socket: any = null;

if (Platform.OS !== 'web') {
  MapView = require('react-native-maps').default;
  Marker = require('react-native-maps').Marker;
  Polyline = require('react-native-maps').Polyline;
  PROVIDER_GOOGLE = require('react-native-maps').PROVIDER_GOOGLE;
  Location = require('expo-location');
  const socketIO = require('socket.io-client');
  io = socketIO.io;
  Socket = socketIO.Socket;
}

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

export default function MapNavigation() {
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();
  
  // Web platform check - show message instead of map
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Navigation</Text>
        </View>
        <View style={styles.webContainer}>
          <Ionicons name="phone-portrait" size={80} color="#10B981" />
          <Text style={styles.webTitle}>Mobile App Only</Text>
          <Text style={styles.webMessage}>
            Map navigation with real-time GPS tracking requires a mobile device.
          </Text>
          <Text style={styles.webInstructions}>
            To test this feature:{'\n\n'}
            📱 Open Expo Go app on your phone{'\n'}
            📷 Scan the QR code from the terminal{'\n'}
            🚀 Experience full navigation features
          </Text>
          <View style={styles.featuresList}>
            <Text style={styles.featureItem}>✓ Real-time GPS tracking</Text>
            <Text style={styles.featureItem}>✓ Google Maps integration</Text>
            <Text style={styles.featureItem}>✓ Live location updates</Text>
            <Text style={styles.featureItem}>✓ Route navigation</Text>
          </View>
        </View>
      </View>
    );
  }
  
  const mapRef = useRef<MapView>(null);
  const socketRef = useRef<Socket | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<RouteCoordinate[]>([]);
  const [loading, setLoading] = useState(true);
  const [distance, setDistance] = useState<string>('');
  const [duration, setDuration] = useState<string>('');

  const pickupLocation = {
    latitude: parseFloat(params.pickupLat as string),
    longitude: parseFloat(params.pickupLng as string),
    address: params.pickupAddress as string,
  };

  const deliveryLocation = {
    latitude: parseFloat(params.deliveryLat as string),
    longitude: parseFloat(params.deliveryLng as string),
    address: params.deliveryAddress as string,
  };

  useEffect(() => {
    initializeMap();
    return () => {
      cleanup();
    };
  }, []);

  const initializeMap = async () => {
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for navigation');
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const currentPos = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setCurrentLocation(currentPos);

      // Fetch route from Google Directions API
      await fetchRoute(currentPos, deliveryLocation);

      // Start location tracking
      startLocationTracking();

      // Initialize Socket.IO
      initializeSocket();

      setLoading(false);

      // Fit map to show all markers
      setTimeout(() => {
        fitMapToMarkers();
      }, 500);
    } catch (error) {
      console.error('Error initializing map:', error);
      Alert.alert('Error', 'Failed to initialize map');
      setLoading(false);
    }
  };

  const fetchRoute = async (
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number }
  ) => {
    try {
      const originStr = `${origin.latitude},${origin.longitude}`;
      const destStr = `${destination.latitude},${destination.longitude}`;
      const waypointStr = `${pickupLocation.latitude},${pickupLocation.longitude}`;

      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destStr}&waypoints=${waypointStr}&key=${GOOGLE_MAPS_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const points = data.routes[0].overview_polyline.points;
        const decodedPoints = decodePolyline(points);
        setRouteCoordinates(decodedPoints);

        // Set distance and duration
        const leg = data.routes[0].legs[0];
        setDistance(leg.distance.text);
        setDuration(leg.duration.text);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  };

  const decodePolyline = (encoded: string): RouteCoordinate[] => {
    const poly: RouteCoordinate[] = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      poly.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }
    return poly;
  };

  const startLocationTracking = async () => {
    try {
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Update every 10 meters
        },
        (location) => {
          const newLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setCurrentLocation(newLocation);

          // Send location update via socket
          if (socketRef.current) {
            socketRef.current.emit('location_update', {
              lat: location.coords.latitude,
              lng: location.coords.longitude,
              order_id: params.orderId,
              agent_id: user?.id,
            });
          }
        }
      );
    } catch (error) {
      console.error('Error tracking location:', error);
    }
  };

  const initializeSocket = () => {
    try {
      socketRef.current = io(BACKEND_URL || '', {
        transports: ['websocket', 'polling'],
      });

      socketRef.current.on('connect', () => {
        console.log('Socket connected');
      });

      socketRef.current.on('connection_response', (data) => {
        console.log('Connection response:', data);
      });

      socketRef.current.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      socketRef.current.on('error', (error) => {
        console.error('Socket error:', error);
      });
    } catch (error) {
      console.error('Error initializing socket:', error);
    }
  };

  const fitMapToMarkers = () => {
    if (!mapRef.current || !currentLocation) return;

    const markers = [
      currentLocation,
      pickupLocation,
      deliveryLocation,
    ];

    mapRef.current.fitToCoordinates(markers, {
      edgePadding: {
        top: 100,
        right: 50,
        bottom: 300,
        left: 50,
      },
      animated: true,
    });
  };

  const cleanup = () => {
    // Stop location tracking
    if (locationSubscription.current) {
      locationSubscription.current.remove();
    }

    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        showsUserLocation={false}
        showsMyLocationButton={false}
        initialRegion={{
          latitude: currentLocation?.latitude || pickupLocation.latitude,
          longitude: currentLocation?.longitude || pickupLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {/* Current location marker */}
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Your Location"
            description="Current position"
          >
            <View style={styles.currentLocationMarker}>
              <Ionicons name="navigate-circle" size={40} color="#10B981" />
            </View>
          </Marker>
        )}

        {/* Pickup location marker */}
        <Marker
          coordinate={pickupLocation}
          title="Pickup Location"
          description={pickupLocation.address}
          pinColor="red"
        />

        {/* Delivery location marker */}
        <Marker
          coordinate={deliveryLocation}
          title="Delivery Location"
          description={deliveryLocation.address}
          pinColor="green"
        />

        {/* Route polyline */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeWidth={4}
            strokeColor="#10B981"
          />
        )}
      </MapView>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Navigation</Text>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="navigate" size={24} color="#10B981" />
            <Text style={styles.infoLabel}>Distance</Text>
            <Text style={styles.infoValue}>{distance || 'Calculating...'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoItem}>
            <Ionicons name="time" size={24} color="#10B981" />
            <Text style={styles.infoLabel}>Duration</Text>
            <Text style={styles.infoValue}>{duration || 'Calculating...'}</Text>
          </View>
        </View>

        <View style={styles.locationsList}>
          <View style={styles.locationItem}>
            <View style={[styles.locationDot, { backgroundColor: '#FF5252' }]} />
            <Text style={styles.locationAddress} numberOfLines={1}>
              {pickupLocation.address}
            </Text>
          </View>
          <View style={styles.locationItem}>
            <View style={[styles.locationDot, { backgroundColor: '#22C55E' }]} />
            <Text style={styles.locationAddress} numberOfLines={1}>
              {deliveryLocation.address}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.recenterButton} onPress={fitMapToMarkers}>
        <Ionicons name="locate" size={24} color="#10B981" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 16,
  },
  infoCard: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 2,
  },
  locationsList: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 16,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  locationAddress: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  recenterButton: {
    position: 'absolute',
    top: 120,
    right: 16,
    backgroundColor: '#fff',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  currentLocationMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  webContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  webTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 24,
    marginBottom: 16,
  },
  webMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  webInstructions: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    backgroundColor: '#E3F2FD',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    lineHeight: 22,
  },
  featuresList: {
    alignItems: 'flex-start',
  },
  featureItem: {
    fontSize: 14,
    color: '#10B981',
    marginVertical: 4,
  },
});