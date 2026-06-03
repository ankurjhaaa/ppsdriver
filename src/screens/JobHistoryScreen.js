import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClockCounterClockwise, MapPin, GasPump, NavigationArrow, CheckCircle, WarningCircle, CaretRight } from 'phosphor-react-native';
import api from '../api/axios';
import CurvedHeader from '../components/CurvedHeader';

export default function JobHistoryScreen({ navigation }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchJobs = async () => {
    try {
      const response = await api.get('/jobs/history');
      setJobs(response.data.jobs || []);
    } catch (e) { console.log('Error fetching jobs', e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchJobs(); }, []);
  const onRefresh = async () => { setRefreshing(true); await fetchJobs(); setRefreshing(false); };

  if (loading && !refreshing) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#FDB813" /></View>;
  }

  const getStatusConfig = (status) => {
    switch(status) {
      case 'completed': return { color: '#059669', bg: '#ecfdf5', icon: <CheckCircle color="#059669" size={14} weight="fill" />, text: 'Completed' };
      case 'in_progress': return { color: '#0A58CA', bg: '#eff6ff', icon: <NavigationArrow color="#0A58CA" size={14} weight="fill" />, text: 'In Progress' };
      case 'cancelled': return { color: '#dc2626', bg: '#fef2f2', icon: <WarningCircle color="#dc2626" size={14} weight="fill" />, text: 'Cancelled' };
      default: return { color: '#64748b', bg: '#f1f5f9', icon: <CheckCircle color="#64748b" size={14} weight="fill" />, text: status };
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <CurvedHeader title="Job History" />
      <View style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FDB813']} />}
          showsVerticalScrollIndicator={false}
        >
          {jobs.length > 0 ? (
            jobs.map((job) => {
              const sc = getStatusConfig(job.status);
              return (
                <TouchableOpacity key={job.id} style={styles.jobCard} onPress={() => navigation.navigate('JobDetails', { jobId: job.id })} activeOpacity={0.8}>
                  <View style={styles.jobHeader}>
                    <Text style={styles.dateText}>
                      {new Date(job.started_at).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                      {sc.icon}
                      <Text style={[styles.statusText, { color: sc.color }]}>{sc.text}</Text>
                    </View>
                  </View>

                  <View style={styles.jobBody}>
                    <View style={styles.infoRow}>
                      <View style={styles.iconBox}><MapPin color="#0A58CA" size={16} weight="fill" /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoLabel}>Route</Text>
                        <Text style={styles.infoValue}>{job.route?.route_name || job.reason || 'Ad-hoc Trip'}</Text>
                      </View>
                    </View>
                    <View style={styles.infoRow}>
                      <View style={styles.iconBox}><GasPump color="#FDB813" size={16} weight="fill" /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoLabel}>Vehicle</Text>
                        <Text style={styles.infoValue}>{job.vehicle?.vehicle_number} • {job.vehicle?.fuel_type}</Text>
                      </View>
                    </View>
                  </View>

                  {job.status === 'completed' && (
                    <View style={styles.jobFooter}>
                      <View style={styles.metric}>
                        <Text style={styles.metricLabel}>DISTANCE</Text>
                        <Text style={styles.metricValue}>{job.total_distance_km || 0} <Text style={styles.metricUnit}>km</Text></Text>
                      </View>
                      <View style={styles.metricDivider} />
                      <View style={styles.metric}>
                        <Text style={styles.metricLabel}>EARNED</Text>
                        <Text style={[styles.metricValue, { color: '#059669' }]}>₹{job.fuel_cost ? job.fuel_cost.toLocaleString() : 0}</Text>
                      </View>
                      <CaretRight color="#cbd5e1" size={18} weight="bold" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyCard}>
              <ClockCounterClockwise color="#cbd5e1" size={48} weight="fill" />
              <Text style={styles.emptyTitle}>No Trip History</Text>
              <Text style={styles.emptyText}>Completed trips will appear here.</Text>
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
  
  jobCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, overflow: 'hidden', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f4f6f9' },
  dateText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  statusText: { fontSize: 10, fontWeight: '800' },
  
  jobBody: { padding: 14, gap: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f4f6f9', justifyContent: 'center', alignItems: 'center' },
  infoLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '700', letterSpacing: 0.3 },
  infoValue: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  
  jobFooter: { flexDirection: 'row', backgroundColor: '#f8fafc', borderTopWidth: 1, borderTopColor: '#f4f6f9', alignItems: 'center', paddingRight: 14 },
  metric: { flex: 1, padding: 14 },
  metricDivider: { width: 1, height: '50%', backgroundColor: '#e2e8f0' },
  metricLabel: { fontSize: 9, fontWeight: '800', color: '#64748b', letterSpacing: 0.5, marginBottom: 2 },
  metricValue: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  metricUnit: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  
  emptyCard: { paddingVertical: 60, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginTop: 16, marginBottom: 4 },
  emptyText: { fontSize: 13, color: '#64748b' },
});
