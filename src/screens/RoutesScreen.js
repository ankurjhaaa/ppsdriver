import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bus, MapPin, Users, MagnifyingGlass } from 'phosphor-react-native';
import api from '../api/axios';
import CurvedHeader from '../components/CurvedHeader';

export default function RoutesScreen() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQueries, setSearchQueries] = useState({});

  const updateSearch = (routeId, text) => {
    setSearchQueries(prev => ({ ...prev, [routeId]: text }));
  };

  const fetchRoutes = async () => {
    try {
      const response = await api.get('/routes');
      setRoutes(response.data.routes || []);
    } catch (e) { console.log('[RoutesScreen] Error:', e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRoutes(); }, []);
  const onRefresh = async () => { setRefreshing(true); await fetchRoutes(); setRefreshing(false); };

  if (loading && !refreshing) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#FDB813" /></View>;
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <CurvedHeader title="Assigned Routes" />
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FDB813']} />}
          showsVerticalScrollIndicator={false}
        >
          {routes.length > 0 ? (
            routes.map((route, i) => {
              const routeId = route.id || i;
              const query = (searchQueries[routeId] || '').toLowerCase();
              const filteredStudents = route.students ? route.students.filter(st =>
                st.student?.user?.name?.toLowerCase().includes(query) ||
                st.pickup_point?.toLowerCase().includes(query)
              ) : [];

              return (
                <View key={routeId} style={styles.routeCard}>
                  <View style={styles.routeHeader}>
                    <View style={styles.routeIconWrap}>
                      <Bus color="#0A1931" size={18} weight="fill" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.routeName}>{route.route_name}</Text>
                      {route.vehicle && <Text style={styles.vehicleText}>{route.vehicle.vehicle_number}</Text>}
                    </View>
                    <View style={styles.studentCountBadge}>
                      <Users color="#0A1931" size={14} />
                      <Text style={styles.studentCountText}>{route.students?.length || 0}</Text>
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

                  {route.students && route.students.length > 0 && (
                    <View style={styles.studentsSection}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <Text style={[styles.sectionLabel, { marginBottom: 0 }]}>STUDENTS ({filteredStudents.length})</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, width: '50%' }}>
                          <MagnifyingGlass color="#64748b" size={14} />
                          <TextInput
                            style={{ flex: 1, marginLeft: 6, fontSize: 12, color: '#0f172a', padding: 0 }}
                            placeholder="Search student..."
                            placeholderTextColor="#94a3b8"
                            value={searchQueries[routeId] || ''}
                            onChangeText={(text) => updateSearch(routeId, text)}
                          />
                        </View>
                      </View>
                      <View style={{ maxHeight: 200 }}>
                        <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={true}>
                          {filteredStudents.length > 0 ? filteredStudents.map((st, idx) => (
                            <View key={idx} style={[styles.studentItem, idx === filteredStudents.length - 1 && { borderBottomWidth: 0 }]}>
                              <View style={styles.studentAvatar}>
                                <Text style={styles.studentAvatarText}>{st.student?.user?.name?.charAt(0) || 'S'}</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.studentName}>{st.student?.user?.name || 'Unknown'}</Text>
                                <Text style={styles.studentPickup}>{st.pickup_point || 'N/A'}</Text>
                              </View>
                            </View>
                          )) : (
                            <Text style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, paddingVertical: 10 }}>No students found</Text>
                          )}
                        </ScrollView>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <MapPin color="#cbd5e1" size={48} weight="fill" />
              <Text style={styles.emptyTitle}>No routes assigned</Text>
              <Text style={styles.emptyText}>Your assigned routes will appear here.</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A1931' },
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f6f9' },
  content: { padding: 16, paddingBottom: 20 },

  routeCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
  routeHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f4f6f9' },
  routeIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(10, 25, 49, 0.05)', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  routeName: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  vehicleText: { fontSize: 11, fontWeight: '600', color: '#64748b', marginTop: 1 },
  studentCountBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(253, 184, 19, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  studentCountText: { fontSize: 12, fontWeight: '800', color: '#0A1931' },

  stopsSection: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f4f6f9' },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: '#64748b', letterSpacing: 0.5, marginBottom: 6 },
  stopsContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  stopBadge: { backgroundColor: 'rgba(10, 25, 49, 0.05)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  stopText: { fontSize: 10, fontWeight: '700', color: '#0A1931' },
  stopArrow: { color: '#cbd5e1', fontSize: 11 },

  studentsSection: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 },
  studentItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f4f6f9' },
  studentAvatar: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  studentAvatarText: { fontSize: 12, fontWeight: '800', color: '#475569' },
  studentName: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  studentPickup: { fontSize: 11, color: '#64748b', marginTop: 1 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { marginTop: 16, fontSize: 16, fontWeight: '900', color: '#0f172a' },
  emptyText: { marginTop: 4, fontSize: 13, color: '#64748b' },
});
