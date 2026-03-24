import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  RefreshControl, TextInput, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ListSkeleton } from '@/components/Skeleton';
import { api } from '@/services/api';
import { ENDPOINTS } from '@/constants/api';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  phone?: string;
}

const ROLE_COLOR: Record<string, string> = {
  DIRECTOR: Colors.primary,
  MANAGER: Colors.accent,
  STAFF: Colors.textSecondary,
};

export default function UsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [filtered, setFiltered] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<any>(ENDPOINTS.USERS);
      const list: User[] = Array.isArray(data) ? data : (data.users ?? []);
      setUsers(list);
      setFiltered(list);
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!search.trim()) { setFiltered(users); return; }
    const q = search.toLowerCase();
    setFiltered(users.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    ));
  }, [search, users]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email or role..."
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
        <ListSkeleton count={5} lines={2} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={[styles.avatar, { backgroundColor: ROLE_COLOR[item.role] ?? Colors.primary }]}>
                <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.email}>{item.email}</Text>
                {item.phone && <Text style={styles.sub}>{item.phone}</Text>}
              </View>
              <View style={styles.right}>
                <View style={[styles.roleBadge, { backgroundColor: (ROLE_COLOR[item.role] ?? Colors.primary) + '20' }]}>
                  <Text style={[styles.roleText, { color: ROLE_COLOR[item.role] ?? Colors.primary }]}>{item.role}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: item.status === 'APPROVED' ? Colors.successBg : Colors.border }]}>
                  <Text style={[styles.statusText, { color: item.status === 'APPROVED' ? Colors.success : Colors.textMuted }]}>{item.status}</Text>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg, marginVertical: Spacing.md,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, height: 46,
  },
  searchIcon: { marginRight: Spacing.sm },
  searchInput: { flex: 1, fontSize: FontSize.md, color: Colors.text },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 120 },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
    gap: Spacing.md,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' },
  info: { flex: 1, gap: 2 },
  name: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  email: { fontSize: FontSize.sm, color: Colors.textSecondary },
  sub: { fontSize: FontSize.xs, color: Colors.textMuted },
  right: { alignItems: 'flex-end', gap: 4 },
  roleBadge: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  roleText: { fontSize: FontSize.xs, fontWeight: '700' },
  statusBadge: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  statusText: { fontSize: FontSize.xs, fontWeight: '600' },
});
