import React, { useContext, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, TextInput, Modal, TouchableWithoutFeedback, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, MapPin, MagnifyingGlass, Check, GasPump, Clock, NavigationArrow, Users } from 'phosphor-react-native';
import { LocationContext, getPersistedRouteCoordinates, clearPersistedData } from '../context/LocationContext';
import * as Location from 'expo-location';
import api from '../api/axios';
import CurvedHeader from '../components/CurvedHeader';

export default function ActiveJobScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { currentJob, setCurrentJob, currentLocation, stopTracking } = useContext(LocationContext);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [pulse, setPulse] = useState(true);
  const [activeActions, setActiveActions] = useState(
    currentJob?.actions?.map(a => a.student_id) || []
  );
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [tripSummary, setTripSummary] = useState({ distance: 0, credit: 0 });
  const [cachedJob, setCachedJob] = useState(currentJob);
  const [isScreenReady, setIsScreenReady] = useState(false);

  const [extraStudents, setExtraStudents] = useState([]);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchModalY = React.useRef(new Animated.Value(800)).current;
  const openSearchModal = () => { setSearchModalVisible(true); searchModalY.setValue(800); };
  const startSearchSlideUp = () => { Animated.timing(searchModalY, { toValue: 0, duration: 300, useNativeDriver: true }).start(); };
  const closeSearchModal = () => { Animated.timing(searchModalY, { toValue: 800, duration: 250, useNativeDriver: true }).start(() => { setSearchModalVisible(false); setStudentSearchQuery(''); setSearchResults([]); }); };


  const confirmModalY = React.useRef(new Animated.Value(600)).current;
  const summaryModalY = React.useRef(new Animated.Value(600)).current;

  const openConfirmModal = () => { setConfirmModalVisible(true); confirmModalY.setValue(600); };
  const startConfirmSlideUp = () => { Animated.timing(confirmModalY, { toValue: 0, duration: 300, useNativeDriver: true }).start(); };
  const closeConfirmModal = (callback) => { Animated.timing(confirmModalY, { toValue: 600, duration: 250, useNativeDriver: true }).start(() => { setConfirmModalVisible(false); if (typeof callback === 'function') callback(); }); };

  const openSummaryModal = () => { setSummaryModalVisible(true); summaryModalY.setValue(600); };
  const startSummarySlideUp = () => { Animated.timing(summaryModalY, { toValue: 0, duration: 300, useNativeDriver: true }).start(); };
  const closeSummaryModal = (callback) => { Animated.timing(summaryModalY, { toValue: 600, duration: 250, useNativeDriver: true }).start(() => { setSummaryModalVisible(false); if (typeof callback === 'function') callback(); }); };

  useEffect(() => {
    const timer = setTimeout(() => setIsScreenReady(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (currentJob) setCachedJob(currentJob);
  }, [currentJob]);

  useEffect(() => {
    const interval = setInterval(() => setPulse(p => !p), 800);
    return () => clearInterval(interval);
  }, []);

  const displayJob = currentJob || cachedJob;

  useEffect(() => {
    if (displayJob?.actions) setActiveActions(displayJob.actions.map(a => a.student_id));
  }, [displayJob]);

  const performAction = async (studentId) => {
    const actionType = displayJob?.trip_direction === 'to_school' ? 'pickup' : 'drop';
    try {
      const lat = currentLocation?.coords?.latitude || null;
      const lng = currentLocation?.coords?.longitude || null;
      await api.post('/student-action', { student_id: studentId, action_type: actionType, latitude: lat, longitude: lng });
      setActiveActions(prev => [...prev, studentId]);
      
      // Update global context so state persists if user navigates away and back
      if (setCurrentJob) {
        setCurrentJob(prev => {
          if (!prev) return prev;
          const newAction = { student_id: studentId, action_type: actionType, action_at: new Date().toISOString() };
          return { ...prev, actions: [...(prev.actions || []), newAction] };
        });
      }
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || `Failed to record ${actionType}`);
    }
  };

  const performStudentSearch = async (query) => {
    setStudentSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await api.get('/students/search', { params: { q: query } });
      setSearchResults(res.data?.data || []);
    } catch (e) {
      // ignore
    } finally {
      setIsSearching(false);
    }
  };

  const addExtraStudent = (student) => {
    const isAlreadyAdded = extraStudents.some(s => s.student_id === student.id) || (displayJob?.route?.students || []).some(s => s.student_id === student.id);
    if (!isAlreadyAdded) {
      const routeStudent = {
        student_id: student.id,
        pickup_point: `Ad-hoc (${student.class_section})`,
        student: { user: { name: student.name } }
      };
      setExtraStudents(prev => [...prev, routeStudent]);
    }
    closeSearchModal();
  };

  const confirmEndJob = () => {
    if (!isScreenReady) return;
    openConfirmModal();
  };

  const processEndJob = async () => {
    closeConfirmModal(async () => {
      setIsLoading(true);
      try {
        let lat = currentLocation?.coords?.latitude;
        let lng = currentLocation?.coords?.longitude;
      
      // Read from persistent storage (survives app kills, background termination)
      let routeCoords = await getPersistedRouteCoordinates();
      console.log(`[EndJob] Retrieved ${routeCoords.length} points from persistent store`);

      // If we don't have a UI location yet, try to use the last known route coordinate or fetch it
      if (!lat || !lng) {
        if (routeCoords.length > 0) {
          lat = routeCoords[routeCoords.length - 1].latitude;
          lng = routeCoords[routeCoords.length - 1].longitude;
        } else {
          try {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            lat = loc.coords.latitude;
            lng = loc.coords.longitude;
          } catch (e) {
            lat = 25.7771; // Absolute fallback
            lng = 87.4753;
          }
        }
      }
      
      // Ensure at least 2 points exist so the backend can generate and save a polyline
      if (routeCoords.length === 1) {
        routeCoords.push({ latitude: lat, longitude: lng, timestamp: Date.now() });
      } else if (routeCoords.length === 0) {
        routeCoords.push({ latitude: lat, longitude: lng, timestamp: Date.now() - 1000 });
        routeCoords.push({ latitude: lat, longitude: lng, timestamp: Date.now() });
      }
      
      const response = await api.post('/job/end', { 
        job_id: displayJob?.id, 
        latitude: lat, 
        longitude: lng,
        route_coordinates: routeCoords
      });
      stopTracking();
      
      // Clear persistent storage after successful submission
      await clearPersistedData();
      console.log('[EndJob] Persistent location data cleared');
      
      const distance = response.data.summary?.total_km || response.data.distance || 0;
      const credit = response.data.summary?.wallet_credited || response.data.wallet_credit || 0;
      
      setTripSummary({ distance, credit });
      setIsLoading(false);
      openSummaryModal();
    } catch (e) {
      setIsLoading(false);
      Alert.alert('Error', e.response?.data?.message || 'Failed to end job');
    }
    });
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FDB813" />
          <Text style={styles.loadingText}>Completing Trip & Updating Wallet...</Text>
        </View>
      );
    }

    if (!displayJob) {
      return (
        <View style={{ flex: 1 }}>
          <CurvedHeader title="Active Trip" showBack onBack={() => navigation.navigate('MainTabs')} />
          <View style={styles.emptyContainer}>
            <NavigationArrow color="#cbd5e1" size={48} weight="fill" />
            <Text style={styles.emptyTitle}>No active job found</Text>
            <Text style={styles.emptyText}>Start a new trip from the home page.</Text>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('MainTabs')}>
              <Text style={styles.backBtnText}>Go to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    const baseStudents = displayJob.route?.students || [];
    const studentsList = [...baseStudents, ...extraStudents];
    
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
    const isToSchool = displayJob?.trip_direction === 'to_school';

    return (
      <View style={styles.container}>
        <CurvedHeader 
          title={displayJob.job_type === 'route' ? (isToSchool ? 'To School' : 'From School') : 'Ad-hoc Trip'}
          subtitle={displayJob.route?.route_name || displayJob.reason || 'Active Trip'}
          showBack onBack={() => navigation.navigate('MainTabs')}
        />

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.liveBanner}>
            <View style={styles.liveBannerLeft}>
              <View style={[styles.pulseDot, { opacity: pulse ? 1 : 0.3 }]} />
              <Text style={styles.liveBannerTitle}>Location Tracking Active</Text>
            </View>
            <Text style={styles.liveBannerSub}>GPS streaming every 1s</Text>
          </View>

          <View style={styles.tripInfoCard}>
            <View style={styles.tripInfoRow}>
              <View style={styles.tripInfoItem}>
                <MapPin color="#3b82f6" size={16} weight="fill" />
                <Text style={styles.tripInfoLabel}>ROUTE</Text>
                <Text style={styles.tripInfoValue}>{displayJob.route?.route_name || displayJob.reason || 'Custom Trip'}</Text>
              </View>
              <View style={styles.tripInfoDivider} />
              <View style={styles.tripInfoItem}>
                <GasPump color="#FDB813" size={16} weight="fill" />
                <Text style={styles.tripInfoLabel}>VEHICLE</Text>
                <Text style={styles.tripInfoValue}>{displayJob.vehicle?.vehicle_number || 'N/A'}</Text>
              </View>
              <View style={styles.tripInfoDivider} />
              <View style={styles.tripInfoItem}>
                <Users color="#8b5cf6" size={16} weight="fill" />
                <Text style={styles.tripInfoLabel}>STUDENTS</Text>
                <Text style={styles.tripInfoValue}>{actionCount}/{studentsList.length}</Text>
              </View>
            </View>
          </View>

          {displayJob.job_type === 'route' && (
            <View style={styles.boardContainer}>
              <View style={styles.boardHeaderRow}>
                <Text style={styles.boardTitle}>Students</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TouchableOpacity style={styles.addExceptionBtn} onPress={openSearchModal} activeOpacity={0.7}>
                    <Text style={styles.addExceptionBtnText}>+ Add Extra</Text>
                  </TouchableOpacity>
                  <View style={styles.progressBadge}>
                    <Text style={styles.progressText}>{actionCount}/{studentsList.length} {isToSchool ? 'picked' : 'dropped'}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.searchContainer}>
                <MagnifyingGlass color="#94a3b8" size={18} />
                <TextInput style={styles.searchInput} placeholder="Search students..." placeholderTextColor="#94a3b8" value={searchQuery} onChangeText={setSearchQuery} />
              </View>

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

        <View style={[styles.footer, { paddingBottom: Math.max(20, insets.bottom + 8) }]}>
          <TouchableOpacity style={styles.endBtn} onPress={confirmEndJob} disabled={isLoading || !isScreenReady} activeOpacity={0.85}>
            <CheckCircle color="#fff" size={20} weight="bold" />
            <Text style={styles.endBtnText}>Complete Trip</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      {renderContent()}

      <Modal visible={confirmModalVisible} transparent animationType="fade" onRequestClose={() => closeConfirmModal()} onShow={startConfirmSlideUp}>
        <TouchableOpacity activeOpacity={1} style={styles.modalOverlay} onPress={() => closeConfirmModal()}>
          <TouchableWithoutFeedback>
            <Animated.View style={[styles.modalContent, { transform: [{ translateY: confirmModalY }], paddingBottom: Math.max(24, insets.bottom + 20) }]}>
              <View style={styles.dragHandle} />
              <View style={[styles.modalIconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                <CheckCircle color="#ef4444" size={28} weight="fill" />
              </View>
              <Text style={styles.modalTitle}>Complete Trip</Text>
              <Text style={styles.modalSub}>Are you sure you want to end this trip? You won't be able to undo this action.</Text>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => closeConfirmModal()}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirmBtn} onPress={processEndJob}>
                  <Text style={styles.modalConfirmText}>Complete</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      <Modal visible={summaryModalVisible} transparent animationType="fade" onRequestClose={() => closeSummaryModal()} onShow={startSummarySlideUp}>
        <TouchableOpacity activeOpacity={1} style={styles.modalOverlay} onPress={() => closeSummaryModal(() => navigation.navigate('MainTabs'))}>
          <TouchableWithoutFeedback>
            <Animated.View style={[styles.modalContent, { transform: [{ translateY: summaryModalY }], paddingBottom: Math.max(24, insets.bottom + 20) }]}>
              <View style={styles.dragHandle} />
              <View style={styles.summaryTop}>
                <View style={[styles.modalIconWrap, { backgroundColor: 'rgba(5, 150, 105, 0.1)' }]}>
                  <CheckCircle color="#059669" size={34} weight="fill" />
                </View>
                <Text style={styles.modalTitle}>Trip Completed!</Text>
                <Text style={styles.modalSub}>Great job. Your wallet has been updated.</Text>
              </View>

              <View style={styles.summaryGrid}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Distance</Text>
                  <Text style={styles.summaryValue}>{tripSummary?.distance} <Text style={{ fontSize: 14 }}>km</Text></Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Earned</Text>
                  <Text style={[styles.summaryValue, { color: '#059669' }]}>₹{tripSummary?.credit}</Text>
                </View>
              </View>
              
              <TouchableOpacity style={styles.modalHomeBtn} onPress={() => closeSummaryModal(() => navigation.navigate('MainTabs'))}>
                <Text style={styles.modalHomeText}>Back to Home</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      <Modal visible={searchModalVisible} transparent animationType="fade" onRequestClose={closeSearchModal} onShow={startSearchSlideUp}>
        <TouchableOpacity activeOpacity={1} style={styles.modalOverlay} onPress={closeSearchModal}>
          <TouchableWithoutFeedback>
            <Animated.View style={[styles.modalContent, { transform: [{ translateY: searchModalY }], paddingBottom: Math.max(24, insets.bottom + 20), height: '80%' }]}>
              <View style={styles.dragHandle} />
              <Text style={styles.modalTitle}>Search Exception Student</Text>
              <Text style={[styles.modalSub, { marginBottom: 12 }]}>Add a student not listed in your route.</Text>
              
              <View style={[styles.searchContainer, { width: '100%', marginBottom: 16 }]}>
                <MagnifyingGlass color="#94a3b8" size={18} />
                <TextInput style={styles.searchInput} placeholder="Search by name or admission no..." placeholderTextColor="#94a3b8" value={studentSearchQuery} onChangeText={performStudentSearch} autoFocus />
              </View>
              
              {isSearching ? <ActivityIndicator color="#FDB813" style={{ marginTop: 30 }} /> : (
                <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
                  {searchResults.map(st => (
                    <TouchableOpacity key={st.id} style={styles.searchResultItem} onPress={() => addExtraStudent(st)}>
                      <View style={styles.studentAvatar}>
                         <Text style={styles.studentAvatarText}>{st.name?.charAt(0)}</Text>
                      </View>
                      <View style={styles.studentDetails}>
                         <Text style={styles.studentName}>{st.name}</Text>
                         <Text style={styles.pickupText}>{st.admission_no} • {st.class_section}</Text>
                      </View>
                      <View style={styles.addBtn}>
                        <Text style={styles.addBtnText}>Add</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                  {studentSearchQuery.length >= 2 && searchResults.length === 0 && (
                    <Text style={{ textAlign: 'center', marginTop: 30, color: '#64748b', fontSize: 13, fontWeight: '500' }}>No students found matching "{studentSearchQuery}"</Text>
                  )}
                  {studentSearchQuery.length < 2 && (
                    <Text style={{ textAlign: 'center', marginTop: 30, color: '#94a3b8', fontSize: 13, fontWeight: '500' }}>Type at least 2 characters to search</Text>
                  )}
                </ScrollView>
              )}
            </Animated.View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A1931' },
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 20 },
  liveBanner: { backgroundColor: '#0A1931', borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  liveBannerLeft: { flexDirection: 'row', alignItems: 'center' },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ade80', marginRight: 8 },
  liveBannerTitle: { color: '#fff', fontSize: 13, fontWeight: '700' },
  liveBannerSub: { color: '#FDB813', fontSize: 11, fontWeight: '600' },
  tripInfoCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 14, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
  tripInfoRow: { flexDirection: 'row', alignItems: 'flex-start' },
  tripInfoItem: { flex: 1, alignItems: 'center' },
  tripInfoDivider: { width: 1, backgroundColor: '#e2e8f0', height: '100%' },
  tripInfoLabel: { fontSize: 9, fontWeight: '800', color: '#64748b', letterSpacing: 0.5, marginTop: 6, marginBottom: 4 },
  tripInfoValue: { fontSize: 13, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  boardContainer: { backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
  boardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  boardTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  progressBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  progressText: { fontSize: 11, fontWeight: '700', color: '#1d4ed8' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f4f6f9', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 13, color: '#0f172a', padding: 0 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#f4f6f9', borderRadius: 8, padding: 3, marginBottom: 14 },
  tabButton: { flex: 1, paddingVertical: 7, borderRadius: 6, alignItems: 'center' },
  tabButtonActive: { backgroundColor: '#0A1931' },
  tabButtonText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  tabButtonTextActive: { color: '#FDB813' },
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
  actionBtn: { backgroundColor: '#0A1931', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  actionBtnText: { color: '#FDB813', fontSize: 11, fontWeight: '800' },
  doneBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, gap: 4 },
  doneText: { color: '#059669', fontSize: 11, fontWeight: '800' },
  noResults: { padding: 20, alignItems: 'center' },
  noResultsText: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(10, 25, 49, 0.65)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, width: '100%', alignItems: 'center', paddingBottom: 24 },
  dragHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', marginBottom: 16 },
  modalIconWrap: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 6, textAlign: 'center' },
  modalSub: { fontSize: 12, color: '#64748b', textAlign: 'center', lineHeight: 18, marginBottom: 20, paddingHorizontal: 10 },
  modalButtons: { flexDirection: 'row', gap: 10, width: '100%' },
  modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  modalConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#ef4444', alignItems: 'center' },
  modalConfirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  summaryTop: { alignItems: 'center', marginBottom: 16 },
  summaryGrid: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 20 },
  summaryCard: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  summaryLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  summaryValue: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  modalHomeBtn: { backgroundColor: '#0A1931', width: '100%', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  modalHomeText: { color: '#fff', fontSize: 14, fontWeight: '800' },
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
  addExceptionBtn: { backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: '#fde68a' },
  addExceptionBtnText: { color: '#d97706', fontSize: 11, fontWeight: '800' },
  searchResultItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  addBtn: { backgroundColor: '#0A1931', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  addBtnText: { color: '#FDB813', fontSize: 10, fontWeight: '800' }
});
