import React, { createContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [driver, setDriver] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
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
    try {
      const userToken = await SecureStore.getItemAsync('userToken');
      if (userToken) {
        // Verify token using profile endpoint
        const response = await api.get('/profile');
        setUser(response.data.user);
        setDriver(response.data.driver);
      }
    } catch (e) {
      console.log('Token restore failed:', e);
      await SecureStore.deleteItemAsync('userToken');
    }
    setIsLoading(false);
  };

  const login = async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post('/login', { email, password });
      
      const { token, user, driver } = response.data;
      await SecureStore.setItemAsync('userToken', token);
      
      setUser(user);
      setDriver(driver);
    } catch (e) {
      setError(e.response?.data?.message || 'Login failed. Please check your credentials.');
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.post('/logout');
    } catch (e) {
      console.log('Logout error', e);
    } finally {
      await SecureStore.deleteItemAsync('userToken');
      setUser(null);
      setDriver(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, driver, isLoading, error, login, logout, setDriver }}>
      {children}
    </AuthContext.Provider>
  );
};
