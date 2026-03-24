import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Skeleton } from '@/components/Skeleton';
import { api } from '@/services/api';
import { ENDPOINTS } from '@/constants/api';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';

interface AppNotification {
  _id: string;
  title: string;
  body: string;
  createdAt: string;
}

interface NotifResponse {
  data: AppNotification[];
  total: number;
  totalPages: number;
  currentPage: number;
}

function timeAgo(dateStr: string): string {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000));
  if (diff < 60)      return `${diff}s ago`;
  if (diff < 3600)    return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)   return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function NotifCard({ notif }: { notif: AppNotification }) {
  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.left}>
        <Text style={cardStyles.title}>{notif.title}</Text>
        <Text style={cardStyles.body}>{notif.body}</Text>
      </View>
      <Text style={cardStyles.time}>{timeAgo(notif.createdAt)}</Text>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  left: { flex: 1 },
  title: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  body: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  time: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '600', flexShrink: 0, marginTop: 2 },
});

export default function NotificationBell() {
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notifTotal, setNotifTotal] = useState(0);
  const [notifPage, setNotifPage] = useState(1);
  const [notifTotalPages, setNotifTotalPages] = useState(1);
  const [notifLoading, setNotifLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [res, lastSeen] = await Promise.all([
          api.get<NotifResponse>(`${ENDPOINTS.NOTIFICATIONS}?page=1&limit=1`),
          AsyncStorage.getItem('notif_last_seen_total'),
        ]);
        const serverTotal = res.total ?? 0;
        const lastSeenTotal = parseInt(lastSeen ?? '0', 10);
        setNotifTotal(Math.max(0, serverTotal - lastSeenTotal));
      } catch {}
    })();
  }, []);

  const loadNotifications = useCallback(async (page = 1) => {
    setNotifLoading(true);
    try {
      const res = await api.get<NotifResponse>(`${ENDPOINTS.NOTIFICATIONS}?page=${page}&limit=10`);
      setNotifications(res.data ?? []);
      setNotifTotalPages(res.totalPages ?? 1);
      setNotifPage(page);
    } catch {
      // silently fail
    } finally {
      setNotifLoading(false);
    }
  }, []);

  const closeNotifs = useCallback(async () => {
    setShowNotifs(false);
    setNotifTotal(0);
    try {
      const res = await api.get<NotifResponse>(`${ENDPOINTS.NOTIFICATIONS}?page=1&limit=1`);
      await AsyncStorage.setItem('notif_last_seen_total', String(res.total ?? 0));
    } catch {}
  }, []);

  return (
    <>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => { setShowNotifs(true); loadNotifications(1); }}
      >
        <Ionicons name="notifications-outline" size={24} color={Colors.white} />
        {notifTotal > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{notifTotal > 99 ? '99+' : notifTotal}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={showNotifs} animationType="slide" transparent onRequestClose={closeNotifs}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={closeNotifs} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Notifications</Text>
            <TouchableOpacity onPress={closeNotifs}>
              <Ionicons name="close" size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>
          {notifLoading ? (
            <>
              <Skeleton width="70%" height={14} style={{ marginBottom: 12 }} />
              <Skeleton width="90%" height={12} style={{ marginBottom: 16 }} />
              <Skeleton width="70%" height={14} style={{ marginBottom: 12 }} />
              <Skeleton width="90%" height={12} style={{ marginBottom: 16 }} />
              <Skeleton width="70%" height={14} style={{ marginBottom: 12 }} />
              <Skeleton width="90%" height={12} />
            </>
          ) : notifications.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={item => item._id}
              contentContainerStyle={{ paddingBottom: 16 }}
              renderItem={({ item }) => <NotifCard notif={item} />}
              ListFooterComponent={
                notifTotalPages > 1 ? (
                  <View style={styles.pager}>
                    <TouchableOpacity
                      onPress={() => loadNotifications(notifPage - 1)}
                      disabled={notifPage === 1}
                      style={[styles.pagerBtn, notifPage === 1 && styles.pagerBtnDisabled]}
                    >
                      <Ionicons name="chevron-back" size={18} color={notifPage === 1 ? Colors.textMuted : Colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.pagerText}>{notifPage} / {notifTotalPages}</Text>
                    <TouchableOpacity
                      onPress={() => loadNotifications(notifPage + 1)}
                      disabled={notifPage === notifTotalPages}
                      style={[styles.pagerBtn, notifPage === notifTotalPages && styles.pagerBtnDisabled]}
                    >
                      <Ionicons name="chevron-forward" size={18} color={notifPage === notifTotalPages ? Colors.textMuted : Colors.primary} />
                    </TouchableOpacity>
                  </View>
                ) : null
              }
            />
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.orange,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: Colors.white },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  empty: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  emptyText: { fontSize: FontSize.md, color: Colors.textMuted },
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
});
