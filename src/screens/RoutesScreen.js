import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapTrifold, Users, MapPin, Bus } from 'phosphor-react-native';
import api from '../api/axios';

export default function RoutesScreen() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRoutes = async () => {
    try {
      const response = await api.get('/routes');
      setRoutes(response.data.routes || []);
    } catch (e) {
      console.log('Error fetching routes', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRoutes();
    setRefreshing(false);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Assigned Routes</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}
      >
        {routes.length > 0 ? (
          routes.map((route, i) => (
            <View key={route.id || i} style={styles.routeCard}>
              <View style={styles.routeHeader}>
                <View style={styles.iconContainer}>
                  <MapTrifold color="#2563eb" size={24} weight="fill" />
                </View>
                <View style={styles.routeHeaderInfo}>
                  <Text style={styles.routeName}>{route.route_name}</Text>
                  {route.vehicle && (
                    <View style={styles.vehicleInfo}>
                      <Bus color="#6b7280" size={12} weight="fill" />
                      <Text style={styles.vehicleText}>{route.vehicle.vehicle_number}</Text>
                    </View>
                  )}
                </View>
              </View>

              {route.stops && route.stops.length > 0 && (
                <View style={styles.stopsSection}>
                  <Text style={styles.sectionLabel}>STOPS</Text>
                  <View style={styles.stopsContainer}>
                    {route.stops.map((stop, idx) => (
                      <React.Fragment key={idx}>
                        <View style={styles.stopBadge}><Text style={styles.stopText}>{stop}</Text></View>
                        {idx < route.stops.length - 1 && <Text style={styles.stopArrow}>→</Text>}
                      </React.Fragment>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.studentsSection}>
                <View style={styles.studentsHeader}>
                  <Users color="#6b7280" size={16} weight="fill" />
                  <Text style={styles.sectionLabel}>STUDENTS ({route.students?.length || 0})</Text>
                </View>
                <View style={styles.studentList}>
                  {route.students && route.students.length > 0 ? (
                    route.students.map((st, idx) => (
                      <View key={idx} style={[styles.studentItem, idx === route.students.length - 1 && { borderBottomWidth: 0 }]}>
                        <Text style={styles.studentName}>{st.student?.user?.name || 'Unknown Student'}</Text>
                        <Text style={styles.studentPickup}>Pickup: {st.pickup_point || 'N/A'}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noStudentsText}>No students enrolled on this route.</Text>
                  )}
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <MapPin color="#d1d5db" size={48} weight="fill" />
            <Text style={styles.emptyTitle}>No Routes Assigned</Text>
            <Text style={styles.emptyText}>Contact administration to get routes assigned to your vehicle.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
  header: { padding: 20, paddingTop: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  content: { padding: 20, paddingBottom: 40 },
  
  routeCard: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#f3f4f6', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, overflow: 'hidden' },
  routeHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  iconContainer: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  routeHeaderInfo: { flex: 1 },
  routeName: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  vehicleInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  vehicleText: { fontSize: 12, fontWeight: '600', color: '#64748b', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  
  stopsSection: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  sectionLabel: { fontSize: 11, fontWeight: 'bold', color: '#94a3b8', letterSpacing: 0.5, marginBottom: 8 },
  stopsContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  stopBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#bfdbfe' },
  stopText: { fontSize: 11, fontWeight: '600', color: '#1d4ed8' },
  stopArrow: { color: '#cbd5e1', fontSize: 12 },
  
  studentsSection: { padding: 16 },
  studentsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  studentList: { marginTop: 4 },
  studentItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  studentName: { fontSize: 14, fontWeight: '500', color: '#334155' },
  studentPickup: { fontSize: 11, color: '#64748b', backgroundColor: '#f8fafc', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  noStudentsText: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic', marginTop: 8 },
  
  emptyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f3f4f6', borderStyle: 'dashed', marginTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
});
