import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, UserRole } from '@/context/AuthContext';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';

const ROLES: { label: string; value: UserRole }[] = [
  { label: 'Staff', value: 'STAFF' },
  { label: 'Manager', value: 'MANAGER' },
];

export default function SignupScreen() {
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('STAFF');
  const [showPassword, setShowPassword] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSignup() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all required fields');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signup({ name: name.trim(), email: email.trim().toLowerCase(), password, role, phone: phone.trim() });
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <View style={styles.successContainer}>
        <StatusBar style="light" />
        <View style={styles.successCard}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={56} color={Colors.success} />
          </View>
          <Text style={styles.successTitle}>Account Created!</Text>
          <Text style={styles.successText}>
            Your account needs Director approval before you can log in.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.btnText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerBrand}>
          <Text style={styles.headerOm}>🕉️</Text>
          <Text style={styles.headerTitle}>Sainik + Amrit</Text>
        </View>
        <Text style={styles.headerSub}>Create your account</Text>
      </View>

      <ScrollView
        style={styles.cardWrapper}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
          <View style={styles.card}>
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Field label="FULL NAME" icon="person-outline">
              <TextInput
                style={styles.input}
                placeholder="Raj Sharma"
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </Field>

            <Field label="EMAIL" icon="mail-outline">
              <TextInput
                style={styles.input}
                placeholder="raj@sainikmotor.com"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </Field>

            <Field label="PHONE (OPTIONAL)" icon="call-outline">
              <TextInput
                style={styles.input}
                placeholder="+91 9876543210"
                placeholderTextColor={Colors.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </Field>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>ROLE</Text>
              <TouchableOpacity
                style={styles.inputRow}
                onPress={() => setShowRolePicker(!showRolePicker)}
                activeOpacity={0.8}
              >
                <Ionicons name="briefcase-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <Text style={[styles.input, { color: Colors.text }]}>
                  {ROLES.find(r => r.value === role)?.label}
                </Text>
                <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
              {showRolePicker && (
                <View style={styles.dropdown}>
                  {ROLES.map(r => (
                    <TouchableOpacity
                      key={r.value}
                      style={[styles.dropdownItem, role === r.value && styles.dropdownItemActive]}
                      onPress={() => { setRole(r.value); setShowRolePicker(false); }}
                    >
                      <Text style={[styles.dropdownText, role === r.value && styles.dropdownTextActive]}>
                        {r.label}
                      </Text>
                      {role === r.value && <Ionicons name="checkmark" size={16} color={Colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <Field label="PASSWORD" icon="lock-closed-outline">
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="••••••••"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            </Field>

            <View style={styles.noticeBox}>
              <Ionicons name="information-circle" size={16} color={Colors.warning} />
              <Text style={styles.noticeText}>
                Your account needs Director approval before you can log in.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.btnText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
                <Text style={styles.footerLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <Ionicons name={icon as any} size={18} color={Colors.textMuted} style={styles.inputIcon} />
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primaryDark },
  successContainer: {
    flex: 1,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  successCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    width: '100%',
  },
  successIcon: { marginBottom: Spacing.md },
  successTitle: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  successText: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.lg },
  header: {
    paddingTop: 52,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  backBtn: { marginBottom: Spacing.sm },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerOm: { fontSize: 24 },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.white },
  headerSub: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  cardWrapper: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  card: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    flex: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorBg,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  errorText: { color: Colors.error, fontSize: FontSize.sm, flex: 1 },
  fieldGroup: { marginBottom: Spacing.md },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    height: 52,
  },
  inputIcon: { marginRight: Spacing.sm },
  input: { flex: 1, fontSize: FontSize.md, color: Colors.text },
  eyeBtn: { padding: Spacing.xs },
  dropdown: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.xs,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownItemActive: { backgroundColor: Colors.tealBg },
  dropdownText: { fontSize: FontSize.md, color: Colors.text },
  dropdownTextActive: { color: Colors.primary, fontWeight: '600' },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.warningBg,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  noticeText: { color: Colors.warning, fontSize: FontSize.sm, flex: 1 },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.lg },
  footerText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  footerLink: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '600' },
});
