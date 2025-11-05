import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { apiClient, BACKEND_URL } from '../utils/api';

function LoginContent() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    console.log('Login button clicked');
    console.log('Backend URL:', BACKEND_URL);
    
    if (!username || !password) {
      const message = 'Please enter both username and password';
      console.error(message);
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Error', message);
      }
      return;
    }

    setLoading(true);
    console.log('Attempting login with:', username);
    
    try {
      const response = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        username,
        password,
      });
      
      console.log('Login successful:', response.data);
      await login(response.data);
      console.log('User data saved, navigating to orders...');
      router.replace('/(main)/orders');
    } catch (error: any) {
      console.error('Login error:', error);
      const message = error.response?.data?.detail || 'Invalid username or password';
      if (Platform.OS === 'web') {
        alert('Login Failed: ' + message);
      } else {
        Alert.alert('Login Failed', message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons name="bicycle" size={64} color="#007AFF" />
          <Text style={styles.title}>Delivery Agent</Text>
          <Text style={styles.subtitle}>Login to continue</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>

          <View style={styles.demoInfo}>
            <Text style={styles.demoText}>Demo Credentials:</Text>
            <Text style={styles.demoDetail}>Username: agent1</Text>
            <Text style={styles.demoDetail}>Password: password123</Text>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

export default function Login() {
  return (
    <AuthProvider>
      <LoginContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  demoInfo: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    alignItems: 'center',
  },
  demoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 8,
  },
  demoDetail: {
    fontSize: 13,
    color: '#1565C0',
    marginTop: 2,
  },
});