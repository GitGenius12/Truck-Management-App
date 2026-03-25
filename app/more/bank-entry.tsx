import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, Modal, ScrollView, TextInput,
  KeyboardAvoidingView, Platform, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ListSkeleton } from '@/components/Skeleton';
import { api } from '@/services/api';
import { ENDPOINTS } from '@/constants/api';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

interface BankEntry {
  _id: string;
  date: string;
  submittedBy?: { name: string };
  loggedIntoNetBanking: boolean;
  accountType?: string;
  sainikMotorDetails?: { bankName: string; openingBalance: number; closingBalance: number; noOfTransactions: number };
  amritLogisticsDetails?: { bankName: string; openingBalance: number; closingBalance: number; noOfTransactions: number };
}

const ROLE_OPTIONS = [
  { v: 'all', label: 'All Roles' },
  { v: 'STAFF', label: 'Staff' },
  { v: 'MANAGER', label: 'Manager' },
  { v: 'DIRECTOR', label: 'Director' },
];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const initialAccountDetails = {
  bankName: '', accountNumber: '',
  openingBalance: '', closingBalance: '',
  noOfTransactions: '', amountOfEachTransaction: '',
  timeOfLogIn: '', timeOfLogOut: '',
  purpose: '', fourEyeVerification: false,
  nameOfSecondPerson: '', statementSentWhatsApp: false,
};

// ── Small helpers ─────────────────────────────────────────────────

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
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: Colors.border, true: Colors.primary }}
        thumbColor={Colors.white}
      />
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

// ── Add Entry Modal ───────────────────────────────────────────────

function AddEntryModal({ visible, onClose, onSuccess }: {
  visible: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [accountType, setAccountType] = useState('both'); // 'sainik' | 'amrit' | 'both'
  const [sainik, setSainik] = useState({ ...initialAccountDetails });
  const [amrit, setAmrit] = useState({ ...initialAccountDetails });

  function reset() {
    setSaving(false);
    setLoggedIn(false);
    setAccountType('both');
    setSainik({ ...initialAccountDetails });
    setAmrit({ ...initialAccountDetails });
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      const body: any = {
        loggedIntoNetBanking: loggedIn,
        accountType,
      };

      if (accountType === 'sainik' || accountType === 'both') {
        body.sainikMotorDetails = {
          ...sainik,
          openingBalance: parseFloat(sainik.openingBalance) || 0,
          closingBalance: parseFloat(sainik.closingBalance) || 0,
          noOfTransactions: parseInt(sainik.noOfTransactions) || 0,
          amountOfEachTransaction: parseFloat(sainik.amountOfEachTransaction) || 0,
          fourEyeVerification: sainik.fourEyeVerification,
          statementSentWhatsApp: sainik.statementSentWhatsApp,
        };
      }

      if (accountType === 'amrit' || accountType === 'both') {
        body.amritLogisticsDetails = {
          ...amrit,
          openingBalance: parseFloat(amrit.openingBalance) || 0,
          closingBalance: parseFloat(amrit.closingBalance) || 0,
          noOfTransactions: parseInt(amrit.noOfTransactions) || 0,
          amountOfEachTransaction: parseFloat(amrit.amountOfEachTransaction) || 0,
          fourEyeVerification: amrit.fourEyeVerification,
          statementSentWhatsApp: amrit.statementSentWhatsApp,
        };
      }

      await api.post(ENDPOINTS.BANK_ENTRIES, body);
      reset();
      onSuccess();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  }

  const ACCOUNT_TYPES = [
    { v: 'sainik', label: 'Sainik Motor' },
    { v: 'amrit', label: 'Amrit Logistics' },
    { v: 'both', label: 'Both' },
  ];

  function AccountFields({ state, setState }: { state: typeof initialAccountDetails; setState: (v: any) => void }) {
    function f(key: keyof typeof initialAccountDetails) {
      return (val: string) => setState((prev: any) => ({ ...prev, [key]: val }));
    }
    function ft(key: keyof typeof initialAccountDetails) {
      return (val: boolean) => setState((prev: any) => ({ ...prev, [key]: val }));
    }
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
          {/* Modal header */}
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
            {/* Net Banking toggle */}
            <SectionHeader title="Login Info" />
            <ToggleRow label="Logged into Net Banking" value={loggedIn} onToggle={setLoggedIn} />

            {/* Account Type */}
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

            {/* Sainik Motor fields */}
            {(accountType === 'sainik' || accountType === 'both') && (
              <>
                <SectionHeader title="Sainik Motor" />
                <AccountFields state={sainik} setState={setSainik} />
              </>
            )}

            {/* Amrit Logistics fields */}
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

// ── Main screen ───────────────────────────────────────────────────

export default function BankEntryScreen() {
  const { user } = useAuth();
  const role = user?.role;
  const isDirector = role === 'DIRECTOR';

  const [entries, setEntries] = useState<BankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Director filters
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [appliedFilters, setAppliedFilters] = useState({ startDate: '', endDate: '', roleFilter: 'all' });

  const hasFilters = appliedFilters.startDate || appliedFilters.endDate || appliedFilters.roleFilter !== 'all';

  const load = useCallback(async (filters = appliedFilters) => {
    try {
      const params: string[] = [];
      if (filters.startDate) params.push(`startDate=${encodeURIComponent(filters.startDate)}`);
      if (filters.endDate) params.push(`endDate=${encodeURIComponent(filters.endDate)}`);
      if (filters.roleFilter !== 'all') params.push(`role=${encodeURIComponent(filters.roleFilter)}`);
      const q = params.length ? `?${params.join('&')}` : '';
      const data = await api.get<any>(`${ENDPOINTS.BANK_ENTRIES}${q}`);
      setEntries(Array.isArray(data) ? data : (data.entries ?? data.bankEntries ?? []));
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, [appliedFilters]);

  useEffect(() => { load(); }, []);

  function applyFilters() {
    const f = { startDate, endDate, roleFilter };
    setAppliedFilters(f);
    setLoading(true);
    load(f);
    setShowFilters(false);
  }

  function clearFilters() {
    const f = { startDate: '', endDate: '', roleFilter: 'all' };
    setStartDate(''); setEndDate(''); setRoleFilter('all');
    setAppliedFilters(f);
    setLoading(true);
    load(f);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* ── Header bar (Director filter toggle) ── */}
      {isDirector && (
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>Bank Entries</Text>
          <TouchableOpacity onPress={() => setShowFilters(v => !v)} style={[styles.filterBtn, showFilters && styles.filterBtnActive]}>
            <Ionicons name="options-outline" size={18} color={showFilters ? Colors.white : Colors.primary} />
            <Text style={[styles.filterBtnText, showFilters && { color: Colors.white }]}>Filter</Text>
            {!!hasFilters && <View style={styles.filterDot} />}
          </TouchableOpacity>
        </View>
      )}

      {/* ── Director filter panel ── */}
      {isDirector && showFilters && (
        <View style={styles.filterPanel}>
          <Text style={styles.filterLabel}>Start Date</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.textMuted}
            value={startDate}
            onChangeText={setStartDate}
          />
          <Text style={styles.filterLabel}>End Date</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.textMuted}
            value={endDate}
            onChangeText={setEndDate}
          />
          <Text style={styles.filterLabel}>Role</Text>
          <View style={styles.pillRow}>
            {ROLE_OPTIONS.map(o => (
              <TouchableOpacity
                key={o.v}
                onPress={() => setRoleFilter(o.v)}
                style={[styles.pill, roleFilter === o.v && styles.pillActive]}
              >
                <Text style={[styles.pillText, roleFilter === o.v && styles.pillTextActive]}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.filterActions}>
            {!!hasFilters && (
              <TouchableOpacity onPress={clearFilters} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>Clear</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={applyFilters} style={styles.applyBtn}>
              <Text style={styles.applyBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
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
              {item.sainikMotorDetails && (
                <AccountRow label="Sainik Motor" details={item.sainikMotorDetails} />
              )}
              {item.amritLogisticsDetails && (
                <AccountRow label="Amrit Logistics" details={item.amritLogisticsDetails} />
              )}
            </View>
          )}
        />
      )}

      {/* ── FAB for Staff / Manager ── */}
      {!isDirector && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={28} color={Colors.white} />
        </TouchableOpacity>
      )}

      <AddEntryModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => { setLoading(true); load(); }}
      />
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.primary,
  },
  filterBtnActive: { backgroundColor: Colors.primary },
  filterBtnText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.primary },
  filterDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.error, marginLeft: 2 },

  filterPanel: {
    backgroundColor: Colors.white, padding: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  filterLabel: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4, textTransform: 'uppercase' },
  input: {
    backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 10,
    fontSize: FontSize.sm, color: Colors.text, marginBottom: Spacing.sm,
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.sm },
  pill: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white,
  },
  pillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pillText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecondary },
  pillTextActive: { color: Colors.white },
  filterActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  clearBtn: {
    flex: 1, paddingVertical: 10, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  clearBtnText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  applyBtn: {
    flex: 2, paddingVertical: 10, borderRadius: Radius.sm,
    backgroundColor: Colors.primary, alignItems: 'center',
  },
  applyBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.white },

  list: { padding: Spacing.lg, paddingBottom: 120 },
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
    position: 'absolute', right: Spacing.lg, bottom: 100,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 8, elevation: 6,
  },
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

  sectionHeader: {
    backgroundColor: Colors.tealBg, paddingHorizontal: Spacing.sm, paddingVertical: 6,
    borderRadius: Radius.sm, marginBottom: Spacing.sm, marginTop: Spacing.sm,
  },
  sectionTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },

  label: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4 },
  input: {
    backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 10,
    fontSize: FontSize.sm, color: Colors.text,
  },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: Spacing.sm, paddingVertical: 4,
  },
  toggleLabel: { fontSize: FontSize.sm, color: Colors.text, fontWeight: '500' },
  pillRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.md },
  pill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white,
  },
  pillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pillText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  pillTextActive: { color: Colors.white },
});
