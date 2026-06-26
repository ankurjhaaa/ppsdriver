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

const COMPLETED_TRIPS_KEY = '@pps_completed_trips';
let pointIdCounter = 0;

const getJobKey = (jobId) => `@pps_trip_${jobId}`;

/**
 * Save a GPS point to persistent storage for a specific job.
 */
export async function savePoint(jobId, latitude, longitude, timestamp, accuracy = 0, speed = 0, heading = 0) {
  if (!jobId) return null;
  
  try {
    const key = getJobKey(jobId);
    const existing = await AsyncStorage.getItem(key);
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

    // Store unlimited points as requested by the user
    await AsyncStorage.setItem(key, JSON.stringify(points));

    return point;
  } catch (e) {
    console.error('[LocationStore] Failed to save point:', e.message);
    return null;
  }
}

/**
 * Get all unsynced points for a specific job.
 */
export async function getUnsyncedPoints(jobId) {
  if (!jobId) return [];
  try {
    const existing = await AsyncStorage.getItem(getJobKey(jobId));
    if (!existing) return [];
    const points = JSON.parse(existing);
    return points.filter(p => !p.synced);
  } catch (e) {
    return [];
  }
}

/**
 * Mark specific point IDs as synced for a specific job.
 */
export async function markSynced(jobId, ids) {
  if (!jobId) return;
  try {
    const key = getJobKey(jobId);
    const existing = await AsyncStorage.getItem(key);
    if (!existing) return;
    
    const points = JSON.parse(existing);
    const idSet = new Set(ids);
    for (const point of points) {
      if (idSet.has(point.id)) {
        point.synced = true;
      }
    }
    await AsyncStorage.setItem(key, JSON.stringify(points));
  } catch (e) {
    console.error('[LocationStore] Failed to mark synced:', e.message);
  }
}

/**
 * Get ALL route coordinates for a specific job (synced + unsynced) 
 * Used for full map sync to the backend.
 */
export async function getRouteCoordinates(jobId) {
  if (!jobId) return [];
  try {
    const existing = await AsyncStorage.getItem(getJobKey(jobId));
    if (!existing) return [];
    const points = JSON.parse(existing);
    return points
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(p => ({
        latitude: p.latitude,
        longitude: p.longitude,
        timestamp: p.timestamp,
      }));
  } catch (e) {
    return [];
  }
}

/**
 * Get total point count for a job (UI display).
 */
export async function getPointCount(jobId) {
  if (!jobId) return 0;
  try {
    const existing = await AsyncStorage.getItem(getJobKey(jobId));
    if (!existing) return 0;
    return JSON.parse(existing).length;
  } catch (e) {
    return 0;
  }
}

/**
 * Check if the given job has any stored points.
 */
export async function hasStoredPoints(jobId) {
  return (await getPointCount(jobId)) > 0;
}

/**
 * Mark a job as completed and retain latest 10 trips locally.
 * Oldest trips beyond 10 are auto-deleted to save phone storage.
 */
export async function markJobCompleteAndRetain(jobId) {
  if (!jobId) return;
  const id = String(jobId); // Normalize to string (API sends number, AsyncStorage sends string)
  try {
    const existing = await AsyncStorage.getItem(COMPLETED_TRIPS_KEY);
    let completedJobs = existing ? JSON.parse(existing) : [];

    // Avoid duplicates (compare as strings)
    if (!completedJobs.map(String).includes(id)) {
      completedJobs.push(id);
    }

    // Keep only the latest 10 completed trips
    if (completedJobs.length > 10) {
      const jobsToRemove = completedJobs.slice(0, completedJobs.length - 10);
      completedJobs = completedJobs.slice(-10);

      // Delete GPS data of older trips to free storage
      for (const oldJobId of jobsToRemove) {
        await AsyncStorage.removeItem(getJobKey(oldJobId));
      }
      console.log(`[LocationStore] Cleaned up ${jobsToRemove.length} old trip(s)`);
    }

    await AsyncStorage.setItem(COMPLETED_TRIPS_KEY, JSON.stringify(completedJobs));
    console.log(`[LocationStore] Retained job ${id}. Total stored trips: ${completedJobs.length}`);
  } catch (e) {
    console.error('[LocationStore] Failed to mark job complete:', e.message);
  }
}

/**
 * Get all completed trip IDs currently stored locally.
 */
export async function getCompletedTripIds() {
  try {
    const existing = await AsyncStorage.getItem(COMPLETED_TRIPS_KEY);
    return existing ? JSON.parse(existing) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Remove a completed trip ID from the registry and delete its data.
 * Call this after successfully syncing the geometry to the backend.
 */
export async function removeCompletedTripId(jobId) {
  try {
    const existing = await AsyncStorage.getItem(COMPLETED_TRIPS_KEY);
    if (!existing) return;
    
    let completedJobs = JSON.parse(existing);
    completedJobs = completedJobs.filter(id => id !== jobId);
    
    await AsyncStorage.setItem(COMPLETED_TRIPS_KEY, JSON.stringify(completedJobs));
    await AsyncStorage.removeItem(getJobKey(jobId));
    console.log(`[LocationStore] Removed successfully synced trip ${jobId}. Remaining: ${completedJobs.length}`);
  } catch (e) {
    console.error('[LocationStore] Failed to remove completed trip:', e.message);
  }
}

/**
 * Verify if a specific job ID exists in local storage.
 */
export async function isJobLocallyStored(jobId) {
  if (!jobId) return false;
  try {
    const count = await getPointCount(jobId);
    return count > 0;
  } catch (e) {
    return false;
  }
}

/**
 * Clear all local storage manually (if needed for debugging).
 */
export async function clearAllLocalData() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const tripKeys = keys.filter(k => k.startsWith('@pps_trip_') || k === COMPLETED_TRIPS_KEY);
    if (tripKeys.length > 0) {
      await AsyncStorage.multiRemove(tripKeys);
    }
  } catch (e) {
    console.error('[LocationStore] Failed to clear all:', e.message);
  }
}
