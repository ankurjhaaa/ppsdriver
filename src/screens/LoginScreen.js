import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Dimensions } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeClosed, EnvelopeSimple, LockKey } from 'phosphor-react-native';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, error } = useContext(AuthContext);

  const handleLogin = async () => {
    if (!email || !password) return;
    try {
      await login(email, password);
    } catch (e) {
      // Error is handled in context
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
        
        <View style={styles.card}>
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>P</Text>
            </View>
            <Text style={styles.title}>Driver Portal</Text>
            <Text style={styles.subtitle}>PPS Purnea Transport System</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            
            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <EnvelopeSimple size={18} color="#2563eb" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="driver@ppspurnea.com"
                  placeholderTextColor="#94a3b8"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <LockKey size={18} color="#2563eb" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#94a3b8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!isLoading}
                />
                <TouchableOpacity 
                  style={styles.eyeIcon} 
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  {showPassword ? (
                    <Eye size={18} color="#64748b" />
                  ) : (
                    <EyeClosed size={18} color="#64748b" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity 
              style={[styles.button, (!email || !password || isLoading) && styles.buttonDisabled]} 
              onPress={handleLogin} 
              disabled={!email || !password || isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>SIGN IN</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>PPS Purnea • Transport Department</Text>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#ffffff' 
  },
  inner: { 
    flex: 1, 
    justifyContent: 'center', 
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 24,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  header: { 
    alignItems: 'center', 
    marginBottom: 28 
  },
  logoContainer: { 
    width: 56, 
    height: 56, 
    backgroundColor: '#2563eb', 
    borderRadius: 8, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 12,
  },
  logoText: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: '#ffffff' 
  },
  title: { 
    fontSize: 22, 
    fontWeight: '700', 
    color: '#0f172a', 
    marginBottom: 4,
  },
  subtitle: { 
    fontSize: 13, 
    color: '#64748b',
    fontWeight: '400',
  },
  formContainer: { 
    width: '100%',
  },
  errorContainer: { 
    backgroundColor: '#fef2f2', 
    padding: 10, 
    borderRadius: 6, 
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  errorText: { 
    color: '#b91c1c', 
    fontSize: 13, 
    textAlign: 'center', 
    fontWeight: '500' 
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: { 
    fontSize: 12, 
    fontWeight: '600', 
    color: '#475569', 
    marginBottom: 6, 
    marginLeft: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    height: 48,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: { 
    flex: 1,
    fontSize: 14, 
    color: '#0f172a', 
    height: '100%',
  },
  eyeIcon: {
    padding: 6,
  },
  button: { 
    backgroundColor: '#2563eb', 
    borderRadius: 6, 
    height: 48,
    justifyContent: 'center',
    alignItems: 'center', 
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
  },
  buttonText: { 
    color: '#ffffff', 
    fontSize: 14, 
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  }
});
