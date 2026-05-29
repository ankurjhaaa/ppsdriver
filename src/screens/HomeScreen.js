import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, StyleSheet, Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SteeringWheel, NavigationArrow, Wallet, MapPin, CheckCircle } from 'phosphor-react-native';
import { AuthContext } from '../context/AuthContext';
import { LocationContext } from '../context/LocationContext';
import api from '../api/axios';

export default function HomeScreen({ navigation }) {
  const { user, driver } = useContext(AuthContext);
  const { currentJob, startTracking } = useContext(LocationContext);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [activeJob, setActiveJob] = useState(currentJob);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/dashboard');
      setDashboardData(response.data);
      if (response.data.activeJob) {
        setActiveJob(response.data.activeJob);
        // Ensure tracking is active if there's an active job
        if (!currentJob) {
          startTracking(response.data.activeJob);
        }
      } else {
        setActiveJob(null);
      }
    } catch (e) {
      console.log('Error fetching dashboard', e);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  };

  const startNewJob = async (type) => {
    if (activeJob) {
      Alert.alert('Job in Progress', 'You already have an active job.');
      return;
    }
    
    // In a real app, you might show a modal to select a vehicle or route
    // Here we'll just start a generic job if they don't select a route
    try {
      // Basic implementation for demo
      const vehicleId = dashboardData?.todays_routes?.[0]?.vehicle_id || null;
      if (!vehicleId) {
        Alert.alert('No Vehicle', 'You need an assigned vehicle to start a job.');
        return;
      }
      
      let location;
      try {
        location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      } catch (err) {
        Alert.alert('Location Error', 'Unable to get your current location. Please ensure location services are enabled.');
        return;
      }

      const response = await api.post('/job/start', {
        vehicle_id: vehicleId,
        job_type: type === 'other' ? 'manual' : 'route',
        route_id: type === 'route' ? dashboardData?.todays_routes?.[0]?.id : null,
        reason: type === 'other' ? 'Ad-hoc trip' : null,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      
      setActiveJob(response.data.job);
      startTracking(response.data.job);
      navigation.navigate('ActiveJob');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to start job');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{user?.name}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0)}</Text>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}
      >
        {/* Active Job Banner */}
        {activeJob ? (
          <TouchableOpacity 
            style={styles.activeJobBanner} 
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ActiveJob')}
          >
            <View style={styles.activeJobIcon}>
              <NavigationArrow color="#059669" size={24} weight="fill" />
            </View>
            <View style={styles.activeJobInfo}>
              <Text style={styles.activeJobTitle}>Active Job — {activeJob.job_type === 'route' ? 'School Route' : 'Other Trip'}</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  greeting: { fontSize: 13, color: '#6b7280', marginBottom: 2 },
  name: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#bfdbfe' },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#2563eb' },
  content: { padding: 20, paddingBottom: 40 },
  
  activeJobBanner: { backgroundColor: '#ecfdf5', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#a7f3d0', marginBottom: 24, shadowColor: '#10b981', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
  activeJobIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  activeJobInfo: { flex: 1 },
  activeJobTitle: { fontSize: 16, fontWeight: '700', color: '#065f46', marginBottom: 4 },
  activeJobDesc: { fontSize: 13, color: '#047857' },
  activeJobBadge: { backgroundColor: '#10b981', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  activeJobBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  
  startJobContainer: { marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  startJobButtons: { flexDirection: 'row', gap: 12 },
  startBtn: { flex: 1, borderRadius: 16, padding: 20, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  routeBtn: { backgroundColor: '#2563eb', shadowColor: '#2563eb' },
  otherBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ffedd5', shadowColor: '#ea580c' },
  startBtnText: { marginTop: 12, fontSize: 15, fontWeight: '600', color: '#fff' },
  
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#f3f4f6', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  statHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 },
  statLabel: { fontSize: 10, fontWeight: 'bold', color: '#9ca3af' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#111827' },
  statUnit: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  
  routeCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f3f4f6', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  routeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  routeName: { fontSize: 16, fontWeight: 'bold', color: '#111827', flex: 1 },
  vehicleBadge: { backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  vehicleText: { fontSize: 11, fontWeight: 'bold', color: '#4b5563', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  stopsContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  stopBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#dbeafe' },
  stopText: { fontSize: 11, fontWeight: '600', color: '#1d4ed8' },
  stopArrow: { color: '#d1d5db', fontSize: 12 },
  stopMore: { fontSize: 11, color: '#6b7280', fontStyle: 'italic' },
  
  emptyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f3f4f6', borderStyle: 'dashed' },
  emptyText: { marginTop: 12, fontSize: 14, color: '#6b7280' },
});
