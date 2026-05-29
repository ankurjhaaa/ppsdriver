import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Phone, Envelope, IdentificationCard, ShieldCheck, SignOut, CaretRight, Car } from 'phosphor-react-native';
import { AuthContext } from '../context/AuthContext';

export default function ProfileScreen() {
  const { user, driver, logout } = useContext(AuthContext);

  const handleLogout = () => {
    logout();
  };

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
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'D'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{user?.name}</Text>
            <View style={styles.statusBadge}>
              <ShieldCheck color="#059669" size={14} weight="bold" />
              <Text style={styles.statusText}>Verified Driver</Text>
            </View>
          </View>
        </View>

        {/* Personal Details */}
        <Text style={styles.sectionTitle}>Personal Details</Text>
        <View style={styles.sectionCard}>
          <InfoRow 
            icon={<User color="#6b7280" size={20} />} 
            label="Full Name" 
            value={user?.name} 
          />
          <InfoRow 
            icon={<Phone color="#6b7280" size={20} />} 
            label="Phone Number" 
            value={driver?.phone || user?.phone} 
          />
          <InfoRow 
            icon={<Envelope color="#6b7280" size={20} />} 
            label="Email Address" 
            value={user?.email} 
          />
          <InfoRow 
            icon={<IdentificationCard color="#6b7280" size={20} />} 
            label="License Number" 
            value={driver?.license_number} 
            showBorder={false}
          />
        </View>

        {/* Support & Actions */}
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.actionRow}>
            <View style={styles.actionIcon}><Phone color="#2563eb" size={20} /></View>
            <Text style={styles.actionText}>Contact Support</Text>
            <CaretRight color="#9ca3af" size={16} weight="bold" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <SignOut color="#dc2626" size={20} weight="bold" />
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>PPS Driver App v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 20, paddingTop: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  content: { padding: 20, paddingBottom: 40 },
  
  profileCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#f3f4f6', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  avatarContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 16, borderWidth: 2, borderColor: '#bfdbfe' },
  avatarText: { fontSize: 28, fontWeight: 'bold', color: '#2563eb' },
  profileInfo: { flex: 1 },
  name: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ecfdf5', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#a7f3d0' },
  statusText: { fontSize: 11, fontWeight: '600', color: '#047857', marginLeft: 4 },
  
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 4 },
  sectionCard: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: '#f3f4f6', overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  iconContainer: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '500', color: '#111827' },
  
  actionRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  actionIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  actionText: { flex: 1, fontSize: 15, fontWeight: '500', color: '#111827' },
  
  logoutBtn: { backgroundColor: '#fef2f2', borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#fee2e2' },
  logoutBtnText: { color: '#dc2626', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  
  versionText: { textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 24 },
});
