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
      let { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== 'granted') {
        setErrorMsg('Permission to access foreground location was denied');
        return;
      }

      let { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus !== 'granted') {
        setErrorMsg('Permission to access background location was denied');
      }
    })();

    // Cleanup on unmount
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
    };
  }, []);

  const startTracking = async (job) => {
    try {
      setCurrentJob(job);
      setIsTracking(true);
      
      // Clear any existing subscription
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 0,
        },
        async (location) => {
          setCurrentLocation(location);
          
          // Sync location to backend
          if (job) {
            try {
              await api.post('/location', {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                speed: location.coords.speed,
                heading: location.coords.heading,
              });
            } catch (err) {
              console.log('Location sync failed', err);
            }
          }
        }
      );
      subscriptionRef.current = sub;
    } catch (e) {
      console.log('Error starting tracking:', e);
    }
  };

  const stopTracking = async () => {
    setIsTracking(false);
    setCurrentJob(null);
    if (subscriptionRef.current) {
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
