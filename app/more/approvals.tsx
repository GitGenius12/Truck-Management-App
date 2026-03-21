import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import OmLoader from '@/components/OmLoader';
import { api } from '@/services/api';
import { ENDPOINTS } from '@/constants/api';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';

interface Approval {
  _id: string;
  userId: { _id: string; name: string; email: string; role: string };
  type: string;
  status: string;
  createdAt: string;
}

export default function ApprovalsScreen() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<any>(ENDPOINTS.APPROVALS_PENDING);
      setApprovals(Array.isArray(data) ? data : (data.requests ?? data.approvals ?? []));
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAction(id: string, action: 'approve' | 'reject') {
    setActing(id + action);
    try {
      const endpoint = action === 'approve' ? ENDPOINTS.APPROVALS_APPROVE : ENDPOINTS.APPROVALS_REJECT;
      await api.post(endpoint, { requestId: id });
      setApprovals(prev => prev.filter(a => a._id !== id));
    } catch (e: any) {
      Alert.alert('Error', e.message || `Failed to ${action}`);
    } finally {
      setActing(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {loading ? (
        <OmLoader />
      ) : (
        <FlatList
          data={approvals}
          keyExtractor={i => i._id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No pending approvals</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.userId?.name?.charAt(0)?.toUpperCase() ?? '?'}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.userId?.name ?? 'Unknown'}</Text>
                <Text style={styles.sub}>{item.userId?.email}</Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>{item.userId?.role}</Text>
                </View>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.btn, styles.approveBtn]}
                  onPress={() => handleAction(item._id, 'approve')}
                  disabled={!!acting}
                >
                  {acting === item._id + 'approve'
                    ? <ActivityIndicator color={Colors.white} size="small" />
                    : <Ionicons name="checkmark" size={18} color={Colors.white} />}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.rejectBtn]}
                  onPress={() => handleAction(item._id, 'reject')}
                  disabled={!!acting}
                >
                  {acting === item._id + 'reject'
                    ? <ActivityIndicator color={Colors.white} size="small" />
                    : <Ionicons name="close" size={18} color={Colors.white} />}
                </TouchableOpacity>
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
  list: { padding: Spacing.lg, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm,
    shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
    gap: Spacing.md,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' },
  info: { flex: 1, gap: 2 },
  name: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  sub: { fontSize: FontSize.sm, color: Colors.textSecondary },
  roleBadge: { alignSelf: 'flex-start', backgroundColor: Colors.tealBg, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2, marginTop: 2 },
  roleText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  btn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  approveBtn: { backgroundColor: Colors.success },
  rejectBtn: { backgroundColor: Colors.error },
});
