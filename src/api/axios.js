import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Set base URL to your Laravel API
// export const API_URL = 'https://www.ppspurnea.com/api/driver'; 
export const API_URL = 'http://192.168.29.128:8000/api/driver';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request interceptor to add token and log requests
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`[API Request] ${config.method.toUpperCase()} -> ${config.url}`, config.data ? JSON.stringify(config.data) : '');
  } catch (error) {
    console.error('[API Request Token Error]:', error);
  }
  return config;
}, (error) => {
  console.log(`[API Request Error]:`, error);
  return Promise.reject(error);
});

// Response interceptor to log responses
api.interceptors.response.use((response) => {
  console.log(`[API Response] ${response.status} <- ${response.config.url}`);
  return response;
}, (error) => {
  console.log(`[API Response Error] <- ${error.config?.url || 'unknown'} | Status: ${error.response?.status} | Message: ${error.response?.data?.message || error.message}`);
  return Promise.reject(error);
});

export default api;
