import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wallet, ArrowCircleUp, ArrowCircleDown, Receipt } from 'phosphor-react-native';
import api from '../api/axios';

export default function WalletScreen() {
  const [data, setData] = useState({ balance: 0, totalEarned: 0, totalPaid: 0, entries: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWallet = async () => {
    console.log('[WalletScreen] Fetching wallet data...');
    try {
      const response = await api.get('/wallet');
      const entries = response.data.entries || [];
      const balance = response.data.balance || 0;
      
      const totalEarned = entries.filter(e => e.type === 'credit').reduce((sum, e) => sum + Number(e.amount), 0);
      const totalPaid = entries.filter(e => e.type === 'debit').reduce((sum, e) => sum + Number(e.amount), 0);
      
      console.log('[WalletScreen] Wallet fetched successfully. Balance:', balance, 'Entries loaded:', entries.length);
      setData({ balance, totalEarned, totalPaid, entries });
    } catch (e) {
      console.log('[WalletScreen] Error fetching wallet data:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const onRefresh = async () => {
    console.log('[WalletScreen] Pull-to-refresh wallet triggered');
    setRefreshing(true);
    await fetchWallet();
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
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#fff' }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Wallet</Text>
        </View>
      </SafeAreaView>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}
      >
        {/* Balance Cards */}
        <View style={styles.balanceContainer}>
          <View style={[styles.mainCard, data.balance < 0 ? styles.negativeCard : null]}>
            <View style={styles.cardHeader}>
              <Wallet color={data.balance < 0 ? "#dc2626" : "#2563eb"} size={24} weight="fill" />
              <Text style={styles.cardLabel}>CURRENT BALANCE</Text>
            </View>
            <Text style={[styles.balanceAmount, data.balance < 0 ? styles.negativeText : null]}>
              ₹{(data.balance || 0).toLocaleString()}
            </Text>
          </View>
          
          <View style={styles.subCardsContainer}>
            <View style={styles.subCard}>
              <View style={styles.cardHeader}>
                <ArrowCircleUp color="#10b981" size={16} weight="fill" />
                <Text style={styles.cardLabel}>TOTAL EARNED</Text>
              </View>
              <Text style={[styles.subAmount, { color: '#10b981' }]}>₹{(data.totalEarned || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.subCard}>
              <View style={styles.cardHeader}>
                <ArrowCircleDown color="#ef4444" size={16} weight="fill" />
                <Text style={styles.cardLabel}>TOTAL PAID</Text>
              </View>
              <Text style={[styles.subAmount, { color: '#ef4444' }]}>₹{(data.totalPaid || 0).toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Transaction History */}
        <Text style={styles.sectionTitle}>Transaction History</Text>
        <View style={styles.historyContainer}>
          {data.entries && data.entries.length > 0 ? (
            data.entries.map((entry, index) => (
              <View key={entry.id} style={[styles.transactionItem, index === data.entries.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={[styles.txIcon, entry.type === 'credit' ? styles.txIconCredit : styles.txIconDebit]}>
                  {entry.type === 'credit' 
                    ? <ArrowCircleUp color="#059669" size={20} weight="bold" />
                    : <ArrowCircleDown color="#dc2626" size={20} weight="bold" />}
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txTitle} numberOfLines={1}>{entry.description || entry.type.toUpperCase()}</Text>
                  <Text style={styles.txDate}>{new Date(entry.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })}</Text>
                  {entry.total_km > 0 && (
                    <Text style={styles.txMeta}>{entry.total_km}km • {entry.fuel_litres}L • ₹{entry.fuel_rate}/L</Text>
                  )}
                </View>
                <View style={styles.txAmountContainer}>
                  <Text style={[styles.txAmount, entry.type === 'credit' ? styles.txAmountCredit : styles.txAmountDebit]}>
                    {entry.type === 'credit' ? '+' : '-'}₹{entry.amount.toLocaleString()}
                  </Text>
                  <Text style={styles.txBalance}>Bal: ₹{entry.balance_after.toLocaleString()}</Text>
                  {entry.paid_by_admin === 1 && (
                    <View style={styles.paidBadge}><Text style={styles.paidBadgeText}>PAID</Text></View>
                  )}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Receipt color="#d1d5db" size={32} weight="fill" />
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  content: { padding: 20, paddingBottom: 40 },
  
  balanceContainer: { marginBottom: 24 },
  mainCard: { backgroundColor: '#fff', borderRadius: 10, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: '#bfdbfe' },
  negativeCard: { borderColor: '#fecaca' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  cardLabel: { fontSize: 11, fontWeight: 'bold', color: '#6b7280', letterSpacing: 0.5 },
  balanceAmount: { fontSize: 32, fontWeight: '900', color: '#1d4ed8' },
  negativeText: { color: '#b91c1c' },
  
  subCardsContainer: { flexDirection: 'row', gap: 12 },
  subCard: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  subAmount: { fontSize: 18, fontWeight: '800' },
  
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#6b7280', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 4 },
  historyContainer: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden' },
  transactionItem: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  txIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txIconCredit: { backgroundColor: '#d1fae5' },
  txIconDebit: { backgroundColor: '#fee2e2' },
  txInfo: { flex: 1, justifyContent: 'center' },
  txTitle: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 },
  txDate: { fontSize: 12, color: '#6b7280' },
  txMeta: { fontSize: 10, color: '#9ca3af', marginTop: 4, fontWeight: '500' },
  txAmountContainer: { alignItems: 'flex-end', justifyContent: 'center', paddingLeft: 8 },
  txAmount: { fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
  txAmountCredit: { color: '#059669' },
  txAmountDebit: { color: '#dc2626' },
  txBalance: { fontSize: 10, color: '#9ca3af' },
  paidBadge: { backgroundColor: '#d1fae5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4, borderWidth: 1, borderColor: '#a7f3d0' },
  paidBadgeText: { fontSize: 9, fontWeight: 'bold', color: '#047857' },
  
  emptyCard: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  emptyText: { marginTop: 12, fontSize: 14, color: '#6b7280' },
});
