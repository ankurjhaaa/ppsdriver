import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClockCounterClockwise, MapPin, GasPump, NavigationArrow, CheckCircle, WarningCircle } from 'phosphor-react-native';
import api from '../api/axios';

export default function JobHistoryScreen() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchJobs = async () => {
    try {
      const response = await api.get('/jobs');
      setJobs(response.data.jobs || []);
    } catch (e) {
      console.log('Error fetching jobs', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const getStatusConfig = (status) => {
    switch(status) {
      case 'completed': return { color: '#059669', bg: '#ecfdf5', icon: <CheckCircle color="#059669" size={16} weight="fill" />, text: 'Completed' };
      case 'in_progress': return { color: '#d97706', bg: '#fffbeb', icon: <NavigationArrow color="#d97706" size={16} weight="fill" />, text: 'In Progress' };
      case 'cancelled': return { color: '#dc2626', bg: '#fef2f2', icon: <WarningCircle color="#dc2626" size={16} weight="fill" />, text: 'Cancelled' };
      default: return { color: '#4b5563', bg: '#f3f4f6', icon: <CheckCircle color="#4b5563" size={16} weight="fill" />, text: status };
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Job History</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}
      >
        {jobs.length > 0 ? (
          jobs.map((job) => {
            const statusConfig = getStatusConfig(job.status);
            
            return (
              <View key={job.id} style={styles.jobCard}>
                <View style={styles.jobHeader}>
                  <View style={styles.dateContainer}>
                    <Text style={styles.dateText}>
                      {new Date(job.started_at).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                    {statusConfig.icon}
                    <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.text}</Text>
                  </View>
                </View>

                <View style={styles.jobBody}>
                  <View style={styles.infoRow}>
                    <View style={styles.iconBox}><MapPin color="#6b7280" size={18} weight="fill" /></View>
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Route / Reason</Text>
                      <Text style={styles.infoValue}>{job.route?.route_name || job.reason || 'Ad-hoc Trip'}</Text>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <View style={styles.iconBox}><GasPump color="#6b7280" size={18} weight="fill" /></View>
                    <View style={styles.infoTextContainer}>
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
                      <Text style={styles.metricLabel}>FUEL COST</Text>
                      <Text style={styles.metricValue}><Text style={styles.metricUnit}>₹</Text>{job.fuel_cost ? job.fuel_cost.toLocaleString() : 0}</Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <ClockCounterClockwise color="#d1d5db" size={48} weight="fill" />
            <Text style={styles.emptyTitle}>No Job History</Text>
            <Text style={styles.emptyText}>You haven't completed any trips yet.</Text>
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
  
  jobCard: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#f3f4f6', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, overflow: 'hidden' },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  dateContainer: { flex: 1 },
  dateText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  
  jobBody: { padding: 16, gap: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  infoTextContainer: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  
  jobFooter: { flexDirection: 'row', backgroundColor: '#f8fafc', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  metric: { flex: 1, padding: 16, alignItems: 'center' },
  metricDivider: { width: 1, backgroundColor: '#f1f5f9' },
  metricLabel: { fontSize: 10, fontWeight: 'bold', color: '#94a3b8', letterSpacing: 0.5, marginBottom: 4 },
  metricValue: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  metricUnit: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  
  emptyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f3f4f6', borderStyle: 'dashed', marginTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
});
