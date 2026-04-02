import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { useFocusEffect, router } from 'expo-router';
import { getApiUrl } from '@/lib/query-client';
import { useAuth } from '@/lib/auth';
import RuckMap from '@/components/RuckMap';
import { formatDuration, formatPace, timeAgo } from '@/lib/format';

interface FeedRuck {
  id: string;
  userId: string;
  distance: number | null;
  durationSeconds: number | null;
  weight: number | null;
  notes: string | null;
  routeCoordinates: string | null;
  routeImageUrl: string | null;
  createdAt: string | null;
  userName: string | null;
  userAvatar: string | null;
  likeCount?: number;
  commentCount?: number;
}

function RuckCard({ ruck }: { ruck: FeedRuck }) {
  const miles = (ruck.distance || 0) / 100;
  const pace = ruck.durationSeconds ? formatPace(ruck.distance || 0, ruck.durationSeconds) : '--';
  const duration = ruck.durationSeconds ? formatDuration(ruck.durationSeconds) : '--';
  const dateLabel = ruck.createdAt ? timeAgo(ruck.createdAt) : '';

  let routeCoords: Array<{ latitude: number; longitude: number }> = [];
  if (ruck.routeCoordinates) {
    try {
      routeCoords = JSON.parse(ruck.routeCoordinates);
    } catch {}
  }
  const hasRoute = routeCoords.length >= 2;
  const lastCoord = hasRoute ? routeCoords[routeCoords.length - 1] : null;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: '/ruck/[id]', params: { id: ruck.id } })}
    >
      <View style={styles.cardHeader}>
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            router.push({ pathname: '/user-profile', params: { userId: ruck.userId } });
          }}
          style={styles.cardHeaderInner}
        >
        {ruck.userAvatar ? (
          <Image source={{ uri: ruck.userAvatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={18} color={Colors.textMuted} />
          </View>
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.userName}>{ruck.userName || 'Rucker'}</Text>
          <Text style={styles.cardDate}>{dateLabel}</Text>
        </View>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{miles.toFixed(1)}</Text>
          <Text style={styles.statLabel}>miles</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{ruck.weight || 0}</Text>
          <Text style={styles.statLabel}>lbs</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{duration}</Text>
          <Text style={styles.statLabel}>duration</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{pace}</Text>
          <Text style={styles.statLabel}>min/mi</Text>
        </View>
      </View>

      {hasRoute && lastCoord ? (
        <View style={styles.mapPreview} pointerEvents="none">
          <RuckMap
            currentPos={lastCoord}
            routeCoords={routeCoords}
          />
        </View>
      ) : null}

      {ruck.notes ? (
        <Text style={styles.notes} numberOfLines={2}>{ruck.notes}</Text>
      ) : null}

      {((ruck.likeCount ?? 0) > 0 || (ruck.commentCount ?? 0) > 0) ? (
        <View style={styles.socialRow}>
          {(ruck.likeCount ?? 0) > 0 ? (
            <View style={styles.socialItem}>
              <Ionicons name="heart" size={14} color={Colors.burntOrange} />
              <Text style={styles.socialText}>{ruck.likeCount}</Text>
            </View>
          ) : null}
          {(ruck.commentCount ?? 0) > 0 ? (
            <View style={styles.socialItem}>
              <Ionicons name="chatbubble" size={13} color={Colors.textMuted} />
              <Text style={styles.socialText}>{ruck.commentCount}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [rucks, setRucks] = useState<FeedRuck[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const baseUrl = (() => {
    try { return getApiUrl(); } catch { return null; }
  })();

  const loadFeed = useCallback(() => {
    if (!baseUrl) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    fetch(`${baseUrl}api/rucks/feed`, { headers })
      .then(r => r.ok ? r.json() : [])
      .then(setRucks)
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
    if (token) {
      fetch(`${baseUrl}api/notifications/unread-count`, { headers })
        .then(r => r.ok ? r.json() : { count: 0 })
        .then(data => setUnreadCount(data.count || 0))
        .catch(() => {});
    }
  }, [baseUrl, token]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadFeed();
    }, [loadFeed])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFeed();
  }, [loadFeed]);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.wordmark}>RUCKON</Text>
        <TouchableOpacity onPress={() => router.push('/notifications')} style={styles.bellBtn}>
          <Ionicons name="notifications-outline" size={24} color={Colors.bone} />
          {unreadCount > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.burntOrange} style={{ marginTop: 60 }} />
      ) : rucks.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="footsteps-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No rucks yet</Text>
          <Text style={styles.emptyText}>Be the first to log a ruck and it will show up here</Text>
        </View>
      ) : (
        <FlatList
          data={rucks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <RuckCard ruck={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.burntOrange}
            />
          }
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
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  wordmark: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 28,
    color: Colors.bone,
    letterSpacing: 3,
  },
  list: {
    paddingBottom: 100,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: Colors.darkCard,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  cardHeader: {
    padding: 14,
  },
  cardHeaderInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.mossGreen,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.darkCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.bone,
  },
  cardDate: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 17,
    color: Colors.bone,
  },
  statLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.cardBorder,
  },
  mapPreview: {
    height: 160,
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  notes: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    paddingHorizontal: 14,
    paddingBottom: 14,
    lineHeight: 18,
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
  socialRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 16,
  },
  socialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  socialText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
  bellBtn: {
    position: 'relative',
    padding: 4,
  },
  bellBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.burntOrange,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Colors.charcoal,
  },
  bellBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: Colors.bone,
  },
});
