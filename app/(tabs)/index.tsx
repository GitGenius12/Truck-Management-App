import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Modal,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';
import { StatRowSkeleton, CardSkeleton } from '@/components/Skeleton';
import NotificationBell from '@/components/NotificationBell';
import { api } from '@/services/api';
import { ENDPOINTS } from '@/constants/api';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';

interface Truck {
  _id: string;
  truckNumber: string;
  model?: string;
  status?: string;
}

interface Trip {
  _id: string;
  truckId?: { truckNumber: string } | string;
  tripDate?: string;
  tripNumber?: number;
  previousKm?: number;
  currentKm?: number;
  diesel?: number;
  cash?: number;
}

interface QuickAction {
  id: string;
  icon: string;
  label: string;
  color: string;
  route: string;
}

const ALL_ACTIONS: Record<string, QuickAction[]> = {
  DIRECTOR: [
    { id: 'trucks',      icon: 'car',                   label: 'Trucks',      color: Colors.primaryLight, route: '/(tabs)/trucks' },
    { id: 'drivers',     icon: 'people',                label: 'Drivers',     color: Colors.accent,       route: '/(tabs)/drivers' },
    { id: 'trips',       icon: 'map',                   label: 'Trips',       color: Colors.teal,         route: '/(tabs)/trips' },
    { id: 'approvals',   icon: 'checkmark-circle',      label: 'Approvals',   color: Colors.warning,      route: '/more/approvals' },
    { id: 'average',     icon: 'trending-up',           label: 'Mileage',     color: Colors.primary,      route: '/more/average' },
    { id: 'validity',    icon: 'shield-checkmark',      label: 'Validity',    color: Colors.orange,       route: '/more/validity' },
    { id: 'availability',icon: 'checkmark-circle',      label: 'Avail.',      color: Colors.teal,         route: '/more/availability' },
    { id: 'assignment',  icon: 'git-branch',            label: 'Assign',      color: Colors.accent,       route: '/more/assignment' },
    { id: 'users',       icon: 'people-circle',         label: 'Users',       color: Colors.primaryLight, route: '/more/users' },
    { id: 'accesses',    icon: 'lock-closed',           label: 'Accesses',    color: Colors.warning,      route: '/more/accesses' },
    { id: 'transactions',icon: 'cash',                  label: 'Txns',        color: Colors.teal,         route: '/more/transactions' },
    { id: 'misc',        icon: 'receipt',               label: 'Misc',        color: Colors.orange,       route: '/more/misc-spend' },
    { id: 'bank',        icon: 'business',              label: 'Bank',        color: Colors.primary,      route: '/more/bank-entry' },
  ],
  MANAGER: [
    { id: 'trucks',      icon: 'car',                   label: 'Trucks',      color: Colors.primaryLight, route: '/(tabs)/trucks' },
    { id: 'drivers',     icon: 'people',                label: 'Drivers',     color: Colors.accent,       route: '/(tabs)/drivers' },
    { id: 'trips',       icon: 'map',                   label: 'Trips',       color: Colors.teal,         route: '/(tabs)/trips' },
    { id: 'add-trip',    icon: 'add-circle',            label: 'Add Trip',    color: Colors.primary,      route: '/trips/add' },
    { id: 'add-truck',   icon: 'add-circle-outline',    label: 'Add Truck',   color: Colors.primaryLight, route: '/trucks/add' },
    { id: 'approvals',   icon: 'checkmark-circle',      label: 'Approvals',   color: Colors.warning,      route: '/more/approvals' },
    { id: 'average',     icon: 'trending-up',           label: 'Mileage',     color: Colors.primary,      route: '/more/average' },
    { id: 'validity',    icon: 'shield-checkmark',      label: 'Validity',    color: Colors.orange,       route: '/more/validity' },
    { id: 'availability',icon: 'checkmark-circle',      label: 'Avail.',      color: Colors.teal,         route: '/more/availability' },
    { id: 'assignment',  icon: 'git-branch',            label: 'Assign',      color: Colors.accent,       route: '/more/assignment' },
    { id: 'transactions',icon: 'cash',                  label: 'Txns',        color: Colors.teal,         route: '/more/transactions' },
    { id: 'misc',        icon: 'receipt',               label: 'Misc',        color: Colors.orange,       route: '/more/misc-spend' },
    { id: 'bank',        icon: 'business',              label: 'Bank',        color: Colors.primary,      route: '/more/bank-entry' },
  ],
  STAFF: [
    { id: 'add-trip',    icon: 'add-circle',            label: 'Add Trip',    color: Colors.primary,      route: '/trips/add' },
    { id: 'trucks',      icon: 'car',                   label: 'Trucks',      color: Colors.primaryLight, route: '/(tabs)/trucks' },
    { id: 'drivers',     icon: 'people',                label: 'Drivers',     color: Colors.accent,       route: '/(tabs)/drivers' },
    { id: 'trips',       icon: 'map',                   label: 'Trips',       color: Colors.teal,         route: '/(tabs)/trips' },
    { id: 'add-truck',   icon: 'add-circle-outline',    label: 'Add Truck',   color: Colors.primaryLight, route: '/trucks/add' },
    { id: 'average',     icon: 'trending-up',           label: 'Mileage',     color: Colors.primary,      route: '/more/average' },
    { id: 'validity',    icon: 'shield-checkmark',      label: 'Validity',    color: Colors.orange,       route: '/more/validity' },
    { id: 'transactions',icon: 'cash',                  label: 'Txns',        color: Colors.teal,         route: '/more/transactions' },
    { id: 'misc',        icon: 'receipt',               label: 'Misc',        color: Colors.orange,       route: '/more/misc-spend' },
    { id: 'bank',        icon: 'business',              label: 'Bank',        color: Colors.primary,      route: '/more/bank-entry' },
  ],
};

const DEFAULT_PINNED: Record<string, string[]> = {
  DIRECTOR: ['trucks', 'drivers', 'approvals', 'average'],
  MANAGER:  ['trucks', 'drivers', 'approvals', 'add-trip'],
  STAFF:    ['add-trip', 'trucks', 'drivers', 'trips'],
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pinned, setPinned] = useState<string[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const role = (user?.role ?? 'STAFF') as keyof typeof ALL_ACTIONS;
  const allActions = ALL_ACTIONS[role] ?? ALL_ACTIONS.STAFF;
  const storageKey = `quick_actions_${user?._id ?? 'guest'}`;

  // Load pinned from storage
  useEffect(() => {
    AsyncStorage.getItem(storageKey).then(val => {
      if (val) {
        try { setPinned(JSON.parse(val)); } catch { setPinned(DEFAULT_PINNED[role] ?? []); }
      } else {
        setPinned(DEFAULT_PINNED[role] ?? []);
      }
    });
  }, [storageKey, role]);

  const togglePin = useCallback(async (id: string) => {
    setPinned(prev => {
      const next = prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id];
      AsyncStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }, [storageKey]);

  const truckEndpoint = ENDPOINTS.TRUCKS;
  const tripEndpoint = ENDPOINTS.TRIPS;

  const loadData = useCallback(async () => {
    try {
      const [trucksRes, tripsRes] = await Promise.allSettled([
        api.get<any>(truckEndpoint),
        api.get<any>(tripEndpoint),
      ]);
      if (trucksRes.status === 'fulfilled') {
        const t = trucksRes.value;
        setTrucks(Array.isArray(t) ? t : (t.trucks ?? []));
      }
      if (tripsRes.status === 'fulfilled') {
        const t = tripsRes.value;
        setTrips(Array.isArray(t) ? t : (t.trips ?? []));
      }
    } catch {
      // silently fail on dashboard
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [truckEndpoint, tripEndpoint]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const activeTrucks = trucks.filter(t => t.status === 'ACTIVE' || !t.status).length;
  const recentTrips = trips.slice(0, 5);
  const pinnedActions = allActions.filter(a => pinned.includes(a.id));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()} 👋</Text>
          <Text style={styles.userName}>{user?.name ?? 'User'}</Text>
        </View>
        <NotificationBell />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Today's Snapshot */}
        <Text style={styles.sectionLabel}>TODAY'S SNAPSHOT</Text>
        {loading ? (
          <StatRowSkeleton />
        ) : (
          <View style={styles.statsRow}>
            <StatCard label="Trucks" value={trucks.length} color={Colors.primary} />
            <StatCard label="Active" value={activeTrucks} color={Colors.orange} />
            <StatCard label="Trips" value={trips.length} color={Colors.teal} />
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
          <TouchableOpacity onPress={() => setShowEditor(true)} style={styles.editBtn}>
            <Ionicons name="star-outline" size={14} color={Colors.primary} />
            <Text style={styles.editBtnText}>Customize</Text>
          </TouchableOpacity>
        </View>

        {pinnedActions.length === 0 ? (
          <TouchableOpacity style={styles.emptyActions} onPress={() => setShowEditor(true)}>
            <Ionicons name="star-outline" size={20} color={Colors.textMuted} />
            <Text style={styles.emptyActionsText}>Tap Customize to pin quick actions</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.actionsRow}>
            {pinnedActions.map(action => (
              <ActionButton
                key={action.id}
                icon={action.icon}
                label={action.label}
                onPress={() => router.push(action.route as any)}
                color={action.color}
              />
            ))}
          </View>
        )}

        {/* Recent Trips */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>RECENT TRIPS</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/trips')}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <>
            <CardSkeleton lines={1} />
            <CardSkeleton lines={1} />
            <CardSkeleton lines={1} />
          </>
        ) : recentTrips.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="map-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No trips yet</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/trips/add')}>
              <Text style={styles.emptyBtnText}>Add First Trip</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recentTrips.map((trip) => (
            <TripRow key={trip._id} trip={trip} />
          ))
        )}
      </ScrollView>

      {/* Customize Modal */}
      <Modal visible={showEditor} animationType="slide" transparent onRequestClose={() => setShowEditor(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowEditor(false)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Customize Quick Actions</Text>
            <TouchableOpacity onPress={() => setShowEditor(false)}>
              <Ionicons name="close" size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalHint}>Star sections to pin them as quick actions</Text>
          <FlatList
            data={allActions}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingBottom: 32 }}
            renderItem={({ item }) => {
              const isPinned = pinned.includes(item.id);
              return (
                <TouchableOpacity
                  style={[styles.actionRow, isPinned && styles.actionRowPinned]}
                  onPress={() => togglePin(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionRowIcon, { backgroundColor: item.color + '18' }]}>
                    <Ionicons name={item.icon as any} size={20} color={item.color} />
                  </View>
                  <Text style={styles.actionRowLabel}>{item.label}</Text>
                  <Ionicons
                    name={isPinned ? 'star' : 'star-outline'}
                    size={20}
                    color={isPinned ? Colors.warning : Colors.textMuted}
                  />
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActionButton({
  icon, label, onPress, color,
}: {
  icon: string; label: string; onPress: () => void; color: string;
}) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.actionIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function TripRow({ trip }: { trip: Trip }) {
  const truckNum =
    typeof trip.truckId === 'object' && trip.truckId
      ? trip.truckId.truckNumber
      : 'Unknown Truck';
  const km = trip.previousKm && trip.currentKm
    ? `${trip.currentKm - trip.previousKm} km`
    : '--';
  const diesel = trip.diesel ? `${trip.diesel} L` : '--';

  return (
    <View style={styles.tripRow}>
      <View style={styles.tripLeft}>
        <Text style={styles.tripReg}>{truckNum}</Text>
        <Text style={styles.tripSub}>
          Trip #{trip.tripNumber ?? '?'} · {km} · {diesel}
        </Text>
      </View>
      <View style={styles.tripRight}>
        <Text style={styles.tripKm}>{km}</Text>
        <Text style={styles.tripDiesel}>{diesel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.primaryDark },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primaryDark,
  },
  greeting: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)' },
  userName: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.white },
  scroll: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: Spacing.lg, paddingBottom: 40 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  seeAll: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.md, marginBottom: Spacing.sm },
  editBtnText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  statValue: { fontSize: FontSize.xxxl, fontWeight: '800' },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  actionBtn: { alignItems: 'center', gap: Spacing.xs, width: 72 },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, textAlign: 'center', fontWeight: '500' },
  emptyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  emptyActionsText: { fontSize: FontSize.sm, color: Colors.textMuted, fontStyle: 'italic' },
  empty: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },
  emptyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
  },
  emptyBtnText: { color: Colors.white, fontWeight: '600', fontSize: FontSize.sm },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  tripLeft: { flex: 1 },
  tripReg: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  tripSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  tripRight: { alignItems: 'flex-end' },
  tripKm: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.primary },
  tripDiesel: { fontSize: FontSize.xs, color: Colors.textMuted },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  modalHint: { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.md },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  actionRowPinned: { backgroundColor: Colors.inputBg, marginHorizontal: -Spacing.lg, paddingHorizontal: Spacing.lg },
  actionRowIcon: { width: 36, height: 36, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  actionRowLabel: { flex: 1, fontSize: FontSize.md, color: Colors.text, fontWeight: '500' },
});
