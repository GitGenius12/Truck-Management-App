import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ListSkeleton } from '@/components/Skeleton';
import NotificationBell from '@/components/NotificationBell';
import { api } from '@/services/api';
import { ENDPOINTS } from '@/constants/api';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';

// ── types ──────────────────────────────────────────────────────────────────

interface EntityItem {
  _id: string;
  truckNumber?: string;
  name?: string;
  phone?: string;
  availabilityStatus: string;
  firmId?: { firmName?: string } | string;
}

interface Board {
  trucks: EntityItem[];
  drivers: EntityItem[];
}

// ── constants ──────────────────────────────────────────────────────────────

const TRUCK_STATUSES  = ['AVAILABLE', 'MAINTENANCE', 'UNAVAILABLE', 'ASSIGNED'] as const;
const DRIVER_STATUSES = ['AVAILABLE', 'LEAVE', 'MAINTENANCE', 'UNAVAILABLE', 'ASSIGNED'] as const;

const STATUS_META: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  AVAILABLE:   { label: 'Available',    bg: Colors.successBg,   text: Colors.success,        dot: Colors.success },
  ASSIGNED:    { label: 'Assigned',     bg: Colors.tealBg,      text: Colors.primary,        dot: Colors.primary },
  MAINTENANCE: { label: 'Maintenance',  bg: '#FEF9C3',          text: '#A16207',             dot: '#A16207' },
  UNAVAILABLE: { label: 'Unavailable',  bg: Colors.errorBg,     text: Colors.error,          dot: Colors.error },
  LEAVE:       { label: 'On Leave',     bg: '#F3E8FF',          text: '#7C3AED',             dot: '#7C3AED' },
};

// ── helpers ────────────────────────────────────────────────────────────────

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(iso: string, n: number) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDisplay(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

// ── component ──────────────────────────────────────────────────────────────

export default function AvailabilityScreen() {
  const today = todayISO();
  const [date, setDate] = useState(today);
  const [tab, setTab] = useState<'trucks' | 'drivers'>('trucks');
  const [board, setBoard] = useState<Board>({ trucks: [], drivers: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // optimistic: key = `${entityType}:${id}`, value = status string
  const [pending, setPending] = useState<Record<string, string>>({});

  const load = useCallback(async (d = date, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.get<any>(`${ENDPOINTS.DAILY_OPS_AVAILABILITY}?date=${d}`);
      setBoard({ trucks: data.trucks ?? [], drivers: data.drivers ?? [] });
    } catch (e: any) {
      if (!silent) Alert.alert('Error', e?.message ?? 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date]);

  useEffect(() => { load(date); }, [date]);

  function changeDate(delta: number) {
    setDate(prev => addDays(prev, delta));
  }

  async function updateStatus(entityType: 'TRUCK' | 'DRIVER', entityId: string, status: string) {
    const key = `${entityType}:${entityId}`;
    // optimistic
    setPending(p => ({ ...p, [key]: status }));
    setBoard(prev => {
      const field = entityType === 'TRUCK' ? 'trucks' : 'drivers';
      return {
        ...prev,
        [field]: prev[field].map(item =>
          item._id === entityId ? { ...item, availabilityStatus: status } : item
        ),
      };
    });
    try {
      await api.put(ENDPOINTS.DAILY_OPS_AVAILABILITY, { date, entityType, entityId, status });
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to update');
      // revert
      load(date, true);
    } finally {
      setPending(p => { const n = { ...p }; delete n[key]; return n; });
    }
  }

  const items = tab === 'trucks' ? board.trucks : board.drivers;
  const statuses = tab === 'trucks' ? TRUCK_STATUSES : DRIVER_STATUSES;

  const availTrucks  = board.trucks.filter(t => t.availabilityStatus === 'AVAILABLE').length;
  const availDrivers = board.drivers.filter(d => d.availabilityStatus === 'AVAILABLE').length;
  const total = board.trucks.length + board.drivers.length;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* ── Header ─────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Availability</Text>
        <NotificationBell />
      </View>

      {/* ── Date Navigator ──────────────────────── */}
      <View style={styles.dateRow}>
        <TouchableOpacity style={styles.arrowBtn} onPress={() => changeDate(-1)}>
          <Ionicons name="chevron-back" size={20} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setDate(today)}>
          <Text style={styles.dateText}>{formatDisplay(date)}</Text>
          {date !== today && <Text style={styles.tapToday}>tap to go today</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.arrowBtn} onPress={() => changeDate(1)}>
          <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* ── Stats ───────────────────────────────── */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: Colors.success }]}>{availTrucks}</Text>
          <Text style={styles.statLabel}>Trucks Free</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: Colors.primary }]}>{availDrivers}</Text>
          <Text style={styles.statLabel}>Drivers Free</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{total}</Text>
          <Text style={styles.statLabel}>Total Assets</Text>
        </View>
      </View>

      {/* ── Tabs ────────────────────────────────── */}
      <View style={styles.tabRow}>
        {(['trucks', 'drivers'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Ionicons
              name={t === 'trucks' ? 'car-outline' : 'people-outline'}
              size={16}
              color={tab === t ? Colors.white : Colors.textSecondary}
            />
            <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>
              {t === 'trucks' ? `Trucks (${board.trucks.length})` : `Drivers (${board.drivers.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── List ────────────────────────────────── */}
      {loading ? (
        <ListSkeleton count={5} lines={2} />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(date, true); }}
              tintColor={Colors.primary}
            />
          }
        >
          {items.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name={tab === 'trucks' ? 'car-outline' : 'people-outline'} size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No {tab} found</Text>
            </View>
          )}
          {items.map(item => {
            const label = tab === 'trucks' ? item.truckNumber : item.name;
            const sub   = tab === 'drivers' && item.phone ? item.phone : undefined;
            const st = STATUS_META[item.availabilityStatus] ?? STATUS_META.UNAVAILABLE;
            const entityType = tab === 'trucks' ? 'TRUCK' : 'DRIVER';
            const isPending = !!pending[`${entityType}:${item._id}`];

            return (
              <View key={item._id} style={styles.card}>
                {/* icon + name */}
                <View style={styles.cardTop}>
                  <View style={styles.iconWrap}>
                    <Ionicons name={tab === 'trucks' ? 'car' : 'person'} size={18} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{label}</Text>
                    {sub && <Text style={styles.cardSub}>{sub}</Text>}
                  </View>
                  <View style={[styles.badge, { backgroundColor: st.bg }]}>
                    <View style={[styles.dot, { backgroundColor: st.dot }]} />
                    <Text style={[styles.badgeText, { color: st.text }]}>{st.label}</Text>
                  </View>
                </View>

                {/* status buttons */}
                <View style={styles.statusBtns}>
                  {statuses.map(s => {
                    const active = item.availabilityStatus === s;
                    const meta = STATUS_META[s];
                    return (
                      <TouchableOpacity
                        key={s}
                        style={[styles.statusBtn, active && { backgroundColor: meta.bg, borderColor: meta.dot }]}
                        onPress={() => !isPending && !active && updateStatus(entityType as any, item._id, s)}
                        disabled={isPending}
                      >
                        <Text style={[styles.statusBtnText, active && { color: meta.text, fontWeight: '700' }]}>
                          {meta.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.primaryDark,
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.white },

  dateRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  arrowBtn: {
    width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.tealBg,
    alignItems: 'center', justifyContent: 'center',
  },
  dateText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  tapToday: { fontSize: FontSize.xs, color: Colors.primary, textAlign: 'center', marginTop: 2 },

  statsRow: {
    flexDirection: 'row', backgroundColor: Colors.white, marginBottom: 1,
    paddingVertical: Spacing.sm,
  },
  statBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xs },
  statNum: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs },

  tabRow: {
    flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    gap: Spacing.sm, backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, borderRadius: Radius.sm, gap: 6,
    backgroundColor: Colors.tealBg,
  },
  tabBtnActive: { backgroundColor: Colors.primary },
  tabBtnText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  tabBtnTextActive: { color: Colors.white },

  list: { padding: Spacing.lg, paddingBottom: 110, gap: Spacing.sm },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },

  card: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  iconWrap: {
    width: 38, height: 38, borderRadius: Radius.sm, backgroundColor: Colors.tealBg,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  cardSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  badge: {
    flexDirection: 'row', alignItems: 'center', borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 4, gap: 5,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontSize: FontSize.xs, fontWeight: '700' },

  statusBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statusBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  statusBtnText: { fontSize: FontSize.xs, color: Colors.textSecondary },
});
