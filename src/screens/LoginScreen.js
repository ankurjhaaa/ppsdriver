import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>P</Text>
          </View>
          <Text style={styles.title}>Driver Portal</Text>
          <Text style={styles.subtitle}>PPS Purnea Transport System</Text>
        </View>

        <View style={styles.form}>
          {error && <View style={styles.errorContainer}><Text style={styles.errorText}>{error}</Text></View>}
          
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="driver@ppspurnea.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!isLoading}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isLoading}
          />

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  logoContainer: { width: 64, height: 64, backgroundColor: '#2563eb', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  logoText: { fontSize: 32, fontWeight: 'bold', color: '#ffffff' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6b7280' },
  form: { backgroundColor: '#ffffff', padding: 24, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  errorContainer: { backgroundColor: '#fee2e2', padding: 12, borderRadius: 6, marginBottom: 16 },
  errorText: { color: '#dc2626', fontSize: 14, textAlign: 'center', fontWeight: '500' },
  label: { fontSize: 13, fontWeight: '600', color: '#4b5563', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#f3f4f6', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#111827', marginBottom: 20 },
  button: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});
