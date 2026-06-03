import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, StyleSheet, Alert, Modal, TextInput, Animated, TouchableWithoutFeedback, Image } from 'react-native';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bus, MapPin, Wallet, NavigationArrow, CheckCircle, Users, CaretRight } from 'phosphor-react-native';
import { AuthContext } from '../context/AuthContext';
import { LocationContext } from '../context/LocationContext';
import api from '../api/axios';
import CurvedHeader from '../components/CurvedHeader';

export default function HomeScreen({ navigation }) {
  const { user, driver } = useContext(AuthContext);
  const { currentJob, startTracking, stopTracking } = useContext(LocationContext);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [routeModalVisible, setRouteModalVisible] = useState(false);
  const [otherTripModalVisible, setOtherTripModalVisible] = useState(false);
  const [tripReason, setTripReason] = useState('');
  const [isStartingJob, setIsStartingJob] = useState(false);

  const routeModalY = React.useRef(new Animated.Value(600)).current;
  const otherTripModalY = React.useRef(new Animated.Value(600)).current;

  const openRouteModal = () => { setRouteModalVisible(true); routeModalY.setValue(600); };
  const startRouteSlideUp = () => { Animated.timing(routeModalY, { toValue: 0, duration: 300, useNativeDriver: true }).start(); };
  const closeRouteModal = () => { Animated.timing(routeModalY, { toValue: 600, duration: 250, useNativeDriver: true }).start(() => setRouteModalVisible(false)); };
  const openOtherTripModal = () => { setOtherTripModalVisible(true); otherTripModalY.setValue(600); };
  const startOtherTripSlideUp = () => { Animated.timing(otherTripModalY, { toValue: 0, duration: 300, useNativeDriver: true }).start(); };
  const closeOtherTripModal = () => { Animated.timing(otherTripModalY, { toValue: 600, duration: 250, useNativeDriver: true }).start(() => setOtherTripModalVisible(false)); };

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

  useEffect(() => { fetchDashboard(); }, []);

  const onRefresh = async () => { setRefreshing(true); await fetchDashboard(); setRefreshing(false); };

  const proceedToStartJob = async (route, isManual = false, reason = null, tripDirection = null) => {
    setIsStartingJob(true);
    try {
      const vehicleId = route ? route.vehicle_id : (dashboardData?.todays_routes?.[0]?.vehicle_id || null);
      if (!vehicleId) { Alert.alert('No Vehicle', 'You need an assigned vehicle.'); setIsStartingJob(false); return; }
      let location;
      try { location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }); }
      catch { Alert.alert('Location Error', 'Enable location services.'); setIsStartingJob(false); return; }
      const response = await api.post('/job/start', {
        vehicle_id: vehicleId, job_type: isManual ? 'manual' : 'route',
        route_id: route ? route.id : null, trip_direction: tripDirection, reason,
        latitude: location.coords.latitude, longitude: location.coords.longitude,
      });
      startTracking(response.data.job);
      navigation.navigate('ActiveJob');
    } catch (e) { Alert.alert('Error', e.response?.data?.message || 'Failed to start job'); }
    finally { setIsStartingJob(false); }
  };

  const handleStartRouteJob = (route) => {
    Alert.alert('Trip Direction', 'Choose the trip direction:', [
      { text: 'To School', onPress: () => proceedToStartJob(route, false, null, 'to_school') },
      { text: 'From School', onPress: () => proceedToStartJob(route, false, null, 'from_school') },
      { text: 'Cancel', style: 'cancel' }
    ], { cancelable: true });
  };

  const startNewJob = async (type) => {
    if (currentJob) { Alert.alert('Job in Progress', 'You already have an active job.'); return; }
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
          {/* Welcome */}
          <View style={styles.welcomeSection}>
            <Text style={styles.greeting}>{greetText},</Text>
            <Text style={styles.name}>{user?.name} 👋</Text>
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
          </View>

          {/* Assigned Routes */}
          <Text style={styles.sectionTitle}>ASSIGNED ROUTES</Text>
          {dashboardData?.todays_routes?.length > 0 ? (
            dashboardData.todays_routes.map((route, i) => (
              <View key={i} style={styles.routeCard}>
                <View style={styles.routeHeader}>
                  <View style={styles.routeIconWrap}>
                    <Bus color="#0A58CA" size={18} weight="fill" />
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
              <Animated.View style={[styles.modalContent, { transform: [{ translateY: routeModalY }] }]}>
                <View style={styles.dragHandle} />
                <Text style={styles.modalTitle}>Select School Route</Text>
                <ScrollView style={styles.modalRouteList}>
                  {dashboardData?.todays_routes?.map((route, i) => (
                    <TouchableOpacity key={route.id || i} style={styles.modalRouteCard} activeOpacity={0.7}
                      onPress={() => { closeRouteModal(); handleStartRouteJob(route); }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalRouteName}>{route.route_name}</Text>
                        {route.vehicle && <Text style={styles.modalRouteVehicle}>{route.vehicle.vehicle_number}</Text>}
                      </View>
                      <View style={styles.modalSelectBadge}>
                        <Text style={styles.modalSelectBadgeText}>Start →</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Animated.View>
            </TouchableWithoutFeedback>
          </TouchableOpacity>
        </Modal>

        {/* Other Trip Modal */}
        <Modal visible={otherTripModalVisible} transparent animationType="fade" onRequestClose={closeOtherTripModal} onShow={startOtherTripSlideUp}>
          <TouchableOpacity activeOpacity={1} style={styles.modalOverlay} onPress={closeOtherTripModal}>
            <TouchableWithoutFeedback>
              <Animated.View style={[styles.modalContent, { transform: [{ translateY: otherTripModalY }] }]}>
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
                  closeOtherTripModal(); proceedToStartJob(null, true, tripReason.trim()); setTripReason('');
                }}>
                  <Text style={styles.modalStartBtnText}>Start Trip</Text>
                </TouchableOpacity>
              </Animated.View>
            </TouchableWithoutFeedback>
          </TouchableOpacity>
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
  welcomeSection: { marginBottom: 16 },
  greeting: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  name: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#64748b', marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase' },
  
  // Start Job Buttons
  startJobSection: { marginBottom: 20 },
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
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
  statLabel: { fontSize: 11, color: '#64748b', marginTop: 6, fontWeight: '600' },
  statValue: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginTop: 2 },
  statUnit: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  
  // Route Cards
  routeCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
  routeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  routeIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  routeName: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  vehicleText: { fontSize: 11, color: '#64748b', fontWeight: '600', marginTop: 1 },
  studentCountBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  studentCountText: { fontSize: 12, fontWeight: '800', color: '#64748b' },
  stopsContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  stopBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  stopText: { fontSize: 10, fontWeight: '700', color: '#1d4ed8' },
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

  // Loader
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A1931' },
  loadingText: { color: '#fff', marginTop: 12, fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
});
