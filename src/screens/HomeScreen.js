import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, StyleSheet, Alert, Platform, Modal, TextInput, Animated, TouchableWithoutFeedback } from 'react-native';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SteeringWheel, NavigationArrow, Wallet, MapPin, CheckCircle } from 'phosphor-react-native';
import { AuthContext } from '../context/AuthContext';
import { LocationContext } from '../context/LocationContext';
import api from '../api/axios';

export default function HomeScreen({ navigation }) {
  const { user, driver } = useContext(AuthContext);
  const { currentJob, startTracking, stopTracking } = useContext(LocationContext);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [routeModalVisible, setRouteModalVisible] = useState(false);
  const [otherTripModalVisible, setOtherTripModalVisible] = useState(false);
  const [tripReason, setTripReason] = useState('');

  const routeModalY = React.useRef(new Animated.Value(600)).current;
  const otherTripModalY = React.useRef(new Animated.Value(600)).current;

  const openRouteModal = () => {
    setRouteModalVisible(true);
    routeModalY.setValue(600);
  };

  const startRouteSlideUp = () => {
    Animated.timing(routeModalY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeRouteModal = () => {
    Animated.timing(routeModalY, {
      toValue: 600,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setRouteModalVisible(false);
    });
  };

  const openOtherTripModal = () => {
    setOtherTripModalVisible(true);
    otherTripModalY.setValue(600);
  };

  const startOtherTripSlideUp = () => {
    Animated.timing(otherTripModalY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeOtherTripModal = () => {
    Animated.timing(otherTripModalY, {
      toValue: 600,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setOtherTripModalVisible(false);
    });
  };

  const fetchDashboard = async () => {
    console.log('[HomeScreen] Fetching dashboard data...');
    try {
      const response = await api.get('/dashboard');
      setDashboardData(response.data);
      console.log('[HomeScreen] Dashboard data successfully loaded. Active job ID:', response.data.active_job?.id || 'None');
      if (response.data.active_job) {
        // Ensure tracking is active if there's an active job
        if (!currentJob) {
          console.log('[HomeScreen] Found active job on backend but not tracking locally. Initializing local tracking...');
          startTracking(response.data.active_job);
        }
      } else {
        if (currentJob) {
          console.log('[HomeScreen] No active job on backend but tracking locally. Stopping local tracking...');
          stopTracking();
        }
      }
    } catch (e) {
      console.log('[HomeScreen] Error fetching dashboard:', e.message);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const onRefresh = async () => {
    console.log('[HomeScreen] Dashboard pull-to-refresh triggered');
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  };

  const proceedToStartJob = async (route, isManual = false, reason = null, tripDirection = null) => {
    console.log('[HomeScreen] proceedToStartJob called. Route:', route?.id, 'isManual:', isManual, 'reason:', reason, 'tripDirection:', tripDirection);
    try {
      const vehicleId = route ? route.vehicle_id : (dashboardData?.todays_routes?.[0]?.vehicle_id || null);
      if (!vehicleId) {
        console.log('[HomeScreen] Job start failed: No vehicle assigned');
        Alert.alert('No Vehicle', 'You need an assigned vehicle to start a job.');
        return;
      }
      
      console.log('[HomeScreen] Requesting current location for job start...');
      let location;
      try {
        location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        console.log('[HomeScreen] Current location acquired:', location.coords.latitude, location.coords.longitude);
      } catch (err) {
        console.log('[HomeScreen] Failed to get current location:', err.message);
        Alert.alert('Location Error', 'Unable to get your current location. Please ensure location services are enabled.');
        return;
      }
 
      console.log('[HomeScreen] Sending job start request to API...');
      const response = await api.post('/job/start', {
        vehicle_id: vehicleId,
        job_type: isManual ? 'manual' : 'route',
        route_id: route ? route.id : null,
        trip_direction: tripDirection,
        reason: reason,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      
      console.log('[HomeScreen] Job started successfully on backend. ID:', response.data.job.id);
      startTracking(response.data.job);
      navigation.navigate('ActiveJob');
    } catch (e) {
      console.log('[HomeScreen] Error starting job:', e.response?.data?.message || e.message);
      Alert.alert('Error', e.response?.data?.message || 'Failed to start job');
    }
  };

  const handleStartRouteJob = (route) => {
    Alert.alert(
      'Trip Direction',
      'Choose the trip direction for this route:',
      [
        {
          text: 'School Lane (To School)',
          onPress: () => {
            proceedToStartJob(route, false, null, 'to_school');
          }
        },
        {
          text: 'Chhodne (From School)',
          onPress: () => {
            proceedToStartJob(route, false, null, 'from_school');
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ],
      { cancelable: true }
    );
  };

  const startNewJob = async (type) => {
    if (currentJob) {
      Alert.alert('Job in Progress', 'You already have an active job.');
      return;
    }
    
    if (type === 'other') {
      openOtherTripModal();
      return;
    }

    const routes = dashboardData?.todays_routes || [];
    if (routes.length === 0) {
      Alert.alert('No Routes', 'You do not have any routes assigned for today.');
      return;
    }

    openRouteModal();
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff' }}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>{user?.name}</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0)}</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}
      >
        {/* Active Job Banner */}
        {currentJob ? (
          <TouchableOpacity 
            style={styles.activeJobBanner} 
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ActiveJob')}
          >
            <View style={styles.activeJobIcon}>
              <NavigationArrow color="#059669" size={24} weight="fill" />
            </View>
            <View style={styles.activeJobInfo}>
              <Text style={styles.activeJobTitle}>Active Job — {currentJob.job_type === 'route' ? 'School Route' : 'Other Trip'}</Text>
              <Text style={styles.activeJobDesc}>Tap to view map and controls</Text>
            </View>
            <View style={styles.activeJobBadge}>
              <Text style={styles.activeJobBadgeText}>IN PROGRESS</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.startJobContainer}>
            <Text style={styles.sectionTitle}>Start New Job</Text>
            <View style={styles.startJobButtons}>
              <TouchableOpacity style={[styles.startBtn, styles.routeBtn]} onPress={() => startNewJob('route')}>
                <SteeringWheel color="#fff" size={28} weight="fill" />
                <Text style={styles.startBtnText}>School Route</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.startBtn, styles.otherBtn]} onPress={() => startNewJob('other')}>
                <MapPin color="#ea580c" size={28} weight="fill" />
                <Text style={[styles.startBtnText, { color: '#ea580c' }]}>Other Trip</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Stats Grid */}
        <Text style={styles.sectionTitle}>Today's Overview</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Wallet color="#3b82f6" size={20} weight="fill" />
              <Text style={styles.statLabel}>WALLET</Text>
            </View>
            <Text style={styles.statValue}>₹{dashboardData?.wallet_balance?.toLocaleString() || 0}</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <NavigationArrow color="#10b981" size={20} weight="fill" />
              <Text style={styles.statLabel}>DISTANCE</Text>
            </View>
            <Text style={styles.statValue}>{dashboardData?.total_km_today || 0} <Text style={styles.statUnit}>km</Text></Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <CheckCircle color="#8b5cf6" size={20} weight="fill" />
              <Text style={styles.statLabel}>TRIPS</Text>
            </View>
            <Text style={styles.statValue}>{dashboardData?.total_jobs_today || 0}</Text>
          </View>
        </View>

        {/* Assigned Routes */}
        <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Assigned Routes</Text>
        {dashboardData?.todays_routes?.length > 0 ? (
          dashboardData.todays_routes.map((route, i) => (
            <View key={i} style={styles.routeCard}>
              <View style={styles.routeHeader}>
                <Text style={styles.routeName}>{route.route_name}</Text>
                {route.vehicle && (
                  <View style={styles.vehicleBadge}>
                    <Text style={styles.vehicleText}>{route.vehicle.vehicle_number}</Text>
                  </View>
                )}
              </View>
              {route.stops && route.stops.length > 0 && (
                <View style={styles.stopsContainer}>
                  {route.stops.slice(0, 3).map((stop, idx) => (
                    <React.Fragment key={idx}>
                      <View style={styles.stopBadge}><Text style={styles.stopText}>{stop}</Text></View>
                      {idx < Math.min(route.stops.length - 1, 2) && <Text style={styles.stopArrow}>→</Text>}
                    </React.Fragment>
                  ))}
                  {route.stops.length > 3 && <Text style={styles.stopMore}>+{route.stops.length - 3} more</Text>}
                </View>
              )}
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <MapPin color="#d1d5db" size={32} weight="fill" />
            <Text style={styles.emptyText}>No routes assigned yet</Text>
          </View>
        )}
      </ScrollView>

      {/* Select School Route Modal */}
      <Modal
        visible={routeModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeRouteModal}
        onShow={startRouteSlideUp}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalOverlayContainer}
          onPress={closeRouteModal}
        >
          <TouchableWithoutFeedback>
            <Animated.View style={[styles.modalContent, { transform: [{ translateY: routeModalY }] }]}>
              <View style={styles.dragHandle} />
              <Text style={styles.modalTitle}>Select School Route</Text>
              <Text style={styles.modalSubtitle}>Choose the school route you want to start:</Text>
              
              <ScrollView style={styles.modalRouteList}>
                {dashboardData?.todays_routes?.map((route, i) => (
                  <TouchableOpacity 
                    key={route.id || i}
                    style={styles.modalRouteCard}
                    onPress={() => {
                      closeRouteModal();
                      handleStartRouteJob(route);
                    }}
                  >
                    <View style={styles.modalRouteCardHeader}>
                      <Text style={styles.modalRouteName}>{route.route_name}</Text>
                      <View style={styles.modalSelectBadge}>
                        <Text style={styles.modalSelectBadgeText}>Start Route</Text>
                      </View>
                    </View>
                    
                    <View style={styles.modalRouteDetails}>
                      <Text style={styles.modalRouteDetailText}>
                        Vehicle: <Text style={styles.modalRouteDetailValue}>{route.vehicle?.vehicle_number || 'N/A'}</Text>
                      </Text>
                      <Text style={styles.modalRouteDetailText}>
                        Students: <Text style={styles.modalRouteDetailValue}>{route.students?.length || 0}</Text>
                      </Text>
                    </View>

                    {route.stops && route.stops.length > 0 && (
                      <View style={styles.modalRouteStopsContainer}>
                        <Text style={styles.modalRouteStopsLabel}>Stops:</Text>
                        <Text style={styles.modalRouteStopsText} numberOfLines={1}>
                          {route.stops.join(' → ')}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity 
                style={[styles.modalFullBtn, styles.modalCancelBtn, { marginTop: 12 }]} 
                onPress={closeRouteModal}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* Other Trip Destination Modal */}
      <Modal
        visible={otherTripModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeOtherTripModal}
        onShow={startOtherTripSlideUp}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalOverlayContainer}
          onPress={closeOtherTripModal}
        >
          <TouchableWithoutFeedback>
            <Animated.View style={[styles.modalContent, { transform: [{ translateY: otherTripModalY }] }]}>
              <View style={styles.dragHandle} />
              <Text style={styles.modalTitle}>Other Trip Details</Text>
              <Text style={styles.modalSubtitle}>Where are you going or what is this trip for?</Text>
              
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Fuel Refill, Servicing, Out of town trip"
                placeholderTextColor="#9ca3af"
                value={tripReason}
                onChangeText={setTripReason}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.modalCancelBtn]} 
                  onPress={() => {
                    closeOtherTripModal();
                    setTripReason('');
                  }}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.modalStartBtn]} 
                  onPress={() => {
                    if (!tripReason.trim()) {
                      Alert.alert('Required', 'Please enter a trip name or reason.');
                      return;
                    }
                    closeOtherTripModal();
                    proceedToStartJob(null, true, tripReason.trim());
                    setTripReason('');
                  }}
                >
                  <Text style={styles.modalStartBtnText}>Start Trip</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  greeting: { fontSize: 13, color: '#6b7280', marginBottom: 2 },
  name: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#bfdbfe' },
  avatarText: { fontSize: 16, fontWeight: 'bold', color: '#2563eb' },
  content: { padding: 20, paddingBottom: 40 },
  
  activeJobBanner: { backgroundColor: '#ecfdf5', borderRadius: 10, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#a7f3d0', marginBottom: 24 },
  activeJobIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  activeJobInfo: { flex: 1 },
  activeJobTitle: { fontSize: 15, fontWeight: '700', color: '#065f46', marginBottom: 4 },
  activeJobDesc: { fontSize: 13, color: '#047857' },
  activeJobBadge: { backgroundColor: '#10b981', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  activeJobBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  
  startJobContainer: { marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#6b7280', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 4 },
  startJobButtons: { flexDirection: 'row', gap: 12 },
  startBtn: { flex: 1, borderRadius: 10, padding: 20, alignItems: 'center', justifyContent: 'center' },
  routeBtn: { backgroundColor: '#2563eb' },
  otherBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ffedd5' },
  startBtnText: { marginTop: 12, fontSize: 15, fontWeight: '600', color: '#fff' },
  
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  statHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 },
  statLabel: { fontSize: 10, fontWeight: 'bold', color: '#9ca3af' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#111827' },
  statUnit: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  
  routeCard: { backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  routeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  routeName: { fontSize: 16, fontWeight: 'bold', color: '#111827', flex: 1 },
  vehicleBadge: { backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  vehicleText: { fontSize: 11, fontWeight: 'bold', color: '#4b5563', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  stopsContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  stopBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#dbeafe' },
  stopText: { fontSize: 11, fontWeight: '600', color: '#1d4ed8' },
  stopArrow: { color: '#d1d5db', fontSize: 12 },
  stopMore: { fontSize: 11, color: '#6b7280', fontStyle: 'italic' },
  
  emptyCard: { backgroundColor: '#fff', borderRadius: 10, padding: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderStyle: 'dashed' },
  emptyText: { marginTop: 12, fontSize: 14, color: '#6b7280' },
 
  // Modal styles (Bottom Sheet style)
  modalOverlayContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, width: '100%', paddingBottom: Platform.OS === 'ios' ? 40 : 24, borderTopWidth: 1, borderColor: '#e5e7eb' },
  dragHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#e5e7eb', alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 6 },
  modalSubtitle: { fontSize: 13, color: '#6b7280', marginBottom: 16 },
  modalInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#111827', backgroundColor: '#f9fafb', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalFullBtn: { width: '100%', paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalCancelBtn: { backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  modalStartBtn: { backgroundColor: '#2563eb' },
  modalCancelBtnText: { color: '#4b5563', fontSize: 14, fontWeight: '600' },
  modalStartBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  
  modalRouteList: { maxHeight: 260, marginBottom: 10 },
  modalRouteCard: { padding: 16, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, marginBottom: 12, backgroundColor: '#f9fafb' },
  modalRouteCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalRouteName: { fontSize: 15, fontWeight: 'bold', color: '#1f2937', flex: 1 },
  modalSelectBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#bfdbfe' },
  modalSelectBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#2563eb' },
  modalRouteDetails: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  modalRouteDetailText: { fontSize: 13, color: '#6b7280' },
  modalRouteDetailValue: { fontWeight: '600', color: '#374151' },
  modalRouteStopsContainer: { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8 },
  modalRouteStopsLabel: { fontSize: 11, fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 2 },
  modalRouteStopsText: { fontSize: 12, color: '#4b5563' }
});
