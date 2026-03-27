import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, TextInput, Modal, Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS, Easing, interpolate, clamp,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { ListSkeleton } from '@/components/Skeleton';
import NotificationBell from '@/components/NotificationBell';
import { api } from '@/services/api';
import { ENDPOINTS } from '@/constants/api';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

// ── Types ────────────────────────────────────────────────────────
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

// ── Date helpers ─────────────────────────────────────────────────
function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatChipDate(iso: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

// ── Calendar picker (unchanged) ──────────────────────────────────
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
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

function CalendarPicker({ visible, value, label, onSelect, onClose }: {
  visible: boolean; value: string; label: string;
  onSelect: (iso: string) => void; onClose: () => void;
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

  function prev() { if (vm === 0) { setVm(11); setVy(y => y - 1); } else setVm(m => m - 1); }
  function next() { if (vm === 11) { setVm(0); setVy(y => y + 1); } else setVm(m => m + 1); }

  const grid = buildGrid(vy, vm);
  const selDate = value ? new Date(value + 'T00:00:00') : null;
  const selectedDay = selDate && selDate.getFullYear() === vy && selDate.getMonth() === vm ? selDate.getDate() : null;

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
              <TouchableOpacity key={idx} style={[cal.cell, sel && cal.cellSel]}
                onPress={() => { if (day) { onSelect(`${vy}-${String(vm + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`); onClose(); } }}
                disabled={day === null} activeOpacity={0.7}
              >
                {day !== null && <Text style={[cal.cellText, sel && cal.cellTextSel]}>{day}</Text>}
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

// ── Filter sheet ─────────────────────────────────────────────────
const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');
const SHEET_H = SCREEN_H * 0.56;

function FilterSheet({ visible, onClose, onApply, onClear, hasFilters,
  search, setSearch, startDate, setStartDate, endDate, setEndDate }: {
  visible: boolean; onClose: () => void; onApply: () => void; onClear: () => void;
  hasFilters: boolean; search: string; setSearch: (v: string) => void;
  startDate: string; setStartDate: (v: string) => void;
  endDate: string; setEndDate: (v: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SHEET_H);
  const opacity = useSharedValue(0);
  const startY = useSharedValue(0);
  const [pickerFor, setPickerFor] = useState<'start' | 'end' | null>(null);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { mass: 0.6, stiffness: 200, damping: 22 });
      opacity.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.quad) });
    } else {
      translateY.value = withTiming(SHEET_H, { duration: 240, easing: Easing.bezier(0.32, 0, 0.67, 0) });
      opacity.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) });
    }
  }, [visible]);

  const sheetAnim = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropAnim = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [0, SHEET_H], [1, 0], 'clamp'),
  }));

  const pan = Gesture.Pan()
    .activeOffsetY(5)
    .onStart(() => {
      startY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateY.value = clamp(startY.value + e.translationY, 0, SHEET_H);
    })
    .onEnd((e) => {
      if (translateY.value > SHEET_H * 0.3 || e.velocityY > 500) {
        translateY.value = withTiming(SHEET_H, { duration: 240, easing: Easing.bezier(0.32, 0, 0.67, 0) }, (done) => {
          if (done) runOnJS(onClose)();
        });
      } else {
        translateY.value = withSpring(0, { mass: 0.6, stiffness: 200, damping: 22 });
      }
    });

  return (
    <>
      <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
        <Animated.View style={[fs.overlay, backdropAnim]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
          <GestureDetector gesture={pan}>
            <Animated.View
              style={[fs.sheet, { height: SHEET_H, paddingBottom: insets.bottom + 16 }, sheetAnim]}
            >
              <View style={fs.handleWrap}>
                <View style={fs.handle} />
              </View>

          {/* Search */}
          <View style={fs.groupLabel}>
            <Text style={fs.groupLabelText}>TRUCK NUMBER</Text>
          </View>
          <View style={fs.searchRow}>
            <Ionicons name="search-outline" size={15} color="#6B7F7D" />
            <TextInput
              style={fs.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="e.g. MH12AB1234"
              placeholderTextColor="#B8CECC"
              autoCapitalize="characters"
              returnKeyType="done"
            />
            {!!search && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={15} color="#B8CECC" />
              </TouchableOpacity>
            )}
          </View>

          {/* Date range */}
          <View style={fs.groupLabel}>
            <Text style={fs.groupLabelText}>DATE RANGE</Text>
          </View>
          <View style={fs.dateRow}>
            {/* From */}
            <TouchableOpacity
              style={[fs.dateChip, !!startDate && fs.dateChipActive]}
              onPress={() => setPickerFor('start')}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={14} color={startDate ? '#0D7377' : '#6B7F7D'} />
              <Text style={[fs.dateChipText, !!startDate && fs.dateChipTextActive]}>
                {startDate ? formatChipDate(startDate) : 'From date'}
              </Text>
              {!!startDate && (
                <TouchableOpacity onPress={() => setStartDate('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={13} color="#B8CECC" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            <Ionicons name="arrow-forward-outline" size={14} color="#B8CECC" />

            {/* To */}
            <TouchableOpacity
              style={[fs.dateChip, !!endDate && fs.dateChipActive]}
              onPress={() => setPickerFor('end')}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={14} color={endDate ? '#0D7377' : '#6B7F7D'} />
              <Text style={[fs.dateChipText, !!endDate && fs.dateChipTextActive]}>
                {endDate ? formatChipDate(endDate) : 'To date'}
              </Text>
              {!!endDate && (
                <TouchableOpacity onPress={() => setEndDate('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={13} color="#B8CECC" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>

          {/* Active filter tags */}
          {hasFilters && (
            <View style={fs.tagsRow}>
              {search ? <View style={fs.tag}><Text style={fs.tagText}>🔍 {search}</Text></View> : null}
              {startDate ? <View style={fs.tag}><Text style={fs.tagText}>From {formatChipDate(startDate)}</Text></View> : null}
              {endDate ? <View style={fs.tag}><Text style={fs.tagText}>To {formatChipDate(endDate)}</Text></View> : null}
            </View>
          )}

          {/* Action buttons */}
          <View style={fs.actionRow}>
            {hasFilters && (
              <TouchableOpacity style={fs.clearBtn} onPress={onClear} activeOpacity={0.75}>
                <Text style={fs.clearText}>Clear all</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={fs.applyBtn} onPress={onApply} activeOpacity={0.85}>
              <Ionicons name="search-outline" size={15} color="#ECFFFB" />
              <Text style={fs.applyText}>Search trips</Text>
            </TouchableOpacity>
          </View>
            </Animated.View>
          </GestureDetector>
        </Animated.View>
      </Modal>

      {/* Calendar pickers — rendered outside the sheet modal so they layer on top */}
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
    </>
  );
}

// ── Main screen ──────────────────────────────────────────────────
export default function TripsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);

  // filter draft (inside sheet)
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // applied filters
  const [applied, setApplied] = useState({ search: '', startDate: '', endDate: '' });

  const hasFilters = !!(applied.search.trim() || applied.startDate || applied.endDate);
  const canAdd = user?.role === 'STAFF';

  const filtersRef = useRef(applied);
  useEffect(() => { filtersRef.current = applied; }, [applied]);

  const loadTrips = useCallback(async (p: number, q: string, sd: string, ed: string, silent = false) => {
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
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => {
    const f = filtersRef.current;
    loadTrips(1, f.search, f.startDate, f.endDate);
  }, [loadTrips]));

  function applyFilters() {
    const f = { search, startDate, endDate };
    setApplied(f);
    loadTrips(1, f.search, f.startDate, f.endDate);
    setSheetOpen(false);
  }

  function clearFilters() {
    const empty = { search: '', startDate: '', endDate: '' };
    setSearch(''); setStartDate(''); setEndDate('');
    setApplied(empty);
    loadTrips(1, '', '', '');
    setSheetOpen(false);
  }

  function openSheet() {
    // sync draft with applied
    setSearch(applied.search);
    setStartDate(applied.startDate);
    setEndDate(applied.endDate);
    setSheetOpen(true);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Trips</Text>
        <View style={styles.headerRight}>
          {/* Applied filter summary chip */}
          {hasFilters && (
            <TouchableOpacity style={styles.activeFilterChip} onPress={openSheet}>
              <Ionicons name="funnel" size={12} color={Colors.primary} />
              <Text style={styles.activeFilterText}>
                {[applied.search, applied.startDate && formatChipDate(applied.startDate), applied.endDate && formatChipDate(applied.endDate)]
                  .filter(Boolean).join(' → ')}
              </Text>
              <TouchableOpacity onPress={clearFilters} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={13} color={Colors.textMuted} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          <NotificationBell />
          {canAdd && (
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/trips/add')}>
              <Ionicons name="add" size={22} color={Colors.white} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* List */}
      {loading ? (
        <ListSkeleton count={5} lines={2} />
      ) : (
        <FlatList
          data={trips}
          keyExtractor={item => item._id}
          contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, 21) + 190 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadTrips(page, applied.search, applied.startDate, applied.endDate, true); }}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="map-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>{hasFilters ? 'No trips match your filters' : 'No trips found'}</Text>
              {hasFilters && (
                <TouchableOpacity style={styles.emptyBtn} onPress={clearFilters}>
                  <Text style={styles.emptyBtnText}>Clear filters</Text>
                </TouchableOpacity>
              )}
              {canAdd && !hasFilters && (
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
                  onPress={() => loadTrips(page - 1, applied.search, applied.startDate, applied.endDate)}
                  disabled={page === 1}
                >
                  <Ionicons name="chevron-back" size={18} color={page === 1 ? Colors.textMuted : Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.pagerText}>{page} / {totalPages}</Text>
                <TouchableOpacity
                  style={[styles.pagerBtn, page === totalPages && styles.pagerBtnDisabled]}
                  onPress={() => loadTrips(page + 1, applied.search, applied.startDate, applied.endDate)}
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

      {/* ── Circular filter FAB ── */}
      <TouchableOpacity
        style={[styles.filterFab, hasFilters && styles.filterFabActive, { bottom: Math.max(insets.bottom, 21) + 110 }]}
        onPress={openSheet}
        activeOpacity={0.85}
      >
        <Ionicons name="options-outline" size={22} color="#fff" />
        {hasFilters && <View style={styles.fabDot} />}
      </TouchableOpacity>

      <FilterSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onApply={applyFilters}
        onClear={clearFilters}
        hasFilters={!!(search.trim() || startDate || endDate)}
        search={search}
        setSearch={setSearch}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
      />
    </SafeAreaView>
  );
}

// ── Trip card ────────────────────────────────────────────────────
function TripCard({ trip }: { trip: Trip }) {
  const truckNum = typeof trip.truckId === 'object' && trip.truckId ? trip.truckId.truckNumber : 'Unknown Truck';
  const km = trip.previousKm != null && trip.currentKm != null ? trip.currentKm - trip.previousKm : null;
  const mileage = km && trip.diesel ? (km / trip.diesel).toFixed(1) : null;

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
        {trip.cash ? <TripStat icon="cash-outline" label="Cash" value={`₹${trip.cash}`} /> : null}
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

// ── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.primaryDark,
  },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.white },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1, justifyContent: 'flex-end' },
  activeFilterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 5,
    maxWidth: 160,
  },
  activeFilterText: { fontSize: 10, color: 'rgba(255,255,255,0.9)', fontWeight: '600', flex: 1 },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  list: { padding: Spacing.lg },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },
  emptyBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, marginTop: Spacing.xs },
  emptyBtnText: { color: Colors.white, fontWeight: '600' },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, paddingVertical: Spacing.md },
  pagerBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.inputBg, alignItems: 'center', justifyContent: 'center' },
  pagerBtnDisabled: { opacity: 0.4 },
  pagerText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  card: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.sm, shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
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
  // FAB
  filterFab: {
    position: 'absolute',
    left: SCREEN_W / 2 - 28,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#111827',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.38, shadowRadius: 10, elevation: 9,
  },
  filterFabActive: { backgroundColor: Colors.primary },
  fabDot: {
    position: 'absolute', top: 10, right: 10,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.error, borderWidth: 1.5, borderColor: Colors.white,
  },
});

// ── Filter sheet styles ──────────────────────────────────────────
const fs = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end' as const,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#F8FCFC',
    borderTopLeftRadius: 48, borderTopRightRadius: 48,
    overflow: 'hidden' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 20,
  },
  handleWrap: {
    alignItems: 'center', paddingVertical: 12,
  },
  handle: {
    width: 86, height: 5, borderRadius: 999,
    backgroundColor: '#8FBFBC',
    shadowColor: '#0D7377',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 6,
    elevation: 4,
  },
  groupLabel: { paddingHorizontal: 20, marginBottom: 8 },
  groupLabelText: {
    fontSize: 10, fontWeight: '700', color: '#6B7F7D',
    textTransform: 'uppercase', letterSpacing: 1.2,
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginBottom: 20,
    backgroundColor: Colors.white,
    borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#DCE9E7',
  },
  searchInput: { flex: 1, fontSize: FontSize.sm, color: '#102A2A' },
  dateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, marginBottom: 20,
  },
  dateChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.white,
    borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#DCE9E7',
  },
  dateChipActive: { borderColor: '#0D7377', backgroundColor: '#E8F8F5' },
  dateChipText: { flex: 1, fontSize: FontSize.sm, color: '#6B7F7D' },
  dateChipTextActive: { color: '#0D7377', fontWeight: '600' },
  tagsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    marginHorizontal: 20, marginBottom: 16,
  },
  tag: {
    backgroundColor: '#E8F8F5',
    borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4,
  },
  tagText: { fontSize: FontSize.xs, color: '#0D7377', fontWeight: '500' },
  actionRow: {
    flexDirection: 'row', gap: 10,
    marginHorizontal: 20,
    borderTopWidth: 1, borderTopColor: '#DCE9E7', paddingTop: 14,
  },
  clearBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, borderColor: '#DCE9E7', alignItems: 'center',
  },
  clearText: { fontSize: FontSize.sm, fontWeight: '600', color: '#6B7F7D' },
  applyBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: 14, backgroundColor: '#0D7377',
  },
  applyText: { fontSize: FontSize.sm, fontWeight: '700', color: '#ECFFFB' },
});

// ── Calendar styles ──────────────────────────────────────────────
const cal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: 32,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.sm },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  monthText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  arrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.inputBg, alignItems: 'center', justifyContent: 'center' },
  dayHeaders: { flexDirection: 'row', marginBottom: Spacing.xs },
  dayHeader: { flex: 1, textAlign: 'center', fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%` as any, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 100 },
  cellSel: { backgroundColor: Colors.primary },
  cellText: { fontSize: FontSize.sm, color: Colors.text },
  cellTextSel: { color: Colors.white, fontWeight: '700' },
  clearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, marginTop: Spacing.md },
  clearText: { fontSize: FontSize.sm, color: Colors.error, fontWeight: '600' },
});
