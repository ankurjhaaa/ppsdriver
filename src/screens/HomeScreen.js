import React, { useContext, useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, StyleSheet, Alert, Modal, TextInput, Animated, TouchableWithoutFeedback, Image, ActivityIndicator, Linking, AppState } from 'react-native';
import * as Location from 'expo-location';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bus, MapPin, Wallet, NavigationArrow, CheckCircle, Users, CaretRight, ArrowsClockwise } from 'phosphor-react-native';
import { AuthContext } from '../context/AuthContext';
import { LocationContext } from '../context/LocationContext';
import { getCompletedTripIds, getRouteCoordinates } from '../utils/LocationStore';
import api from '../api/axios';
import { CameraView, useCameraPermissions } from 'expo-camera';
import CurvedHeader from '../components/CurvedHeader';
import { useFocusEffect } from '@react-navigation/native';

export default function HomeScreen({ navigation }) {
  const { user, driver } = useContext(AuthContext);
  const { currentJob, startTracking, stopTracking } = useContext(LocationContext);
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [routeModalVisible, setRouteModalVisible] = useState(false);
  const [otherTripModalVisible, setOtherTripModalVisible] = useState(false);
  const [tripDirectionModalVisible, setTripDirectionModalVisible] = useState(false);
  const [selectedRouteForDirection, setSelectedRouteForDirection] = useState(null);
  const [tripReason, setTripReason] = useState('');
  const [isStartingJob, setIsStartingJob] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState(0);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [showFaceScan, setShowFaceScan] = useState(false);
  const [pendingJobParams, setPendingJobParams] = useState(null);
  const [cameraFacing, setCameraFacing] = useState('front');
  const cameraRef = React.useRef(null);

  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [permState, setPermState] = useState({ fg: true, bg: true });

  const routeModalY = React.useRef(new Animated.Value(600)).current;
  const otherTripModalY = React.useRef(new Animated.Value(600)).current;
  const tripDirectionModalY = React.useRef(new Animated.Value(600)).current;

  const openRouteModal = () => { setRouteModalVisible(true); routeModalY.setValue(600); };
  const startRouteSlideUp = () => { Animated.timing(routeModalY, { toValue: 0, duration: 300, useNativeDriver: true }).start(); };
  const closeRouteModal = () => { Animated.timing(routeModalY, { toValue: 600, duration: 250, useNativeDriver: true }).start(() => setRouteModalVisible(false)); };

  const openOtherTripModal = () => { setOtherTripModalVisible(true); otherTripModalY.setValue(600); };
  const startOtherTripSlideUp = () => { Animated.timing(otherTripModalY, { toValue: 0, duration: 300, useNativeDriver: true }).start(); };
  const closeOtherTripModal = () => { Animated.timing(otherTripModalY, { toValue: 600, duration: 250, useNativeDriver: true }).start(() => setOtherTripModalVisible(false)); };

  const openTripDirectionModal = (route) => { setSelectedRouteForDirection(route); setTripDirectionModalVisible(true); tripDirectionModalY.setValue(600); };
  const startTripDirectionSlideUp = () => { Animated.timing(tripDirectionModalY, { toValue: 0, duration: 300, useNativeDriver: true }).start(); };
  const closeTripDirectionModal = () => { Animated.timing(tripDirectionModalY, { toValue: 600, duration: 250, useNativeDriver: true }).start(() => { setTripDirectionModalVisible(false); setTimeout(() => setSelectedRouteForDirection(null), 300); }); };

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/dashboard');
      setDashboardData(response.data);
      if (response.data.active_job) {
        if (!currentJob) startTracking(response.data.active_job);
      } else {
        if (currentJob) stopTracking();
      }
    } catch (e) {
      console.log('[HomeScreen] Error fetching dashboard:', e.message);
    }
  };

  const checkPermissions = async () => {
    const fg = await Location.getForegroundPermissionsAsync();
    let bgStatus = false;
    if (fg.status === 'granted') {
      const bg = await Location.getBackgroundPermissionsAsync();
      bgStatus = (bg.status === 'granted');
    }
    
    if (fg.status !== 'granted' || !bgStatus) {
      setPermState({ fg: fg.status === 'granted', bg: bgStatus });
      setPermissionModalVisible(true);
      return false;
    }
    return true;
  };

  useEffect(() => { 
    fetchDashboard(); 
    checkPermissions();
    checkUnsyncedTrips();
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkUnsyncedTrips();
    }, [])
  );

  const checkUnsyncedTrips = async () => {
    const ids = await getCompletedTripIds();
    setUnsyncedCount(ids.length);
  };

  const handleBulkSync = async () => {
    if (currentJob) {
      Alert.alert('Trip Active', 'You cannot sync routes while a trip is currently active. Please end the trip first.');
      return;
    }

    const ids = await getCompletedTripIds();
    if (ids.length === 0) {
      Alert.alert('No Trips', 'No completed trips found to sync.');
      return;
    }

    setSyncing(true);
    let successCount = 0;

    try {
      for (const jobId of ids) {
        const points = await getRouteCoordinates(jobId);
        if (points.length > 0) {
          await api.post(`/job/${jobId}/sync-geometry`, { points });
          successCount++;
        }
      }
      Alert.alert('Sync Complete', `Successfully synced ${successCount} route(s) to the server.`);
    } catch (e) {
      console.log('[HomeScreen] Sync error:', e.message);
      Alert.alert('Sync Error', `Failed to sync all routes. Synced ${successCount} before error occurred.`);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active' && permissionModalVisible) {
        checkPermissions().then(hasPerms => {
          if (hasPerms) setPermissionModalVisible(false);
        });
      }
    });
    return () => subscription.remove();
  }, [permissionModalVisible]);

  const onRefresh = async () => { setRefreshing(true); await fetchDashboard(); checkPermissions(); await checkUnsyncedTrips(); setRefreshing(false); };

  const proceedToStartJob = async (route, isManual = false, reason = null, tripDirection = null, facePhoto = null) => {
    setIsVerifying(true);
    setVerificationError(null);
    try {
      const vehicleId = route ? route.vehicle_id : (dashboardData?.todays_routes?.[0]?.vehicle_id || null);
      if (!vehicleId) {
        setVerificationError('You need an assigned vehicle to start a job.');
        setIsVerifying(false);
        return;
      }
      let location;
      try {
        location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      } catch {
        setVerificationError('Enable location services to proceed.');
        setIsVerifying(false);
        return;
      }

      const payload = {
        vehicle_id: vehicleId,
        job_type: isManual ? 'manual' : 'route',
        route_id: route ? route.id : null,
        trip_direction: tripDirection,
        reason,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        face_photo: facePhoto,
      };

      const response = await api.post('/job/start', payload);

      if (response.data.attendance_marked) {
        Alert.alert('Attendance Marked', 'Your attendance for today has been marked successfully.');
      }

      // Success: Clear scanner states and close modal
      setShowFaceScan(false);
      setPendingJobParams(null);
      setCapturedPhoto(null);
      setVerificationError(null);

      startTracking(response.data.job);
      setTimeout(() => {
        navigation.navigate('ActiveJob');
      }, 150);
    } catch (e) {
      setVerificationError(e.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const capturePhoto = async () => {
    if (cameraRef.current && !capturedPhoto && !isVerifying) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
        setCapturedPhoto(photo.base64);
        proceedToStartJob(
          pendingJobParams.route,
          pendingJobParams.isManual,
          pendingJobParams.reason,
          pendingJobParams.tripDirection,
          photo.base64
        );
      } catch (e) {
        setVerificationError('Failed to capture photo. Try again.');
      }
    }
  };

  const initiateJobStart = async (route, isManual = false, reason = null, tripDirection = null) => {
    if (!cameraPermission?.granted) {
      const p = await requestCameraPermission();
      if (!p.granted) {
        Alert.alert('Permission Denied', 'Camera permission is required to start a trip.');
        return;
      }
    }
    setPendingJobParams({ route, isManual, reason, tripDirection });
    setCapturedPhoto(null);
    setVerificationError(null);
    setShowFaceScan(true);
  };

  const handleStartRouteJob = (route) => {
    openTripDirectionModal(route);
  };

  const startNewJob = async (type) => {
    if (currentJob) { Alert.alert('Job in Progress', 'You already have an active job.'); return; }
    
    // Check permissions before opening any modal
    const hasPerms = await checkPermissions();
    if (!hasPerms) return;

    if (type === 'other') { openOtherTripModal(); return; }
    const routes = dashboardData?.todays_routes || [];
    if (routes.length === 0) { Alert.alert('No Routes', 'No routes assigned for today.'); return; }
    openRouteModal();
  };

  // Time-based greeting
  const hour = new Date().getHours();
  const greetText = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  if (isStartingJob) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FDB813" />
        <Text style={styles.loadingText}>Starting Trip & Initializing GPS...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <CurvedHeader
        isHome={true}
        rightComponent={
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'D'}</Text>
          </View>
        }
      />

      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FDB813']} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome & Sync */}
          <View style={styles.welcomeSection}>
            <View>
              <Text style={styles.greeting}>{greetText},</Text>
              <Text style={styles.name}>{user?.name} 👋</Text>
            </View>
            <TouchableOpacity 
              style={[styles.syncButton, currentJob ? styles.syncButtonDisabled : null]} 
              onPress={handleBulkSync}
              activeOpacity={0.6}
              disabled={syncing || !!currentJob}
            >
              {syncing ? (
                <ActivityIndicator size="small" color="#0A1931" />
              ) : (
                <ArrowsClockwise color="#0A1931" size={24} weight="bold" />
              )}
            </TouchableOpacity>
          </View>

          {/* Active Job / Start Job Section */}
          {currentJob ? (
            <TouchableOpacity
              style={styles.activeJobBanner}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('ActiveJob')}
            >
              <View style={styles.activeJobIcon}>
                <NavigationArrow color="#0A1931" size={22} weight="fill" />
              </View>
              <View style={styles.activeJobInfo}>
                <Text style={styles.activeJobTitle}>{currentJob.job_type === 'route' ? 'School Route Active' : 'Trip Active'}</Text>
                <Text style={styles.activeJobDesc}>Tap to view live tracking →</Text>
              </View>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.startJobSection}>
              <Text style={styles.sectionTitle}>START A TRIP</Text>
              <View style={styles.startJobButtons}>
                <TouchableOpacity style={styles.routeBtn} onPress={() => startNewJob('route')} activeOpacity={0.85}>
                  <View style={styles.startBtnIconWrap}>
                    <Bus color="#fff" size={28} weight="fill" />
                  </View>
                  <Text style={styles.startBtnTitle}>School Route</Text>
                  <Text style={styles.startBtnSub}>Pick up / Drop students</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.otherBtn} onPress={() => startNewJob('other')} activeOpacity={0.85}>
                  <View style={styles.startBtnIconWrapYellow}>
                    <MapPin color="#0A1931" size={28} weight="fill" />
                  </View>
                  <Text style={styles.startBtnTitleDark}>Other Trip</Text>
                  <Text style={styles.startBtnSubDark}>Fuel, Service etc.</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Stats Grid */}
          <Text style={styles.sectionTitle}>TODAY'S OVERVIEW</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { borderLeftColor: '#FDB813', borderLeftWidth: 3 }]}>
              <Wallet color="#FDB813" size={20} weight="fill" />
              <Text style={styles.statLabel}>Wallet</Text>
              <Text style={[styles.statValue, (dashboardData?.wallet_balance || 0) < 0 ? { color: '#dc2626' } : { color: '#059669' }]}>
                ₹{dashboardData?.wallet_balance?.toLocaleString() || 0}
              </Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: '#3b82f6', borderLeftWidth: 3 }]}>
              <MapPin color="#3b82f6" size={20} weight="fill" />
              <Text style={styles.statLabel}>Distance</Text>
              <Text style={styles.statValue}>{dashboardData?.total_km_today || 0} km</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: '#8b5cf6', borderLeftWidth: 3 }]}>
              <CheckCircle color="#8b5cf6" size={20} weight="fill" />
              <Text style={styles.statLabel}>Trips</Text>
              <Text style={styles.statValue}>{dashboardData?.total_jobs_today || 0}</Text>
            </View>
            <TouchableOpacity style={[styles.statCard, { borderLeftColor: '#0A1931', borderLeftWidth: 3 }]} onPress={() => navigation.navigate('RoutesTab')} activeOpacity={0.8}>
              <Bus color="#0A1931" size={20} weight="fill" />
              <Text style={styles.statLabel}>Routes</Text>
              <Text style={styles.statValue}>{dashboardData?.todays_routes?.length || 0}</Text>
            </TouchableOpacity>
          </View>

          {/* Assigned Routes */}
          <Text style={styles.sectionTitle}>ASSIGNED ROUTES</Text>
          {dashboardData?.todays_routes?.length > 0 ? (
            dashboardData.todays_routes.map((route, i) => (
              <View key={i} style={styles.routeCard}>
                <View style={styles.routeHeader}>
                  <View style={styles.routeIconWrap}>
                    <Bus color="#0A1931" size={18} weight="fill" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.routeName}>{route.route_name}</Text>
                    {route.vehicle && <Text style={styles.vehicleText}>{route.vehicle.vehicle_number}</Text>}
                  </View>
                  <View style={styles.studentCountBadge}>
                    <Users color="#64748b" size={14} />
                    <Text style={styles.studentCountText}>{route.students?.length || 0}</Text>
                  </View>
                </View>
                {route.stops && route.stops.length > 0 && (
                  <View style={styles.stopsContainer}>
                    {route.stops.slice(0, 4).map((stop, idx) => (
                      <React.Fragment key={idx}>
                        <View style={styles.stopBadge}><Text style={styles.stopText}>{stop}</Text></View>
                        {idx < Math.min(route.stops.length - 1, 3) && <Text style={styles.stopArrow}>→</Text>}
                      </React.Fragment>
                    ))}
                    {route.stops.length > 4 && <Text style={styles.stopMore}>+{route.stops.length - 4}</Text>}
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <MapPin color="#cbd5e1" size={36} weight="fill" />
              <Text style={styles.emptyText}>No routes assigned yet</Text>
            </View>
          )}
        </ScrollView>

        {/* Route Selection Modal */}
        <Modal visible={routeModalVisible} transparent animationType="fade" onRequestClose={closeRouteModal} onShow={startRouteSlideUp}>
          <TouchableOpacity activeOpacity={1} style={styles.modalOverlay} onPress={closeRouteModal}>
            <TouchableWithoutFeedback>
              <Animated.View style={[styles.modalContent, { transform: [{ translateY: routeModalY }], paddingBottom: Math.max(40, insets.bottom + 20) }]}>
                <View style={styles.dragHandle} />
                <Text style={styles.modalTitle}>Select School Route</Text>
                <ScrollView style={styles.modalRouteList}>
                  {dashboardData?.todays_routes?.map((route, i) => (
                    <TouchableOpacity key={route.id || i} style={styles.routeCard} activeOpacity={0.7}
                      onPress={() => { closeRouteModal(); handleStartRouteJob(route); }}>
                      <View style={styles.routeHeader}>
                        <View style={[styles.routeIconWrap, { backgroundColor: 'rgba(10, 25, 49, 0.05)' }]}>
                          <Bus color="#0A1931" size={18} weight="fill" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.routeName}>{route.route_name}</Text>
                          {route.vehicle && <Text style={styles.vehicleText}>{route.vehicle.vehicle_number}</Text>}
                        </View>
                        <View style={styles.studentCountBadge}>
                          <Users color="#64748b" size={14} />
                          <Text style={styles.studentCountText}>{route.students?.length || 0}</Text>
                        </View>
                      </View>
                      {route.stops && route.stops.length > 0 && (
                        <View style={[styles.stopsContainer, { marginBottom: 12 }]}>
                          {route.stops.slice(0, 4).map((stop, idx) => (
                            <React.Fragment key={idx}>
                              <View style={[styles.stopBadge, { backgroundColor: 'rgba(10, 25, 49, 0.05)' }]}><Text style={[styles.stopText, { color: '#0A1931' }]}>{stop}</Text></View>
                              {idx < Math.min(route.stops.length - 1, 3) && <Text style={styles.stopArrow}>→</Text>}
                            </React.Fragment>
                          ))}
                          {route.stops.length > 4 && <Text style={styles.stopMore}>+{route.stops.length - 4}</Text>}
                        </View>
                      )}
                      <View style={{ backgroundColor: '#FDB813', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 5 }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#0A1931' }}>Select this route →</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Animated.View>
            </TouchableWithoutFeedback>
          </TouchableOpacity>
        </Modal>

        {/* Trip Direction Modal */}
        <Modal visible={tripDirectionModalVisible} transparent animationType="fade" onRequestClose={closeTripDirectionModal} onShow={startTripDirectionSlideUp}>
          <TouchableOpacity activeOpacity={1} style={styles.modalOverlay} onPress={closeTripDirectionModal}>
            <TouchableWithoutFeedback>
              <Animated.View style={[styles.modalContent, { transform: [{ translateY: tripDirectionModalY }], paddingBottom: Math.max(40, insets.bottom + 20) }]}>
                <View style={styles.dragHandle} />
                <Text style={styles.modalTitle}>Select Trip Type</Text>
                <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 20, marginTop: -10 }}>For route: {selectedRouteForDirection?.route_name}</Text>

                <TouchableOpacity style={styles.directionCard} activeOpacity={0.8}
                  onPress={() => { closeTripDirectionModal(); initiateJobStart(selectedRouteForDirection, false, null, 'to_school'); }}>
                  <View style={[styles.directionIconWrap, { backgroundColor: 'rgba(10, 25, 49, 0.08)' }]}><Bus color="#0A1931" size={24} weight="fill" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.directionTitle}>Morning Pickup</Text>
                    <Text style={styles.directionSub}>Bringing students to school</Text>
                  </View>
                  <CaretRight color="#cbd5e1" size={20} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.directionCard} activeOpacity={0.8}
                  onPress={() => { closeTripDirectionModal(); initiateJobStart(selectedRouteForDirection, false, null, 'from_school'); }}>
                  <View style={[styles.directionIconWrap, { backgroundColor: 'rgba(253, 184, 19, 0.2)' }]}><MapPin color="#0A1931" size={24} weight="fill" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.directionTitle}>Evening Drop-off</Text>
                    <Text style={styles.directionSub}>Taking students back home</Text>
                  </View>
                  <CaretRight color="#cbd5e1" size={20} />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.modalStartBtn, { backgroundColor: '#f1f5f9', marginTop: 10 }]} onPress={closeTripDirectionModal}>
                  <Text style={[styles.modalStartBtnText, { color: '#64748b' }]}>Cancel</Text>
                </TouchableOpacity>
              </Animated.View>
            </TouchableWithoutFeedback>
          </TouchableOpacity>
        </Modal>

        {/* Other Trip Modal */}
        <Modal visible={otherTripModalVisible} transparent animationType="fade" onRequestClose={closeOtherTripModal} onShow={startOtherTripSlideUp}>
          <TouchableOpacity activeOpacity={1} style={styles.modalOverlay} onPress={closeOtherTripModal}>
            <TouchableWithoutFeedback>
              <Animated.View style={[styles.modalContent, { transform: [{ translateY: otherTripModalY }], paddingBottom: Math.max(40, insets.bottom + 20) }]}>
                <View style={styles.dragHandle} />
                <Text style={styles.modalTitle}>Other Trip Details</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Fuel Refill, Servicing..."
                  placeholderTextColor="#94a3b8"
                  value={tripReason}
                  onChangeText={setTripReason}
                />
                <TouchableOpacity style={styles.modalStartBtn} onPress={() => {
                  if (!tripReason.trim()) { Alert.alert('Required', 'Please enter a reason.'); return; }
                  closeOtherTripModal(); initiateJobStart(null, true, tripReason.trim()); setTripReason('');
                }}>
                  <Text style={styles.modalStartBtnText}>Start Trip</Text>
                </TouchableOpacity>
              </Animated.View>
            </TouchableWithoutFeedback>
          </TouchableOpacity>
        </Modal>

        {/* Face Scan Modal */}
        <Modal visible={showFaceScan} transparent animationType="slide">
          <View style={styles.cameraModalContainer}>
            <View style={styles.cameraHeader}>
              <Text style={styles.cameraTitle}>Face Verification</Text>
              <Text style={styles.cameraSub}>Please capture your face to mark attendance</Text>
            </View>
            <View style={styles.cameraWrapper}>
              {capturedPhoto ? (
                <View style={styles.cameraView}>
                  <Image source={{ uri: `data:image/jpeg;base64,${capturedPhoto}` }} style={styles.cameraView} />
                  {isVerifying && (
                    <View style={styles.verifyingOverlay}>
                      <ActivityIndicator size="large" color="#FDB813" />
                      <Text style={styles.verifyingText}>Verifying Face...</Text>
                    </View>
                  )}
                </View>
              ) : (
                cameraPermission?.granted && showFaceScan && (
                  <CameraView ref={cameraRef} facing={cameraFacing} style={styles.cameraView} />
                )
              )}
              {!capturedPhoto && (
                <TouchableOpacity style={styles.cameraOverlay} activeOpacity={1} onPress={capturePhoto}>
                  <View style={styles.faceOutline} />
                  <Text style={{ color: 'rgba(255,255,255,0.7)', position: 'absolute', bottom: 40, fontWeight: '700' }}>Tap anywhere to capture</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.cameraControls}>
              {verificationError ? (
                <View style={styles.errorControls}>
                  <Text style={styles.errorMessage}>{verificationError}</Text>
                  <View style={styles.errorButtons}>
                    <TouchableOpacity style={styles.errorCancelBtn} onPress={() => {
                      setShowFaceScan(false);
                      setPendingJobParams(null);
                      setCapturedPhoto(null);
                      setVerificationError(null);
                    }}>
                      <Text style={styles.cameraCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => {
                      setCapturedPhoto(null);
                      setVerificationError(null);
                    }}>
                      <Text style={styles.retryBtnText}>Try Again</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : isVerifying ? (
                <View style={styles.loadingControls}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.loadingControlText}>Processing...</Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-between', paddingHorizontal: 20 }}>
                  <TouchableOpacity style={styles.cameraCancelBtn} onPress={() => { setShowFaceScan(false); setPendingJobParams(null); setCapturedPhoto(null); setVerificationError(null); }}>
                    <Text style={styles.cameraCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cameraCaptureBtn} onPress={capturePhoto}>
                    <View style={styles.cameraCaptureInner} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cameraSwitchBtn} onPress={() => setCameraFacing(prev => prev === 'front' ? 'back' : 'front')}>
                    <Text style={styles.cameraSwitchText}>Switch</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* Permission & Battery Warning Modal */}
        <Modal visible={permissionModalVisible} transparent animationType="slide" onRequestClose={() => setPermissionModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.permissionModalContent, { paddingBottom: Math.max(40, insets.bottom + 20) }]}>
              <View style={styles.dragHandle} />
              <View style={styles.warningIconWrap}>
                <MapPin color="#ef4444" size={32} weight="fill" />
              </View>
              <Text style={styles.modalTitle}>Action Required</Text>
              <Text style={styles.modalSub}>
                To track your trips perfectly, this app requires background location and unrestricted battery settings.
              </Text>
              
              <View style={styles.reqContainer}>
                <View style={styles.reqRow}>
                  <View style={[styles.reqDot, permState.fg ? { backgroundColor: '#10b981' } : { backgroundColor: '#ef4444' }]} />
                  <Text style={styles.reqText}>1. Allow Location Tracking</Text>
                </View>
                <View style={styles.reqRow}>
                  <View style={[styles.reqDot, permState.bg ? { backgroundColor: '#10b981' } : { backgroundColor: '#ef4444' }]} />
                  <Text style={styles.reqText}>2. Select "Allow all the time"</Text>
                </View>
                <View style={[styles.reqRow, { marginBottom: 0 }]}>
                  <View style={[styles.reqDot, { backgroundColor: '#FDB813' }]} />
                  <Text style={styles.reqText}>3. Set Battery to "Unrestricted"</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.settingsBtn} activeOpacity={0.8} onPress={() => Linking.openSettings()}>
                <Text style={styles.settingsBtnText}>Open App Settings</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.laterBtn} onPress={() => setPermissionModalVisible(false)}>
                <Text style={styles.laterBtnText}>I'll do it later</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A1931' },
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FDB813', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 15, fontWeight: '900', color: '#0A1931' },

  content: { padding: 16, paddingBottom: 20 },
  welcomeSection: { marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 13, color: '#64748b', fontWeight: '700', letterSpacing: 0.5 },
  name: { fontSize: 24, fontWeight: '900', color: '#0A1931', marginTop: 2 },
  
  syncButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'flex-end' },
  syncButtonDisabled: { opacity: 0.3 },

  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#64748b', marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase' },

  startJobSection: { marginBottom: 20 },

  // Start Job Buttons
  startJobButtons: { flexDirection: 'row', gap: 12 },
  routeBtn: { flex: 1, backgroundColor: '#0A1931', borderRadius: 14, padding: 18, alignItems: 'center', elevation: 3, shadowColor: '#0A1931', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6 },
  otherBtn: { flex: 1, backgroundColor: '#FDB813', borderRadius: 14, padding: 18, alignItems: 'center', elevation: 3, shadowColor: '#FDB813', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6 },
  startBtnIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  startBtnIconWrapYellow: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(10,25,49,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  startBtnTitle: { fontSize: 14, fontWeight: '800', color: '#fff', marginBottom: 2 },
  startBtnSub: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  startBtnTitleDark: { fontSize: 14, fontWeight: '800', color: '#0A1931', marginBottom: 2 },
  startBtnSubDark: { fontSize: 10, color: 'rgba(10,25,49,0.5)', fontWeight: '500' },

  // Active Job Banner
  activeJobBanner: { backgroundColor: '#FDB813', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 20, elevation: 3, shadowColor: '#FDB813', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6 },
  activeJobIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.4)', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  activeJobInfo: { flex: 1 },
  activeJobTitle: { fontSize: 15, fontWeight: '800', color: '#0A1931' },
  activeJobDesc: { fontSize: 12, color: '#0A1931', opacity: 0.7, fontWeight: '500', marginTop: 2 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0A1931', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80', marginRight: 5 },
  liveText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20, justifyContent: 'space-between' },
  statCard: { width: '48%', backgroundColor: '#fff', borderRadius: 12, padding: 14, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
  statLabel: { fontSize: 11, color: '#64748b', marginTop: 6, fontWeight: '600' },
  statValue: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginTop: 2 },
  statUnit: { fontSize: 12, fontWeight: '600', color: '#64748b' },

  // Route Cards
  routeCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  routeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  routeIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(10, 25, 49, 0.05)', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  routeName: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  vehicleText: { fontSize: 11, color: '#64748b', fontWeight: '600', marginTop: 1 },
  studentCountBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(253, 184, 19, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  studentCountText: { fontSize: 12, fontWeight: '800', color: '#0A1931' },
  stopsContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  stopBadge: { backgroundColor: 'rgba(10, 25, 49, 0.05)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  stopText: { fontSize: 10, fontWeight: '700', color: '#0A1931' },
  stopArrow: { color: '#cbd5e1', fontSize: 11 },
  stopMore: { fontSize: 10, color: '#64748b', fontWeight: '600' },

  emptyCard: { backgroundColor: '#fff', borderRadius: 12, padding: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed' },
  emptyText: { marginTop: 10, fontSize: 13, color: '#94a3b8', fontWeight: '600' },

  // Modals
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10, 25, 49, 0.6)' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  dragHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 16 },
  modalInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, backgroundColor: '#f8fafc', marginBottom: 20, color: '#0f172a' },
  modalStartBtn: { backgroundColor: '#0A1931', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  modalStartBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  modalRouteList: { maxHeight: 300 },
  modalRouteCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, marginBottom: 10, backgroundColor: '#f8fafc' },
  modalRouteName: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  modalRouteVehicle: { fontSize: 11, color: '#64748b', marginTop: 2 },
  modalSelectBadge: { backgroundColor: '#FDB813', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  modalSelectBadgeText: { fontSize: 12, fontWeight: '800', color: '#0A1931' },

  directionCard: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, marginBottom: 12 },
  directionIconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  directionTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  directionSub: { fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: '500' },

  // Loader
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A1931' },
  loadingText: { color: '#fff', marginTop: 12, fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },

  // Camera Styles
  cameraModalContainer: { flex: 1, backgroundColor: '#0A1931' },
  cameraHeader: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, alignItems: 'center' },
  cameraTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
  cameraSub: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  cameraWrapper: { flex: 1, position: 'relative', overflow: 'hidden', borderRadius: 30, marginHorizontal: 20, marginBottom: 20, backgroundColor: '#000' },
  cameraView: { flex: 1 },
  cameraOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  faceOutline: { width: 250, height: 350, borderWidth: 3, borderColor: '#FDB813', borderRadius: 125, borderStyle: 'dashed' },
  cameraControls: { paddingBottom: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 40 },
  cameraCancelBtn: { padding: 15 },
  cameraCancelText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cameraCaptureBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  cameraCaptureInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff' },
  verifyingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,25,49,0.7)', justifyContent: 'center', alignItems: 'center' },
  verifyingText: { color: '#fff', marginTop: 10, fontSize: 15, fontWeight: '700' },
  errorControls: { width: '100%', paddingHorizontal: 30, alignItems: 'center' },
  errorMessage: { color: '#ef4444', fontSize: 14, fontWeight: '700', textAlign: 'center', marginBottom: 15 },
  errorButtons: { flexDirection: 'row', gap: 20, justifyContent: 'center', width: '100%' },
  errorCancelBtn: { padding: 12, borderWidth: 1, borderColor: '#fff', borderRadius: 8, minWidth: 100, alignItems: 'center' },
  retryBtn: { padding: 12, backgroundColor: '#FDB813', borderRadius: 8, minWidth: 100, alignItems: 'center' },
  retryBtnText: { color: '#0A1931', fontSize: 15, fontWeight: '800' },
  loadingControls: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 15 },
  loadingControlText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cameraSwitchBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)' },
  cameraSwitchText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Permission Modal
  permissionModalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, alignItems: 'center' },
  warningIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(239, 68, 68, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  reqContainer: { width: '100%', backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  reqRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  reqDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  reqText: { fontSize: 13, color: '#0f172a', fontWeight: '600' },
  settingsBtn: { backgroundColor: '#0A1931', width: '100%', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  settingsBtnText: { color: '#FDB813', fontSize: 15, fontWeight: '800' },
  laterBtn: { paddingVertical: 10 },
  laterBtnText: { color: '#64748b', fontSize: 14, fontWeight: '700' },
});
