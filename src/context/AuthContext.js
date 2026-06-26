import React, { createContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [driver, setDriver] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Register 401 response interceptor to auto logout
    const interceptor = api.interceptors.response.use(
      response => response,
      async error => {
        if (error.response && error.response.status === 401) {
          await SecureStore.deleteItemAsync('userToken');
          setUser(null);
          setDriver(null);
        }
        return Promise.reject(error);
      }
    );

    bootstrapAsync();

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, []);

  const bootstrapAsync = async () => {
    console.log('[AuthContext] Bootstrapping auth state...');
    try {
      const userToken = await SecureStore.getItemAsync('userToken');
      console.log('[AuthContext] Restored token from SecureStore:', userToken ? 'Found (active)' : 'Not found');
      if (userToken) {
        console.log('[AuthContext] Verifying restored token with backend...');
        const response = await api.get('/profile');
        console.log('[AuthContext] Verification successful. User:', response.data.user.name, 'Driver ID:', response.data.driver?.id);
        setUser(response.data.user);
        setDriver(response.data.driver);
      }
    } catch (e) {
      console.log('[AuthContext] Token verification/restore failed. Error:', e.message);
      await SecureStore.deleteItemAsync('userToken');
      setUser(null);
      setDriver(null);
    }
    setIsLoading(false);
    setIsBootstrapping(false);
  };

  const login = async (phone, password) => {
    console.log('[AuthContext] Initiating login for phone:', phone);
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post('/login', { phone, password });
      const { token, user, driver } = response.data;
      console.log('[AuthContext] Login successful. Saving token to SecureStore. User:', user.name);
      await SecureStore.setItemAsync('userToken', token);
      
      setUser(user);
      setDriver(driver);
    } catch (e) {
      const errMsg = e.response?.data?.message || 'Login failed. Please check your credentials.';
      console.log('[AuthContext] Login failed. Error:', errMsg);
      setError(errMsg);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    console.log('[AuthContext] Initiating logout...');
    setIsLoading(true);
    try {
      await api.post('/logout');
      console.log('[AuthContext] Logout API call succeeded');
    } catch (e) {
      console.log('[AuthContext] Logout API error:', e.message);
    } finally {
      console.log('[AuthContext] Clearing token from SecureStore and resetting state');
      await SecureStore.deleteItemAsync('userToken');
      setUser(null);
      setDriver(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, driver, isLoading, isBootstrapping, error, login, logout, setDriver }}>
      {children}
    </AuthContext.Provider>
  );
};
