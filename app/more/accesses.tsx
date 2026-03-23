import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, SectionList,
  RefreshControl, Switch, Alert, TouchableOpacity, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ListSkeleton } from '@/components/Skeleton';
import { api } from '@/services/api';
import { ENDPOINTS } from '@/constants/api';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';

// ── tab catalog (must match backend ROLE_TAB_IDS) ─────────────────────────

const TAB_LABELS: Record<string, string> = {
  'average':        'Average / Mileage',
  'my-trucks':      'All Trucks',
  'trucks':         'Validity',
  'daily-ops':      'Daily Ops',
  'add':            'Add Truck Details',
  'trips':          'Trip Entries',
  'misc':           'Miscellaneous',
  'transactions':   'Transactions',
  'drivers':        'Drivers',
  'bank-entry':     'Bank Entry',
  'availability':   'Availability',
  'assignments':    'Assignments',
  'requests':       'Staff Approvals',
};

const ROLE_TABS: Record<string, string[]> = {
  STAFF:   ['average', 'my-trucks', 'trucks', 'daily-ops', 'add', 'trips', 'misc', 'transactions', 'drivers', 'bank-entry', 'availability', 'assignments'],
  MANAGER: ['requests', 'average', 'my-trucks', 'add', 'trips', 'misc', 'trucks', 'drivers', 'availability', 'assignments', 'transactions', 'bank-entry'],
};

// ── allowlist helpers ──────────────────────────────────────────────────────

function isTabAllowed(allowlist: string[], tabId: string) {
  return allowlist.length === 0 || allowlist.includes(tabId);
}

function toggleAllowlist(allowlist: string[], tabId: string, allIds: string[]) {
  let next: string[];
  if (allowlist.length === 0) {
    next = allIds.filter(id => id !== tabId);
  } else if (allowlist.includes(tabId)) {
    next = allowlist.filter(id => id !== tabId);
  } else {
    next = [...allowlist, tabId];
  }
  return next.length === allIds.length ? [] : next;
}

// ── types ──────────────────────────────────────────────────────────────────

interface UserAccess {
  overrideEnabled: boolean;
  effectiveTabIds: string[];
  customTabIds: string[];
  roleDefaultTabIds: string[];
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  access?: UserAccess;
}

type RoleKey = 'STAFF' | 'MANAGER';
type Permissions = { STAFF: string[]; MANAGER: string[] };

// ── component ──────────────────────────────────────────────────────────────

export default function AccessesScreen() {
  // ── role defaults state ───────────────────────────────────────────────
  const [permissions, setPermissions] = useState<Permissions>({ STAFF: [], MANAGER: [] });
  const [activeDefaultRole, setActiveDefaultRole] = useState<RoleKey>('STAFF');
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [defaultsDirty, setDefaultsDirty] = useState(false);

  // ── per-user state ────────────────────────────────────────────────────
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  // ── load everything ───────────────────────────────────────────────────

  const load = useCallback(async () => {
    try {
      const [permRes, usersRaw] = await Promise.all([
        api.get<any>(ENDPOINTS.FIRM_TAB_PERMISSIONS),
        api.get<any>(ENDPOINTS.USERS),
      ]);

      const perms = permRes.tabPermissions ?? { STAFF: [], MANAGER: [] };
      setPermissions({ STAFF: perms.STAFF ?? [], MANAGER: perms.MANAGER ?? [] });
      setDefaultsDirty(false);

      const list: User[] = (Array.isArray(usersRaw) ? usersRaw : (usersRaw.users ?? []))
        .filter((u: User) => u.role !== 'DIRECTOR');

      const withAccess = await Promise.all(list.map(async u => {
        try {
          const raw = await api.get<any>(`${ENDPOINTS.USERS}/${u._id}/tab-access`);
          return {
            ...u,
            access: {
              overrideEnabled:   Boolean(raw.overrideEnabled),
              effectiveTabIds:   Array.isArray(raw.effectiveTabIds)   ? raw.effectiveTabIds   : [],
              customTabIds:      Array.isArray(raw.customTabIds)      ? raw.customTabIds      : [],
              roleDefaultTabIds: Array.isArray(raw.roleDefaultTabIds) ? raw.roleDefaultTabIds : [],
            } as UserAccess,
          };
        } catch {
          return { ...u, access: { overrideEnabled: false, effectiveTabIds: [], customTabIds: [], roleDefaultTabIds: [] } };
        }
      }));

      setUsers(withAccess);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── role default helpers ──────────────────────────────────────────────

  function handleToggleDefault(tabId: string) {
    setPermissions(prev => ({
      ...prev,
      [activeDefaultRole]: toggleAllowlist(prev[activeDefaultRole], tabId, ROLE_TABS[activeDefaultRole]),
    }));
    setDefaultsDirty(true);
  }

  async function saveDefaults() {
    setSavingDefaults(true);
    try {
      const res = await api.put<any>(ENDPOINTS.FIRM_TAB_PERMISSIONS, { tabPermissions: permissions });
      const saved = res.tabPermissions ?? permissions;
      setPermissions({ STAFF: saved.STAFF ?? [], MANAGER: saved.MANAGER ?? [] });
      setDefaultsDirty(false);

      // update users who don't have override (their effective tabs come from role defaults)
      setUsers(prev => prev.map(u => {
        const acc = u.access;
        if (!acc || acc.overrideEnabled) return u;
        const newDefault = saved[u.role as RoleKey] ?? [];
        return { ...u, access: { ...acc, roleDefaultTabIds: newDefault, effectiveTabIds: newDefault } };
      }));
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save defaults');
    } finally {
      setSavingDefaults(false);
    }
  }

  // ── per-user helpers ──────────────────────────────────────────────────

  async function toggleTab(userId: string, tab: string, currentAccess: UserAccess) {
    const currentTabs = currentAccess.effectiveTabIds;
    const newTabs = currentTabs.includes(tab)
      ? currentTabs.filter(t => t !== tab)
      : [...currentTabs, tab];

    const newAccess: UserAccess = {
      ...currentAccess,
      overrideEnabled: true,
      effectiveTabIds: newTabs,
      customTabIds: newTabs,
    };

    setUsers(prev => prev.map(u => u._id === userId ? { ...u, access: newAccess } : u));
    setSaving(userId + tab);
    try {
      await api.put(`${ENDPOINTS.USERS}/${userId}/tab-access`, { enabled: true, tabs: newTabs });
    } catch (e: any) {
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, access: currentAccess } : u));
      Alert.alert('Error', e?.message || 'Failed to update access');
    } finally {
      setSaving(null);
    }
  }

  async function toggleOverride(userId: string, currentAccess: UserAccess) {
    const enable = !currentAccess.overrideEnabled;
    const newEffective = enable ? currentAccess.effectiveTabIds : currentAccess.roleDefaultTabIds;
    const newAccess: UserAccess = {
      ...currentAccess,
      overrideEnabled: enable,
      customTabIds: enable ? [...currentAccess.effectiveTabIds] : [],
      effectiveTabIds: newEffective,
    };

    setUsers(prev => prev.map(u => u._id === userId ? { ...u, access: newAccess } : u));
    setSaving(userId + '_override');
    try {
      await api.put(`${ENDPOINTS.USERS}/${userId}/tab-access`, {
        enabled: enable,
        tabs: enable ? currentAccess.effectiveTabIds : [],
      });
    } catch (e: any) {
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, access: currentAccess } : u));
      Alert.alert('Error', e?.message || 'Failed to update override');
    } finally {
      setSaving(null);
    }
  }

  // ── render ─────────────────────────────────────────────────────────────

  const currentAllowlist = permissions[activeDefaultRole];
  const currentRoleTabs  = ROLE_TABS[activeDefaultRole];
  const visibleCount = currentAllowlist.length === 0 ? currentRoleTabs.length : currentAllowlist.length;

  if (loading) return <SafeAreaView style={styles.safe} edges={['bottom']}><ListSkeleton count={4} lines={2} /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />
        }
      >
        {/* ═══════════════════════════════════════════════════════════════
            ROLE DEFAULTS SECTION
        ═══════════════════════════════════════════════════════════════ */}
        <Text style={styles.sectionHead}>Role Defaults</Text>
        <Text style={styles.sectionHint}>
          Set which tabs are on by default for all Staff or all Managers. Individual overrides below will take priority.
        </Text>

        {/* Role picker */}
        <View style={styles.roleTabRow}>
          {(['STAFF', 'MANAGER'] as RoleKey[]).map(role => (
            <TouchableOpacity
              key={role}
              style={[styles.roleTab, activeDefaultRole === role && styles.roleTabActive]}
              onPress={() => setActiveDefaultRole(role)}
            >
              <Text style={[styles.roleTabText, activeDefaultRole === role && styles.roleTabTextActive]}>
                {role}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Status banner */}
        <View style={styles.banner}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
          <Text style={styles.bannerText}>
            {currentAllowlist.length === 0
              ? `All ${currentRoleTabs.length} tabs visible for ${activeDefaultRole}`
              : `${visibleCount} of ${currentRoleTabs.length} tabs visible for ${activeDefaultRole}`
            }
          </Text>
        </View>

        {/* Default tab toggles */}
        <View style={styles.card}>
          {currentRoleTabs.map((tabId, idx) => {
            const allowed = isTabAllowed(currentAllowlist, tabId);
            return (
              <View key={tabId}>
                <View style={styles.tabRow}>
                  <Text style={styles.tabLabel}>{TAB_LABELS[tabId] ?? tabId}</Text>
                  <Switch
                    value={allowed}
                    onValueChange={() => handleToggleDefault(tabId)}
                    trackColor={{ false: Colors.border, true: Colors.primary + '80' }}
                    thumbColor={allowed ? Colors.primary : Colors.textMuted}
                  />
                </View>
                {idx < currentRoleTabs.length - 1 && <View style={styles.divider} />}
              </View>
            );
          })}
        </View>

        {/* Save defaults button */}
        <TouchableOpacity
          style={[styles.saveBtn, (!defaultsDirty || savingDefaults) && styles.saveBtnDisabled]}
          onPress={saveDefaults}
          disabled={!defaultsDirty || savingDefaults}
        >
          {savingDefaults
            ? <ActivityIndicator size="small" color={Colors.white} />
            : <Text style={styles.saveBtnText}>Save {activeDefaultRole} Defaults</Text>
          }
        </TouchableOpacity>

        {/* ═══════════════════════════════════════════════════════════════
            PER-USER OVERRIDES SECTION
        ═══════════════════════════════════════════════════════════════ */}
        <Text style={[styles.sectionHead, { marginTop: Spacing.xl }]}>User Overrides</Text>
        <Text style={styles.sectionHint}>
          Enable override for a specific user to give them a custom set of tabs, different from the role default.
        </Text>

        {users.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="lock-closed-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No users to manage</Text>
          </View>
        )}

        {users.map(item => {
          const isOpen = expanded === item._id;
          const access = item.access ?? { overrideEnabled: false, effectiveTabIds: [], customTabIds: [], roleDefaultTabIds: [] };
          const tabs = ROLE_TABS[item.role] ?? [];
          const isSavingOverride = saving === item._id + '_override';

          return (
            <View key={item._id} style={styles.card}>
              {/* User row */}
              <TouchableOpacity
                style={styles.userRow}
                onPress={() => setExpanded(isOpen ? null : item._id)}
                activeOpacity={0.7}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.email}>{item.email}</Text>
                  <View style={styles.metaRow}>
                    <View style={[styles.rolePill, item.role === 'MANAGER' && styles.rolePillManager]}>
                      <Text style={[styles.rolePillText, item.role === 'MANAGER' && styles.rolePillTextManager]}>
                        {item.role}
                      </Text>
                    </View>
                    <Text style={styles.sub}>
                      {access.effectiveTabIds.length} tabs
                      {' · '}{access.overrideEnabled ? 'custom' : 'default'}
                    </Text>
                  </View>
                </View>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textMuted} />
              </TouchableOpacity>

              {isOpen && (
                <View style={styles.expanded}>
                  {/* Override toggle */}
                  <View style={styles.overrideRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.overrideLabel}>Custom Override</Text>
                      <Text style={styles.overrideHint}>
                        {access.overrideEnabled
                          ? 'User has a custom tab list (ignores role default)'
                          : 'User inherits from role default'}
                      </Text>
                    </View>
                    {isSavingOverride
                      ? <ActivityIndicator size="small" color={Colors.primary} />
                      : <Switch
                          value={access.overrideEnabled}
                          onValueChange={() => toggleOverride(item._id, access)}
                          trackColor={{ false: Colors.border, true: Colors.primary + '80' }}
                          thumbColor={access.overrideEnabled ? Colors.primary : Colors.textMuted}
                        />
                    }
                  </View>

                  <View style={styles.divider} />

                  {/* Tab toggles */}
                  {tabs.map((tab, idx) => {
                    const isEnabled = access.effectiveTabIds.includes(tab);
                    const isSavingTab = saving === item._id + tab;
                    return (
                      <View key={tab}>
                        <View style={styles.tabRow}>
                          <Text style={[styles.tabLabel, !access.overrideEnabled && styles.tabLabelMuted]}>
                            {TAB_LABELS[tab] ?? tab}
                          </Text>
                          {isSavingTab
                            ? <ActivityIndicator size="small" color={Colors.primary} />
                            : <Switch
                                value={isEnabled}
                                onValueChange={() => access.overrideEnabled && toggleTab(item._id, tab, access)}
                                disabled={!access.overrideEnabled || !!saving}
                                trackColor={{ false: Colors.border, true: Colors.primary + '80' }}
                                thumbColor={isEnabled ? Colors.primary : Colors.textMuted}
                              />
                          }
                        </View>
                        {idx < tabs.length - 1 && <View style={styles.divider} />}
                      </View>
                    );
                  })}

                  {!access.overrideEnabled && (
                    <Text style={styles.inheritNote}>
                      Enable override to customise tabs for this user
                    </Text>
                  )}
                </View>
              )}
            </View>
          );
        })}

        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg },

  sectionHead: {
    fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: Spacing.xs,
  },
  sectionHint: {
    fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.md, lineHeight: 18,
  },

  roleTabRow: {
    flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm,
  },
  roleTab: {
    flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: Radius.sm,
    backgroundColor: Colors.tealBg, borderWidth: 1, borderColor: Colors.border,
  },
  roleTabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  roleTabText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary },
  roleTabTextActive: { color: Colors.white },

  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.tealBg, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    marginBottom: Spacing.sm,
  },
  bannerText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600', flex: 1 },

  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.sm,
    paddingVertical: 12, alignItems: 'center', marginTop: Spacing.sm,
  },
  saveBtnDisabled: { backgroundColor: Colors.textMuted },
  saveBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.md },

  card: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, marginBottom: Spacing.sm,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
    overflow: 'hidden',
  },

  empty: { alignItems: 'center', paddingTop: 40, gap: Spacing.sm },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },

  userRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' },
  userInfo: { flex: 1 },
  name: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  email: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  rolePill: {
    backgroundColor: Colors.tealBg, borderRadius: Radius.full,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  rolePillManager: { backgroundColor: '#EDE9FE' },
  rolePillText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary },
  rolePillTextManager: { color: '#5B21B6' },
  sub: { fontSize: FontSize.xs, color: Colors.textSecondary },

  expanded: { borderTopWidth: 1, borderTopColor: Colors.border },
  overrideRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  overrideLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  overrideHint: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },

  tabRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 10,
  },
  tabLabel: { fontSize: FontSize.sm, color: Colors.text, flex: 1 },
  tabLabelMuted: { color: Colors.textMuted },
  divider: { height: 1, backgroundColor: Colors.border },
  inheritNote: {
    fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center',
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
  },
});
