import axios from 'axios';
import { Platform } from 'react-native';

// Get the correct backend URL based on platform
const getBackendURL = () => {
  if (Platform.OS === 'web') {
    // On web, use relative URLs which will go through the proxy
    // Or use window.location for dynamic host
    if (typeof window !== 'undefined') {
      return `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port.replace('3000', '8001')}` : ''}`;
    }
    return 'http://localhost:8001';
  }
  // On mobile, use the full backend URL from environment
  return process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';
};

export const BACKEND_URL = getBackendURL();

// Create axios instance with proper configuration
export const apiClient = axios.create({
  baseURL: BACKEND_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for logging
apiClient.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.status, error.config?.url, error.message);
    return Promise.reject(error);
  }
);
