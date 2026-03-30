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
import { useFocusEffect } from 'expo-router';
import { getApiUrl } from '@/lib/query-client';

interface FeedRuck {
  id: string;
  userId: string;
  distance: number | null;
  durationSeconds: number | null;
  weight: number | null;
  notes: string | null;
  routeImageUrl: string | null;
  createdAt: string | null;
  userName: string | null;
  userAvatar: string | null;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatPace(distanceCents: number, durationSeconds: number): string {
  const miles = distanceCents / 100;
  if (miles <= 0 || durationSeconds <= 0) return '--';
  const paceMinutes = durationSeconds / 60 / miles;
  const mins = Math.floor(paceMinutes);
  const secs = Math.round((paceMinutes - mins) * 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

function RuckCard({ ruck }: { ruck: FeedRuck }) {
  const miles = (ruck.distance || 0) / 100;
  const pace = ruck.durationSeconds ? formatPace(ruck.distance || 0, ruck.durationSeconds) : '--';
  const duration = ruck.durationSeconds ? formatDuration(ruck.durationSeconds) : '--';
  const dateLabel = ruck.createdAt ? timeAgo(ruck.createdAt) : '';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
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

      {ruck.notes ? (
        <Text style={styles.notes} numberOfLines={2}>{ruck.notes}</Text>
      ) : null}
    </View>
  );
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const [rucks, setRucks] = useState<FeedRuck[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const baseUrl = (() => {
    try { return getApiUrl(); } catch { return null; }
  })();

  const loadFeed = useCallback(() => {
    if (!baseUrl) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    fetch(`${baseUrl}api/rucks/feed`)
      .then(r => r.ok ? r.json() : [])
      .then(setRucks)
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, [baseUrl]);

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
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={24} color={Colors.bone} />
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
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
});
