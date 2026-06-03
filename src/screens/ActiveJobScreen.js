import React, { useContext, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, MapPin, MagnifyingGlass, Check, GasPump, Clock, NavigationArrow, Users } from 'phosphor-react-native';
import { LocationContext } from '../context/LocationContext';
import api from '../api/axios';
import CurvedHeader from '../components/CurvedHeader';

export default function ActiveJobScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { currentJob, currentLocation, stopTracking } = useContext(LocationContext);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [pulse, setPulse] = useState(true);
  const [activeActions, setActiveActions] = useState(
    currentJob?.actions?.map(a => a.student_id) || []
  );

  useEffect(() => {
    const interval = setInterval(() => setPulse(p => !p), 800);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (currentJob?.actions) setActiveActions(currentJob.actions.map(a => a.student_id));
  }, [currentJob]);

  const performAction = async (studentId) => {
    const actionType = currentJob?.trip_direction === 'to_school' ? 'pickup' : 'drop';
    try {
      const lat = currentLocation?.coords?.latitude || null;
      const lng = currentLocation?.coords?.longitude || null;
      await api.post('/student-action', { student_id: studentId, action_type: actionType, latitude: lat, longitude: lng });
      setActiveActions(prev => [...prev, studentId]);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || `Failed to record ${actionType}`);
    }
  };

  const endJob = async () => {
    Alert.alert('Complete Trip', 'Are you sure you want to complete this trip?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Complete', style: 'destructive', onPress: async () => {
        setIsLoading(true);
        try {
          const lat = currentLocation?.coords?.latitude || 25.7771;
          const lng = currentLocation?.coords?.longitude || 87.4753;
          const response = await api.post('/job/end', { job_id: currentJob?.id, latitude: lat, longitude: lng });
          stopTracking();
          const distance = response.data.summary?.total_km || response.data.distance || 0;
          const credit = response.data.summary?.wallet_credited || response.data.wallet_credit || 0;
          Alert.alert('Trip Completed', `Distance: ${distance} km\nEarned: ₹${credit}`, [
            { text: 'OK', onPress: () => navigation.navigate('MainTabs') }
          ]);
        } catch (e) { Alert.alert('Error', e.response?.data?.message || 'Failed to end job'); }
        finally { setIsLoading(false); }
      }}
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FDB813" />
        <Text style={styles.loadingText}>Completing Trip & Updating Wallet...</Text>
      </SafeAreaView>
    );
  }

  if (!currentJob) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <CurvedHeader title="Active Trip" showBack onBack={() => navigation.navigate('MainTabs')} />
        <View style={styles.emptyContainer}>
          <NavigationArrow color="#cbd5e1" size={48} weight="fill" />
          <Text style={styles.emptyTitle}>No active job found</Text>
          <Text style={styles.emptyText}>Start a new trip from the home page.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('MainTabs')}>
            <Text style={styles.backBtnText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const studentsList = currentJob.route?.students || [];
  const filteredStudents = studentsList.filter(st => {
    const name = (st.student?.user?.name || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = name.includes(query);
    const hasAction = activeActions.includes(st.student_id);
    if (activeTab === 'pending') return matchesSearch && !hasAction;
    if (activeTab === 'done') return matchesSearch && hasAction;
    return matchesSearch;
  });

  const pendingCount = studentsList.filter(st => !activeActions.includes(st.student_id)).length;
  const actionCount = activeActions.length;
  const isToSchool = currentJob?.trip_direction === 'to_school';

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <CurvedHeader 
        title={currentJob.job_type === 'route' ? (isToSchool ? 'To School' : 'From School') : 'Ad-hoc Trip'}
        subtitle={currentJob.route?.route_name || currentJob.reason || 'Active Trip'}
        showBack onBack={() => navigation.navigate('MainTabs')}
      />

      <View style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Live Tracking Banner */}
          <View style={styles.liveBanner}>
            <View style={styles.liveBannerLeft}>
              <View style={[styles.pulseDot, { opacity: pulse ? 1 : 0.3 }]} />
              <Text style={styles.liveBannerTitle}>Location Tracking Active</Text>
            </View>
            <Text style={styles.liveBannerSub}>GPS streaming every 1s</Text>
          </View>

          {/* Trip Info Card */}
          <View style={styles.tripInfoCard}>
            <View style={styles.tripInfoRow}>
              <View style={styles.tripInfoItem}>
                <MapPin color="#3b82f6" size={16} weight="fill" />
                <Text style={styles.tripInfoLabel}>ROUTE</Text>
                <Text style={styles.tripInfoValue}>{currentJob.route?.route_name || currentJob.reason || 'Custom Trip'}</Text>
              </View>
              <View style={styles.tripInfoDivider} />
              <View style={styles.tripInfoItem}>
                <GasPump color="#FDB813" size={16} weight="fill" />
                <Text style={styles.tripInfoLabel}>VEHICLE</Text>
                <Text style={styles.tripInfoValue}>{currentJob.vehicle?.vehicle_number || 'N/A'}</Text>
              </View>
              <View style={styles.tripInfoDivider} />
              <View style={styles.tripInfoItem}>
                <Users color="#8b5cf6" size={16} weight="fill" />
                <Text style={styles.tripInfoLabel}>STUDENTS</Text>
                <Text style={styles.tripInfoValue}>{actionCount}/{studentsList.length}</Text>
              </View>
            </View>
          </View>

          {/* Student Management Board */}
          {currentJob.job_type === 'route' && (
            <View style={styles.boardContainer}>
              <View style={styles.boardHeaderRow}>
                <Text style={styles.boardTitle}>Students</Text>
                <View style={styles.progressBadge}>
                  <Text style={styles.progressText}>{actionCount}/{studentsList.length} {isToSchool ? 'picked' : 'dropped'}</Text>
                </View>
              </View>

              {/* Search */}
              <View style={styles.searchContainer}>
                <MagnifyingGlass color="#94a3b8" size={18} />
                <TextInput style={styles.searchInput} placeholder="Search students..." placeholderTextColor="#94a3b8" value={searchQuery} onChangeText={setSearchQuery} />
              </View>

              {/* Tabs */}
              <View style={styles.tabContainer}>
                {[
                  { key: 'all', label: `All (${studentsList.length})` },
                  { key: 'pending', label: `Pending (${pendingCount})` },
                  { key: 'done', label: `${isToSchool ? 'Picked' : 'Dropped'} (${actionCount})` },
                ].map(tab => (
                  <TouchableOpacity key={tab.key} style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]} onPress={() => setActiveTab(tab.key)}>
                    <Text style={[styles.tabButtonText, activeTab === tab.key && styles.tabButtonTextActive]}>{tab.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Student List */}
              {filteredStudents.map((st, i) => {
                const hasAction = activeActions.includes(st.student_id);
                return (
                  <View key={st.id || i} style={[styles.studentCard, hasAction && styles.studentCardDone]}>
                    <View style={[styles.studentAvatar, hasAction && styles.studentAvatarDone]}>
                      <Text style={[styles.studentAvatarText, hasAction && { color: '#059669' }]}>{st.student?.user?.name?.charAt(0) || 'S'}</Text>
                    </View>
                    <View style={styles.studentDetails}>
                      <Text style={[styles.studentName, hasAction && styles.studentNameDone]}>{st.student?.user?.name || 'Unknown'}</Text>
                      <View style={styles.pickupRow}>
                        <MapPin size={11} color="#94a3b8" />
                        <Text style={styles.pickupText}>{st.pickup_point || 'No pickup point'}</Text>
                      </View>
                    </View>
                    {hasAction ? (
                      <View style={styles.doneBadge}>
                        <Check size={12} color="#059669" weight="bold" />
                        <Text style={styles.doneText}>{isToSchool ? 'Picked' : 'Dropped'}</Text>
                      </View>
                    ) : (
                      <TouchableOpacity style={styles.actionBtn} onPress={() => performAction(st.student_id)} activeOpacity={0.8}>
                        <Text style={styles.actionBtnText}>{isToSchool ? 'Pick Up' : 'Drop'}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
              {filteredStudents.length === 0 && (
                <View style={styles.noResults}><Text style={styles.noResultsText}>No students match</Text></View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: Math.max(20, insets.bottom + 8) }]}>
          <TouchableOpacity style={styles.endBtn} onPress={endJob} disabled={isLoading} activeOpacity={0.85}>
            {isLoading ? <ActivityIndicator color="#fff" /> : (
              <>
                <CheckCircle color="#fff" size={20} weight="bold" />
                <Text style={styles.endBtnText}>Complete Trip</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A1931' },
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 20 },

  // Live Banner
  liveBanner: { backgroundColor: '#0A1931', borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  liveBannerLeft: { flexDirection: 'row', alignItems: 'center' },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ade80', marginRight: 8 },
  liveBannerTitle: { color: '#fff', fontSize: 13, fontWeight: '700' },
  liveBannerSub: { color: '#FDB813', fontSize: 11, fontWeight: '600' },

  // Trip Info
  tripInfoCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 14, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
  tripInfoRow: { flexDirection: 'row', alignItems: 'flex-start' },
  tripInfoItem: { flex: 1, alignItems: 'center' },
  tripInfoDivider: { width: 1, backgroundColor: '#e2e8f0', height: '100%' },
  tripInfoLabel: { fontSize: 9, fontWeight: '800', color: '#64748b', letterSpacing: 0.5, marginTop: 6, marginBottom: 4 },
  tripInfoValue: { fontSize: 13, fontWeight: '800', color: '#0f172a', textAlign: 'center' },

  // Board
  boardContainer: { backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
  boardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  boardTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  progressBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  progressText: { fontSize: 11, fontWeight: '700', color: '#1d4ed8' },

  // Search
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f4f6f9', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 13, color: '#0f172a', padding: 0 },

  // Tabs
  tabContainer: { flexDirection: 'row', backgroundColor: '#f4f6f9', borderRadius: 8, padding: 3, marginBottom: 14 },
  tabButton: { flex: 1, paddingVertical: 7, borderRadius: 6, alignItems: 'center' },
  tabButtonActive: { backgroundColor: '#0A1931' },
  tabButtonText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  tabButtonTextActive: { color: '#FDB813' },

  // Student Cards
  studentCard: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff', borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#f1f5f9' },
  studentCardDone: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  studentAvatar: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  studentAvatarDone: { backgroundColor: '#dcfce7' },
  studentAvatarText: { fontSize: 14, fontWeight: '800', color: '#475569' },
  studentDetails: { flex: 1, marginRight: 8 },
  studentName: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  studentNameDone: { color: '#16a34a' },
  pickupRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 3 },
  pickupText: { fontSize: 10, color: '#94a3b8', fontWeight: '500' },

  // Buttons
  actionBtn: { backgroundColor: '#0A1931', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  actionBtnText: { color: '#FDB813', fontSize: 11, fontWeight: '800' },
  doneBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, gap: 4 },
  doneText: { color: '#059669', fontSize: 11, fontWeight: '800' },

  noResults: { padding: 20, alignItems: 'center' },
  noResultsText: { fontSize: 13, color: '#94a3b8' },

  // Footer
  footer: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  endBtn: { backgroundColor: '#dc2626', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  endBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Empty
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f4f6f9' },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginTop: 16, marginBottom: 4 },
  emptyText: { fontSize: 14, color: '#64748b', marginBottom: 20 },
  backBtn: { backgroundColor: '#0A1931', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  backBtnText: { color: '#FDB813', fontWeight: '800', fontSize: 14 },
  
  // Loader
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A1931' },
  loadingText: { color: '#fff', marginTop: 12, fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
});
