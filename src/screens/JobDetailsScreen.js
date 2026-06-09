import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { MapPin, GasPump, CheckCircle, Info, Clock } from 'phosphor-react-native';
import api from '../api/axios';
import CurvedHeader from '../components/CurvedHeader';

const { width } = Dimensions.get('window');

function decodePolyline(encoded) {
  if (!encoded) return [];
  let points = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

export default function JobDetailsScreen({ route, navigation }) {
  const { jobId } = route.params;
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState(null);
  const [locations, setLocations] = useState([]);
  const mapRef = useRef(null);

  useEffect(() => { fetchJobDetails(); }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/job/${jobId}`);
      setJob(response.data.job);
      setLocations(response.data.locations || []);
    } catch (e) { console.log('[JobDetailsScreen] Error:', e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!loading && mapRef.current) fitMapToRoute();
  }, [loading, locations]);

  const fitMapToRoute = () => {
    let coords = [];
    if (job?.route_polyline) {
      coords = decodePolyline(job.route_polyline);
    } else {
      locations.forEach(loc => coords.push({ latitude: parseFloat(loc.latitude), longitude: parseFloat(loc.longitude) }));
    }
    if (job?.start_lat && job?.start_lng) coords.push({ latitude: parseFloat(job.start_lat), longitude: parseFloat(job.start_lng) });
    if (job?.end_lat && job?.end_lng) coords.push({ latitude: parseFloat(job.end_lat), longitude: parseFloat(job.end_lng) });
    if (coords.length > 0 && mapRef.current) {
      mapRef.current.fitToCoordinates(coords, { edgePadding: { top: 50, right: 50, bottom: 50, left: 50 }, animated: true });
    }
  };

  if (loading) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#FDB813" /><Text style={styles.loadingText}>Loading route...</Text></View>;
  }

  if (!job) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <CurvedHeader title="Trip Details" showBack onBack={() => navigation.goBack()} />
        <View style={styles.emptyContainer}><Info size={48} color="#cbd5e1" /><Text style={styles.emptyText}>Failed to load details.</Text></View>
      </SafeAreaView>
    );
  }

  const durationMin = job.ended_at ? Math.round((new Date(job.ended_at) - new Date(job.started_at)) / 1000 / 60) : 0;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <CurvedHeader title={`Trip #${job.id}`} subtitle={job.job_type === 'route' ? 'School Route' : 'Ad-hoc Trip'} showBack onBack={() => navigation.goBack()} />

      <View style={styles.container}>
        {/* Map */}
        <View style={styles.mapContainer}>
          <MapView ref={mapRef} style={styles.map}
            initialRegion={{ latitude: job.start_lat ? parseFloat(job.start_lat) : 25.7771, longitude: job.start_lng ? parseFloat(job.start_lng) : 87.4753, latitudeDelta: 0.05, longitudeDelta: 0.05 }}>
            {job.start_lat && job.start_lng && (
              <Marker coordinate={{ latitude: parseFloat(job.start_lat), longitude: parseFloat(job.start_lng) }} title="Start" pinColor="green" />
            )}
            {job.status === 'completed' && job.end_lat && job.end_lng && (
              <Marker coordinate={{ latitude: parseFloat(job.end_lat), longitude: parseFloat(job.end_lng) }} title="End" pinColor="red" />
            )}
            {job.actions && job.actions.map(action => action.action_lat && action.action_lng ? (
              <Marker key={action.id} coordinate={{ latitude: parseFloat(action.action_lat), longitude: parseFloat(action.action_lng) }}
                title={`${action.student?.user?.name || 'Student'}`} pinColor="blue" />
            ) : null)}
            {job.route_polyline ? (
              <Polyline coordinates={decodePolyline(job.route_polyline)} strokeColor="#0A58CA" strokeWidth={4} />
            ) : (
              locations.length > 1 && (
                <Polyline coordinates={locations.map(l => ({ latitude: parseFloat(l.latitude), longitude: parseFloat(l.longitude) }))} strokeColor="#0A58CA" strokeWidth={4} />
              )
            )}
          </MapView>
          <TouchableOpacity style={styles.refitBtn} onPress={fitMapToRoute} activeOpacity={0.85}>
            <Text style={styles.refitText}>Recenter Map</Text>
          </TouchableOpacity>
        </View>

        {/* Details */}
        <View style={styles.detailsBox}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { borderLeftColor: '#3b82f6', borderLeftWidth: 3 }]}>
                <MapPin color="#3b82f6" size={16} weight="fill" />
                <Text style={styles.statLabel}>Distance</Text>
                <Text style={styles.statValue}>{job.total_distance_km || 0} km</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: '#059669', borderLeftWidth: 3 }]}>
                <GasPump color="#059669" size={16} weight="fill" />
                <Text style={styles.statLabel}>Earned</Text>
                <Text style={[styles.statValue, { color: '#059669' }]}>₹{job.fuel_cost || 0}</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: '#FDB813', borderLeftWidth: 3 }]}>
                <Clock color="#FDB813" size={16} weight="fill" />
                <Text style={styles.statLabel}>Duration</Text>
                <Text style={styles.statValue}>{durationMin} min</Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Route</Text>
                <Text style={styles.infoValue}>{job.route?.route_name || job.reason || 'Ad-hoc'}</Text>
              </View>
              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.infoLabel}>Vehicle</Text>
                <Text style={styles.infoValue}>{job.vehicle?.vehicle_number || 'N/A'} • {job.vehicle?.fuel_type || ''}</Text>
              </View>
            </View>

            {job.job_type === 'route' && (
              <View style={styles.dropsSection}>
                <Text style={styles.sectionTitle}>STUDENT ACTIONS ({job.actions?.length || 0})</Text>
                {job.actions && job.actions.length > 0 ? job.actions.map(action => (
                  <View key={action.id} style={styles.dropItem}>
                    <View style={styles.dropAvatar}><Text style={styles.dropAvatarText}>{action.student?.user?.name?.charAt(0) || 'S'}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dropName}>{action.student?.user?.name}</Text>
                      <Text style={styles.dropTime}>{action.action_type === 'pickup' ? 'Picked up' : 'Dropped'} at {new Date(action.action_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                    <CheckCircle size={18} color="#10b981" weight="fill" />
                  </View>
                )) : (
                  <View style={styles.noDrops}><Text style={styles.noDropsText}>No actions recorded</Text></View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A1931' },
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f6f9' },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 13, fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { marginTop: 12, fontSize: 15, color: '#64748b', fontWeight: '700' },

  mapContainer: { height: Dimensions.get('window').height * 0.38, position: 'relative' },
  map: { ...StyleSheet.absoluteFillObject },
  refitBtn: { position: 'absolute', top: 12, right: 12, backgroundColor: '#FDB813', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, elevation: 3 },
  refitText: { color: '#0A1931', fontWeight: '800', fontSize: 12 },

  detailsBox: { flex: 1, backgroundColor: '#f4f6f9' },
  scrollContent: { padding: 16, paddingBottom: 24 },

  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
  statLabel: { fontSize: 10, color: '#64748b', fontWeight: '600', marginTop: 4 },
  statValue: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginTop: 2 },

  infoCard: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, marginBottom: 14, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
  infoRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f4f6f9' },
  infoLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 0.3, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '800', color: '#0f172a' },

  dropsSection: { marginTop: 4 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#64748b', marginBottom: 8, letterSpacing: 0.5 },
  dropItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, gap: 10, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
  dropAvatar: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center' },
  dropAvatarText: { fontSize: 13, fontWeight: '800', color: '#047857' },
  dropName: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  dropTime: { fontSize: 11, color: '#64748b', marginTop: 1 },
  noDrops: { padding: 20, alignItems: 'center' },
  noDropsText: { fontSize: 12, color: '#94a3b8' },
});
