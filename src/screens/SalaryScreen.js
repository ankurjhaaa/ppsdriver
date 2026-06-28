import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity, Modal, ScrollView, Alert, TextInput, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bank, CheckCircle, WarningCircle, Receipt, CaretRight, FileText, Image as ImageIcon } from 'phosphor-react-native';
import api from '../api/axios';
import CurvedHeader from '../components/CurvedHeader';

export default function SalaryScreen() {
  const [salaries, setSalaries] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [selectedSalary, setSelectedSalary] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [verifyNote, setVerifyNote] = useState('');

  const fetchSalaries = async (pageNum = 1) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const response = await api.get(`/salaries?page=${pageNum}`);
      const newSalaries = response.data.data || [];

      if (pageNum === 1) {
        setSalaries(newSalaries);
      } else {
        setSalaries(prev => [...prev, ...newSalaries]);
      }

      setHasMore(response.data.current_page < response.data.last_page);
      setPage(pageNum);
    } catch (e) { 
      console.log('[SalaryScreen] Error:', e.message); 
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchSalaries(1); }, []);
  const onRefresh = () => { setRefreshing(true); fetchSalaries(1); };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchSalaries(page + 1);
    }
  };

  const handleVerifyDispute = async (transactionId, status) => {
    try {
      setActionLoading(true);
      await api.post(`/salaries/transactions/${transactionId}/verify`, {
        verifyStatus: status,
        verifyNote: verifyNote
      });
      
      Alert.alert('Success', `Transaction marked as ${status}.`);
      setVerifyNote('');
      setShowModal(false);
      fetchSalaries(1);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Could not process request');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmAction = (transactionId, status) => {
    Alert.alert(
      `Confirm ${status}`,
      `Are you sure you want to mark this payment as ${status}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes', onPress: () => handleVerifyDispute(transactionId, status) }
      ]
    );
  };

  const getStatusColor = (status) => {
    if (!status) return '#64748b';
    const s = status.toLowerCase();
    if (s === 'paid' || s === 'verified') return '#059669'; // Green
    if (s === 'partial' || s === 'under review' || s === 'under_review') return '#d97706'; // Yellow/Orange
    return '#dc2626'; // Red
  };

  const getStatusBgColor = (status) => {
    if (!status) return '#f1f5f9';
    const s = status.toLowerCase();
    if (s === 'paid' || s === 'verified') return '#ecfdf5';
    if (s === 'partial' || s === 'under review' || s === 'under_review') return '#fef3c7';
    return '#fef2f2';
  };

  if (loading && !refreshing && salaries.length === 0) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#FDB813" /></View>;
  }

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.salaryCard}
      onPress={() => { setSelectedSalary(item); setShowModal(true); }}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.monthTag}>
          <Text style={styles.monthText}>{item.month_year}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(item.current_status) }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.current_status) }]}>
            {item.current_status ? item.current_status.replace('_', ' ').toUpperCase() : 'UNKNOWN'}
          </Text>
        </View>
      </View>

      <View style={styles.salaryRow}>
        <Text style={styles.label}>Final Salary:</Text>
        <Text style={styles.value}>₹{Number(item.final_salary).toLocaleString()}</Text>
      </View>
      <View style={styles.salaryRow}>
        <Text style={styles.label}>Paid Amount:</Text>
        <Text style={[styles.value, { color: '#059669' }]}>₹{Number(item.paid_amount).toLocaleString()}</Text>
      </View>
      <View style={styles.salaryRow}>
        <Text style={styles.label}>Pending Amount:</Text>
        <Text style={[styles.value, { color: '#dc2626' }]}>
          ₹{Math.max(0, Number(item.final_salary) - Number(item.paid_amount)).toLocaleString()}
        </Text>
      </View>
      
      {item.transactions?.length > 0 && (
        <View style={styles.footerRow}>
          <Text style={styles.transactionsText}>{item.transactions.length} Transactions</Text>
          <View style={styles.detailsBtn}>
            <Text style={styles.detailsText}>View Details</Text>
            <CaretRight color="#0A1931" size={14} weight="bold" />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyCard}>
      <Receipt color="#cbd5e1" size={40} weight="fill" />
      <Text style={styles.emptyText}>No salary records found</Text>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return <View style={{ height: 20 }} />;
    return <View style={styles.footerLoader}><ActivityIndicator size="small" color="#FDB813" /></View>;
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <CurvedHeader title="My Salaries" />
      <View style={styles.container}>
        <FlatList
          data={salaries}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FDB813']} />}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
        />
      </View>

      {/* Salary Details & Timeline Modal */}
      <Modal visible={showModal} transparent={true} animationType="slide" onRequestClose={() => setShowModal(false)}>
        <TouchableOpacity activeOpacity={1} style={styles.modalOverlay} onPress={() => setShowModal(false)}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Salary Details: {selectedSalary?.month_year}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeBtn}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              
              <Text style={styles.sectionTitle}>PAYMENT HISTORY</Text>
              
              {!selectedSalary?.transactions || selectedSalary.transactions.length === 0 ? (
                <Text style={styles.noDataText}>No transactions yet.</Text>
              ) : (
                <View style={styles.timeline}>
                  {selectedSalary.transactions.map((tx, index) => {
                    const isLast = index === selectedSalary.transactions.length - 1;
                    const isUnderReview = tx.current_status === 'under_review';
                    const sColor = getStatusColor(tx.current_status);
                    
                    return (
                      <View key={tx.id} style={styles.timelineItem}>
                        <View style={styles.timelineLeft}>
                          <View style={[styles.timelineDot, { backgroundColor: sColor }]} />
                          {!isLast && <View style={[styles.timelineLine, { backgroundColor: sColor + '40' }]} />}
                        </View>
                        <View style={styles.timelineContent}>
                          <View style={styles.txHeader}>
                            <Text style={styles.txDate}>{new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                            <View style={[styles.statusBadgeSmall, { backgroundColor: getStatusBgColor(tx.current_status) }]}>
                              <Text style={[styles.statusTextSmall, { color: sColor }]}>
                                {tx.current_status ? tx.current_status.replace('_', ' ').toUpperCase() : 'UNKNOWN'}
                              </Text>
                            </View>
                          </View>
                          
                          <Text style={styles.txAmount}>₹{Number(tx.amount).toLocaleString()}</Text>
                          <Text style={styles.txMethod}>{tx.payment_method} {tx.reference ? `• Ref: ${tx.reference}` : ''}</Text>
                          
                          {tx.remarks ? <Text style={styles.txRemarks}>{tx.remarks}</Text> : null}

                          {isUnderReview && (
                            <View style={styles.actionBox}>
                              <Text style={styles.actionLabel}>Add Note (Optional)</Text>
                              <TextInput 
                                style={styles.input} 
                                placeholder="E.g., Amount received correctly"
                                value={verifyNote}
                                onChangeText={setVerifyNote}
                                placeholderTextColor="#94a3b8"
                              />
                              <View style={styles.actionButtons}>
                                <TouchableOpacity 
                                  style={[styles.btn, styles.btnDispute]} 
                                  onPress={() => confirmAction(tx.id, 'Disputed')}
                                  disabled={actionLoading}
                                >
                                  <WarningCircle color="#fff" size={16} weight="bold" />
                                  <Text style={styles.btnText}>Dispute</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                  style={[styles.btn, styles.btnVerify]} 
                                  onPress={() => confirmAction(tx.id, 'Verified')}
                                  disabled={actionLoading}
                                >
                                  <CheckCircle color="#fff" size={16} weight="bold" />
                                  <Text style={styles.btnText}>Verify</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </TouchableOpacity>
    </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A1931' },
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f6f9' },
  content: { padding: 16, paddingBottom: 20 },
  
  salaryCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  monthTag: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  monthText: { fontSize: 13, fontWeight: '800', color: '#334155' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  
  salaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  value: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  transactionsText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  detailsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailsText: { fontSize: 12, fontWeight: '700', color: '#0A1931' },

  emptyCard: { padding: 40, alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  emptyText: { marginTop: 12, fontSize: 14, color: '#64748b', fontWeight: '600' },
  footerLoader: { paddingVertical: 20, alignItems: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(10, 25, 49, 0.6)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '85%', padding: 24, paddingBottom: 40 },
  dragHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  closeText: { fontSize: 16, fontWeight: '600', color: '#64748b' },
  
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#64748b', marginBottom: 16, letterSpacing: 1 },
  noDataText: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginTop: 20 },
  
  timeline: { paddingLeft: 8 },
  timelineItem: { flexDirection: 'row', marginBottom: 20 },
  timelineLeft: { width: 24, alignItems: 'center', marginRight: 12 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4, zIndex: 2 },
  timelineLine: { width: 2, flex: 1, marginTop: 4, marginBottom: -24 },
  timelineContent: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#f1f5f9' },
  
  txHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  txDate: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  statusBadgeSmall: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusTextSmall: { fontSize: 9, fontWeight: '800' },
  
  txAmount: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
  txMethod: { fontSize: 12, color: '#475569', fontWeight: '500' },
  txRemarks: { fontSize: 12, color: '#64748b', marginTop: 8, fontStyle: 'italic', backgroundColor: '#fff', padding: 8, borderRadius: 6 },
  
  actionBox: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  actionLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 12, color: '#0f172a' },
  actionButtons: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 6 },
  btnVerify: { backgroundColor: '#059669' },
  btnDispute: { backgroundColor: '#dc2626' },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
