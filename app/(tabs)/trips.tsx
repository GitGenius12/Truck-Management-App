import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { ENDPOINTS } from '@/constants/api';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

interface Trip {
  _id: string;
  truckId?: { _id: string; truckNumber: string } | string;
  tripDate?: string;
  tripNumber?: number;
  previousKm?: number;
  currentKm?: number;
  diesel?: number;
  cash?: number;
  driverId?: { name: string } | null;
  createdBy?: { name: string };
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TripsScreen() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const endpoint = ENDPOINTS.TRIPS;

  const loadTrips = useCallback(async () => {
    try {
      const data = await api.get<any>(endpoint);
      // getAllTrips returns { trips: [...] }, getMyTrips returns [...] directly
      setTrips(Array.isArray(data) ? data : (data.trips ?? []));
    } catch {
      //
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [endpoint]);

  useEffect(() => { loadTrips(); }, [loadTrips]);

  const canAdd = user?.role === 'STAFF';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Trips</Text>
        {canAdd && (
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/trips/add')}>
            <Ionicons name="add" size={22} color={Colors.white} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={trips}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadTrips(); }}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="map-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No trips found</Text>
              {canAdd && (
                <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/trips/add')}>
                  <Text style={styles.emptyBtnText}>Add Trip</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }) => <TripCard trip={item} />}
        />
      )}
    </SafeAreaView>
  );
}

function TripCard({ trip }: { trip: Trip }) {
  const truckNum =
    typeof trip.truckId === 'object' && trip.truckId
      ? trip.truckId.truckNumber
      : 'Unknown Truck';
  const km = trip.previousKm != null && trip.currentKm != null
    ? trip.currentKm - trip.previousKm
    : null;
  const mileage = km && trip.diesel
    ? (km / trip.diesel).toFixed(1)
    : null;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View>
          <Text style={styles.regNum}>{truckNum}</Text>
          <Text style={styles.routeText}>Trip #{trip.tripNumber ?? '?'}</Text>
        </View>
        <Text style={styles.date}>{formatDate(trip.tripDate)}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.statsRow}>
        <TripStat icon="speedometer-outline" label="Distance" value={km != null ? `${km} km` : '--'} />
        <TripStat icon="water-outline" label="Diesel" value={trip.diesel ? `${trip.diesel} L` : '--'} />
        <TripStat icon="flash-outline" label="Mileage" value={mileage ? `${mileage} km/L` : '--'} color={Colors.success} />
        {trip.cash ? (
          <TripStat icon="cash-outline" label="Cash" value={`₹${trip.cash}`} />
        ) : null}
      </View>
    </View>
  );
}

function TripStat({ icon, label, value, color }: { icon: string; label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon as any} size={14} color={color || Colors.textSecondary} />
      <Text style={[styles.statValue, color ? { color } : {}]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primaryDark,
  },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.white },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { padding: Spacing.lg, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },
  emptyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
  },
  emptyBtnText: { color: Colors.white, fontWeight: '600' },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  regNum: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  routeText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  date: { fontSize: FontSize.sm, color: Colors.textMuted },
  divider: { height: 1, backgroundColor: Colors.border, marginBottom: Spacing.sm },
  statsRow: { flexDirection: 'row', gap: Spacing.md },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
});
