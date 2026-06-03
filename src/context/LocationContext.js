import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import api from '../api/axios';
import { AuthContext } from './AuthContext';

export const LocationContext = createContext();

const LOCATION_TASK_NAME = 'BACKGROUND_LOCATION_TASK';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('[BackgroundTask] Error:', error.message);
    return;
  }
  if (data) {
    const { locations } = data;
    const location = locations[0];
    
    // Ignore highly inaccurate points (GPS jitter / cellular triangulation)
    if (location.coords.accuracy > 30) {
      console.log('[BackgroundTask] Ignored inaccurate location. Accuracy:', location.coords.accuracy);
      return;
    }

    console.log('[BackgroundTask] Received location update:', location.coords.latitude, location.coords.longitude, 'Speed:', location.coords.speed);
    
    try {
      const response = await api.post('/location', {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        speed: location.coords.speed,
        heading: location.coords.heading,
      });
      console.log('[BackgroundTask] Location synced successfully:', response.data.message);
    } catch (err) {
      console.log('[BackgroundTask] Location sync failed:', err?.response?.data?.message || err.message);
    }
  }
});

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

      console.log('[LocationContext] Starting background location updates...');
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 1,
        foregroundService: {
          notificationTitle: 'Live Tracking Active',
          notificationBody: 'Location is being shared with parents.',
          notificationColor: '#2563eb',
        },
        showsBackgroundLocationIndicator: true,
      });

      console.log('[LocationContext] Attaching watchPositionAsync listener for UI updates');
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (location) => {
          if (location.coords.accuracy <= 30) {
            setCurrentLocation(location);
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
    
    try {
      const hasTask = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      if (hasTask) {
        console.log('[LocationContext] Stopping background location updates');
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }
    } catch (e) {
      console.log('[LocationContext] Error stopping background updates:', e);
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
