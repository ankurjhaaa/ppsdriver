/**
 * LocationStore — Persistent offline location queue using AsyncStorage.
 * 
 * Every GPS point is saved locally FIRST before any network call.
 * This ensures zero data loss even if the app is killed, network drops, or phone sleeps.
 * 
 * Storage key: @pps_location_queue
 * Each point: { id, latitude, longitude, timestamp, accuracy, speed, heading, synced }
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@pps_location_queue';
const PENDING_SYNC_KEY = '@pps_pending_sync';

let pointIdCounter = 0;

/**
 * Save a GPS point to persistent storage.
 */
export async function savePoint(latitude, longitude, timestamp, accuracy = 0, speed = 0, heading = 0) {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    const points = existing ? JSON.parse(existing) : [];

    pointIdCounter++;
    const point = {
      id: `${Date.now()}_${pointIdCounter}`,
      latitude,
      longitude,
      timestamp,
      accuracy,
      speed,
      heading,
      synced: false,
    };

    points.push(point);

    // Keep max 5000 points in storage to prevent memory issues on very long trips
    // (5000 points × 1 per second = ~83 minutes of continuous tracking)
    if (points.length > 5000) {
      // Remove oldest synced points first
      const synced = points.filter(p => p.synced);
      const unsynced = points.filter(p => !p.synced);
      
      if (synced.length > 1000) {
        // Remove oldest 500 synced points
        synced.splice(0, 500);
      }
      const trimmed = [...synced, ...unsynced];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } else {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(points));
    }

    return point;
  } catch (e) {
    console.error('[LocationStore] Failed to save point:', e.message);
    return null;
  }
}

/**
 * Get all unsynced points (for network flush).
 */
export async function getUnsyncedPoints() {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    if (!existing) return [];
    const points = JSON.parse(existing);
    return points.filter(p => !p.synced);
  } catch (e) {
    console.error('[LocationStore] Failed to get unsynced:', e.message);
    return [];
  }
}

/**
 * Mark specific point IDs as synced.
 */
export async function markSynced(ids) {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    if (!existing) return;
    const points = JSON.parse(existing);
    const idSet = new Set(ids);
    for (const point of points) {
      if (idSet.has(point.id)) {
        point.synced = true;
      }
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(points));
  } catch (e) {
    console.error('[LocationStore] Failed to mark synced:', e.message);
  }
}

/**
 * Get ALL route coordinates (synced + unsynced) for job end submission.
 * Returns in chronological order with only lat/lng/timestamp.
 */
export async function getRouteCoordinates() {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    if (!existing) return [];
    const points = JSON.parse(existing);
    // Sort by timestamp and return clean coordinate objects
    return points
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(p => ({
        latitude: p.latitude,
        longitude: p.longitude,
        timestamp: p.timestamp,
      }));
  } catch (e) {
    console.error('[LocationStore] Failed to get route coordinates:', e.message);
    return [];
  }
}

/**
 * Get total point count (for UI display/debugging).
 */
export async function getPointCount() {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    if (!existing) return 0;
    return JSON.parse(existing).length;
  } catch (e) {
    return 0;
  }
}

/**
 * Clear all stored points (call after successful job end).
 */
export async function clearAll() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    await AsyncStorage.removeItem(PENDING_SYNC_KEY);
    pointIdCounter = 0;
    console.log('[LocationStore] All points cleared.');
  } catch (e) {
    console.error('[LocationStore] Failed to clear:', e.message);
  }
}

/**
 * Check if there are any stored points (to detect interrupted trips on app restart).
 */
export async function hasStoredPoints() {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    if (!existing) return false;
    return JSON.parse(existing).length > 0;
  } catch (e) {
    return false;
  }
}
