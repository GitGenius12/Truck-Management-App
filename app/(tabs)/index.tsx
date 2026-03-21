import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import OmLoader from '@/components/OmLoader';
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

  const truckEndpoint = ENDPOINTS.TRUCKS;
  const tripEndpoint = ENDPOINTS.TRIPS;

  const loadData = useCallback(async () => {
    try {
      const [trucksRes, tripsRes] = await Promise.allSettled([
        api.get<any>(truckEndpoint),
        api.get<any>(tripEndpoint),
      ]);
      if (trucksRes.status === 'fulfilled') {
        // getAllTrucks returns { trucks: [...] }, getMyTrucks returns [...] directly
        const t = trucksRes.value;
        setTrucks(Array.isArray(t) ? t : (t.trucks ?? []));
      }
      if (tripsRes.status === 'fulfilled') {
        // getAllTrips returns { trips: [...] }, getMyTrips returns [...] directly
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

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const activeTrucks = trucks.filter(t => t.status === 'ACTIVE' || !t.status).length;
  const recentTrips = trips.slice(0, 5);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()} 👋</Text>
          <Text style={styles.userName}>{user?.name ?? 'User'}</Text>
        </View>
        <TouchableOpacity style={styles.notifBtn}>
          <Ionicons name="notifications-outline" size={24} color={Colors.white} />
        </TouchableOpacity>
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
          <OmLoader size="sm" text="" />
        ) : (
          <View style={styles.statsRow}>
            <StatCard label="Trucks" value={trucks.length} color={Colors.primary} />
            <StatCard label="Active" value={activeTrucks} color={Colors.orange} />
            <StatCard label="Trips" value={trips.length} color={Colors.teal} />
          </View>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
        <View style={styles.actionsRow}>
          {user?.role === 'STAFF' && (
            <ActionButton
              icon="add-circle"
              label="Add Trip"
              onPress={() => router.push('/trips/add')}
              color={Colors.primary}
            />
          )}
          <ActionButton
            icon="car"
            label="Trucks"
            onPress={() => router.push('/(tabs)/trucks')}
            color={Colors.primaryLight}
          />
          <ActionButton
            icon="people"
            label="Drivers"
            onPress={() => router.push('/(tabs)/drivers')}
            color={Colors.accent}
          />
          {(user?.role === 'DIRECTOR' || user?.role === 'MANAGER') && (
            <ActionButton
              icon="checkmark-circle"
              label="Approvals"
              onPress={() => router.push('/(tabs)/more')}
              color={Colors.warning}
            />
          )}
        </View>

        {/* Recent Trips */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>RECENT TRIPS</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/trips')}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <OmLoader size="sm" text="" />
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
  icon,
  label,
  onPress,
  color,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  color: string;
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
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
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
});
