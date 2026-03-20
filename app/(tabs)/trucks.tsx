import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { ENDPOINTS } from '@/constants/api';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

interface Truck {
  _id: string;
  truckNumber: string;
  model?: string;
  make?: string;
  year?: number;
  status?: string;
  assignedDriver?: { name: string } | null;
  insuranceExpiry?: string;
  fitnessExpiry?: string;
  operator?: string;
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: Colors.success,
  INACTIVE: Colors.textMuted,
  MAINTENANCE: Colors.warning,
};

export default function TrucksScreen() {
  const { user } = useAuth();
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [filtered, setFiltered] = useState<Truck[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const endpoint = ENDPOINTS.TRUCKS;

  const loadTrucks = useCallback(async () => {
    try {
      const data = await api.get<any>(endpoint);
      // getAllTrucks returns { trucks: [...] }, getMyTrucks returns [...] directly
      const list: Truck[] = Array.isArray(data) ? data : (data.trucks ?? []);
      setTrucks(list);
      setFiltered(list);
    } catch {
      // handle
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [endpoint]);

  useEffect(() => { loadTrucks(); }, [loadTrucks]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(trucks);
    } else {
      const q = search.toLowerCase();
      setFiltered(trucks.filter(t =>
        t.truckNumber.toLowerCase().includes(q) ||
        t.model?.toLowerCase().includes(q) ||
        t.make?.toLowerCase().includes(q) ||
        t.operator?.toLowerCase().includes(q)
      ));
    }
  }, [search, trucks]);

  const canAdd = user?.role === 'STAFF';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Trucks</Text>
        {canAdd && (
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/trucks/add')}>
            <Ionicons name="add" size={22} color={Colors.white} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by number or model..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="characters"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTrucks(); }} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="car-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No trucks found</Text>
              {canAdd && (
                <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/trucks/add')}>
                  <Text style={styles.emptyBtnText}>Add Truck</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/trucks/${item._id}`)}
              activeOpacity={0.85}
            >
              <View style={styles.cardLeft}>
                <View style={styles.truckIcon}>
                  <Ionicons name="car" size={22} color={Colors.primary} />
                </View>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.regNum}>{item.truckNumber}</Text>
                {(item.make || item.model) && (
                  <Text style={styles.model}>
                    {[item.make, item.model, item.year].filter(Boolean).join(' · ')}
                  </Text>
                )}
                {item.operator && (
                  <Text style={styles.model}>{item.operator}</Text>
                )}
                {item.assignedDriver && (
                  <View style={styles.driverRow}>
                    <Ionicons name="person-outline" size={12} color={Colors.textSecondary} />
                    <Text style={styles.driverName}>{item.assignedDriver.name}</Text>
                  </View>
                )}
              </View>
              <View style={styles.cardRight}>
                {item.status && (
                  <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOR[item.status] || Colors.textMuted) + '20' }]}>
                    <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[item.status] || Colors.textMuted }]} />
                    <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] || Colors.textMuted }]}>
                      {item.status}
                    </Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    height: 46,
  },
  searchIcon: { marginRight: Spacing.sm },
  searchInput: { flex: 1, fontSize: FontSize.md, color: Colors.text },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 40 },
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
    flexDirection: 'row',
    alignItems: 'center',
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
  cardLeft: { marginRight: Spacing.md },
  truckIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.tealBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  regNum: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  model: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  driverName: { fontSize: FontSize.xs, color: Colors.textSecondary },
  cardRight: { alignItems: 'flex-end', gap: Spacing.xs },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    gap: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: FontSize.xs, fontWeight: '600' },
});
