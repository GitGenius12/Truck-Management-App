import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, Modal, ScrollView, TextInput,
  KeyboardAvoidingView, Platform, Alert, Switch,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS, Easing, interpolate, clamp,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { ListSkeleton } from '@/components/Skeleton';
import { api } from '@/services/api';
import { ENDPOINTS } from '@/constants/api';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

// ── Types ────────────────────────────────────────────────────────
interface BankEntry {
  _id: string;
  date: string;
  submittedBy?: { name: string };
  loggedIntoNetBanking: boolean;
  accountType?: string;
  sainikMotorDetails?: { bankName: string; openingBalance: number; closingBalance: number; noOfTransactions: number };
  amritLogisticsDetails?: { bankName: string; openingBalance: number; closingBalance: number; noOfTransactions: number };
}

// ── Constants ────────────────────────────────────────────────────
const ROLE_OPTIONS = [
  { v: 'STAFF', label: 'Staff' },
  { v: 'MANAGER', label: 'Manager' },
  { v: 'DIRECTOR', label: 'Director' },
];

const ACCOUNT_TYPES = [
  { v: 'sainik', label: 'Sainik Motor' },
  { v: 'amrit', label: 'Amrit Logistics' },
  { v: 'both', label: 'Both' },
];

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_H = SCREEN_H * 0.52;

const initialAccountDetails = {
  bankName: '', accountNumber: '',
  openingBalance: '', closingBalance: '',
  noOfTransactions: '', amountOfEachTransaction: '',
  timeOfLogIn: '', timeOfLogOut: '',
  purpose: '', fourEyeVerification: false,
  nameOfSecondPerson: '', statementSentWhatsApp: false,
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Shared sub-components ────────────────────────────────────────
function LabeledInput({ label, value, onChangeText, placeholder, keyboardType, multiline }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: any; multiline?: boolean;
}) {
  return (
    <View style={{ marginBottom: Spacing.sm }}>
      <Text style={addStyles.label}>{label}</Text>
      <TextInput
        style={[addStyles.input, multiline && { height: 72, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor={Colors.textMuted}
        keyboardType={keyboardType ?? 'default'}
        multiline={multiline}
      />
    </View>
  );
}

function ToggleRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: (v: boolean) => void }) {
  return (
    <View style={addStyles.toggleRow}>
      <Text style={addStyles.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onToggle} trackColor={{ false: Colors.border, true: Colors.primary }} thumbColor={Colors.white} />
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={addStyles.sectionHeader}>
      <Text style={addStyles.sectionTitle}>{title}</Text>
    </View>
  );
}

// ── Dark pill ────────────────────────────────────────────────────
function DarkPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[ds.pill, active && ds.pillActive]} activeOpacity={0.75}>
      <Text style={[ds.pillText, active && ds.pillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Director Filter sheet ────────────────────────────────────────
function FilterSheet({ visible, onClose, onApply, onClear, hasFilters, startDate, endDate, roleFilter, setStartDate, setEndDate, setRoleFilter }: {
  visible: boolean; onClose: () => void; onApply: () => void; onClear: () => void;
  hasFilters: boolean; startDate: string; endDate: string; roleFilter: string;
  setStartDate: (v: string) => void; setEndDate: (v: string) => void; setRoleFilter: (v: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SHEET_H);
  const opacity = useSharedValue(0);
  const startY = useSharedValue(0);

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
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[ds.overlay, backdropAnim]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <GestureDetector gesture={pan}>
          <Animated.View
            style={[ds.sheet, { height: SHEET_H, paddingBottom: insets.bottom + 16 }, sheetAnim]}
          >
            <View style={ds.handleWrap}>
              <View style={ds.handle} />
            </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ds.sheetScroll}>
          <Text style={ds.groupLabel}>Start Date</Text>
          <View style={ds.inputRow}>
            <TextInput
              style={ds.sheetInput}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#B8CECC"
            />
          </View>

          <Text style={ds.groupLabel}>End Date</Text>
          <View style={ds.inputRow}>
            <TextInput
              style={ds.sheetInput}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#B8CECC"
            />
          </View>

          <Text style={ds.groupLabel}>Role</Text>
          <View style={ds.pillWrap}>
            {ROLE_OPTIONS.map(o => (
              <DarkPill
                key={o.v}
                label={o.label}
                active={roleFilter === o.v}
                onPress={() => setRoleFilter(roleFilter === o.v ? 'all' : o.v)}
              />
            ))}
          </View>
        </ScrollView>

        <View style={ds.actionRow}>
          {hasFilters && (
            <TouchableOpacity style={ds.clearBtn} onPress={onClear}>
              <Text style={ds.clearBtnText}>Clear all</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={ds.applyBtn} onPress={onApply}>
            <Text style={ds.applyBtnText}>Apply filters</Text>
          </TouchableOpacity>
        </View>
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    </Modal>
  );
}

// ── Add Entry Modal ──────────────────────────────────────────────
function AddEntryModal({ visible, onClose, onSuccess }: {
  visible: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [accountType, setAccountType] = useState('both');
  const [sainik, setSainik] = useState({ ...initialAccountDetails });
  const [amrit, setAmrit] = useState({ ...initialAccountDetails });

  function reset() {
    setSaving(false); setLoggedIn(false); setAccountType('both');
    setSainik({ ...initialAccountDetails }); setAmrit({ ...initialAccountDetails });
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      const body: any = { loggedIntoNetBanking: loggedIn, accountType };
      if (accountType === 'sainik' || accountType === 'both') {
        body.sainikMotorDetails = {
          ...sainik,
          openingBalance: parseFloat(sainik.openingBalance) || 0,
          closingBalance: parseFloat(sainik.closingBalance) || 0,
          noOfTransactions: parseInt(sainik.noOfTransactions) || 0,
          amountOfEachTransaction: parseFloat(sainik.amountOfEachTransaction) || 0,
        };
      }
      if (accountType === 'amrit' || accountType === 'both') {
        body.amritLogisticsDetails = {
          ...amrit,
          openingBalance: parseFloat(amrit.openingBalance) || 0,
          closingBalance: parseFloat(amrit.closingBalance) || 0,
          noOfTransactions: parseInt(amrit.noOfTransactions) || 0,
          amountOfEachTransaction: parseFloat(amrit.amountOfEachTransaction) || 0,
        };
      }
      await api.post(ENDPOINTS.BANK_ENTRIES, body);
      reset(); onSuccess(); onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  }

  function AccountFields({ state, setState }: { state: typeof initialAccountDetails; setState: (v: any) => void }) {
    const f = (key: keyof typeof initialAccountDetails) => (val: string) => setState((p: any) => ({ ...p, [key]: val }));
    const ft = (key: keyof typeof initialAccountDetails) => (val: boolean) => setState((p: any) => ({ ...p, [key]: val }));
    return (
      <>
        <LabeledInput label="Bank Name" value={state.bankName} onChangeText={f('bankName')} />
        <LabeledInput label="Account Number" value={state.accountNumber} onChangeText={f('accountNumber')} keyboardType="number-pad" />
        <LabeledInput label="Opening Balance (₹)" value={state.openingBalance} onChangeText={f('openingBalance')} keyboardType="decimal-pad" />
        <LabeledInput label="Closing Balance (₹)" value={state.closingBalance} onChangeText={f('closingBalance')} keyboardType="decimal-pad" />
        <LabeledInput label="No. of Transactions" value={state.noOfTransactions} onChangeText={f('noOfTransactions')} keyboardType="number-pad" />
        <LabeledInput label="Amount per Transaction (₹)" value={state.amountOfEachTransaction} onChangeText={f('amountOfEachTransaction')} keyboardType="decimal-pad" />
        <LabeledInput label="Time of Log In" value={state.timeOfLogIn} onChangeText={f('timeOfLogIn')} placeholder="e.g. 10:30 AM" />
        <LabeledInput label="Time of Log Out" value={state.timeOfLogOut} onChangeText={f('timeOfLogOut')} placeholder="e.g. 11:00 AM" />
        <LabeledInput label="Purpose" value={state.purpose} onChangeText={f('purpose')} multiline />
        <ToggleRow label="4-Eye Verification" value={state.fourEyeVerification} onToggle={ft('fourEyeVerification')} />
        {state.fourEyeVerification && (
          <LabeledInput label="Second Person Name" value={state.nameOfSecondPerson} onChangeText={f('nameOfSecondPerson')} />
        )}
        <ToggleRow label="Statement Sent on WhatsApp" value={state.statementSentWhatsApp} onToggle={ft('statementSentWhatsApp')} />
      </>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top', 'bottom']}>
          <View style={addStyles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={addStyles.modalTitle}>Add Bank Entry</Text>
            <TouchableOpacity onPress={handleSubmit} disabled={saving} style={addStyles.saveBtn}>
              <Text style={addStyles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={addStyles.form} keyboardShouldPersistTaps="handled">
            <SectionHeader title="Login Info" />
            <ToggleRow label="Logged into Net Banking" value={loggedIn} onToggle={setLoggedIn} />

            <SectionHeader title="Account Type" />
            <View style={addStyles.pillRow}>
              {ACCOUNT_TYPES.map(t => (
                <TouchableOpacity
                  key={t.v}
                  onPress={() => setAccountType(t.v)}
                  style={[addStyles.pill, accountType === t.v && addStyles.pillActive]}
                >
                  <Text style={[addStyles.pillText, accountType === t.v && addStyles.pillTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {(accountType === 'sainik' || accountType === 'both') && (
              <>
                <SectionHeader title="Sainik Motor" />
                <AccountFields state={sainik} setState={setSainik} />
              </>
            )}
            {(accountType === 'amrit' || accountType === 'both') && (
              <>
                <SectionHeader title="Amrit Logistics" />
                <AccountFields state={amrit} setState={setAmrit} />
              </>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main screen ──────────────────────────────────────────────────
export default function BankEntryScreen() {
  const { user } = useAuth();
  const isDirector = user?.role === 'DIRECTOR';

  const [entries, setEntries] = useState<BankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Director filter state (draft in sheet)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  // Applied filters
  const [applied, setApplied] = useState({ startDate: '', endDate: '', roleFilter: 'all' });

  const hasFilters = applied.startDate !== '' || applied.endDate !== '' || applied.roleFilter !== 'all';

  const load = useCallback(async (f = applied) => {
    try {
      const params: string[] = [];
      if (f.startDate) params.push(`startDate=${encodeURIComponent(f.startDate)}`);
      if (f.endDate) params.push(`endDate=${encodeURIComponent(f.endDate)}`);
      if (f.roleFilter !== 'all') params.push(`role=${encodeURIComponent(f.roleFilter)}`);
      const q = params.length ? `?${params.join('&')}` : '';
      const data = await api.get<any>(`${ENDPOINTS.BANK_ENTRIES}${q}`);
      setEntries(Array.isArray(data) ? data : (data.entries ?? data.bankEntries ?? []));
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, [applied]);

  useEffect(() => { load(); }, []);

  function applyFilters() {
    const f = { startDate, endDate, roleFilter };
    setApplied(f);
    setLoading(true);
    load(f);
    setSheetOpen(false);
  }

  function clearFilters() {
    const f = { startDate: '', endDate: '', roleFilter: 'all' };
    setStartDate(''); setEndDate(''); setRoleFilter('all');
    setApplied(f);
    setLoading(true);
    load(f);
    setSheetOpen(false);
  }

  function openSheet() {
    // sync draft with applied
    setStartDate(applied.startDate);
    setEndDate(applied.endDate);
    setRoleFilter(applied.roleFilter);
    setSheetOpen(true);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Count bar with clear for Director */}
      {isDirector && !loading && (
        <View style={styles.countBar}>
          <Text style={styles.countText}>
            {entries.length} entr{entries.length !== 1 ? 'ies' : 'y'}
            {hasFilters ? <Text style={styles.countFiltered}> · filtered</Text> : null}
          </Text>
          {hasFilters && (
            <TouchableOpacity onPress={clearFilters}>
              <Text style={styles.clearLink}>Clear filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {loading ? (
        <ListSkeleton count={4} lines={2} />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={i => i._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="business-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No bank entries found</Text>
              {!isDirector && (
                <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addFirstBtn}>
                  <Text style={styles.addFirstBtnText}>+ Add First Entry</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.date}>{formatDate(item.date)}</Text>
                  {item.submittedBy && <Text style={styles.sub}>By {item.submittedBy.name}</Text>}
                </View>
                <View style={[styles.badge, { backgroundColor: item.loggedIntoNetBanking ? Colors.successBg : Colors.border }]}>
                  <Text style={[styles.badgeText, { color: item.loggedIntoNetBanking ? Colors.success : Colors.textMuted }]}>
                    {item.loggedIntoNetBanking ? 'Net Banking' : 'Not Logged In'}
                  </Text>
                </View>
              </View>
              {item.accountType && (
                <View style={styles.typeRow}>
                  <Ionicons name="business-outline" size={14} color={Colors.textSecondary} />
                  <Text style={styles.typeText}>{item.accountType}</Text>
                </View>
              )}
              {item.sainikMotorDetails && <AccountRow label="Sainik Motor" details={item.sainikMotorDetails} />}
              {item.amritLogisticsDetails && <AccountRow label="Amrit Logistics" details={item.amritLogisticsDetails} />}
            </View>
          )}
        />
      )}

      {/* FAB — Staff/Manager: add entry; Director: filter */}
      <TouchableOpacity
        style={[styles.fab, hasFilters && styles.fabActive]}
        onPress={isDirector ? openSheet : () => setShowAddModal(true)}
        activeOpacity={0.85}
      >
        <Ionicons name={isDirector ? 'options-outline' : 'add'} size={isDirector ? 22 : 28} color={Colors.white} />
        {isDirector && hasFilters && <View style={styles.filterDot} />}
      </TouchableOpacity>

      {/* Director filter sheet */}
      {isDirector && (
        <FilterSheet
          visible={sheetOpen}
          onClose={() => setSheetOpen(false)}
          onApply={applyFilters}
          onClear={clearFilters}
          hasFilters={hasFilters}
          startDate={startDate}
          endDate={endDate}
          roleFilter={roleFilter}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
          setRoleFilter={setRoleFilter}
        />
      )}

      {/* Staff/Manager add entry modal */}
      {!isDirector && (
        <AddEntryModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setLoading(true); load(); }}
        />
      )}
    </SafeAreaView>
  );
}

function AccountRow({ label, details }: { label: string; details: any }) {
  return (
    <View style={styles.accountRow}>
      <Text style={styles.accountLabel}>{label}</Text>
      <View style={styles.accountStats}>
        <StatChip label="Opening" value={`₹${details.openingBalance?.toLocaleString('en-IN') ?? '—'}`} />
        <StatChip label="Closing" value={`₹${details.closingBalance?.toLocaleString('en-IN') ?? '—'}`} />
        <StatChip label="Txns" value={String(details.noOfTransactions ?? '—')} />
      </View>
    </View>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statChip}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  countBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  countText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  countFiltered: { color: Colors.primary, fontWeight: '600' },
  clearLink: { fontSize: FontSize.sm, color: Colors.error, fontWeight: '600' },
  list: { padding: Spacing.lg, paddingBottom: 130 },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },
  addFirstBtn: { marginTop: Spacing.xs, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, backgroundColor: Colors.primary, borderRadius: Radius.full },
  addFirstBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.white },
  card: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.sm, shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  date: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  sub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  badge: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  badgeText: { fontSize: FontSize.xs, fontWeight: '600' },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.sm },
  typeText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  accountRow: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm, marginTop: Spacing.xs },
  accountLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.primary, marginBottom: 6 },
  accountStats: { flexDirection: 'row', gap: Spacing.sm },
  statChip: { flex: 1, backgroundColor: Colors.tealBg, borderRadius: Radius.sm, padding: Spacing.sm, alignItems: 'center' },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  statValue: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, marginTop: 2 },
  fab: {
    position: 'absolute', bottom: 100, alignSelf: 'center',
    left: '50%', marginLeft: -28,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#111827',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
  fabActive: { backgroundColor: Colors.primary },
  filterDot: {
    position: 'absolute', top: 10, right: 10,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.error, borderWidth: 1.5, borderColor: Colors.white,
  },
});

const ds = StyleSheet.create({
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
  handleWrap: { alignItems: 'center', paddingVertical: 12 },
  handle: {
    width: 86, height: 5, borderRadius: 999,
    backgroundColor: '#8FBFBC',
    shadowColor: '#0D7377',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 6,
    elevation: 4,
  },
  sheetScroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  groupLabel: {
    fontSize: FontSize.xs, fontWeight: '700',
    color: '#6B7F7D',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 8,
  },
  inputRow: {
    backgroundColor: Colors.white,
    borderRadius: Radius.full,
    borderWidth: 1, borderColor: '#DCE9E7',
    paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 16,
  },
  sheetInput: { fontSize: FontSize.sm, color: '#102A2A' },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: '#DCE9E7' },
  pillActive: { backgroundColor: '#0D7377', borderColor: '#0D7377' },
  pillText: { fontSize: FontSize.sm, fontWeight: '600', color: '#102A2A' },
  pillTextActive: { color: Colors.white },
  actionRow: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#DCE9E7',
  },
  clearBtn: { flex: 1, paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: '#DCE9E7', alignItems: 'center' },
  clearBtnText: { fontSize: FontSize.sm, fontWeight: '600', color: '#6B7F7D' },
  applyBtn: { flex: 2, paddingVertical: 13, borderRadius: 14, backgroundColor: '#0D7377', alignItems: 'center' },
  applyBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: '#ECFFFB' },
});

const addStyles = StyleSheet.create({
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  saveBtn: { paddingHorizontal: Spacing.md, paddingVertical: 6, backgroundColor: Colors.primary, borderRadius: Radius.sm },
  saveBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.white },
  form: { padding: Spacing.lg, paddingBottom: 40 },
  sectionHeader: { backgroundColor: Colors.tealBg, paddingHorizontal: Spacing.sm, paddingVertical: 6, borderRadius: Radius.sm, marginBottom: Spacing.sm, marginTop: Spacing.sm },
  sectionTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  label: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4 },
  input: {
    backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 10,
    fontSize: FontSize.sm, color: Colors.text,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm, paddingVertical: 4 },
  toggleLabel: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '500' },
  pillRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.md },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  pillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pillText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  pillTextActive: { color: Colors.white },
});
