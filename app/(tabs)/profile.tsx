import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import {
  MOCK_USERS,
  MOCK_RUCKS,
  MOCK_ACHIEVEMENTS,
  MOCK_COMMUNITIES,
  type Achievement,
  type Ruck,
} from '@/data/mockData';

const ME = MOCK_USERS.find((u) => u.id === 'me')!;
const MY_RUCKS = MOCK_RUCKS.filter((r) => r.userId === 'me');
const MY_COMMUNITIES = MOCK_COMMUNITIES.filter((c) => c.isJoined);

function AchievementBadge({ achievement }: { achievement: Achievement }) {
  return (
    <View style={[styles.badge, !achievement.earned && styles.badgeLocked]}>
      <View style={[styles.badgeIcon, !achievement.earned && styles.badgeIconLocked]}>
        <Ionicons
          name={achievement.icon as any}
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

function RuckHistoryItem({ ruck }: { ruck: Ruck }) {
  return (
    <TouchableOpacity
      style={styles.historyItem}
      onPress={() => router.push({ pathname: '/ruck/[id]', params: { id: ruck.id } })}
      activeOpacity={0.8}
    >
      <View style={styles.historyLeft}>
        <View style={styles.historyIconWrap}>
          <Ionicons name="walk" size={18} color={Colors.burntOrange} />
        </View>
        <View>
          <Text style={styles.historyTitle}>{ruck.distance} mi · {ruck.weight} lbs</Text>
          <Text style={styles.historyMeta}>{ruck.date} · {ruck.duration}</Text>
        </View>
      </View>
      <View style={styles.historyRight}>
        <Text style={styles.historyPace}>{ruck.pace}</Text>
        <Text style={styles.historyPaceLabel}>min/mi</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

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
          <TouchableOpacity>
            <Ionicons name="settings-outline" size={22} color={Colors.bone} />
          </TouchableOpacity>
          <TouchableOpacity>
            <Ionicons name="share-outline" size={22} color={Colors.bone} />
          </TouchableOpacity>
        </View>
        <View style={styles.profileHead}>
          <Image source={{ uri: ME.avatar }} style={styles.profileAvatar} />
          <View style={styles.profileEdit}>
            <Ionicons name="pencil" size={14} color={Colors.bone} />
          </View>
        </View>
        <Text style={styles.profileName}>{ME.name}</Text>
        <Text style={styles.profileHandle}>@{ME.username}</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={13} color={Colors.textSecondary} />
          <Text style={styles.locationText}>{ME.location}</Text>
        </View>
        <Text style={styles.bio}>{ME.bio}</Text>
      </LinearGradient>

      <View style={styles.statsCard}>
        <View style={styles.statBlock}>
          <Text style={styles.statNum}>{ME.totalMiles.toLocaleString()}</Text>
          <Text style={styles.statBlockLabel}>Total Miles</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={styles.statNum}>{ME.totalRucks}</Text>
          <Text style={styles.statBlockLabel}>Total Rucks</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={styles.statNum}>{(ME.weightMoved / 1000).toFixed(0)}k</Text>
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
          {MY_COMMUNITIES.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={styles.communityRow}
              onPress={() => router.push({ pathname: '/community/[id]', params: { id: c.id } })}
            >
              <Image source={{ uri: c.banner }} style={styles.communityThumb} />
              <View style={{ flex: 1 }}>
                <Text style={styles.communityName}>{c.name}</Text>
                <Text style={styles.communityMeta}>{c.memberCount.toLocaleString()} members</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.section, { marginTop: 24 }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { paddingHorizontal: 20 }]}>RUCK HISTORY</Text>
          <Text style={styles.seeAll}>See all</Text>
        </View>
        <View style={styles.historyList}>
          {MY_RUCKS.map((r) => (
            <RuckHistoryItem key={r.id} ruck={r} />
          ))}
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
  seeAll: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.burntOrange,
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
});
