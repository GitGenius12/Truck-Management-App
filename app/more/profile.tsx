import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';

const ROLE_COLOR: Record<string, string> = {
  DIRECTOR: Colors.primary,
  MANAGER: Colors.accent,
  STAFF: Colors.textSecondary,
};

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const roleColor = ROLE_COLOR[user.role] ?? Colors.primary;

  function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View style={styles.hero}>
        {user.profilePhoto ? (
          <Image source={{ uri: user.profilePhoto }} style={styles.photo} />
        ) : (
          <View style={[styles.avatarLarge, { backgroundColor: roleColor }]}>
            <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.heroName}>{user.name}</Text>
        <View style={[styles.roleBadge, { backgroundColor: roleColor + '30' }]}>
          <View style={[styles.roleDot, { backgroundColor: roleColor }]} />
          <Text style={[styles.roleText, { color: roleColor }]}>{user.role}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: user.status === 'APPROVED' ? Colors.successBg : Colors.errorBg }
        ]}>
          <Text style={[
            styles.statusText,
            { color: user.status === 'APPROVED' ? Colors.success : Colors.error }
          ]}>
            {user.status}
          </Text>
        </View>
      </View>

      {/* Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Details</Text>
        <InfoRow icon="mail-outline" label="Email" value={user.email} />
        <InfoRow icon="call-outline" label="Phone" value={user.phone || '—'} />
        <InfoRow icon="finger-print-outline" label="User ID" value={user.id} mono />
        <InfoRow
          icon="checkmark-circle-outline"
          label="Profile Complete"
          value={user.isProfileComplete ? 'Yes' : 'No'}
          valueColor={user.isProfileComplete ? Colors.success : Colors.warning}
        />
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
        <Ionicons name="log-out-outline" size={20} color={Colors.error} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({
  icon, label, value, valueColor, mono,
}: {
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon as any} size={16} color={Colors.textSecondary} style={styles.rowIcon} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[styles.rowValue, valueColor ? { color: valueColor } : {}, mono && styles.mono]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 120 },

  hero: {
    alignItems: 'center',
    backgroundColor: Colors.primaryDark,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  photo: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 3, borderColor: Colors.white,
  },
  avatarLarge: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: Colors.white,
  },
  avatarText: { color: Colors.white, fontSize: FontSize.xxl + 4, fontWeight: '700' },
  heroName: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.white, marginTop: Spacing.xs },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 4,
  },
  roleDot: { width: 7, height: 7, borderRadius: 4 },
  roleText: { fontSize: FontSize.sm, fontWeight: '700' },
  statusBadge: {
    borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 3,
  },
  statusText: { fontSize: FontSize.xs, fontWeight: '700' },

  section: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary,
    textTransform: 'uppercase', letterSpacing: 0.8,
    paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  rowIcon: { marginRight: Spacing.sm, width: 20 },
  rowLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, width: 120 },
  rowValue: { flex: 1, fontSize: FontSize.md, color: Colors.text, fontWeight: '500', textAlign: 'right' },
  mono: { fontSize: FontSize.xs, color: Colors.textMuted },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, marginHorizontal: Spacing.lg, marginTop: Spacing.lg,
    backgroundColor: Colors.errorBg, borderRadius: Radius.md,
    paddingVertical: Spacing.md,
  },
  logoutText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.error },
});
