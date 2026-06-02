import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import * as Location from 'expo-location';
import api from '../api/axios';
import { AuthContext } from './AuthContext';

export const LocationContext = createContext();

const LOCATION_TASK_NAME = 'BACKGROUND_LOCATION_TASK';

export const LocationProvider = ({ children }) => {
  const { user, driver } = useContext(AuthContext);
  const [isTracking, setIsTracking] = useState(false);
  const [currentJob, setCurrentJob] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const subscriptionRef = useRef(null);

  useEffect(() => {
    (async () => {
      console.log('[LocationContext] Requesting location permissions...');
      let { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      console.log('[LocationContext] Foreground location permission status:', fgStatus);
      if (fgStatus !== 'granted') {
        setErrorMsg('Permission to access foreground location was denied');
        return;
      }

      let { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      console.log('[LocationContext] Background location permission status:', bgStatus);
      if (bgStatus !== 'granted') {
        setErrorMsg('Permission to access background location was denied');
      }
    })();

    // Cleanup on unmount
    return () => {
      if (subscriptionRef.current) {
        console.log('[LocationContext] Cleaning up position subscription on unmount');
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
    };
  }, []);

  const startTracking = async (job) => {
    try {
      console.log('[LocationContext] Starting tracking for job:', job ? `ID: ${job.id}, type: ${job.job_type}` : 'None');
      setCurrentJob(job);
      setIsTracking(true);
      
      // Clear any existing subscription
      if (subscriptionRef.current) {
        console.log('[LocationContext] Removing existing position subscription...');
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }

      console.log('[LocationContext] Attaching watchPositionAsync listener (5s interval)');
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        async (location) => {
          console.log('[LocationContext] Received location update:', location.coords.latitude, location.coords.longitude, 'Speed:', location.coords.speed);
          setCurrentLocation(location);
          
          // Sync location to backend
          if (job) {
            try {
              console.log('[LocationContext] Syncing location to backend...');
              const response = await api.post('/location', {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                speed: location.coords.speed,
                heading: location.coords.heading,
              });
              console.log('[LocationContext] Location synced successfully:', response.data.message);
            } catch (err) {
              console.log('[LocationContext] Location sync failed:', err.response?.data?.message || err.message);
            }
          }
        }
      );
      subscriptionRef.current = sub;
    } catch (e) {
      console.log('[LocationContext] Error starting tracking:', e);
    }
  };

  const stopTracking = async () => {
    console.log('[LocationContext] Stopping tracking and clearing state');
    setIsTracking(false);
    setCurrentJob(null);
    if (subscriptionRef.current) {
      console.log('[LocationContext] Removing watchPositionAsync listener');
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
  };

  return (
    <LocationContext.Provider value={{ 
      isTracking, 
      currentLocation, 
      currentJob, 
      startTracking, 
      stopTracking,
      errorMsg
    }}>
      {children}
    </LocationContext.Provider>
  );
};
