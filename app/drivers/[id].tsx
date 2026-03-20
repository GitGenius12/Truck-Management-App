import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { ENDPOINTS } from '@/constants/api';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';

interface Driver {
  _id: string;
  name: string;
  phone?: string;
  status?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  aadhaarNumber?: string;
  monthlySalary?: number;
  profilePhoto?: string;
  licensePhoto?: string;
  aadhaarPhoto?: string;
  firmId?: { firmName: string };
  createdBy?: { name: string; role: string };
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isExpiringSoon(dateStr?: string) {
  if (!dateStr) return false;
  const diff = new Date(dateStr).getTime() - Date.now();
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000; // within 30 days
}

function isExpired(dateStr?: string) {
  if (!dateStr) return false;
  return new Date(dateStr).getTime() < Date.now();
}

export default function DriverDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Driver>(`${ENDPOINTS.DRIVERS}/${id}`)
      .then(setDriver)
      .catch(e => setError(e.message || 'Failed to load driver'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (error || !driver) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <Text style={styles.errorText}>{error || 'Driver not found'}</Text>
      </View>
    );
  }

  const isActive = driver.status === 'ACTIVE';
  const licenseExpired = isExpired(driver.licenseExpiry);
  const licenseWarning = !licenseExpired && isExpiringSoon(driver.licenseExpiry);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        {driver.profilePhoto ? (
          <Image source={{ uri: driver.profilePhoto }} style={styles.profilePhoto} />
        ) : (
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>{driver.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.driverName}>{driver.name}</Text>
        {driver.firmId?.firmName && (
          <Text style={styles.firmName}>{driver.firmId.firmName}</Text>
        )}
        <View style={[
          styles.statusBadge,
          { backgroundColor: isActive ? Colors.successBg : Colors.border }
        ]}>
          <View style={[styles.statusDot, { backgroundColor: isActive ? Colors.success : Colors.textMuted }]} />
          <Text style={[styles.statusText, { color: isActive ? Colors.success : Colors.textMuted }]}>
            {driver.status ?? 'UNKNOWN'}
          </Text>
        </View>
      </View>

      {/* Contact Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact</Text>
        <InfoRow icon="call-outline" label="Phone" value={driver.phone || '—'} />
      </View>

      {/* License */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Driving Licence</Text>
        <InfoRow icon="card-outline" label="Licence No." value={driver.licenseNumber || '—'} />
        <InfoRow
          icon="calendar-outline"
          label="Expiry"
          value={formatDate(driver.licenseExpiry)}
          valueColor={licenseExpired ? Colors.error : licenseWarning ? Colors.warning : undefined}
          badge={licenseExpired ? 'EXPIRED' : licenseWarning ? 'EXPIRING SOON' : undefined}
          badgeColor={licenseExpired ? Colors.error : Colors.warning}
        />
        {driver.licensePhoto && (
          <View style={styles.docPreviewRow}>
            <Text style={styles.docPreviewLabel}>Licence Photo</Text>
            <Image source={{ uri: driver.licensePhoto }} style={styles.docImage} resizeMode="cover" />
          </View>
        )}
      </View>

      {/* Aadhaar */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Aadhaar</Text>
        <InfoRow icon="finger-print-outline" label="Aadhaar No." value={driver.aadhaarNumber || '—'} />
        {driver.aadhaarPhoto && (
          <View style={styles.docPreviewRow}>
            <Text style={styles.docPreviewLabel}>Aadhaar Photo</Text>
            <Image source={{ uri: driver.aadhaarPhoto }} style={styles.docImage} resizeMode="cover" />
          </View>
        )}
      </View>

      {/* Salary */}
      {driver.monthlySalary != null && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Salary</Text>
          <InfoRow
            icon="cash-outline"
            label="Monthly Salary"
            value={`₹${driver.monthlySalary.toLocaleString('en-IN')}`}
          />
        </View>
      )}

      {/* Meta */}
      {driver.createdBy && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Created By</Text>
          <InfoRow icon="person-outline" label="Name" value={driver.createdBy.name} />
          <InfoRow icon="briefcase-outline" label="Role" value={driver.createdBy.role} />
        </View>
      )}
    </ScrollView>
  );
}

function InfoRow({
  icon, label, value, valueColor, badge, badgeColor,
}: {
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={16} color={Colors.textSecondary} style={styles.infoIcon} />
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={styles.infoRight}>
        <Text style={[styles.infoValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
        {badge && (
          <View style={[styles.expBadge, { backgroundColor: (badgeColor || Colors.error) + '20' }]}>
            <Text style={[styles.expBadgeText, { color: badgeColor || Colors.error }]}>{badge}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.lg },
  errorText: { fontSize: FontSize.md, color: Colors.error, textAlign: 'center' },

  profileHeader: {
    alignItems: 'center',
    backgroundColor: Colors.primaryDark,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  profilePhoto: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: Colors.white,
  },
  avatarLarge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
  },
  avatarText: { color: Colors.white, fontSize: FontSize.xxl, fontWeight: '700' },
  driverName: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.white },
  firmName: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    gap: 6,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: FontSize.sm, fontWeight: '600' },

  section: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoIcon: { marginRight: Spacing.sm, width: 20 },
  infoLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, width: 110 },
  infoRight: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  infoValue: { fontSize: FontSize.md, color: Colors.text, fontWeight: '500', flex: 1 },
  expBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  expBadgeText: { fontSize: FontSize.xs, fontWeight: '700' },

  docPreviewRow: { marginTop: Spacing.sm },
  docPreviewLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 6 },
  docImage: {
    width: '100%',
    height: 160,
    borderRadius: Radius.md,
    backgroundColor: Colors.border,
  },
});
