import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';

interface MenuItem {
  icon: string;
  label: string;
  subtitle?: string;
  route?: string;
  onPress?: () => void;
  danger?: boolean;
  tabId?: string; // backend tab access ID — if set, hidden when user lacks access
}

export default function MoreScreen() {
  const { user, logout } = useAuth();

  function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  }

  const role = user?.role;

  // ── Director tabs ──────────────────────────────────────────────
  const directorGroups: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Analytics',
      items: [
        { icon: 'trending-up-outline', label: 'Average / Mileage', subtitle: 'Trip mileage per truck', route: '/more/average' },
      ],
    },
    {
      title: 'Fleet',
      items: [
        { icon: 'car-outline', label: 'My Trucks', subtitle: 'View all trucks', route: '/(tabs)/trucks' },
        { icon: 'shield-checkmark-outline', label: 'Validity', subtitle: 'Document expiry tracker', route: '/more/validity' },
        { icon: 'map-outline', label: 'Daily Ops', subtitle: 'Trip entries', route: '/(tabs)/trips' },
        { icon: 'checkmark-circle-outline', label: 'Availability', subtitle: 'Truck availability board', route: '/more/availability' },
        { icon: 'git-branch-outline', label: 'Assignment', subtitle: 'Driver-truck assignments', route: '/more/assignment' },
      ],
    },
    {
      title: 'People',
      items: [
        { icon: 'people-outline', label: 'Drivers', subtitle: 'Driver management', route: '/(tabs)/drivers' },
        { icon: 'people-circle-outline', label: 'All Users', subtitle: 'View all team members', route: '/more/users' },
        { icon: 'newspaper-outline', label: 'Approvals', subtitle: 'Review pending requests', route: '/more/approvals' },
        { icon: 'lock-closed-outline', label: 'Accesses', subtitle: 'Manage tab access', route: '/more/accesses' },
      ],
    },
    {
      title: 'Finance',
      items: [
        { icon: 'cash-outline', label: 'Transactions', subtitle: 'Driver salary & payments', route: '/more/transactions' },
        { icon: 'receipt-outline', label: 'Misc Spend', subtitle: 'Miscellaneous expenses', route: '/more/misc-spend' },
        { icon: 'business-outline', label: 'Bank Entry', subtitle: 'Net banking log', route: '/more/bank-entry' },
      ],
    },
  ];

  // ── Manager tabs ───────────────────────────────────────────────
  const managerGroups: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Analytics',
      items: [
        { icon: 'trending-up-outline', label: 'Average / Mileage', subtitle: 'Trip mileage per truck', route: '/more/average', tabId: 'average' },
      ],
    },
    {
      title: 'Fleet',
      items: [
        { icon: 'car-outline', label: 'My Trucks', subtitle: 'View all trucks', route: '/(tabs)/trucks', tabId: 'my-trucks' },
        { icon: 'add-circle-outline', label: 'Add Truck', subtitle: 'Register new truck', route: '/trucks/add', tabId: 'add' },
        { icon: 'shield-checkmark-outline', label: 'Validity', subtitle: 'Document expiry tracker', route: '/more/validity', tabId: 'trucks' },
        { icon: 'checkmark-circle-outline', label: 'Availability', subtitle: 'Truck availability board', route: '/more/availability', tabId: 'availability' },
        { icon: 'git-branch-outline', label: 'Assignments', subtitle: 'Driver-truck assignments', route: '/more/assignment', tabId: 'assignments' },
      ],
    },
    {
      title: 'Trips',
      items: [
        { icon: 'add-circle-outline', label: 'Add Trip Entry', subtitle: 'Log a new trip', route: '/trips/add', tabId: 'trips' },
        { icon: 'map-outline', label: 'All Trips', subtitle: 'View trip history', route: '/(tabs)/trips', tabId: 'trips' },
      ],
    },
    {
      title: 'People',
      items: [
        { icon: 'people-outline', label: 'Drivers', subtitle: 'Driver management', route: '/(tabs)/drivers', tabId: 'drivers' },
        { icon: 'newspaper-outline', label: 'Staff Approvals', subtitle: 'Review pending requests', route: '/more/approvals', tabId: 'requests' },
      ],
    },
    {
      title: 'Finance',
      items: [
        { icon: 'cash-outline', label: 'Transactions', subtitle: 'Driver salary & payments', route: '/more/transactions', tabId: 'transactions' },
        { icon: 'receipt-outline', label: 'Miscellaneous', subtitle: 'Misc expenses', route: '/more/misc-spend', tabId: 'misc' },
        { icon: 'business-outline', label: 'Bank Entry', subtitle: 'Net banking log', route: '/more/bank-entry', tabId: 'bank-entry' },
      ],
    },
  ];

  // ── Staff tabs ─────────────────────────────────────────────────
  const staffGroups: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Analytics',
      items: [
        { icon: 'trending-up-outline', label: 'Average / Mileage', subtitle: 'Trip mileage per truck', route: '/more/average', tabId: 'average' },
      ],
    },
    {
      title: 'Fleet',
      items: [
        { icon: 'car-outline', label: 'All Trucks', subtitle: 'View assigned trucks', route: '/(tabs)/trucks', tabId: 'my-trucks' },
        { icon: 'shield-checkmark-outline', label: 'Validity', subtitle: 'Document expiry tracker', route: '/more/validity', tabId: 'trucks' },
        { icon: 'map-outline', label: 'Daily Ops', subtitle: 'Trip entries', route: '/(tabs)/trips', tabId: 'daily-ops' },
        { icon: 'checkmark-circle-outline', label: 'Availability', subtitle: 'Truck availability board', route: '/more/availability', tabId: 'availability' },
        { icon: 'git-branch-outline', label: 'Assignment', subtitle: 'Driver-truck assignments', route: '/more/assignment', tabId: 'assignments' },
        { icon: 'add-circle-outline', label: 'Add Truck Details', subtitle: 'Register new truck', route: '/trucks/add', tabId: 'add' },
        { icon: 'add-circle-outline', label: 'Add Trip Entry', subtitle: 'Log a new trip', route: '/trips/add', tabId: 'trips' },
      ],
    },
    {
      title: 'People',
      items: [
        { icon: 'people-outline', label: 'Drivers', subtitle: 'Driver management', route: '/(tabs)/drivers', tabId: 'drivers' },
      ],
    },
    {
      title: 'Finance',
      items: [
        { icon: 'cash-outline', label: 'Transactions', subtitle: 'Driver salary & payments', route: '/more/transactions', tabId: 'transactions' },
        { icon: 'receipt-outline', label: 'Miscellaneous', subtitle: 'Misc expenses', route: '/more/misc-spend', tabId: 'misc' },
        { icon: 'business-outline', label: 'Bank Entry', subtitle: 'Net banking log', route: '/more/bank-entry', tabId: 'bank-entry' },
      ],
    },
  ];

  const rawGroups =
    role === 'DIRECTOR' ? directorGroups :
    role === 'MANAGER' ? managerGroups :
    staffGroups;

  // Directors see everything; STAFF/MANAGER are filtered by their effectiveTabIds
  const menuGroups = role === 'DIRECTOR'
    ? rawGroups
    : rawGroups
        .map(group => ({
          ...group,
          items: group.items.filter(item =>
            !item.tabId || (user?.tabAccess ?? []).includes(item.tabId)
          ),
        }))
        .filter(group => group.items.length > 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>More</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <TouchableOpacity style={styles.userCard} onPress={() => router.push('/more/profile')} activeOpacity={0.8}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {user?.name?.charAt(0).toUpperCase() ?? 'U'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{user?.role}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </TouchableOpacity>

        {menuGroups.map(group => (
          <View key={group.title} style={styles.group}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.groupCard}>
              {group.items.map((item, idx) => (
                <React.Fragment key={item.label}>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={item.onPress ?? (() => item.route && router.push(item.route as any))}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.menuIcon, item.danger && styles.menuIconDanger]}>
                      <Ionicons
                        name={item.icon as any}
                        size={20}
                        color={item.danger ? Colors.error : Colors.primary}
                      />
                    </View>
                    <View style={styles.menuBody}>
                      <Text style={[styles.menuLabel, item.danger && styles.menuLabelDanger]}>
                        {item.label}
                      </Text>
                      {item.subtitle && (
                        <Text style={styles.menuSub} numberOfLines={1}>
                          {item.subtitle}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                  </TouchableOpacity>
                  {idx < group.items.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}

        {/* Sign Out */}
        <View style={styles.group}>
          <View style={styles.groupCard}>
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout} activeOpacity={0.7}>
              <View style={[styles.menuIcon, styles.menuIconDanger]}>
                <Ionicons name="log-out-outline" size={20} color={Colors.error} />
              </View>
              <View style={styles.menuBody}>
                <Text style={[styles.menuLabel, styles.menuLabelDanger]}>Sign Out</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.version}>TruckManager v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.primaryDark,
  },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.white },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, paddingBottom: 40 },
  userCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.lg, gap: Spacing.md,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
  },
  userAvatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primaryDark,
    alignItems: 'center', justifyContent: 'center',
  },
  userAvatarText: { color: Colors.white, fontSize: FontSize.xl, fontWeight: '700' },
  userInfo: { flex: 1, gap: 2 },
  userName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  userEmail: { fontSize: FontSize.sm, color: Colors.textSecondary },
  roleBadge: {
    alignSelf: 'flex-start', backgroundColor: Colors.tealBg,
    borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2, marginTop: 4,
  },
  roleText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '600' },
  group: { marginBottom: Spacing.lg },
  groupTitle: {
    fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary,
    letterSpacing: 1, marginBottom: Spacing.sm,
  },
  groupCard: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, overflow: 'hidden',
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md,
  },
  menuIcon: {
    width: 38, height: 38, borderRadius: Radius.sm, backgroundColor: Colors.tealBg,
    alignItems: 'center', justifyContent: 'center',
  },
  menuIconDanger: { backgroundColor: Colors.errorBg },
  menuBody: { flex: 1 },
  menuLabel: { fontSize: FontSize.md, fontWeight: '500', color: Colors.text },
  menuLabelDanger: { color: Colors.error },
  menuSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: 70 },
  version: { textAlign: 'center', fontSize: FontSize.xs, color: Colors.textMuted, marginTop: Spacing.lg },
});
