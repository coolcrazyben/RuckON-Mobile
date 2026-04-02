import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import Colors from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getApiUrl } from '@/lib/query-client';
import { timeAgo } from '@/lib/format';

interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  referenceId: string | null;
  fromUserId: string | null;
  message: string;
  read: boolean | null;
  createdAt: string | null;
  fromUserName: string | null;
  fromUserAvatar: string | null;
}

function getNotificationIcon(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'like': return 'heart';
    case 'comment': return 'chatbubble';
    case 'friend_request': return 'person-add';
    case 'friend_accepted': return 'people';
    default: return 'notifications';
  }
}

function getNotificationColor(type: string): string {
  switch (type) {
    case 'like': return Colors.burntOrange;
    case 'comment': return Colors.mossGreen;
    case 'friend_request': return '#5B9BD5';
    case 'friend_accepted': return Colors.success;
    default: return Colors.textMuted;
  }
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const baseUrl = (() => {
    try { return getApiUrl(); } catch { return null; }
  })();

  useFocusEffect(
    useCallback(() => {
      if (!baseUrl || !token) {
        setLoading(false);
        return;
      }
      fetch(`${baseUrl}api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.ok ? r.json() : { notifications: [] })
        .then(data => {
          setNotifs(data.notifications || []);
          if (data.notifications?.some((n: NotificationItem) => !n.read)) {
            fetch(`${baseUrl}api/notifications/read`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
            }).then(() => {
              setNotifs(prev => prev.map(n => ({ ...n, read: true })));
            }).catch(() => {});
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [baseUrl, token])
  );

  const handleNotifPress = (notif: NotificationItem) => {
    if (notif.type === 'like' || notif.type === 'comment') {
      if (notif.referenceId) {
        router.push({ pathname: '/ruck/[id]', params: { id: notif.referenceId } });
      }
    } else if (notif.type === 'friend_request' || notif.type === 'friend_accepted') {
      if (notif.fromUserId) {
        router.push({ pathname: '/user-profile', params: { userId: notif.fromUserId } });
      }
    }
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      style={[styles.notifItem, !item.read && styles.notifUnread]}
      onPress={() => handleNotifPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.notifLeft}>
        {item.fromUserAvatar ? (
          <Image source={{ uri: item.fromUserAvatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={18} color={Colors.textMuted} />
          </View>
        )}
        <View style={[styles.iconBadge, { backgroundColor: getNotificationColor(item.type) }]}>
          <Ionicons name={getNotificationIcon(item.type)} size={10} color="#fff" />
        </View>
      </View>
      <View style={styles.notifContent}>
        <Text style={styles.notifMessage}>{item.message}</Text>
        {item.createdAt && (
          <Text style={styles.notifTime}>{timeAgo(item.createdAt)}</Text>
        )}
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.bone} />
        </TouchableOpacity>
        <Text style={styles.title}>NOTIFICATIONS</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.burntOrange} style={{ marginTop: 60 }} />
      ) : notifs.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-off-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptyText}>You'll see activity here when people interact with your rucks</Text>
        </View>
      ) : (
        <FlatList
          data={notifs}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.charcoal,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 20,
    color: Colors.bone,
    letterSpacing: 2,
  },
  list: {
    paddingBottom: 100,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  notifUnread: {
    backgroundColor: 'rgba(196, 98, 45, 0.06)',
  },
  notifLeft: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: Colors.cardBorder,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.darkCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.charcoal,
  },
  notifContent: {
    flex: 1,
  },
  notifMessage: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.bone,
    lineHeight: 20,
  },
  notifTime: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.burntOrange,
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    gap: 10,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 22,
    color: Colors.bone,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
