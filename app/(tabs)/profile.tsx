import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getApiUrl } from '@/lib/query-client';
import { MOCK_ACHIEVEMENTS, type Achievement } from '@/data/mockData';

interface RuckData {
  id: string;
  distance: number | null;
  durationSeconds: number | null;
  weight: number | null;
  notes: string | null;
  routeImageUrl: string | null;
  createdAt: string | null;
}

interface RuckStats {
  totalMiles: number;
  totalRucks: number;
  weightMoved: number;
}

interface CommunityData {
  id: string;
  name: string;
  memberCount: number | null;
  banner: string | null;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  return `${diffWeeks}w ago`;
}

function AchievementBadge({ achievement }: { achievement: Achievement }) {
  return (
    <View style={[styles.badge, !achievement.earned && styles.badgeLocked]}>
      <View style={[styles.badgeIcon, !achievement.earned && styles.badgeIconLocked]}>
        <Ionicons
          name={achievement.icon as keyof typeof Ionicons.glyphMap}
          size={22}
          color={achievement.earned ? Colors.burntOrange : Colors.textMuted}
        />
      </View>
      <Text style={[styles.badgeTitle, !achievement.earned && styles.badgeTitleLocked]}>
        {achievement.title}
      </Text>
    </View>
  );
}

function RuckHistoryItem({ ruck }: { ruck: RuckData }) {
  const distMiles = (ruck.distance || 0) / 100;
  const pace = ruck.durationSeconds ? formatPace(ruck.distance || 0, ruck.durationSeconds) : '--';
  const duration = ruck.durationSeconds ? formatDuration(ruck.durationSeconds) : '--';
  const dateLabel = ruck.createdAt ? timeAgo(ruck.createdAt) : '';

  return (
    <View style={styles.historyItem}>
      <View style={styles.historyLeft}>
        <View style={styles.historyIconWrap}>
          <Ionicons name="walk" size={18} color={Colors.burntOrange} />
        </View>
        <View>
          <Text style={styles.historyTitle}>{distMiles.toFixed(1)} mi · {ruck.weight || 0} lbs</Text>
          <Text style={styles.historyMeta}>{dateLabel} · {duration}</Text>
        </View>
      </View>
      <View style={styles.historyRight}>
        <Text style={styles.historyPace}>{pace}</Text>
        <Text style={styles.historyPaceLabel}>min/mi</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { logout, user, token, updateAvatar } = useAuth();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [rucks, setRucks] = useState<RuckData[]>([]);
  const [stats, setStats] = useState<RuckStats>({ totalMiles: 0, totalRucks: 0, weightMoved: 0 });
  const [communities, setCommunities] = useState<CommunityData[]>([]);
  const [friendCount, setFriendCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const baseUrl = (() => {
    try { return getApiUrl(); } catch { return null; }
  })();

  useFocusEffect(
    useCallback(() => {
      if (!token || !baseUrl) {
        setLoading(false);
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };

      Promise.all([
        fetch(`${baseUrl}api/rucks`, { headers }).then(r => r.ok ? r.json() : []),
        fetch(`${baseUrl}api/rucks/stats`, { headers }).then(r => r.ok ? r.json() : { totalMiles: 0, totalRucks: 0, weightMoved: 0 }),
        fetch(`${baseUrl}api/user/communities`, { headers }).then(r => r.ok ? r.json() : []),
        fetch(`${baseUrl}api/friends`, { headers }).then(r => r.ok ? r.json() : []),
        fetch(`${baseUrl}api/friends/pending`, { headers }).then(r => r.ok ? r.json() : []),
      ]).then(([rucksData, statsData, commData, friendsData, pendingData]) => {
        setRucks(rucksData);
        setStats(statsData);
        setCommunities(commData);
        setFriendCount(friendsData.length);
        setPendingCount(pendingData.length);
      }).catch(() => {}).finally(() => setLoading(false));
    }, [token, baseUrl])
  );

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: () => logout() },
      ]
    );
  };

  const handlePickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        const mimeType = result.assets[0].mimeType || 'image/jpeg';
        const base64Uri = `data:${mimeType};base64,${result.assets[0].base64}`;
        await updateAvatar(base64Uri);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to update photo';
      Alert.alert('Error', message);
    }
  };

  const displayName = user?.name || 'Rucker';
  const displayUsername = user?.username || '';
  const displayLocation = user?.location || '';
  const displayBio = user?.bio || '';

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <LinearGradient
        colors={[Colors.forestGreen, Colors.charcoal]}
        style={[styles.banner, { paddingTop: topPad + 12 }]}
      >
        <View style={styles.bannerActions}>
          <TouchableOpacity onPress={() => router.push('/settings')}>
            <Ionicons name="settings-outline" size={22} color={Colors.bone} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color={Colors.bone} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.profileHead} onPress={handlePickAvatar} activeOpacity={0.8}>
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.profileAvatar} />
          ) : (
            <View style={[styles.profileAvatar, styles.profileAvatarPlaceholder]}>
              <Ionicons name="person" size={36} color={Colors.textMuted} />
            </View>
          )}
          <View style={styles.profileEdit}>
            <Ionicons name="camera" size={14} color={Colors.bone} />
          </View>
        </TouchableOpacity>
        <Text style={styles.profileName}>{displayName}</Text>
        {displayUsername ? <Text style={styles.profileHandle}>@{displayUsername}</Text> : null}
        {displayLocation ? (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color={Colors.textSecondary} />
            <Text style={styles.locationText}>{displayLocation}</Text>
          </View>
        ) : null}
        {displayBio ? <Text style={styles.bio}>{displayBio}</Text> : null}

        <TouchableOpacity
          style={styles.friendsLink}
          onPress={() => router.push('/friends')}
        >
          <Ionicons name="people" size={16} color={Colors.burntOrange} />
          <Text style={styles.friendsLinkText}>{friendCount} Friends</Text>
          {pendingCount > 0 && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.statsCard}>
        <View style={styles.statBlock}>
          <Text style={styles.statNum}>{stats.totalMiles < 1000 ? stats.totalMiles.toFixed(1) : (stats.totalMiles / 1000).toFixed(1) + 'k'}</Text>
          <Text style={styles.statBlockLabel}>Total Miles</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={styles.statNum}>{stats.totalRucks}</Text>
          <Text style={styles.statBlockLabel}>Total Rucks</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={styles.statNum}>{stats.weightMoved >= 1000 ? (stats.weightMoved / 1000).toFixed(0) + 'k' : stats.weightMoved}</Text>
          <Text style={styles.statBlockLabel}>lbs Moved</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACHIEVEMENTS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
          {MOCK_ACHIEVEMENTS.map((a) => (
            <AchievementBadge key={a.id} achievement={a} />
          ))}
        </ScrollView>
      </View>

      <View style={[styles.section, { marginTop: 24 }]}>
        <Text style={[styles.sectionTitle, { paddingHorizontal: 20 }]}>COMMUNITIES</Text>
        <View style={styles.communitiesList}>
          {communities.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={32} color={Colors.textMuted} />
              <Text style={styles.emptyStateTitle}>No communities yet</Text>
              <Text style={styles.emptyStateText}>Explore and join communities</Text>
            </View>
          ) : (
            communities.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.communityRow}
                onPress={() => router.push({ pathname: '/community/[id]', params: { id: c.id } })}
              >
                {c.banner ? (
                  <Image source={{ uri: c.banner }} style={styles.communityThumb} />
                ) : (
                  <View style={[styles.communityThumb, { backgroundColor: Colors.forestGreen, alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="people" size={18} color={Colors.bone} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.communityName}>{c.name}</Text>
                  <Text style={styles.communityMeta}>{(c.memberCount || 0).toLocaleString()} members</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>

      <View style={[styles.section, { marginTop: 24 }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { paddingHorizontal: 20 }]}>RUCK HISTORY</Text>
        </View>
        <View style={styles.historyList}>
          {loading ? (
            <ActivityIndicator color={Colors.burntOrange} style={{ marginTop: 20 }} />
          ) : rucks.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="footsteps-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyStateTitle}>No rucks yet</Text>
              <Text style={styles.emptyStateText}>Log your first ruck to see it here</Text>
            </View>
          ) : (
            rucks.map((r) => (
              <RuckHistoryItem key={r.id} ruck={r} />
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.charcoal,
  },
  banner: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  bannerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginBottom: 16,
  },
  profileHead: {
    position: 'relative',
    width: 80,
    marginBottom: 12,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: Colors.burntOrange,
  },
  profileAvatarPlaceholder: {
    backgroundColor: Colors.darkCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileEdit: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.burntOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 26,
    color: Colors.bone,
    marginBottom: 2,
  },
  profileHandle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  locationText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  bio: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  friendsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  friendsLinkText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.bone,
  },
  pendingBadge: {
    backgroundColor: Colors.burntOrange,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  pendingBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.bone,
  },
  statsCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: -16,
    backgroundColor: Colors.darkCard,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 24,
    color: Colors.bone,
  },
  statBlockLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.cardBorder,
  },
  section: {
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  badge: {
    alignItems: 'center',
    width: 72,
  },
  badgeLocked: {
    opacity: 0.45,
  },
  badgeIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.forestGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1.5,
    borderColor: Colors.burntOrange,
  },
  badgeIconLocked: {
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.darkCard,
  },
  badgeTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: Colors.bone,
    textAlign: 'center',
  },
  badgeTitleLocked: {
    color: Colors.textMuted,
  },
  communitiesList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  communityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.darkCard,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  communityThumb: {
    width: 42,
    height: 42,
    borderRadius: 8,
  },
  communityName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.bone,
    marginBottom: 2,
  },
  communityMeta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
  },
  historyList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.darkCard,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.forestGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.bone,
    marginBottom: 2,
  },
  historyMeta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyPace: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 16,
    color: Colors.bone,
  },
  historyPaceLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: Colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyStateTitle: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 18,
    color: Colors.bone,
  },
  emptyStateText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
  },
});
