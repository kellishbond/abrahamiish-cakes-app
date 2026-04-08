import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert, ScrollView
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getFriendlyErrorMessage } from '../../utils/errorMessages';

export default function SignupScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();

  const handleSignup = async () => {
    if (!name || !email || !password) {
      return Alert.alert(
        'Missing details',
        'Please fill in your full name, email address, and password to create your account.'
      );
    }
    if (password.length < 6) {
      return Alert.alert(
        'Password too short',
        'Please use a password with at least 6 characters.'
      );
    }
    setLoading(true);
    try {
      await signup(name, email, password);
    } catch (error) {
      Alert.alert(
        'Unable to create account',
        getFriendlyErrorMessage(
          error,
          'We could not create your account right now. Please try again.'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner}>

        {/* Header */}
        <Text style={styles.emoji}>🎂</Text>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join Abrahamiish Cakes</Text>

        {/* Inputs */}
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          placeholderTextColor="#aaa"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Email address"
          placeholderTextColor="#aaa"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password (min 6 characters)"
          placeholderTextColor="#aaa"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {/* Signup Button */}
        <TouchableOpacity style={styles.btn} onPress={handleSignup} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Create Account</Text>
          }
        </TouchableOpacity>

        {/* Login link */}
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Already have an account? <Text style={styles.linkBold}>Login</Text></Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F8' },
  inner: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  emoji: { fontSize: 56, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1A1A1A', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 32 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1A1A1A',
    marginBottom: 14,
  },
  btn: {
    backgroundColor: '#E8634A',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  link: { textAlign: 'center', color: '#888', fontSize: 14 },
  linkBold: { color: '#E8634A', fontWeight: 'bold' },
});
