import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Image } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Eye, EyeClosed, EnvelopeSimple, LockKey } from 'phosphor-react-native';
import Svg, { Path } from 'react-native-svg';
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, error } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  const handleLogin = async () => {
    if (!email || !password) return;
    try { await login(email, password); } catch (e) {}
  };

  return (
    <View style={styles.container}>
      {/* Top Navy Section */}
      <View style={styles.topSection}>
        <SafeAreaView edges={['top']}>
          <View style={styles.brandingArea}>
            <Image source={require('../../assets/ppspurnea.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.schoolName}>PURNEA PUBLIC SCHOOL</Text>
            <Text style={styles.driverText}>Driver App</Text>
          </View>
        </SafeAreaView>
      </View>

      {/* Curved SVG at the bottom */}
      <View style={styles.svgContainer}>
        <Svg width={width} height="30" viewBox={`0 0 ${width} 30`} preserveAspectRatio="none">
          {/* Navy fill background */}
          <Path
            d={`M0,0 L${width},0 L${width},8 Q${width * 0.75},30 ${width * 0.5},18 Q${width * 0.25},6 0,20 L0,0 Z`}
            fill="#0A1931"
          />
          {/* Yellow accent stroke */}
          <Path
            d={`M${width},8 Q${width * 0.75},30 ${width * 0.5},18 Q${width * 0.25},6 0,20`}
            fill="none"
            stroke="#FDB813"
            strokeWidth="3"
          />
        </Svg>
      </View>

      {/* Form Section */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.formArea, { paddingBottom: Math.max(20, insets.bottom + 20) }]}>
        <Text style={styles.loginTitle}>Sign In</Text>
        <Text style={styles.loginSub}>Enter your credentials to continue</Text>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>EMAIL</Text>
          <View style={styles.inputWrapper}>
            <EnvelopeSimple size={16} color="#0A58CA" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="driver@ppspurnea.com" placeholderTextColor="#94a3b8"
              value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" editable={!isLoading} />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>PASSWORD</Text>
          <View style={styles.inputWrapper}>
            <LockKey size={16} color="#0A58CA" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="••••••••" placeholderTextColor="#94a3b8"
              value={password} onChangeText={setPassword} secureTextEntry={!showPassword} editable={!isLoading} />
            <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7}>
              {showPassword ? <Eye size={16} color="#64748b" /> : <EyeClosed size={16} color="#64748b" />}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.button, (!email || !password || isLoading) && styles.buttonDisabled]} 
          onPress={handleLogin} disabled={!email || !password || isLoading} activeOpacity={0.85}>
          {isLoading ? <ActivityIndicator color="#0A1931" size="small" /> : <Text style={styles.buttonText}>SIGN IN</Text>}
        </TouchableOpacity>

        <Text style={styles.footerText}>PPS Purnea • Transport Department</Text>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  topSection: { backgroundColor: '#0A1931' },
  brandingArea: { alignItems: 'center', paddingVertical: 30 },
  logo: { width: 80, height: 80, marginBottom: 12 },
  schoolName: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  driverText: { color: '#FDB813', fontSize: 13, fontWeight: '700', marginTop: 4, letterSpacing: 0.5 },
  svgContainer: {
    width: '100%',
    height: 30,
    backgroundColor: '#f4f6f9',
    marginTop: -1,
  },
  
  formArea: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  loginTitle: { fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
  loginSub: { fontSize: 13, color: '#64748b', marginBottom: 24, fontWeight: '500' },
  
  errorContainer: { backgroundColor: '#fef2f2', padding: 10, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#fecaca' },
  errorText: { color: '#b91c1c', fontSize: 12, textAlign: 'center', fontWeight: '600' },
  
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 10, fontWeight: '800', color: '#64748b', marginBottom: 6, marginLeft: 2, letterSpacing: 0.5 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, height: 48, paddingHorizontal: 12 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, color: '#0f172a', height: '100%' },
  eyeIcon: { padding: 6 },
  
  button: { backgroundColor: '#FDB813', borderRadius: 10, height: 48, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  buttonDisabled: { backgroundColor: '#e2e8f0' },
  buttonText: { color: '#0A1931', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  
  footerText: { fontSize: 10, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center', marginTop: 24 },
});
