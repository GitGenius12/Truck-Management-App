import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, FlatList, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS, Easing, interpolate, clamp,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Skeleton } from '@/components/Skeleton';
import { api } from '@/services/api';
import { ENDPOINTS } from '@/constants/api';
import { Colors, Spacing, Radius, FontSize } from '@/constants/theme';

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_H = SCREEN_H * 0.65;

interface AppNotification {
  _id: string;
  title: string;
  body: string;
  createdAt: string;
  data?: { type?: string; [key: string]: any };
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

function routeForType(type?: string) {
  switch (type) {
    case 'approval_request':
    case 'approved':
    case 'rejected':
      return '/more/approvals';
    case 'assignment_created':
    case 'assignment_removed':
      return '/more/assignment';
    case 'trip_created':
    case 'trip_updated':
      return '/(tabs)/trips';
    case 'bank_entry':
    case 'bank_entry_updated':
      return '/more/bank-entry';
    case 'doc_expiry':
      return '/more/validity';
    default:
      return null;
  }
}

function NotifCard({ notif, onPress }: { notif: AppNotification; onPress: () => void }) {
  const route = routeForType(notif.data?.type);
  return (
    <TouchableOpacity
      style={cardStyles.card}
      onPress={route ? onPress : undefined}
      activeOpacity={route ? 0.65 : 1}
    >
      <View style={cardStyles.left}>
        <Text style={cardStyles.title}>{notif.title}</Text>
        <Text style={cardStyles.body}>{notif.body}</Text>
      </View>
      <View style={cardStyles.right}>
        <Text style={cardStyles.time}>{timeAgo(notif.createdAt)}</Text>
        {!!route && <Ionicons name="chevron-forward" size={14} color="#B8CECC" style={{ marginTop: 2 }} />}
      </View>
    </TouchableOpacity>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: '#DCE9E7',
    gap: Spacing.md,
  },
  left: { flex: 1 },
  right: { alignItems: 'flex-end', gap: 2 },
  title: { fontSize: FontSize.md, fontWeight: '700', color: '#102A2A' },
  body: { fontSize: FontSize.sm, color: '#6B7F7D', marginTop: 2 },
  time: { fontSize: FontSize.xs, color: '#0D7377', fontWeight: '600', flexShrink: 0, marginTop: 2 },
});

export default function NotificationBell() {
  const insets = useSafeAreaInsets();
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notifTotal, setNotifTotal] = useState(0);
  const [notifPage, setNotifPage] = useState(1);
  const [notifTotalPages, setNotifTotalPages] = useState(1);
  const [notifLoading, setNotifLoading] = useState(false);

  const translateY = useSharedValue(SHEET_H);
  const startY = useSharedValue(0);

  const sheetAnim = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropAnim = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [0, SHEET_H], [1, 0], 'clamp'),
  }));

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
    } finally {
      setNotifLoading(false);
    }
  }, []);

  function openSheet() {
    setShowNotifs(true);
    translateY.value = withSpring(0, { mass: 0.6, stiffness: 200, damping: 22 });
    loadNotifications(1);
  }

  const handleClose = useCallback(() => {
    setShowNotifs(false);
    setNotifTotal(0);
    api.get<NotifResponse>(`${ENDPOINTS.NOTIFICATIONS}?page=1&limit=1`)
      .then(res => AsyncStorage.setItem('notif_last_seen_total', String(res.total ?? 0)))
      .catch(() => {});
  }, []);

  const closeSheet = useCallback(() => {
    translateY.value = withTiming(SHEET_H, { duration: 240, easing: Easing.bezier(0.32, 0, 0.67, 0) }, (done) => {
      if (done) runOnJS(handleClose)();
    });
  }, [handleClose]);

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
          if (done) runOnJS(handleClose)();
        });
      } else {
        translateY.value = withSpring(0, { mass: 0.6, stiffness: 200, damping: 22 });
      }
    });

  return (
    <>
      <TouchableOpacity
        style={styles.btn}
        onPress={openSheet}
      >
        <Ionicons name="notifications-outline" size={24} color={Colors.white} />
        {notifTotal > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{notifTotal > 99 ? '99+' : notifTotal}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={showNotifs} animationType="none" transparent onRequestClose={closeSheet}>
        <Animated.View style={[styles.overlay, backdropAnim]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeSheet} />
          <GestureDetector gesture={pan}>
            <Animated.View
              style={[styles.sheet, { height: SHEET_H, paddingBottom: insets.bottom + 16 }, sheetAnim]}
            >
              <View style={styles.handleWrap}>
                <View style={styles.handle} />
              </View>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Notifications</Text>
                <TouchableOpacity onPress={closeSheet}>
                  <Ionicons name="close" size={22} color="#102A2A" />
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
                  <Ionicons name="notifications-off-outline" size={40} color="#B8CECC" />
                  <Text style={styles.emptyText}>No notifications yet</Text>
                </View>
              ) : (
                <FlatList
                  data={notifications}
                  keyExtractor={item => item._id}
                  contentContainerStyle={{ paddingBottom: 16 }}
                  renderItem={({ item }) => (
                    <NotifCard
                      notif={item}
                      onPress={() => {
                        const route = routeForType(item.data?.type);
                        if (!route) return;
                        closeSheet();
                        setTimeout(() => router.push(route as any), 100);
                      }}
                    />
                  )}
                  ListFooterComponent={
                    notifTotalPages > 1 ? (
                      <View style={styles.pager}>
                        <TouchableOpacity
                          onPress={() => loadNotifications(notifPage - 1)}
                          disabled={notifPage === 1}
                          style={[styles.pagerBtn, notifPage === 1 && styles.pagerBtnDisabled]}
                        >
                          <Ionicons name="chevron-back" size={18} color={notifPage === 1 ? '#B8CECC' : '#0D7377'} />
                        </TouchableOpacity>
                        <Text style={styles.pagerText}>{notifPage} / {notifTotalPages}</Text>
                        <TouchableOpacity
                          onPress={() => loadNotifications(notifPage + 1)}
                          disabled={notifPage === notifTotalPages}
                          style={[styles.pagerBtn, notifPage === notifTotalPages && styles.pagerBtnDisabled]}
                        >
                          <Ionicons name="chevron-forward" size={18} color={notifPage === notifTotalPages ? '#B8CECC' : '#0D7377'} />
                        </TouchableOpacity>
                      </View>
                    ) : null
                  }
                />
              )}
            </Animated.View>
          </GestureDetector>
        </Animated.View>
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
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#F8FCFC',
    borderTopLeftRadius: 48,
    borderTopRightRadius: 48,
    overflow: 'hidden',
    paddingHorizontal: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 20,
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 86,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#8FBFBC',
    shadowColor: '#0D7377',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 6,
    elevation: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '700', color: '#102A2A' },
  empty: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  emptyText: { fontSize: FontSize.md, color: '#6B7F7D' },
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
    backgroundColor: '#F0F7F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagerBtnDisabled: { opacity: 0.4 },
  pagerText: { fontSize: FontSize.md, fontWeight: '600', color: '#102A2A' },
});
