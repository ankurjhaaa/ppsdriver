import React, { createContext, useState, useEffect, useContext } from 'react';
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
  }, []);

  // Define the background task if not already defined
  // (Usually done outside component, but putting setup here for simplicity)
  
  const startTracking = async (job) => {
    try {
      setCurrentJob(job);
      setIsTracking(true);
      
      // Start foreground tracking for UI updates
      await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
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
    } catch (e) {
      console.log('Error starting tracking:', e);
    }
  };

  const stopTracking = async () => {
    setIsTracking(false);
    setCurrentJob(null);
    // Location tracking stops when component unmounts or we manage subscription
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
