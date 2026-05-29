import React, { useContext, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { CheckCircle, NavigationArrow, MapPin, GasPump } from 'phosphor-react-native';
import { LocationContext } from '../context/LocationContext';
import api from '../api/axios';

export default function ActiveJobScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { currentJob, currentLocation, stopTracking } = useContext(LocationContext);
  const [isLoading, setIsLoading] = useState(false);
  const [region, setRegion] = useState({
    latitude: 25.7771,
    longitude: 87.4753,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  useEffect(() => {
    if (currentLocation) {
      setRegion({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  }, [currentLocation]);

  const endJob = async () => {
    Alert.alert(
      'End Trip',
      'Are you sure you want to end this trip? This will calculate your distance and wallet earnings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'End Trip', 
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              const response = await api.post('/job/end', {
                job_id: currentJob?.id,
                latitude: currentLocation?.coords?.latitude || region.latitude,
                longitude: currentLocation?.coords?.longitude || region.longitude,
              });
              stopTracking();
              
              Alert.alert('Trip Completed', `Distance: ${response.data.distance} km\nEarned: ₹${response.data.wallet_credit || 0}`, [
                { text: 'OK', onPress: () => navigation.navigate('MainTabs') }
              ]);
            } catch (e) {
              Alert.alert('Error', e.response?.data?.message || 'Failed to end job');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  if (!currentJob) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No active job found.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('MainTabs')}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map View */}
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        region={region}
        showsUserLocation={true}
        showsMyLocationButton={false}
        followsUserLocation={true}
      >
        {currentLocation && (
          <Marker
            coordinate={{
              latitude: currentLocation.coords.latitude,
              longitude: currentLocation.coords.longitude,
            }}
          >
            <View style={styles.markerContainer}>
              <View style={styles.markerCore} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Floating Header */}
      <SafeAreaView style={styles.headerContainer} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <NavigationArrow color="#059669" size={24} weight="fill" />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>{currentJob.job_type === 'route' ? 'School Route' : 'Other Trip'}</Text>
            <Text style={styles.headerSubtitle}>Live Tracking Active</Text>
          </View>
          <View style={styles.pulseDot} />
        </View>
      </SafeAreaView>

      {/* Bottom Panel */}
      <View style={[styles.bottomPanel, { paddingBottom: Math.max(24, insets.bottom + 10) }]}>
        <View style={styles.dragHandle} />
        
        <View style={styles.jobInfoContainer}>
          <View style={styles.jobInfoRow}>
            <MapPin color="#6b7280" size={20} weight="fill" />
            <Text style={styles.jobInfoText}>{currentJob.route?.route_name || currentJob.reason || 'Ad-hoc Trip'}</Text>
          </View>
          <View style={styles.jobInfoRow}>
            <GasPump color="#6b7280" size={20} weight="fill" />
            <Text style={styles.jobInfoText}>{currentJob.vehicle?.vehicle_number} • {currentJob.vehicle?.fuel_type}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.endBtn} 
          onPress={endJob}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <CheckCircle color="#fff" size={24} weight="bold" />
              <Text style={styles.endBtnText}>Complete Trip</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  map: { ...StyleSheet.absoluteFillObject },
  markerContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(37, 99, 235, 0.2)', justifyContent: 'center', alignItems: 'center' },
  markerCore: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#2563eb', borderWidth: 2, borderColor: '#fff' },
  
  headerContainer: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 10 },
  header: { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  headerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  headerSubtitle: { fontSize: 13, color: '#059669', fontWeight: '500' },
  pulseDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#10b981', shadowColor: '#10b981', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6, elevation: 4 },
  
  bottomPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 10 },
  dragHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#e5e7eb', alignSelf: 'center', marginBottom: 20 },
  
  jobInfoContainer: { backgroundColor: '#f9fafb', borderRadius: 16, padding: 16, marginBottom: 20, gap: 12, borderWidth: 1, borderColor: '#f3f4f6' },
  jobInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  jobInfoText: { fontSize: 15, fontWeight: '500', color: '#374151', flex: 1 },
  
  endBtn: { backgroundColor: '#ef4444', borderRadius: 16, padding: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  endBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 16, color: '#6b7280', marginBottom: 20 },
  backBtn: { backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  backBtnText: { color: '#fff', fontWeight: 'bold' }
});
