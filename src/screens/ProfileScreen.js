import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Phone, Envelope, IdentificationCard, ShieldCheck, SignOut, CaretRight } from 'phosphor-react-native';
import { AuthContext } from '../context/AuthContext';
import CurvedHeader from '../components/CurvedHeader';

export default function ProfileScreen() {
  const { user, driver, logout } = useContext(AuthContext);

  const InfoRow = ({ icon, label, value, showBorder = true }) => (
    <View style={[styles.infoRow, showBorder && styles.borderBottom]}>
      <View style={styles.iconContainer}>{icon}</View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || 'Not provided'}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <CurvedHeader title="My Profile" />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'D'}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name}</Text>
              <View style={styles.statusBadge}>
                <ShieldCheck color="#059669" size={13} weight="bold" />
                <Text style={styles.statusText}>Verified Driver</Text>
              </View>
            </View>
          </View>

          {/* Personal Details */}
          <Text style={styles.sectionTitle}>PERSONAL DETAILS</Text>
          <View style={styles.sectionCard}>
            <InfoRow icon={<User color="#64748b" size={18} />} label="Full Name" value={user?.name} />
            <InfoRow icon={<Phone color="#64748b" size={18} />} label="Phone" value={driver?.phone || user?.phone} />
            <InfoRow icon={<Envelope color="#64748b" size={18} />} label="Email" value={user?.email} />
            <InfoRow icon={<IdentificationCard color="#64748b" size={18} />} label="License" value={driver?.license_number} showBorder={false} />
          </View>

          {/* Settings */}
          <Text style={styles.sectionTitle}>SETTINGS</Text>
          <View style={styles.sectionCard}>
            <TouchableOpacity style={styles.actionRow}>
              <View style={styles.actionIcon}><Phone color="#0A58CA" size={18} /></View>
              <Text style={styles.actionText}>Contact Support</Text>
              <CaretRight color="#cbd5e1" size={16} weight="bold" />
            </TouchableOpacity>
          </View>

          {/* Logout */}
          <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.85}>
            <SignOut color="#dc2626" size={18} weight="bold" />
            <Text style={styles.logoutBtnText}>Sign Out</Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>PPS Driver App v1.0.0</Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A1931' },
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  content: { padding: 16, paddingBottom: 30 },
  
  profileCard: { backgroundColor: '#fff', borderRadius: 12, padding: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 20, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
  avatarContainer: { width: 56, height: 56, borderRadius: 18, backgroundColor: '#FDB813', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  avatarText: { fontSize: 24, fontWeight: '900', color: '#0A1931' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ecfdf5', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, gap: 4 },
  statusText: { fontSize: 10, fontWeight: '700', color: '#047857' },
  
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#64748b', marginBottom: 8, letterSpacing: 1, marginLeft: 2 },
  sectionCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 20, overflow: 'hidden', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: '#f4f6f9' },
  iconContainer: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f4f6f9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '700', marginBottom: 1 },
  infoValue: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  
  actionRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  actionIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  actionText: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0f172a' },
  
  logoutBtn: { backgroundColor: '#fef2f2', borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  logoutBtnText: { color: '#dc2626', fontSize: 15, fontWeight: '800' },
  
  versionText: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginTop: 20, fontWeight: '600' },
});
