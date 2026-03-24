import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  RefreshControl, Alert, Modal, FlatList, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ListSkeleton } from '@/components/Skeleton';
import NotificationBell from '@/components/NotificationBell';
import { api } from '@/services/api';
import { ENDPOINTS } from '@/constants/api';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';

// ── types ──────────────────────────────────────────────────────────────────

interface Assignment {
  _id: string;
  date: string;
  truckId: { _id: string; truckNumber: string; firmId?: { firmName?: string } };
  driverId: { _id: string; name: string; phone?: string; firmId?: { firmName?: string } };
  assignedBy?: { name: string };
}

interface TruckOption  { _id: string; truckNumber: string; availabilityStatus: string }
interface DriverOption { _id: string; name: string; phone?: string; availabilityStatus: string }

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

export default function AssignmentScreen() {
  const today = todayISO();
  const [date, setDate] = useState(today);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // create modal
  const [showCreate, setShowCreate] = useState(false);
  const [availTrucks, setAvailTrucks]   = useState<TruckOption[]>([]);
  const [availDrivers, setAvailDrivers] = useState<DriverOption[]>([]);
  const [selTruck,  setSelTruck]  = useState<TruckOption | null>(null);
  const [selDriver, setSelDriver] = useState<DriverOption | null>(null);
  const [creating, setCreating] = useState(false);
  const [loadingBoard, setLoadingBoard] = useState(false);

  // ── load assignments ──────────────────────────────────────────────────────

  const load = useCallback(async (d = date, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.get<any>(`${ENDPOINTS.DAILY_OPS_ASSIGNMENTS}?date=${d}`);
      setAssignments(Array.isArray(data) ? data : (data.assignments ?? []));
    } catch (e: any) {
      if (!silent) Alert.alert('Error', e?.message ?? 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date]);

  useEffect(() => { load(date); }, [date]);

  // ── load availability board for create modal ──────────────────────────────

  async function openCreate() {
    setShowCreate(true);
    setSelTruck(null);
    setSelDriver(null);
    setLoadingBoard(true);
    try {
      const data = await api.get<any>(`${ENDPOINTS.DAILY_OPS_AVAILABILITY}?date=${date}`);
      setAvailTrucks(
        (data.trucks ?? []).filter((t: TruckOption) => t.availabilityStatus === 'AVAILABLE')
      );
      setAvailDrivers(
        (data.drivers ?? []).filter((d: DriverOption) => d.availabilityStatus === 'AVAILABLE')
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to load available trucks/drivers');
      setShowCreate(false);
    } finally {
      setLoadingBoard(false);
    }
  }

  // ── create assignment ─────────────────────────────────────────────────────

  async function createAssignment() {
    if (!selTruck || !selDriver) {
      Alert.alert('Select both a truck and a driver');
      return;
    }
    setCreating(true);
    try {
      await api.post(ENDPOINTS.DAILY_OPS_ASSIGNMENTS, {
        date,
        truckId: selTruck._id,
        driverId: selDriver._id,
      });
      setShowCreate(false);
      load(date, true);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to create assignment');
    } finally {
      setCreating(false);
    }
  }

  // ── delete assignment ─────────────────────────────────────────────────────

  function confirmDelete(a: Assignment) {
    Alert.alert(
      'Remove Assignment',
      `Unassign ${a.truckId?.truckNumber} from ${a.driverId?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: () => deleteAssignment(a),
        },
      ]
    );
  }

  async function deleteAssignment(a: Assignment) {
    // optimistic remove
    setAssignments(prev => prev.filter(x => x._id !== a._id));
    try {
      await api.deleteWithBody(ENDPOINTS.DAILY_OPS_ASSIGNMENTS, {
        date,
        assignmentId: a._id,
      });
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to remove assignment');
      load(date, true); // revert
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* ── Header ─────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Assignments</Text>
        <View style={styles.headerRight}>
          <NotificationBell />
          <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
            <Ionicons name="add" size={22} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Date Navigator ──────────────────────── */}
      <View style={styles.dateRow}>
        <TouchableOpacity style={styles.arrowBtn} onPress={() => setDate(d => addDays(d, -1))}>
          <Ionicons name="chevron-back" size={20} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setDate(today)}>
          <Text style={styles.dateText}>{formatDisplay(date)}</Text>
          {date !== today && <Text style={styles.tapToday}>tap to go today</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.arrowBtn} onPress={() => setDate(d => addDays(d, 1))}>
          <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* ── Stats bar ───────────────────────────── */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: Colors.primary }]}>{assignments.length}</Text>
          <Text style={styles.statLabel}>Assigned Pairs</Text>
        </View>
      </View>

      {/* ── List ────────────────────────────────── */}
      {loading ? (
        <ListSkeleton count={4} lines={2} />
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
          {assignments.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="git-branch-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No assignments for this date</Text>
              <TouchableOpacity style={styles.createEmptyBtn} onPress={openCreate}>
                <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                <Text style={styles.createEmptyText}>Create Assignment</Text>
              </TouchableOpacity>
            </View>
          )}

          {assignments.map(a => (
            <View key={a._id} style={styles.card}>
              {/* truck row */}
              <View style={styles.entityRow}>
                <View style={[styles.iconWrap, { backgroundColor: Colors.tealBg }]}>
                  <Ionicons name="car" size={16} color={Colors.primary} />
                </View>
                <Text style={styles.entityLabel}>{a.truckId?.truckNumber ?? '—'}</Text>
                {a.truckId?.firmId?.firmName && (
                  <Text style={styles.firmName}>{a.truckId.firmId.firmName}</Text>
                )}
              </View>

              <View style={styles.linkLine} />

              {/* driver row */}
              <View style={styles.entityRow}>
                <View style={[styles.iconWrap, { backgroundColor: '#F3E8FF' }]}>
                  <Ionicons name="person" size={16} color="#7C3AED" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.entityLabel}>{a.driverId?.name ?? '—'}</Text>
                  {a.driverId?.phone && (
                    <Text style={styles.cardSub}>{a.driverId.phone}</Text>
                  )}
                </View>
                {a.assignedBy?.name && (
                  <Text style={styles.assignedBy}>by {a.assignedBy.name}</Text>
                )}
              </View>

              {/* delete button */}
              <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(a)}>
                <Ionicons name="trash-outline" size={16} color={Colors.error} />
                <Text style={styles.deleteBtnText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── Create Modal ─────────────────────────── */}
      <Modal visible={showCreate} animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreate(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Assignment — {formatDisplay(date)}</Text>
            <TouchableOpacity
              style={[styles.confirmBtn, (!selTruck || !selDriver || creating) && styles.confirmBtnDisabled]}
              onPress={createAssignment}
              disabled={!selTruck || !selDriver || creating}
            >
              {creating
                ? <ActivityIndicator size="small" color={Colors.white} />
                : <Text style={styles.confirmBtnText}>Assign</Text>
              }
            </TouchableOpacity>
          </View>

          {loadingBoard ? (
            <ListSkeleton count={4} lines={2} />
          ) : (
            <ScrollView contentContainerStyle={styles.modalContent}>
              {/* Truck picker */}
              <Text style={styles.sectionHead}>Select Truck (Available)</Text>
              {availTrucks.length === 0 && (
                <Text style={styles.noItems}>No available trucks for this date</Text>
              )}
              {availTrucks.map(t => (
                <TouchableOpacity
                  key={t._id}
                  style={[styles.pickRow, selTruck?._id === t._id && styles.pickRowSelected]}
                  onPress={() => setSelTruck(t)}
                >
                  <View style={[styles.iconWrap, { backgroundColor: Colors.tealBg }]}>
                    <Ionicons name="car" size={16} color={Colors.primary} />
                  </View>
                  <Text style={styles.pickLabel}>{t.truckNumber}</Text>
                  {selTruck?._id === t._id && (
                    <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}

              {/* Driver picker */}
              <Text style={[styles.sectionHead, { marginTop: Spacing.lg }]}>Select Driver (Available)</Text>
              {availDrivers.length === 0 && (
                <Text style={styles.noItems}>No available drivers for this date</Text>
              )}
              {availDrivers.map(d => (
                <TouchableOpacity
                  key={d._id}
                  style={[styles.pickRow, selDriver?._id === d._id && styles.pickRowSelected]}
                  onPress={() => setSelDriver(d)}
                >
                  <View style={[styles.iconWrap, { backgroundColor: '#F3E8FF' }]}>
                    <Ionicons name="person" size={16} color="#7C3AED" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickLabel}>{d.name}</Text>
                    {d.phone && <Text style={styles.cardSub}>{d.phone}</Text>}
                  </View>
                  {selDriver?._id === d._id && (
                    <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  addBtn: {
    width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },

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
    flexDirection: 'row', backgroundColor: Colors.white, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },

  list: { padding: Spacing.lg, paddingBottom: 110, gap: Spacing.sm },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },
  createEmptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderRadius: Radius.sm, backgroundColor: Colors.tealBg,
  },
  createEmptyText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },

  card: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
  },
  entityRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconWrap: { width: 32, height: 32, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  entityLabel: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, flex: 1 },
  firmName: { fontSize: FontSize.xs, color: Colors.textSecondary },
  cardSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 1 },
  assignedBy: { fontSize: FontSize.xs, color: Colors.textMuted },
  linkLine: {
    width: 2, height: 12, backgroundColor: Colors.border,
    marginLeft: 15, marginVertical: 3,
  },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-end', marginTop: Spacing.sm,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: Radius.sm, backgroundColor: Colors.errorBg,
  },
  deleteBtnText: { fontSize: FontSize.xs, color: Colors.error, fontWeight: '600' },

  // Modal
  modalSafe: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, flex: 1, marginLeft: Spacing.sm },
  confirmBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  confirmBtnDisabled: { backgroundColor: Colors.textMuted },
  confirmBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },

  modalContent: { padding: Spacing.lg, paddingBottom: 40 },
  sectionHead: {
    fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary,
    letterSpacing: 1, marginBottom: Spacing.sm, textTransform: 'uppercase',
  },
  noItems: { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.sm },
  pickRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  pickRowSelected: { borderColor: Colors.primary, backgroundColor: Colors.tealBg },
  pickLabel: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text, flex: 1 },
});
