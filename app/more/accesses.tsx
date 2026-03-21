import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  RefreshControl, Switch, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import OmLoader from '@/components/OmLoader';
import { api } from '@/services/api';
import { ENDPOINTS } from '@/constants/api';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  tabAccess?: string[];
}

const ALL_TABS = [
  'average', 'my-trucks', 'validity', 'daily-ops', 'availability',
  'assignment', 'drivers', 'transactions', 'misc', 'bank-entry', 'trips', 'requests',
];

export default function AccessesScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<any>(ENDPOINTS.USERS);
      const list: User[] = (Array.isArray(data) ? data : (data.users ?? [])).filter(
        (u: User) => u.role !== 'DIRECTOR'
      );
      // Load tab access for each user
      const withAccess = await Promise.all(list.map(async u => {
        try {
          const raw = await api.get<any>(`${ENDPOINTS.USERS}/${u._id}/tab-access`);
          const resolved = raw?.tabAccess ?? raw;
          return { ...u, tabAccess: Array.isArray(resolved) ? resolved : [] };
        } catch {
          return { ...u, tabAccess: [] };
        }
      }));
      setUsers(withAccess);
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleTab(userId: string, tab: string, currentAccess: string[]) {
    const newAccess = currentAccess.includes(tab)
      ? currentAccess.filter(t => t !== tab)
      : [...currentAccess, tab];

    setSaving(userId + tab);
    try {
      await api.put(`${ENDPOINTS.USERS}/${userId}/tab-access`, { tabAccess: newAccess });
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, tabAccess: newAccess } : u));
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update access');
    } finally {
      setSaving(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {loading ? (
        <OmLoader />
      ) : (
        <FlatList
          data={users}
          keyExtractor={i => i._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="lock-closed-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No users to manage</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isOpen = expanded === item._id;
            const access = Array.isArray(item.tabAccess) ? item.tabAccess : [];
            return (
              <View style={styles.card}>
                <View style={styles.userRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.sub}>{item.role} · {access.length} tabs</Text>
                  </View>
                  <Ionicons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={Colors.textMuted}
                    onPress={() => setExpanded(isOpen ? null : item._id)}
                  />
                </View>
                {isOpen && (
                  <View style={styles.tabsGrid}>
                    {ALL_TABS.map(tab => (
                      <View key={tab} style={styles.tabRow}>
                        <Text style={styles.tabLabel}>{tab}</Text>
                        <Switch
                          value={access.includes(tab)}
                          onValueChange={() => toggleTab(item._id, tab, access)}
                          disabled={saving === item._id + tab}
                          trackColor={{ false: Colors.border, true: Colors.primary + '80' }}
                          thumbColor={access.includes(tab) ? Colors.primary : Colors.textMuted}
                        />
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Spacing.lg, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },
  card: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, marginBottom: Spacing.sm,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
    overflow: 'hidden',
  },
  userRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' },
  userInfo: { flex: 1 },
  name: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  sub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  tabsGrid: { borderTopWidth: 1, borderTopColor: Colors.border, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  tabRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tabLabel: { fontSize: FontSize.sm, color: Colors.text, textTransform: 'capitalize', flex: 1 },
});
