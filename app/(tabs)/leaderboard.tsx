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
import { useFocusEffect } from 'expo-router';
import Colors from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getApiUrl } from '@/lib/query-client';

type Period = 'weekly' | 'monthly';
type Metric = 'distance' | 'weight';

interface LeaderboardEntry {
  userId: string;
  name: string | null;
  username: string;
  avatar: string | null;
  totalDistance: number;
  totalWeight: number;
  rank: number;
  isCurrentUser: boolean;
}

function getRankColor(rank: number) {
  if (rank === 1) return Colors.gold;
  if (rank === 2) return Colors.silver;
  if (rank === 3) return Colors.bronze;
  return Colors.textMuted;
}

function getRankIcon(rank: number): string {
  if (rank === 1) return 'trophy';
  if (rank === 2) return 'medal';
  if (rank === 3) return 'ribbon';
  return '';
}

function TopThreeItem({ entry, metric }: { entry: LeaderboardEntry; metric: Metric }) {
  const rankColor = getRankColor(entry.rank);
  const isFirst = entry.rank === 1;
  const distMiles = entry.totalDistance / 100;
  return (
    <View style={[styles.topItem, isFirst && styles.topItemFirst]}>
      <View style={[styles.rankBadge, { borderColor: rankColor }]}>
        <Ionicons name={getRankIcon(entry.rank) as any} size={14} color={rankColor} />
      </View>
      {entry.avatar ? (
        <Image source={{ uri: entry.avatar }} style={[styles.topAvatar, { borderColor: rankColor }]} />
      ) : (
        <View style={[styles.topAvatar, styles.avatarPlaceholder, { borderColor: rankColor }]}>
          <Ionicons name="person" size={20} color={Colors.textMuted} />
        </View>
      )}
      <Text style={styles.topName} numberOfLines={1}>
        {entry.name ? entry.name.split(' ')[0] : entry.username}
      </Text>
      <Text style={[styles.topStat, { color: rankColor }]}>
        {metric === 'distance'
          ? `${distMiles.toFixed(1)} mi`
          : `${entry.totalWeight >= 1000 ? (entry.totalWeight / 1000).toFixed(1) + 'k' : entry.totalWeight} lbs`}
      </Text>
    </View>
  );
}

function EntryRow({ entry, metric }: { entry: LeaderboardEntry; metric: Metric }) {
  const rankColor = getRankColor(entry.rank);
  const distMiles = entry.totalDistance / 100;
  return (
    <View style={[styles.entryRow, entry.isCurrentUser && styles.entryRowCurrent]}>
      <View style={styles.rankNumWrap}>
        <Text style={[styles.rankNum, { color: rankColor }]}>{entry.rank}</Text>
      </View>
      {entry.avatar ? (
        <Image source={{ uri: entry.avatar }} style={styles.entryAvatar} />
      ) : (
        <View style={[styles.entryAvatar, styles.avatarPlaceholder]}>
          <Ionicons name="person" size={16} color={Colors.textMuted} />
        </View>
      )}
      <View style={styles.entryInfo}>
        <Text style={[styles.entryName, entry.isCurrentUser && styles.entryNameCurrent]}>
          {entry.name || entry.username} {entry.isCurrentUser ? '(you)' : ''}
        </Text>
      </View>
      <Text style={[styles.entryStat, entry.isCurrentUser && { color: Colors.burntOrange }]}>
        {metric === 'distance'
          ? `${distMiles.toFixed(1)} mi`
          : `${entry.totalWeight >= 1000 ? (entry.totalWeight / 1000).toFixed(1) + 'k' : entry.totalWeight} lbs`}
      </Text>
    </View>
  );
}

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>('weekly');
  const [metric, setMetric] = useState<Metric>('distance');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const baseUrl = (() => {
    try { return getApiUrl(); } catch { return null; }
  })();

  useFocusEffect(
    useCallback(() => {
      if (!baseUrl) {
        setLoading(false);
        return;
      }
      setLoading(true);
      fetch(`${baseUrl}api/leaderboard?period=${period}&metric=${metric}`)
        .then(r => r.ok ? r.json() : [])
        .then((data: Array<{ userId: string; name: string | null; username: string; avatar: string | null; totalDistance: number; totalWeight: number }>) => {
          const ranked = data.map((e, i) => ({
            ...e,
            rank: i + 1,
            isCurrentUser: user?.id === e.userId,
          }));
          setEntries(ranked);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [baseUrl, period, metric, user?.id])
  );

  const topThree = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>LEADERBOARD</Text>
      </View>

      <View style={styles.controlsRow}>
        <View style={styles.periodToggle}>
          <TouchableOpacity
            style={[styles.periodBtn, period === 'weekly' && styles.periodBtnActive]}
            onPress={() => setPeriod('weekly')}
          >
            <Text style={[styles.periodText, period === 'weekly' && styles.periodTextActive]}>
              Weekly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodBtn, period === 'monthly' && styles.periodBtnActive]}
            onPress={() => setPeriod('monthly')}
          >
            <Text style={[styles.periodText, period === 'monthly' && styles.periodTextActive]}>
              Monthly
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metricToggle}>
          <TouchableOpacity
            style={[styles.metricBtn, metric === 'distance' && styles.metricBtnActive]}
            onPress={() => setMetric('distance')}
          >
            <Text style={[styles.metricText, metric === 'distance' && styles.metricTextActive]}>
              Distance
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.metricBtn, metric === 'weight' && styles.metricBtnActive]}
            onPress={() => setMetric('weight')}
          >
            <Text style={[styles.metricText, metric === 'weight' && styles.metricTextActive]}>
              Weight
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.burntOrange} style={{ marginTop: 60 }} />
      ) : entries.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="trophy-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No activity yet</Text>
          <Text style={styles.emptyText}>Log rucks to appear on the leaderboard</Text>
        </View>
      ) : (
        <FlatList
          data={rest}
          keyExtractor={(item) => item.userId}
          ListHeaderComponent={() => (
            <View>
              {topThree.length >= 3 ? (
                <View style={styles.podium}>
                  <TopThreeItem entry={topThree[1]} metric={metric} />
                  <TopThreeItem entry={topThree[0]} metric={metric} />
                  <TopThreeItem entry={topThree[2]} metric={metric} />
                </View>
              ) : topThree.length > 0 ? (
                <View style={styles.podium}>
                  {topThree.map(e => (
                    <TopThreeItem key={e.userId} entry={e} metric={metric} />
                  ))}
                </View>
              ) : null}
              {rest.length > 0 && (
                <View style={styles.listHeader}>
                  <Text style={styles.listHeaderText}>RANK</Text>
                  <Text style={[styles.listHeaderText, { flex: 1, marginLeft: 52 }]}>RUCKER</Text>
                  <Text style={styles.listHeaderText}>
                    {metric === 'distance' ? 'MILES' : 'LBS MOVED'}
                  </Text>
                </View>
              )}
            </View>
          )}
          renderItem={({ item }) => <EntryRow entry={item} metric={metric} />}
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
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 28,
    color: Colors.bone,
    letterSpacing: 3,
  },
  controlsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  periodToggle: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.darkCard,
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  periodBtnActive: {
    backgroundColor: Colors.mossGreen,
  },
  periodText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.textMuted,
  },
  periodTextActive: {
    color: Colors.bone,
  },
  metricToggle: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.darkCard,
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  metricBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  metricBtnActive: {
    backgroundColor: Colors.mossGreen,
  },
  metricText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.textMuted,
  },
  metricTextActive: {
    color: Colors.bone,
  },
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 8,
    gap: 8,
  },
  topItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 16,
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    maxWidth: 110,
  },
  topItemFirst: {
    paddingVertical: 22,
    borderColor: Colors.gold,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.darkCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.bone,
    textAlign: 'center',
  },
  topStat: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 14,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    marginHorizontal: 16,
    marginBottom: 4,
  },
  listHeaderText: {
    fontFamily: 'Oswald_500Medium',
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1.2,
  },
  list: {
    paddingBottom: 100,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 3,
    borderRadius: 10,
    gap: 12,
  },
  entryRowCurrent: {
    backgroundColor: Colors.forestGreen,
    borderWidth: 1,
    borderColor: Colors.mossGreen,
  },
  rankNumWrap: {
    width: 28,
    alignItems: 'center',
  },
  rankNum: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 18,
  },
  entryAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  entryInfo: {
    flex: 1,
  },
  entryName: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.bone,
  },
  entryNameCurrent: {
    color: Colors.bone,
    fontFamily: 'Inter_700Bold',
  },
  entryStat: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 16,
    color: Colors.bone,
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
  },
});
