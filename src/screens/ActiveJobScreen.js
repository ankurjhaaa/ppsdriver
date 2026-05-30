import React, { useContext, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, Platform, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, NavigationArrow, MapPin, GasPump, MagnifyingGlass, Check, Info } from 'phosphor-react-native';
import { LocationContext } from '../context/LocationContext';
import api from '../api/axios';

export default function ActiveJobScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { currentJob, currentLocation, stopTracking } = useContext(LocationContext);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'pending', 'dropped'
  const [pulse, setPulse] = useState(true);
  const [activeDrops, setActiveDrops] = useState(
    currentJob?.drops?.map(d => d.student_id) || []
  );

  // Pulse effect for live telemetry dot
  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(p => !p);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (currentJob?.drops) {
      setActiveDrops(currentJob.drops.map(d => d.student_id));
    }
  }, [currentJob]);

  const dropStudent = async (studentId) => {
    try {
      const lat = currentLocation?.coords?.latitude || null;
      const lng = currentLocation?.coords?.longitude || null;

      await api.post('/drop-student', {
        student_id: studentId,
        latitude: lat,
        longitude: lng,
      });

      setActiveDrops(prev => [...prev, studentId]);
      Alert.alert('Student Dropped', 'Student marked as dropped successfully.');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to record student drop');
    }
  };

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
                latitude: currentLocation?.coords?.latitude || 25.7771,
                longitude: currentLocation?.coords?.longitude || 87.4753,
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
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No active job found.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('MainTabs')}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Filter students array based on search query and active tab selection
  const studentsList = currentJob.route?.students || [];
  const filteredStudents = studentsList.filter(st => {
    const name = (st.student?.user?.name || '').toLowerCase();
    const pickup = (st.pickup_point || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = name.includes(query) || pickup.includes(query);

    const isDropped = activeDrops.includes(st.student_id);
    if (activeTab === 'pending') {
      return matchesSearch && !isDropped;
    }
    if (activeTab === 'dropped') {
      return matchesSearch && isDropped;
    }
    return matchesSearch;
  });

  const pendingCount = studentsList.filter(st => !activeDrops.includes(st.student_id)).length;
  const droppedCount = activeDrops.length;

  return (
    <View style={styles.container}>
      {/* Header Container */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff' }}>
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              {currentJob.job_type === 'route' ? 'School Route' : 'Other Trip'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {currentJob.route?.route_name || currentJob.reason || 'Active Trip'}
            </Text>
          </View>
          <View style={styles.telemetryBadge}>
            <View style={[styles.pulseDot, { opacity: pulse ? 1 : 0.3 }]} />
            <Text style={styles.telemetryText}>Live</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Live Telemetry Info Panel */}
        <View style={styles.telemetryPanel}>
          <View style={styles.telemetryRow}>
            <NavigationArrow color="#10b981" size={20} weight="fill" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.telemetryStatusTitle}>Location Service Active</Text>
              <Text style={styles.telemetryStatusDesc}>Sending GPS telemetry every 5 seconds</Text>
            </View>
          </View>
        </View>

        {/* Trip Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <GasPump color="#6b7280" size={16} />
              <Text style={styles.statLabel}>VEHICLE</Text>
            </View>
            <Text style={styles.statValue}>{currentJob.vehicle?.vehicle_number || 'N/A'}</Text>
            <Text style={styles.statSubText}>{currentJob.vehicle?.fuel_type || 'Fuel'}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <MapPin color="#6b7280" size={16} />
              <Text style={styles.statLabel}>STOPS</Text>
            </View>
            <Text style={styles.statValue}>{currentJob.route?.stops?.length || 0}</Text>
            <Text style={styles.statSubText}>Enroute locations</Text>
          </View>
        </View>

        {/* Student Management Board */}
        {currentJob.job_type === 'route' && (
          <View style={styles.boardContainer}>
            <View style={styles.boardHeaderRow}>
              <Text style={styles.boardTitle}>Students List</Text>
              <Text style={styles.boardCount}>
                {droppedCount}/{studentsList.length} dropped
              </Text>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <MagnifyingGlass color="#9ca3af" size={20} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search students by name or pickup..."
                placeholderTextColor="#9ca3af"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Filter Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'all' && styles.tabButtonActive]}
                onPress={() => setActiveTab('all')}
              >
                <Text style={[styles.tabButtonText, activeTab === 'all' && styles.tabButtonTextActive]}>
                  All ({studentsList.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'pending' && styles.tabButtonActive]}
                onPress={() => setActiveTab('pending')}
              >
                <Text style={[styles.tabButtonText, activeTab === 'pending' && styles.tabButtonTextActive]}>
                  Pending ({pendingCount})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'dropped' && styles.tabButtonActive]}
                onPress={() => setActiveTab('dropped')}
              >
                <Text style={[styles.tabButtonText, activeTab === 'dropped' && styles.tabButtonTextActive]}>
                  Dropped ({droppedCount})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Students Listing */}
            {filteredStudents.length > 0 ? (
              filteredStudents.map((st, i) => {
                const isDropped = activeDrops.includes(st.student_id);
                return (
                  <View 
                    key={st.id || i} 
                    style={[styles.studentCard, isDropped && styles.studentCardDropped]}
                  >
                    <View style={styles.studentInitialContainer}>
                      <Text style={styles.studentInitial}>
                        {st.student?.user?.name?.charAt(0) || 'S'}
                      </Text>
                    </View>

                    <View style={styles.studentDetails}>
                      <Text style={[styles.studentName, isDropped && styles.studentNameDropped]}>
                        {st.student?.user?.name || 'Unknown Student'}
                      </Text>
                      <View style={styles.pickupPointRow}>
                        <MapPin size={12} color="#9ca3af" style={{ marginRight: 4 }} />
                        <Text style={styles.pickupPointText}>
                          {st.pickup_point || 'No pickup point listed'}
                        </Text>
                      </View>
                    </View>

                    {isDropped ? (
                      <View style={styles.dropSuccessBadge}>
                        <Check size={14} color="#15803d" weight="bold" />
                        <Text style={styles.dropSuccessText}>Dropped</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.markDropBtn}
                        onPress={() => dropStudent(st.student_id)}
                      >
                        <Text style={styles.markDropBtnText}>Mark Drop</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            ) : (
              <View style={styles.emptySearchCard}>
                <Info color="#9ca3af" size={24} />
                <Text style={styles.emptySearchText}>No students match criteria</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Footer Area with Complete Trip button */}
      <View style={[styles.footer, { paddingBottom: Math.max(20, insets.bottom + 8) }]}>
        <TouchableOpacity 
          style={styles.endBtn} 
          onPress={endJob}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <CheckCircle color="#fff" size={20} weight="bold" />
              <Text style={styles.endBtnText}>Complete Trip</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: '#f9fafb' },
  container: { flex: 1, backgroundColor: '#f9fafb' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerTitleContainer: { flex: 1, marginRight: 16 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  headerSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  telemetryBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ecfdf5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: '#a7f3d0' },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981', marginRight: 6 },
  telemetryText: { fontSize: 12, fontWeight: 'bold', color: '#047857' },

  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 32 },

  telemetryPanel: { backgroundColor: '#ecfdf5', borderRadius: 10, padding: 16, borderWidth: 1, borderColor: '#a7f3d0', marginBottom: 20 },
  telemetryRow: { flexDirection: 'row', alignItems: 'center' },
  telemetryStatusTitle: { fontSize: 14, fontWeight: 'bold', color: '#065f46' },
  telemetryStatusDesc: { fontSize: 12, color: '#047857', marginTop: 2 },

  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  statHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 },
  statLabel: { fontSize: 10, fontWeight: 'bold', color: '#9ca3af', letterSpacing: 0.5 },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  statSubText: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  boardContainer: { backgroundColor: '#fff', borderRadius: 10, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  boardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  boardTitle: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  boardCount: { fontSize: 13, color: '#6b7280', fontWeight: '500' },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#111827', padding: 0 },

  tabContainer: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 8, padding: 4, marginBottom: 16 },
  tabButton: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  tabButtonActive: { backgroundColor: '#fff' },
  tabButtonText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  tabButtonTextActive: { color: '#2563eb' },

  studentCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', backgroundColor: '#fff', borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  studentCardDropped: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  studentInitialContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  studentInitial: { fontSize: 14, fontWeight: 'bold', color: '#4b5563' },
  studentDetails: { flex: 1, marginRight: 8 },
  studentName: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  studentNameDropped: { textDecorationLine: 'line-through', color: '#15803d' },
  pickupPointRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  pickupPointText: { fontSize: 11, color: '#6b7280' },

  markDropBtn: { backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  markDropBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  dropSuccessBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#d1fae5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#86efac' },
  dropSuccessText: { color: '#15803d', fontSize: 12, fontWeight: 'bold', marginLeft: 4 },

  emptySearchCard: { alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', borderStyle: 'dashed' },
  emptySearchText: { marginTop: 8, fontSize: 13, color: '#9ca3af' },

  footer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  endBtn: { backgroundColor: '#ef4444', borderRadius: 10, padding: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  endBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 16, color: '#6b7280', marginBottom: 20 },
  backBtn: { backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 6 },
  backBtnText: { color: '#fff', fontWeight: 'bold' }
});
