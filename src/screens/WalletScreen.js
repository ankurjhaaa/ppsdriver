import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wallet, ArrowCircleUp, ArrowCircleDown, Receipt } from 'phosphor-react-native';
import api from '../api/axios';
import CurvedHeader from '../components/CurvedHeader';

export default function WalletScreen() {
  const [data, setData] = useState({ balance: 0, totalEarned: 0, totalPaid: 0 });
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWallet = async (pageNum = 1) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const response = await api.get(`/wallet?page=${pageNum}`);
      const newEntries = response.data.entries?.data || [];
      const balance = response.data.balance || 0;
      const totalEarned = response.data.total_earned || 0;
      const totalPaid = response.data.total_paid || 0;
      
      setData({ balance, totalEarned, totalPaid });
      
      if (pageNum === 1) {
        setEntries(newEntries);
      } else {
        setEntries(prev => [...prev, ...newEntries]);
      }
      
      setHasMore(response.data.entries?.current_page < response.data.entries?.last_page);
      setPage(pageNum);
    } catch (e) { console.log('[WalletScreen] Error:', e.message); }
    finally { 
      setLoading(false); 
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchWallet(1); }, []);
  const onRefresh = () => { setRefreshing(true); fetchWallet(1); };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchWallet(page + 1);
    }
  };

  if (loading && !refreshing && entries.length === 0) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#FDB813" /></View>;
  }

  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceCardHeader}>
          <Wallet color="#FDB813" size={24} weight="fill" />
          <Text style={styles.balanceLabel}>CURRENT BALANCE</Text>
        </View>
        <Text style={[styles.balanceAmount, data.balance < 0 && { color: '#fca5a5' }]}>
          ₹{(data.balance || 0).toLocaleString()}
        </Text>
        <View style={styles.balanceSubRow}>
          <View style={styles.balanceSubItem}>
            <ArrowCircleUp color="#4ade80" size={16} weight="fill" />
            <Text style={styles.balanceSubLabel}>Earned</Text>
            <Text style={[styles.balanceSubValue, { color: '#4ade80' }]}>₹{(data.totalEarned || 0).toLocaleString()}</Text>
          </View>
          <View style={styles.balanceSubDivider} />
          <View style={styles.balanceSubItem}>
            <ArrowCircleDown color="#f87171" size={16} weight="fill" />
            <Text style={styles.balanceSubLabel}>Paid</Text>
            <Text style={[styles.balanceSubValue, { color: '#f87171' }]}>₹{(data.totalPaid || 0).toLocaleString()}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>TRANSACTION HISTORY</Text>
    </View>
  );

  const renderItem = ({ item: entry, index }) => (
    <View style={[styles.txItem, index === entries.length - 1 && { borderBottomWidth: 0 }]}>
      <View style={[styles.txIcon, entry.type === 'credit' ? styles.txIconCredit : styles.txIconDebit]}>
        {entry.type === 'credit' 
          ? <ArrowCircleUp color="#059669" size={20} weight="fill" />
          : <ArrowCircleDown color="#dc2626" size={20} weight="fill" />}
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txTitle} numberOfLines={1}>{entry.description || entry.type.toUpperCase()}</Text>
        <Text style={styles.txDate}>{new Date(entry.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })}</Text>
        {entry.total_km > 0 && <Text style={styles.txMeta}>{entry.total_km}km • {entry.fuel_litres}L • ₹{entry.fuel_rate}/L</Text>}
      </View>
      <View style={styles.txAmountContainer}>
        <Text style={[styles.txAmount, entry.type === 'credit' ? { color: '#059669' } : { color: '#dc2626' }]}>
          {entry.type === 'credit' ? '+' : '-'}₹{entry.amount.toLocaleString()}
        </Text>
        <Text style={styles.txBalance}>Bal: ₹{entry.balance_after.toLocaleString()}</Text>
        {entry.paid_by_admin === 1 && (
          <View style={styles.paidBadge}><Text style={styles.paidBadgeText}>PAID</Text></View>
        )}
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return <View style={{ height: 20 }} />;
    return <View style={styles.footerLoader}><ActivityIndicator size="small" color="#FDB813" /></View>;
  };

  const renderEmpty = () => (
    <View style={styles.emptyCard}>
      <Receipt color="#cbd5e1" size={40} weight="fill" />
      <Text style={styles.emptyText}>No transactions yet</Text>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <CurvedHeader title="My Wallet" />
      <View style={styles.container}>
        <FlatList 
          data={entries}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FDB813']} />}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          style={styles.listStyle}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A1931' },
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f6f9' },
  content: { padding: 16, paddingBottom: 20 },
  
  // Balance Card
  balanceCard: { backgroundColor: '#0A1931', borderRadius: 16, padding: 20, marginBottom: 20, elevation: 4, shadowColor: '#0A1931', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
  balanceCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  balanceLabel: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 1 },
  balanceAmount: { fontSize: 36, fontWeight: '900', color: '#fff', marginBottom: 16 },
  balanceSubRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: 12 },
  balanceSubItem: { flex: 1, alignItems: 'center', gap: 4 },
  balanceSubDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  balanceSubLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
  balanceSubValue: { fontSize: 16, fontWeight: '900' },
  
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#64748b', marginBottom: 10, letterSpacing: 1 },
  
  historyContainer: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
  listStyle: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
  headerContent: { backgroundColor: '#f4f6f9' },
  footerLoader: { paddingVertical: 20, alignItems: 'center' },
  txItem: { flexDirection: 'row', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f4f6f9', backgroundColor: '#fff' },
  txIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txIconCredit: { backgroundColor: '#ecfdf5' },
  txIconDebit: { backgroundColor: '#fef2f2' },
  txInfo: { flex: 1, justifyContent: 'center' },
  txTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  txDate: { fontSize: 11, color: '#64748b' },
  txMeta: { fontSize: 10, color: '#94a3b8', marginTop: 3, fontWeight: '600' },
  txAmountContainer: { alignItems: 'flex-end', justifyContent: 'center', paddingLeft: 8 },
  txAmount: { fontSize: 15, fontWeight: '900', marginBottom: 2 },
  txBalance: { fontSize: 10, color: '#94a3b8', fontWeight: '500' },
  paidBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  paidBadgeText: { fontSize: 9, fontWeight: '800', color: '#047857' },
  
  emptyCard: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  emptyText: { marginTop: 12, fontSize: 14, color: '#64748b', fontWeight: '600' },
});
