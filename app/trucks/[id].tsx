import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { ENDPOINTS } from '@/constants/api';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';

interface TruckDetail {
  _id: string;
  registrationNumber: string;
  make?: string;
  model?: string;
  year?: number;
  capacity?: number;
  status?: string;
  currentDriver?: { name: string; phone?: string } | null;
  insuranceExpiry?: string;
  fitnessExpiry?: string;
  roadTaxExpiry?: string;
  permitExpiry?: string;
  pollutionExpiry?: string;
  totalTrips?: number;
  totalKm?: number;
}

interface Trip {
  _id: string;
  date?: string;
  kmDriven?: number;
  dieselFilled?: number;
  from?: string;
  to?: string;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  const formatted = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  if (days < 0) return `${formatted} (Expired)`;
  if (days <= 30) return `${formatted} (${days}d left)`;
  return formatted;
}

function getExpiryColor(dateStr?: string) {
  if (!dateStr) return Colors.textMuted;
  const diff = new Date(dateStr).getTime() - Date.now();
  const days = diff / (1000 * 60 * 60 * 24);
  if (days < 0) return Colors.error;
  if (days <= 30) return Colors.warning;
  return Colors.success;
}

export default function TruckDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [truck, setTruck] = useState<TruckDetail | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [trucksRes, tripsRes] = await Promise.allSettled([
        api.get<TruckDetail[]>(ENDPOINTS.TRUCKS),
        api.get<Trip[]>(ENDPOINTS.TRIPS_BY_TRUCK(id)),
      ]);

      if (trucksRes.status === 'fulfilled') {
        const found = trucksRes.value.find(t => t._id === id);
        if (found) setTruck(found);
      }
      if (tripsRes.status === 'fulfilled') {
        setTrips(tripsRes.value);
      }
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!truck) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle" size={48} color={Colors.textMuted} />
        <Text style={styles.notFound}>Truck not found</Text>
      </View>
    );
  }

  const totalKm = trips.reduce((sum, t) => sum + (t.kmDriven || 0), 0);
  const totalDiesel = trips.reduce((sum, t) => sum + (t.dieselFilled || 0), 0);
  const avgMileage = totalDiesel > 0 ? (totalKm / totalDiesel).toFixed(1) : '--';

  const docs = [
    { label: 'Insurance', date: truck.insuranceExpiry, icon: 'shield-checkmark-outline' },
    { label: 'Fitness', date: truck.fitnessExpiry, icon: 'fitness-outline' },
    { label: 'Road Tax', date: truck.roadTaxExpiry, icon: 'receipt-outline' },
    { label: 'Permit', date: truck.permitExpiry, icon: 'card-outline' },
    { label: 'Pollution', date: truck.pollutionExpiry, icon: 'leaf-outline' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Truck Header */}
      <View style={styles.truckHeader}>
        <View style={styles.truckIcon}>
          <Ionicons name="car" size={32} color={Colors.primary} />
        </View>
        <View>
          <Text style={styles.regNum}>{truck.registrationNumber}</Text>
          {(truck.make || truck.model) && (
            <Text style={styles.model}>
              {[truck.make, truck.model, truck.year].filter(Boolean).join(' · ')}
            </Text>
          )}
        </View>
        {truck.status && (
          <View style={[styles.statusBadge, { backgroundColor: truck.status === 'ACTIVE' ? Colors.successBg : Colors.border }]}>
            <Text style={[styles.statusText, { color: truck.status === 'ACTIVE' ? Colors.success : Colors.textMuted }]}>
              {truck.status}
            </Text>
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatBox label="Trips" value={String(trips.length)} icon="map" color={Colors.primary} />
        <StatBox label="Total KM" value={`${totalKm}`} icon="speedometer" color={Colors.teal} />
        <StatBox label="Avg Mileage" value={avgMileage !== '--' ? `${avgMileage} km/L` : '--'} icon="flash" color={Colors.success} />
      </View>

      {/* Driver */}
      {truck.currentDriver && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person" size={18} color={Colors.primary} />
            <Text style={styles.cardTitle}>Current Driver</Text>
          </View>
          <View style={styles.driverInfo}>
            <View style={styles.driverAvatar}>
              <Text style={styles.driverAvatarText}>{truck.currentDriver.name.charAt(0)}</Text>
            </View>
            <View>
              <Text style={styles.driverName}>{truck.currentDriver.name}</Text>
              {truck.currentDriver.phone && (
                <Text style={styles.driverPhone}>{truck.currentDriver.phone}</Text>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Document Expiry */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="document-text" size={18} color={Colors.primary} />
          <Text style={styles.cardTitle}>Document Status</Text>
        </View>
        {docs.map(doc => (
          <View key={doc.label} style={styles.docRow}>
            <Ionicons name={doc.icon as any} size={16} color={Colors.textSecondary} />
            <Text style={styles.docLabel}>{doc.label}</Text>
            <Text style={[styles.docDate, { color: getExpiryColor(doc.date) }]}>
              {formatDate(doc.date)}
            </Text>
          </View>
        ))}
      </View>

      {/* Recent Trips */}
      <View style={styles.card}>
        <View style={[styles.cardHeader, { justifyContent: 'space-between' }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="map" size={18} color={Colors.primary} />
            <Text style={styles.cardTitle}>Recent Trips</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/trips/add')}>
            <Text style={styles.addTrip}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {trips.length === 0 ? (
          <Text style={styles.noTrips}>No trips recorded yet</Text>
        ) : (
          trips.slice(0, 5).map(trip => (
            <View key={trip._id} style={styles.tripRow}>
              <View>
                {trip.from && trip.to ? (
                  <Text style={styles.tripRoute}>{trip.from} → {trip.to}</Text>
                ) : null}
                {trip.date && (
                  <Text style={styles.tripDate}>
                    {new Date(trip.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </Text>
                )}
              </View>
              <View style={styles.tripStats}>
                {trip.kmDriven ? <Text style={styles.tripKm}>{trip.kmDriven} km</Text> : null}
                {trip.dieselFilled ? <Text style={styles.tripDiesel}>{trip.dieselFilled} L</Text> : null}
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function StatBox({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <View style={styles.statBox}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  notFound: { fontSize: FontSize.lg, color: Colors.textMuted },
  truckHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  truckIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: Colors.tealBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regNum: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  model: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: {
    marginLeft: 'auto',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  statusText: { fontSize: FontSize.xs, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: { fontSize: FontSize.lg, fontWeight: '700' },
  statLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  cardTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  driverInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' },
  driverName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  driverPhone: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  docLabel: { flex: 1, fontSize: FontSize.sm, color: Colors.text },
  docDate: { fontSize: FontSize.sm, fontWeight: '500' },
  addTrip: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
  noTrips: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', paddingVertical: Spacing.md },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tripRoute: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.text },
  tripDate: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  tripStats: { alignItems: 'flex-end', gap: 2 },
  tripKm: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.primary },
  tripDiesel: { fontSize: FontSize.xs, color: Colors.textMuted },
});
