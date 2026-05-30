import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Set base URL to your Laravel API
export const API_URL = 'http://192.168.29.128:8000/api/driver'; 

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request interceptor to add token
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Error fetching token:', error);
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
