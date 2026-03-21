import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import OmLoader from '@/components/OmLoader';
import { api } from '@/services/api';
import { ENDPOINTS } from '@/constants/api';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';

interface Driver {
  _id: string;
  name: string;
  phone?: string;
  licenseNumber?: string;
  status?: string;
  currentTruck?: { registrationNumber: string } | null;
  totalTrips?: number;
}

export default function DriversScreen() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filtered, setFiltered] = useState<Driver[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDrivers = useCallback(async () => {
    try {
      const data = await api.get<any>(ENDPOINTS.DRIVERS);
      const list: Driver[] = Array.isArray(data) ? data : (data.drivers ?? []);
      setDrivers(list);
      setFiltered(list);
    } catch {
      //
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadDrivers(); }, [loadDrivers]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(drivers);
    } else {
      const q = search.toLowerCase();
      setFiltered(drivers.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.phone?.includes(q) ||
        d.licenseNumber?.toLowerCase().includes(q)
      ));
    }
  }, [search, drivers]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Drivers</Text>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or phone..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <OmLoader />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDrivers(); }} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No drivers found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/drivers/${item._id}`)}
              activeOpacity={0.85}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                {item.phone && (
                  <View style={styles.row}>
                    <Ionicons name="call-outline" size={12} color={Colors.textSecondary} />
                    <Text style={styles.sub}>{item.phone}</Text>
                  </View>
                )}
                {item.currentTruck && (
                  <View style={styles.row}>
                    <Ionicons name="car-outline" size={12} color={Colors.textSecondary} />
                    <Text style={styles.sub}>{item.currentTruck.registrationNumber}</Text>
                  </View>
                )}
              </View>
              {item.status && (
                <View style={[
                  styles.badge,
                  { backgroundColor: item.status === 'ACTIVE' ? Colors.successBg : Colors.border }
                ]}>
                  <Text style={[
                    styles.badgeText,
                    { color: item.status === 'ACTIVE' ? Colors.success : Colors.textMuted }
                  ]}>
                    {item.status}
                  </Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} style={{ marginLeft: 4 }} />
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primaryDark,
  },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.white },
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
    gap: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' },
  info: { flex: 1, gap: 3 },
  name: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sub: { fontSize: FontSize.sm, color: Colors.textSecondary },
  badge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  badgeText: { fontSize: FontSize.xs, fontWeight: '600' },
});
