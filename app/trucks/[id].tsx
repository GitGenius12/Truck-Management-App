import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import OmLoader from '@/components/OmLoader';
import { api } from '@/services/api';
import { ENDPOINTS } from '@/constants/api';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';

interface TruckDetail {
  _id: string;
  truckNumber: string;
  make?: string;
  model?: string;
  year?: number;
  capacity?: string;
  operator?: string;
  assignedDriver?: { _id: string; name: string; phone?: string } | null;
  insuranceExpiry?: string;
  fitnessExpiry?: string;
  roadTaxExpiry?: string;
  permitExpiry?: string;
  pollutionExpiry?: string;
  carrierLegalLiabilityExpiry?: string;
}

interface Trip {
  _id: string;
  tripDate?: string;
  tripNumber?: number;
  totalDistance?: number;
  previousKm?: number;
  currentKm?: number;
  diesel?: number;
  cash?: number;
  average?: number;
  driverId?: { name: string } | null;
}

function formatExpiry(dateStr?: string) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  const diff = d.getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  const formatted = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  if (days < 0) return `${formatted} (Expired)`;
  if (days <= 30) return `${formatted} (${days}d left)`;
  return formatted;
}

function expiryColor(dateStr?: string) {
  if (!dateStr) return Colors.textMuted;
  const days = (new Date(dateStr).getTime() - Date.now()) / 86400000;
  if (days < 0) return Colors.error;
  if (days <= 30) return Colors.warning;
  return Colors.success;
}

export default function TruckDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [truck, setTruck] = useState<TruckDetail | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [trucksRes, tripsRes] = await Promise.allSettled([
        api.get<any>(ENDPOINTS.TRUCKS),
        api.get<any>(ENDPOINTS.TRIPS_BY_TRUCK(id)),
      ]);

      if (trucksRes.status === 'fulfilled') {
        const raw = trucksRes.value;
        const list: TruckDetail[] = Array.isArray(raw) ? raw : (raw.trucks ?? []);
        const found = list.find(t => t._id === id);
        if (found) setTruck(found);
        else setError('Truck not found');
      }

      if (tripsRes.status === 'fulfilled') {
        const raw = tripsRes.value;
        setTrips(Array.isArray(raw) ? raw : (raw.trips ?? []));
      }
    } catch {
      setError('Failed to load truck details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <OmLoader fullScreen />;
  }

  if (error || !truck) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <Text style={styles.notFound}>{error || 'Truck not found'}</Text>
      </View>
    );
  }

  const totalKm = trips.reduce((s, t) => s + (t.totalDistance ?? 0), 0);
  const totalDiesel = trips.reduce((s, t) => s + (t.diesel ?? 0), 0);
  const avgMileage = totalDiesel > 0 ? (totalKm / totalDiesel).toFixed(1) : '--';

  const docs = [
    { label: 'Insurance',   date: truck.insuranceExpiry,              icon: 'shield-checkmark-outline' },
    { label: 'Fitness',     date: truck.fitnessExpiry,                icon: 'fitness-outline' },
    { label: 'Road Tax',    date: truck.roadTaxExpiry,                icon: 'receipt-outline' },
    { label: 'Permit',      date: truck.permitExpiry,                 icon: 'card-outline' },
    { label: 'Pollution',   date: truck.pollutionExpiry,              icon: 'leaf-outline' },
    { label: 'CLL',         date: truck.carrierLegalLiabilityExpiry, icon: 'briefcase-outline' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.headerCard}>
        <View style={styles.truckIcon}>
          <Ionicons name="car" size={30} color={Colors.primary} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.regNum}>{truck.truckNumber}</Text>
          {(truck.make || truck.model) && (
            <Text style={styles.subText}>
              {[truck.make, truck.model, truck.year].filter(Boolean).join(' · ')}
            </Text>
          )}
          {truck.operator && <Text style={styles.subText}>{truck.operator}</Text>}
          {truck.capacity && <Text style={styles.subText}>Capacity: {truck.capacity}</Text>}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatBox label="Trips" value={String(trips.length)} icon="map" color={Colors.primary} />
        <StatBox label="Total KM" value={totalKm > 0 ? `${totalKm}` : '0'} icon="speedometer" color={Colors.teal} />
        <StatBox label="Avg Mileage" value={avgMileage !== '--' ? `${avgMileage}` : '--'} icon="flash" color={Colors.success} />
      </View>

      {/* Assigned Driver */}
      {truck.assignedDriver && (
        <View style={styles.card}>
          <SectionHeader icon="person" title="Assigned Driver" />
          <View style={styles.driverRow}>
            <View style={styles.driverAvatar}>
              <Text style={styles.driverAvatarText}>
                {truck.assignedDriver.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.driverName}>{truck.assignedDriver.name}</Text>
              {truck.assignedDriver.phone && (
                <Text style={styles.driverPhone}>{truck.assignedDriver.phone}</Text>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Documents */}
      <View style={styles.card}>
        <SectionHeader icon="document-text" title="Document Status" />
        {docs.map((doc, idx) => (
          <View key={doc.label} style={[styles.docRow, idx === docs.length - 1 && { borderBottomWidth: 0 }]}>
            <Ionicons name={doc.icon as any} size={15} color={Colors.textSecondary} />
            <Text style={styles.docLabel}>{doc.label}</Text>
            <Text style={[styles.docDate, { color: expiryColor(doc.date) }]}>
              {formatExpiry(doc.date)}
            </Text>
          </View>
        ))}
      </View>

      {/* Recent Trips */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <SectionHeader icon="map" title="Recent Trips" />
          <TouchableOpacity onPress={() => router.push('/trips/add')}>
            <Text style={styles.addBtn}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {trips.length === 0 ? (
          <Text style={styles.emptyTrips}>No trips recorded yet</Text>
        ) : (
          trips.slice(0, 6).map(trip => {
            const km = trip.totalDistance ?? ((trip.currentKm ?? 0) - (trip.previousKm ?? 0));
            return (
              <View key={trip._id} style={styles.tripRow}>
                <View>
                  <Text style={styles.tripNum}>Trip #{trip.tripNumber ?? '?'}</Text>
                  {trip.tripDate && (
                    <Text style={styles.tripDate}>
                      {new Date(trip.tripDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  )}
                  {trip.driverId && (
                    <Text style={styles.tripDriver}>{trip.driverId.name}</Text>
                  )}
                </View>
                <View style={styles.tripRight}>
                  {km > 0 && <Text style={styles.tripKm}>{km} km</Text>}
                  {trip.diesel ? <Text style={styles.tripSub}>{trip.diesel} L</Text> : null}
                  {trip.average ? <Text style={[styles.tripSub, { color: Colors.success }]}>{trip.average.toFixed(1)} km/L</Text> : null}
                  {trip.cash ? <Text style={styles.tripSub}>₹{trip.cash}</Text> : null}
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon as any} size={17} color={Colors.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function StatBox({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <View style={styles.statBox}>
      <Ionicons name={icon as any} size={18} color={color} />
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

  headerCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.md, shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
  },
  truckIcon: {
    width: 56, height: 56, borderRadius: Radius.md,
    backgroundColor: Colors.tealBg, alignItems: 'center', justifyContent: 'center',
  },
  headerInfo: { flex: 1 },
  regNum: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  subText: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  statBox: {
    flex: 1, backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.md, alignItems: 'center', gap: 4,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  statValue: { fontSize: FontSize.lg, fontWeight: '700' },
  statLabel: { fontSize: FontSize.xs, color: Colors.textMuted },

  card: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.md, shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },

  driverRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  driverAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryDark,
    alignItems: 'center', justifyContent: 'center',
  },
  driverAvatarText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' },
  driverName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  driverPhone: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },

  docRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  docLabel: { flex: 1, fontSize: FontSize.sm, color: Colors.text },
  docDate: { fontSize: FontSize.sm, fontWeight: '500' },

  addBtn: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
  emptyTrips: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', paddingVertical: Spacing.md },
  tripRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tripNum: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
  tripDate: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  tripDriver: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  tripRight: { alignItems: 'flex-end', gap: 2 },
  tripKm: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  tripSub: { fontSize: FontSize.xs, color: Colors.textMuted },
});
