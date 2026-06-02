import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { CaretLeft, MapPin, Calendar, GasPump, NavigationArrow, CheckCircle, Info } from 'phosphor-react-native';
import api from '../api/axios';

const { width } = Dimensions.get('window');

export default function JobDetailsScreen({ route, navigation }) {
  const { jobId } = route.params;
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState(null);
  const [locations, setLocations] = useState([]);
  const mapRef = useRef(null);

  useEffect(() => {
    console.log('[JobDetailsScreen] Loaded screen for Job ID:', jobId);
    fetchJobDetails();
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/job/${jobId}`);
      setJob(response.data.job);
      setLocations(response.data.locations || []);
      console.log('[JobDetailsScreen] Job loaded:', response.data.job.id, 'Locations count:', response.data.locations?.length);
    } catch (e) {
      console.log('[JobDetailsScreen] Error loading job details:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && mapRef.current) {
      fitMapToRoute();
    }
  }, [loading, locations]);

  const fitMapToRoute = () => {
    const coords = [];
    
    // Add all location points
    locations.forEach(loc => {
      coords.push({
        latitude: parseFloat(loc.latitude),
        longitude: parseFloat(loc.longitude)
      });
    });

    // Add start and end points explicitly to be sure
    if (job?.start_lat && job?.start_lng) {
      coords.push({
        latitude: parseFloat(job.start_lat),
        longitude: parseFloat(job.start_lng)
      });
    }
    if (job?.end_lat && job?.end_lng) {
      coords.push({
        latitude: parseFloat(job.end_lat),
        longitude: parseFloat(job.end_lng)
      });
    }

    if (coords.length > 0 && mapRef.current) {
      console.log('[JobDetailsScreen] Fitting map bounds for', coords.length, 'coordinates');
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading trip route...</Text>
      </View>
    );
  }

  if (!job) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <CaretLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trip Details</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Info size={48} color="#9ca3af" />
          <Text style={styles.emptyText}>Failed to load trip details.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const durationMin = job.ended_at 
    ? Math.round((new Date(job.ended_at) - new Date(job.started_at)) / 1000 / 60) 
    : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff' }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <CaretLeft size={24} color="#111827" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Trip #{job.id} Route</Text>
            <Text style={styles.headerSubtitle}>
              {job.job_type === 'route' ? 'School Route' : 'Ad-hoc Trip'}
            </Text>
          </View>
          <TouchableOpacity onPress={fitMapToRoute} style={styles.fitButton}>
            <Text style={styles.fitButtonText}>Re-fit</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Map View */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: job.start_lat ? parseFloat(job.start_lat) : 25.7771,
            longitude: job.start_lng ? parseFloat(job.start_lng) : 87.4753,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          {/* Start Marker (Green) */}
          {job.start_lat && job.start_lng && (
            <Marker
              coordinate={{ latitude: parseFloat(job.start_lat), longitude: parseFloat(job.start_lng) }}
              title="Start Point"
              description={new Date(job.started_at).toLocaleTimeString()}
              pinColor="green"
            />
          )}

          {/* End Marker (Red) */}
          {job.status === 'completed' && job.end_lat && job.end_lng && (
            <Marker
              coordinate={{ latitude: parseFloat(job.end_lat), longitude: parseFloat(job.end_lng) }}
              title="End Point"
              description={job.ended_at ? new Date(job.ended_at).toLocaleTimeString() : ''}
              pinColor="red"
            />
          )}

          {/* Student Drops Markers (Blue) */}
          {job.drops && job.drops.map(drop => {
            if (drop.drop_lat && drop.drop_lng) {
              return (
                <Marker
                  key={drop.id}
                  coordinate={{ latitude: parseFloat(drop.drop_lat), longitude: parseFloat(drop.drop_lng) }}
                  title={`${drop.student?.user?.name || 'Student'} Drop`}
                  description={`Dropped at: ${new Date(drop.dropped_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                  pinColor="blue"
                />
              );
            }
            return null;
          })}

          {/* Route Path Polyline */}
          {locations.length > 1 && (
            <Polyline
              coordinates={locations.map(l => ({
                latitude: parseFloat(l.latitude),
                longitude: parseFloat(l.longitude)
              }))}
              strokeColor="#2563eb"
              strokeWidth={4}
            />
          )}
        </MapView>
      </View>

      {/* Details Box */}
      <View style={styles.detailsBox}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Top Info Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>DISTANCE</Text>
              <Text style={styles.statValue}>
                {job.total_distance_km || 0} <Text style={styles.statUnit}>km</Text>
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>FUEL EARNING</Text>
              <Text style={[styles.statValue, { color: '#059669' }]}>
                ₹{job.fuel_cost || 0}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>DURATION</Text>
              <Text style={styles.statValue}>
                {durationMin} <Text style={styles.statUnit}>min</Text>
              </Text>
            </View>
          </View>

          {/* Route and Vehicle Cards */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <MapPin size={20} color="#6b7280" weight="fill" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Route Name</Text>
                <Text style={styles.infoValue}>{job.route?.route_name || job.reason || 'Ad-hoc Trip'}</Text>
              </View>
            </View>

            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <GasPump size={20} color="#6b7280" weight="fill" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Vehicle Used</Text>
                <Text style={styles.infoValue}>{job.vehicle?.vehicle_number || 'N/A'} • {job.vehicle?.fuel_type || 'Fuel'}</Text>
              </View>
            </View>
          </View>

          {/* Student drops logs list */}
          {job.job_type === 'route' && (
            <View style={styles.dropsSection}>
              <Text style={styles.sectionTitle}>Drops Records ({job.drops?.length || 0})</Text>
              {job.drops && job.drops.length > 0 ? (
                job.drops.map((drop, index) => (
                  <View key={drop.id} style={styles.dropItem}>
                    <View style={styles.dropAvatar}>
                      <Text style={styles.dropAvatarText}>{drop.student?.user?.name?.charAt(0) || 'S'}</Text>
                    </View>
                    <View style={styles.dropDetails}>
                      <Text style={styles.dropName}>{drop.student?.user?.name}</Text>
                      <Text style={styles.dropTime}>
                        Dropped at {new Date(drop.dropped_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </Text>
                    </View>
                    <CheckCircle size={20} color="#10b981" weight="fill" />
                  </View>
                ))
              ) : (
                <View style={styles.emptyDropsCard}>
                  <Text style={styles.emptyDropsText}>No drops registered during this trip</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  safeContainer: { flex: 1, backgroundColor: '#ffffff' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' },
  loadingText: { marginTop: 12, color: '#6b7280', fontSize: 14, fontWeight: '500' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#6b7280', fontWeight: 'bold' },
  
  header: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'left' },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  headerSubtitle: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  fitButton: { backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#bfdbfe' },
  fitButtonText: { fontSize: 12, fontWeight: '600', color: '#2563eb' },
  
  mapContainer: { flex: 1, backgroundColor: '#f3f4f6' },
  map: { width: '100%', height: '100%' },
  
  detailsBox: { height: Dimensions.get('window').height * 0.38, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  scrollContent: { padding: 16, paddingBottom: 24 },
  
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' },
  statLabel: { fontSize: 9, fontWeight: 'bold', color: '#9ca3af', marginBottom: 4, letterSpacing: 0.5 },
  statValue: { fontSize: 18, fontWeight: '900', color: '#111827' },
  statUnit: { fontSize: 12, fontWeight: 'normal', color: '#6b7280' },
  
  infoSection: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 16, marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 12 },
  infoTextContainer: { flex: 1 },
  infoLabel: { fontSize: 10, fontWeight: 'bold', color: '#9ca3af', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  
  dropsSection: { marginTop: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 10 },
  dropItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, marginBottom: 8, gap: 12 },
  dropAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#a7f3d0' },
  dropAvatarText: { fontSize: 14, fontWeight: 'bold', color: '#047857' },
  dropDetails: { flex: 1 },
  dropName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  dropTime: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  emptyDropsCard: { padding: 20, backgroundColor: '#f9fafb', borderStyle: 'dashed', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, alignItems: 'center' },
  emptyDropsText: { fontSize: 12, color: '#9ca3af', fontStyle: 'italic' },
});
