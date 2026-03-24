import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ListSkeleton } from '@/components/Skeleton';
import NotificationBell from '@/components/NotificationBell';
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

// ── date helpers ────────────────────────────────────────────────────────────

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatChipDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

// ── calendar picker ─────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function buildGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function CalendarPicker({
  visible, value, label, onSelect, onClose,
}: {
  visible: boolean;
  value: string;
  label: string;
  onSelect: (iso: string) => void;
  onClose: () => void;
}) {
  const init = value ? new Date(value + 'T00:00:00') : new Date();
  const [vy, setVy] = useState(init.getFullYear());
  const [vm, setVm] = useState(init.getMonth());

  useEffect(() => {
    if (visible) {
      const d = value ? new Date(value + 'T00:00:00') : new Date();
      setVy(d.getFullYear()); setVm(d.getMonth());
    }
  }, [visible, value]);

  function prev() {
    if (vm === 0) { setVm(11); setVy(y => y - 1); }
    else setVm(m => m - 1);
  }
  function next() {
    if (vm === 11) { setVm(0); setVy(y => y + 1); }
    else setVm(m => m + 1);
  }

  const grid = buildGrid(vy, vm);
  const selDate = value ? new Date(value + 'T00:00:00') : null;
  const selectedDay = selDate && selDate.getFullYear() === vy && selDate.getMonth() === vm
    ? selDate.getDate() : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={cal.overlay} activeOpacity={1} onPress={onClose} />
      <View style={cal.sheet}>
        <View style={cal.handle} />
        <Text style={cal.label}>{label}</Text>
        <View style={cal.monthRow}>
          <TouchableOpacity style={cal.arrow} onPress={prev}>
            <Ionicons name="chevron-back" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={cal.monthText}>{MONTH_NAMES[vm]} {vy}</Text>
          <TouchableOpacity style={cal.arrow} onPress={next}>
            <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={cal.dayHeaders}>
          {DAY_LABELS.map(d => <Text key={d} style={cal.dayHeader}>{d}</Text>)}
        </View>
        <View style={cal.grid}>
          {grid.map((day, idx) => {
            const sel = day !== null && day === selectedDay;
            return (
              <TouchableOpacity
                key={idx}
                style={[cal.cell, sel && cal.cellSel]}
                onPress={() => {
                  if (day) {
                    onSelect(`${vy}-${String(vm + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
                    onClose();
                  }
                }}
                disabled={day === null}
                activeOpacity={0.7}
              >
                {day !== null && (
                  <Text style={[cal.cellText, sel && cal.cellTextSel]}>{day}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        {value ? (
          <TouchableOpacity style={cal.clearRow} onPress={() => { onSelect(''); onClose(); }}>
            <Ionicons name="close-circle-outline" size={16} color={Colors.error} />
            <Text style={cal.clearText}>Clear date</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </Modal>
  );
}

// ── main screen ─────────────────────────────────────────────────────────────

export default function TripsScreen() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);

  // Keep a ref so useFocusEffect can read current filters without stale closure
  const filtersRef = useRef({ search: '', startDate: '', endDate: '' });
  useEffect(() => {
    filtersRef.current = { search, startDate, endDate };
  }, [search, startDate, endDate]);

  const canAdd = user?.role === 'STAFF';

  const loadTrips = useCallback(async (
    p: number, q: string, sd: string, ed: string, silent = false,
  ) => {
    if (!silent) setLoading(true);
    try {
      const params: string[] = [`page=${p}`, 'limit=20'];
      if (q.trim()) params.push(`truckNumber=${encodeURIComponent(q.trim())}`);
      if (sd) params.push(`startDate=${sd}`);
      if (ed) params.push(`endDate=${ed}`);
      const data = await api.get<any>(`${ENDPOINTS.TRIPS}?${params.join('&')}`);
      setTrips(data.trips ?? []);
      setTotalPages(data.totalPages ?? 1);
      setPage(p);
    } catch {
      //
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    const f = filtersRef.current;
    loadTrips(1, f.search, f.startDate, f.endDate);
  }, [loadTrips]));

  function applyFilters() {
    loadTrips(1, search, startDate, endDate);
  }

  function clearFilters() {
    setSearch('');
    setStartDate('');
    setEndDate('');
    loadTrips(1, '', '', '');
  }

  const hasFilter = !!(search.trim() || startDate || endDate);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Trips</Text>
        <View style={styles.headerRight}>
          <NotificationBell />
          {canAdd && (
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/trips/add')}>
              <Ionicons name="add" size={22} color={Colors.white} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter bar */}
      <View style={styles.filterBar}>
        {/* Search row */}
        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by truck number..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="characters"
            returnKeyType="search"
            onSubmitEditing={applyFilters}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); loadTrips(1, '', startDate, endDate); }}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Date range row */}
        <View style={styles.dateRow}>
          <TouchableOpacity
            style={[styles.dateChip, startDate ? styles.dateChipActive : null]}
            onPress={() => setPickerFor('start')}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={13} color={startDate ? Colors.primary : Colors.textMuted} />
            <Text style={[styles.dateChipText, startDate ? styles.dateChipTextActive : null]}>
              {startDate ? formatChipDate(startDate) : 'From'}
            </Text>
          </TouchableOpacity>

          <Ionicons name="arrow-forward" size={13} color={Colors.textMuted} style={styles.arrowIcon} />

          <TouchableOpacity
            style={[styles.dateChip, endDate ? styles.dateChipActive : null]}
            onPress={() => setPickerFor('end')}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={13} color={endDate ? Colors.primary : Colors.textMuted} />
            <Text style={[styles.dateChipText, endDate ? styles.dateChipTextActive : null]}>
              {endDate ? formatChipDate(endDate) : 'To'}
            </Text>
          </TouchableOpacity>

          <View style={styles.dateActions}>
            <TouchableOpacity style={styles.searchBtn} onPress={applyFilters}>
              <Text style={styles.searchBtnText}>Search</Text>
            </TouchableOpacity>
            {hasFilter && (
              <TouchableOpacity onPress={clearFilters}>
                <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* List */}
      {loading ? (
        <ListSkeleton count={5} lines={2} />
      ) : (
        <FlatList
          data={trips}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadTrips(page, search, startDate, endDate, true);
              }}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="map-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>
                {hasFilter ? 'No trips match your filters' : 'No trips found'}
              </Text>
              {canAdd && !hasFilter && (
                <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/trips/add')}>
                  <Text style={styles.emptyBtnText}>Add Trip</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pager}>
                <TouchableOpacity
                  style={[styles.pagerBtn, page === 1 && styles.pagerBtnDisabled]}
                  onPress={() => loadTrips(page - 1, search, startDate, endDate)}
                  disabled={page === 1}
                >
                  <Ionicons name="chevron-back" size={18} color={page === 1 ? Colors.textMuted : Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.pagerText}>{page} / {totalPages}</Text>
                <TouchableOpacity
                  style={[styles.pagerBtn, page === totalPages && styles.pagerBtnDisabled]}
                  onPress={() => loadTrips(page + 1, search, startDate, endDate)}
                  disabled={page === totalPages}
                >
                  <Ionicons name="chevron-forward" size={18} color={page === totalPages ? Colors.textMuted : Colors.primary} />
                </TouchableOpacity>
              </View>
            ) : null
          }
          renderItem={({ item }) => <TripCard trip={item} />}
        />
      )}

      {/* Calendar pickers */}
      <CalendarPicker
        visible={pickerFor === 'start'}
        value={startDate}
        label="Select start date"
        onSelect={setStartDate}
        onClose={() => setPickerFor(null)}
      />
      <CalendarPicker
        visible={pickerFor === 'end'}
        value={endDate}
        label="Select end date"
        onSelect={setEndDate}
        onClose={() => setPickerFor(null)}
      />
    </SafeAreaView>
  );
}

// ── trip card ────────────────────────────────────────────────────────────────

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

// ── styles ───────────────────────────────────────────────────────────────────

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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Filter bar
  filterBar: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    gap: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
    paddingVertical: 0,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.tealBg,
  },
  dateChipText: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '500' },
  dateChipTextActive: { color: Colors.primary },
  arrowIcon: { marginHorizontal: 2 },
  dateActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginLeft: 'auto' },
  searchBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  searchBtnText: { fontSize: FontSize.xs, color: Colors.white, fontWeight: '700' },
  // List
  list: { padding: Spacing.lg, paddingBottom: 120 },
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
  // Pagination
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  pagerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagerBtnDisabled: { opacity: 0.4 },
  pagerText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  // Trip card
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
  routeText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  date: { fontSize: FontSize.sm, color: Colors.textMuted },
  divider: { height: 1, backgroundColor: Colors.border, marginBottom: Spacing.sm },
  statsRow: { flexDirection: 'row', gap: Spacing.md },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
});

const cal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: 32,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.sm },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  monthText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  arrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
  },
  cellSel: { backgroundColor: Colors.primary },
  cellText: { fontSize: FontSize.sm, color: Colors.text },
  cellTextSel: { color: Colors.white, fontWeight: '700' },
  clearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  clearText: { fontSize: FontSize.sm, color: Colors.error, fontWeight: '600' },
});
