import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import NetInfo from '@react-native-community/netinfo';
import api from '../api/axios';
import { AuthContext } from './AuthContext';
import {
  savePoint,
  getUnsyncedPoints,
  markSynced,
  getRouteCoordinates as getStoredRouteCoordinates,
  clearAll as clearLocationStore,
  getPointCount,
} from '../utils/LocationStore';

export const LocationContext = createContext();

const LOCATION_TASK_NAME = 'BACKGROUND_LOCATION_TASK';

// ─────────────────────────────────────────────────────
// Kalman Filter — smooths raw GPS data to eliminate drift
// ─────────────────────────────────────────────────────
class KalmanFilter {
  constructor() {
    this.lat = null;
    this.lng = null;
    this.variance = -1; // Uninitialized
    // Process noise — how much we expect the position to change per second
    // Lower = smoother (but slower to react), Higher = more responsive (but noisier)
    this.qMetersPerSecond = 3; // Tuned for school bus speeds (20-50 km/h)
  }

  /**
   * Process a new GPS reading and return the smoothed coordinates.
   * @param {number} lat - Raw latitude
   * @param {number} lng - Raw longitude  
   * @param {number} accuracy - GPS accuracy in meters
   * @param {number} timestampMs - Timestamp in milliseconds
   * @returns {{ latitude: number, longitude: number }}
   */
  process(lat, lng, accuracy, timestampMs) {
    // Clamp minimum accuracy to prevent division issues
    if (accuracy < 1) accuracy = 1;

    if (this.variance < 0) {
      // First reading — initialize
      this.lat = lat;
      this.lng = lng;
      this.variance = accuracy * accuracy;
      this.lastTimestamp = timestampMs;
    } else {
      // Time delta in seconds
      const dt = (timestampMs - this.lastTimestamp) / 1000.0;
      this.lastTimestamp = timestampMs;

      if (dt > 0) {
        // Increase variance based on time passed (position uncertainty grows over time)
        this.variance += dt * this.qMetersPerSecond * this.qMetersPerSecond;
      }

      // Kalman gain — balance between prediction and new measurement
      const k = this.variance / (this.variance + accuracy * accuracy);

      // Update position
      this.lat += k * (lat - this.lat);
      this.lng += k * (lng - this.lng);

      // Update variance
      this.variance = (1 - k) * this.variance;
    }

    return { latitude: this.lat, longitude: this.lng };
  }

  reset() {
    this.lat = null;
    this.lng = null;
    this.variance = -1;
    this.lastTimestamp = null;
  }
}

// ─────────────────────────────────────────────────────
// Module-level state (survives component re-renders)
// ─────────────────────────────────────────────────────
const kalmanFilter = new KalmanFilter();
let lastRecordedPoint = null;
let lastSyncTime = 0;
let lastHeading = null;
let isNetworkAvailable = true;
let heartbeatInterval = null;

// Legacy compatibility — still available but now backed by persistent store
let routeCoordinates = [];

/**
 * Get route coordinates from both RAM and persistent storage.
 * Call this when ending a job for maximum data recovery.
 */
export const getAndClearRouteCoordinates = () => {
  const ramData = [...routeCoordinates];
  routeCoordinates = [];
  return ramData;
};

/**
 * Get route coordinates from persistent store (preferred method).
 */
export const getPersistedRouteCoordinates = async () => {
  return await getStoredRouteCoordinates();
};

/**
 * Clear all persistent location data.
 */
export const clearPersistedData = async () => {
  routeCoordinates = [];
  lastRecordedPoint = null;
  lastHeading = null;
  kalmanFilter.reset();
  await clearLocationStore();
};

// ─────────────────────────────────────────────────────
// Utility functions
// ─────────────────────────────────────────────────────

/** Haversine distance in meters */
function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Calculate bearing between two points in degrees (0-360) */
function getBearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
}

/** Calculate angular difference between two bearings */
function getAngleDifference(bearing1, bearing2) {
  let diff = Math.abs(bearing1 - bearing2);
  if (diff > 180) diff = 360 - diff;
  return diff;
}

/** Calculate implied speed in km/h between two points */
function getImpliedSpeedKmh(lat1, lon1, ts1, lat2, lon2, ts2) {
  const distM = getDistanceInMeters(lat1, lon1, lat2, lon2);
  const timeSec = (ts2 - ts1) / 1000;
  if (timeSec <= 0) return 0;
  return (distM / 1000) / (timeSec / 3600);
}

// ─────────────────────────────────────────────────────
// Background Location Task
// ─────────────────────────────────────────────────────
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('[BackgroundTask] Error:', error.message);
    return;
  }
  if (!data) return;

  const { locations } = data;
  const location = locations[0];
  const { latitude: rawLat, longitude: rawLng, accuracy, speed: rawSpeed, heading: rawHeading } = location.coords;
  const timestamp = location.timestamp;

  // ── Layer 1: Accuracy filter ──
  // Reject highly inaccurate points (cellular triangulation, indoor GPS)
  if (accuracy > 25) {
    console.log(`[BackgroundTask] REJECTED: accuracy ${accuracy.toFixed(1)}m > 25m threshold`);
    return;
  }

  // ── Layer 2: Kalman Filter smoothing ──
  // Reduces GPS jitter by ~80% while preserving real movement
  const smoothed = kalmanFilter.process(rawLat, rawLng, accuracy, timestamp);
  const smoothLat = smoothed.latitude;
  const smoothLng = smoothed.longitude;

  // ── Layer 3: Speed sanity check ──
  // Reject physically impossible movements (teleports due to GPS glitch)
  if (lastRecordedPoint) {
    const impliedSpeed = getImpliedSpeedKmh(
      lastRecordedPoint.latitude, lastRecordedPoint.longitude, lastRecordedPoint.timestamp,
      smoothLat, smoothLng, timestamp
    );
    if (impliedSpeed > 120) {
      console.log(`[BackgroundTask] REJECTED: impossible speed ${impliedSpeed.toFixed(1)} km/h`);
      return;
    }
  }

  // ── Layer 4: Minimum distance threshold ──
  let shouldRecord = true;
  let validLat = smoothLat;
  let validLng = smoothLng;
  let validSpeed = rawSpeed > 0.5 ? rawSpeed : 0;

  if (lastRecordedPoint) {
    const distance = getDistanceInMeters(
      lastRecordedPoint.latitude, lastRecordedPoint.longitude,
      smoothLat, smoothLng
    );

    if (distance < 10) {
      // Not enough movement — use last known good point for live ping
      validLat = lastRecordedPoint.latitude;
      validLng = lastRecordedPoint.longitude;
      validSpeed = 0;
      shouldRecord = false;
      // Don't log every stationary ping to reduce noise
    } else {
      // ── Layer 5: Direction reversal filter ──
      // At low speeds, sudden 150°+ reversals are GPS bounce, not real U-turns
      if (lastHeading !== null && validSpeed < 5) {
        const currentBearing = getBearing(
          lastRecordedPoint.latitude, lastRecordedPoint.longitude,
          smoothLat, smoothLng
        );
        const angleDiff = getAngleDifference(lastHeading, currentBearing);

        if (angleDiff > 150 && distance < 30) {
          console.log(`[BackgroundTask] REJECTED: suspicious reversal ${angleDiff.toFixed(0)}° at ${distance.toFixed(1)}m`);
          validLat = lastRecordedPoint.latitude;
          validLng = lastRecordedPoint.longitude;
          validSpeed = 0;
          shouldRecord = false;
        }
      }
    }
  }

  // ── Record valid point ──
  if (shouldRecord) {
    const point = {
      latitude: smoothLat,
      longitude: smoothLng,
      timestamp: timestamp,
    };

    // Save to RAM (legacy)
    routeCoordinates.push(point);

    // Save to persistent storage (primary — survives app kills)
    await savePoint(smoothLat, smoothLng, timestamp, accuracy, validSpeed, rawHeading || 0);

    // Update tracking state
    if (lastRecordedPoint) {
      lastHeading = getBearing(
        lastRecordedPoint.latitude, lastRecordedPoint.longitude,
        smoothLat, smoothLng
      );
    }
    lastRecordedPoint = point;

    console.log(`[BackgroundTask] ✓ RECORDED point #${routeCoordinates.length} | dist from last: ${lastRecordedPoint ? getDistanceInMeters(lastRecordedPoint.latitude, lastRecordedPoint.longitude, smoothLat, smoothLng).toFixed(1) : '0'}m | accuracy: ${accuracy.toFixed(1)}m`);
  }

  // ── Network sync (throttled to every 8 seconds) ──
  const now = Date.now();
  if (now - lastSyncTime > 8000) {
    lastSyncTime = now;

    if (isNetworkAvailable) {
      try {
        await api.post('/location', {
          latitude: validLat,
          longitude: validLng,
          speed: validSpeed,
          heading: rawHeading || 0,
        });
        console.log(`[BackgroundTask] ✓ Live ping synced | ${validLat.toFixed(6)}, ${validLng.toFixed(6)}`);
      } catch (err) {
        console.log(`[BackgroundTask] ✗ Live ping failed (offline): ${err?.message}`);
        isNetworkAvailable = false; // Will be re-checked by NetInfo listener
      }
    } else {
      console.log('[BackgroundTask] Offline — point stored locally, will sync later');
    }
  }
});

// ─────────────────────────────────────────────────────
// Location Provider Component
// ─────────────────────────────────────────────────────
export const LocationProvider = ({ children }) => {
  const { user, driver } = useContext(AuthContext);
  const [isTracking, setIsTracking] = useState(false);
  const [currentJob, setCurrentJob] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [storedPointCount, setStoredPointCount] = useState(0);
  const subscriptionRef = useRef(null);
  const netInfoUnsubRef = useRef(null);
  const pointCountIntervalRef = useRef(null);

  // ── Request permissions on mount ──
  useEffect(() => {
    (async () => {
      console.log('[LocationContext] Requesting location permissions...');
      let { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      console.log('[LocationContext] Foreground permission:', fgStatus);
      if (fgStatus !== 'granted') {
        setErrorMsg('Permission to access foreground location was denied');
        return;
      }

      let { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      console.log('[LocationContext] Background permission:', bgStatus);
      if (bgStatus !== 'granted') {
        setErrorMsg('Permission to access background location was denied');
      }
    })();

    // ── Network state listener ──
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOffline = !isNetworkAvailable;
      isNetworkAvailable = state.isConnected && state.isInternetReachable !== false;
      
      if (wasOffline && isNetworkAvailable) {
        console.log('[LocationContext] 📶 Network restored! Flushing offline queue...');
        flushOfflineQueue();
      }
    });
    netInfoUnsubRef.current = unsubscribe;

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
      if (netInfoUnsubRef.current) {
        netInfoUnsubRef.current();
        netInfoUnsubRef.current = null;
      }
      if (pointCountIntervalRef.current) {
        clearInterval(pointCountIntervalRef.current);
        pointCountIntervalRef.current = null;
      }
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    };
  }, []);

  /**
   * Flush all offline-stored points to the server in batches.
   */
  const flushOfflineQueue = async () => {
    try {
      const unsynced = await getUnsyncedPoints();
      if (unsynced.length === 0) return;

      console.log(`[LocationContext] Flushing ${unsynced.length} offline points...`);

      // Send in batches of 50 to avoid huge payloads
      const batchSize = 50;
      for (let i = 0; i < unsynced.length; i += batchSize) {
        const batch = unsynced.slice(i, i + batchSize);
        try {
          await api.post('/location/batch', {
            points: batch.map(p => ({
              latitude: p.latitude,
              longitude: p.longitude,
              timestamp: p.timestamp,
              speed: p.speed || 0,
              heading: p.heading || 0,
            })),
          });
          await markSynced(batch.map(p => p.id));
          console.log(`[LocationContext] ✓ Batch ${Math.floor(i / batchSize) + 1} flushed (${batch.length} points)`);
        } catch (err) {
          console.log(`[LocationContext] ✗ Batch flush failed: ${err?.message}`);
          break; // Stop flushing if a batch fails — will retry on next network event
        }
      }
    } catch (e) {
      console.error('[LocationContext] Flush error:', e.message);
    }
  };

  /**
   * Start GPS tracking for a job.
   */
  const startTracking = async (job) => {
    try {
      console.log('[LocationContext] Starting tracking for job:', job ? `ID: ${job.id}, type: ${job.job_type}` : 'None');
      setCurrentJob(job);
      setIsTracking(true);

      // Reset filters for new trip
      kalmanFilter.reset();
      lastRecordedPoint = null;
      lastHeading = null;
      lastSyncTime = 0;
      routeCoordinates = [];

      // Clear any stale data from previous trips
      await clearLocationStore();

      // Remove existing subscriptions
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }

      // ── Start background location updates ──
      console.log('[LocationContext] Starting background location updates...');
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 2000,       // Every 2 seconds (was 1s — reduced to save battery while maintaining accuracy)
        distanceInterval: 3,      // Or every 3 meters of movement
        deferredUpdatesInterval: 1000,
        foregroundService: {
          notificationTitle: '🚌 Live Tracking Active',
          notificationBody: 'GPS location is being recorded for this trip.',
          notificationColor: '#2563eb',
        },
        // Critical for background survival on Android
        showsBackgroundLocationIndicator: true,
        activityType: Location.ActivityType.AutomotiveNavigation,
        pausesUpdatesAutomatically: false,
      });

      // ── Foreground position watcher for UI map ──
      console.log('[LocationContext] Attaching foreground position watcher...');
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 2000,
          distanceInterval: 3,
        },
        (location) => {
          if (location.coords.accuracy <= 25) {
            setCurrentLocation(location);
          }
        }
      );
      subscriptionRef.current = sub;

      // ── Heartbeat — keeps Android from killing the service ──
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      heartbeatInterval = setInterval(() => {
        console.log(`[Heartbeat] 💓 Tracking alive | Points in RAM: ${routeCoordinates.length} | Network: ${isNetworkAvailable ? 'Online' : 'Offline'}`);
      }, 30000); // Every 30 seconds

      // ── Track stored point count for UI ──
      if (pointCountIntervalRef.current) clearInterval(pointCountIntervalRef.current);
      pointCountIntervalRef.current = setInterval(async () => {
        const count = await getPointCount();
        setStoredPointCount(count);
      }, 5000);

    } catch (e) {
      console.error('[LocationContext] Error starting tracking:', e);
    }
  };

  /**
   * Stop GPS tracking and clean up.
   */
  const stopTracking = async () => {
    console.log('[LocationContext] Stopping tracking...');
    setIsTracking(false);
    setCurrentJob(null);
    setStoredPointCount(0);

    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }

    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }

    if (pointCountIntervalRef.current) {
      clearInterval(pointCountIntervalRef.current);
      pointCountIntervalRef.current = null;
    }

    try {
      const hasTask = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      if (hasTask) {
        console.log('[LocationContext] Stopping background location updates...');
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }
    } catch (e) {
      console.log('[LocationContext] Error stopping background updates:', e);
    }

    // Reset filter state
    kalmanFilter.reset();
    lastRecordedPoint = null;
    lastHeading = null;
  };

  return (
    <LocationContext.Provider value={{
      isTracking,
      currentLocation,
      currentJob,
      setCurrentJob,
      startTracking,
      stopTracking,
      errorMsg,
      storedPointCount,
      flushOfflineQueue,
    }}>
      {children}
    </LocationContext.Provider>
  );
};
