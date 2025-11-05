import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Order {
  id: string;
  order_number: string;
  pickup_location: {
    lat: number;
    lng: number;
    address: string;
  };
  delivery_location: {
    lat: number;
    lng: number;
    address: string;
  };
  status: string;
  customer_info: {
    name: string;
    phone: string;
  };
  created_at: string;
}

export default function OrderDetail() {
  const { id } = useLocalSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const fetchOrderDetail = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/orders/${id}`);
      setOrder(response.data);
    } catch (error) {
      console.error('Error fetching order:', error);
      Alert.alert('Error', 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchOrderDetail();
    }
  }, [id]);

  const handleStartDelivery = async () => {
    if (!order) return;

    setActionLoading(true);
    try {
      await axios.put(`${BACKEND_URL}/api/orders/${order.id}/start`);
      
      // Navigate to map screen
      router.push({
        pathname: '/(main)/map-navigation',
        params: {
          orderId: order.id,
          pickupLat: order.pickup_location.lat,
          pickupLng: order.pickup_location.lng,
          pickupAddress: order.pickup_location.address,
          deliveryLat: order.delivery_location.lat,
          deliveryLng: order.delivery_location.lng,
          deliveryAddress: order.delivery_location.address,
        },
      });
    } catch (error) {
      console.error('Error starting delivery:', error);
      Alert.alert('Error', 'Failed to start delivery');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteDelivery = async () => {
    if (!order) return;

    Alert.alert(
      'Complete Delivery',
      'Are you sure you want to mark this delivery as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            setActionLoading(true);
            try {
              await axios.put(`${BACKEND_URL}/api/orders/${order.id}/complete`);
              Alert.alert('Success', 'Delivery completed successfully');
              router.back();
            } catch (error) {
              console.error('Error completing delivery:', error);
              Alert.alert('Error', 'Failed to complete delivery');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleNavigate = () => {
    if (!order) return;

    router.push({
      pathname: '/(main)/map-navigation',
      params: {
        orderId: order.id,
        pickupLat: order.pickup_location.lat,
        pickupLng: order.pickup_location.lng,
        pickupAddress: order.pickup_location.address,
        deliveryLat: order.delivery_location.lat,
        deliveryLng: order.delivery_location.lng,
        deliveryAddress: order.delivery_location.address,
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centerContainer}>
        <Text>Order not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <View style={styles.orderHeader}>
            <Text style={styles.orderNumber}>{order.order_number}</Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    order.status === 'pending'
                      ? '#FF9800'
                      : order.status === 'in_progress'
                      ? '#2196F3'
                      : '#4CAF50',
                },
              ]}
            >
              <Text style={styles.statusText}>
                {order.status === 'pending'
                  ? 'Pending'
                  : order.status === 'in_progress'
                  ? 'In Progress'
                  : 'Completed'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={20} color="#007AFF" />
            <Text style={styles.infoText}>{order.customer_info.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call" size={20} color="#007AFF" />
            <Text style={styles.infoText}>{order.customer_info.phone}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Pickup Location</Text>
          <View style={styles.locationCard}>
            <Ionicons name="location" size={24} color="#FF5252" />
            <Text style={styles.locationText}>{order.pickup_location.address}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delivery Location</Text>
          <View style={styles.locationCard}>
            <Ionicons name="location" size={24} color="#4CAF50" />
            <Text style={styles.locationText}>{order.delivery_location.address}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {order.status === 'pending' && (
          <TouchableOpacity
            style={[styles.primaryButton, actionLoading && styles.buttonDisabled]}
            onPress={handleStartDelivery}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="play" size={24} color="#fff" />
                <Text style={styles.buttonText}>Start Delivery</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {order.status === 'in_progress' && (
          <>
            <TouchableOpacity
              style={[styles.secondaryButton, { flex: 1, marginRight: 8 }]}
              onPress={handleNavigate}
            >
              <Ionicons name="navigate" size={24} color="#007AFF" />
              <Text style={styles.secondaryButtonText}>Navigate</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, { flex: 1 }, actionLoading && styles.buttonDisabled]}
              onPress={handleCompleteDelivery}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={24} color="#fff" />
                  <Text style={styles.buttonText}>Complete</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        {order.status === 'completed' && (
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.completedText}>Delivery Completed</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 16,
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationText: {
    flex: 1,
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
    lineHeight: 24,
  },
  footer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    flexDirection: 'row',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 12,
    flex: 1,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  completedText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 8,
  },
});