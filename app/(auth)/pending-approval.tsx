import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';

const STEPS = [
  { label: 'Director reviews your sign-up request' },
  { label: 'You receive an approval notification' },
  { label: 'Complete your profile and start working' },
];

export default function PendingApprovalScreen() {
  const { logout } = useAuth();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          <View style={styles.iconCircle}>
            <Ionicons name="help" size={48} color={Colors.warning} />
          </View>
        </View>

        <Text style={styles.title}>Awaiting Approval</Text>
        <Text style={styles.subtitle}>
          Your account has been created successfully. A Director will review and approve your request.
        </Text>

        <View style={styles.stepsCard}>
          <Text style={styles.stepsTitle}>What Happens Next</Text>
          {STEPS.map((step, i) => (
            <View key={i} style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepLabel}>{step.label}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={logout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color={Colors.textSecondary} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  iconWrapper: {
    marginBottom: Spacing.lg,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: Colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.warningBg,
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
    maxWidth: 300,
  },
  stepsCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    width: '100%',
    marginBottom: Spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  stepsTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumberText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  stepLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    flex: 1,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  signOutText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
});
