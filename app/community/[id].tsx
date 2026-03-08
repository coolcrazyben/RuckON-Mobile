import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import {
  MOCK_COMMUNITIES,
  COMMUNITY_FEED,
  COMMUNITY_MEMBERS,
  MOCK_CHALLENGES,
  MOCK_LEADERBOARD,
  type Ruck,
} from '@/data/mockData';

type CommunityTab = 'feed' | 'members' | 'leaderboard' | 'challenges';

function MiniRuckCard({ ruck }: { ruck: Ruck }) {
  return (
    <TouchableOpacity
      style={styles.miniCard}
      onPress={() => router.push({ pathname: '/ruck/[id]', params: { id: ruck.id } })}
      activeOpacity={0.85}
    >
      <View style={styles.miniCardHeader}>
        <Image source={{ uri: ruck.userAvatar }} style={styles.miniAvatar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.miniUserName}>{ruck.userName}</Text>
          <Text style={styles.miniDate}>{ruck.date}</Text>
        </View>
      </View>
      <Image source={{ uri: ruck.photo }} style={styles.miniPhoto} />
      <View style={styles.miniStats}>
        <Text style={styles.miniStat}>{ruck.distance} mi</Text>
        <Text style={styles.miniStatDot}>·</Text>
        <Text style={styles.miniStat}>{ruck.weight} lbs</Text>
        <Text style={styles.miniStatDot}>·</Text>
        <Text style={styles.miniStat}>{ruck.pace}/mi</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function CommunityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const community = MOCK_COMMUNITIES.find((c) => c.id === id) ?? MOCK_COMMUNITIES[0];

  const [activeTab, setActiveTab] = useState<CommunityTab>('feed');
  const [joined, setJoined] = useState(community.isJoined);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={[styles.container]}>
      <View style={styles.bannerContainer}>
        <Image source={{ uri: community.banner }} style={styles.banner} />
        <View style={styles.bannerOverlay} />
        <View style={[styles.backBtn, { top: topPad + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backPress}>
            <Ionicons name="arrow-back" size={20} color={Colors.bone} />
          </TouchableOpacity>
        </View>
        <View style={styles.bannerContent}>
          <Text style={styles.categoryBadge}>{community.category.toUpperCase()}</Text>
          <Text style={styles.communityName}>{community.name}</Text>
          <View style={styles.membersRow}>
            <Ionicons name="people" size={14} color={Colors.textSecondary} />
            <Text style={styles.membersText}>
              {community.memberCount.toLocaleString()} members
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.headerRow}>
        <Text style={styles.description} numberOfLines={2}>
          {community.description}
        </Text>
        <TouchableOpacity
          style={[styles.joinBtn, joined && styles.joinBtnJoined]}
          onPress={() => setJoined((p) => !p)}
        >
          <Text style={[styles.joinBtnText, joined && styles.joinBtnTextJoined]}>
            {joined ? 'Joined' : 'Join'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        {(['feed', 'members', 'leaderboard', 'challenges'] as CommunityTab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, activeTab === t && styles.tabBtnActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 30 }]}
      >
        {activeTab === 'feed' && (
          <View style={styles.tabContent}>
            {COMMUNITY_FEED.map((r) => (
              <MiniRuckCard key={r.id} ruck={r} />
            ))}
          </View>
        )}

        {activeTab === 'members' && (
          <View style={styles.tabContent}>
            {COMMUNITY_MEMBERS.map((member) => (
              <View key={member.id} style={styles.memberRow}>
                <Image source={{ uri: member.avatar }} style={styles.memberAvatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberMeta}>{member.totalMiles} miles · {member.totalRucks} rucks</Text>
                </View>
                <Text style={styles.memberLocation}>{member.location}</Text>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'leaderboard' && (
          <View style={styles.tabContent}>
            <Text style={styles.subTitle}>COMMUNITY LEADERS</Text>
            {MOCK_LEADERBOARD.map((entry) => (
              <View
                key={entry.id}
                style={[styles.lbRow, entry.isCurrentUser && styles.lbRowCurrent]}
              >
                <Text
                  style={[
                    styles.lbRank,
                    entry.rank <= 3 && {
                      color:
                        entry.rank === 1
                          ? Colors.gold
                          : entry.rank === 2
                          ? Colors.silver
                          : Colors.bronze,
                    },
                  ]}
                >
                  {entry.rank}
                </Text>
                <Image source={{ uri: entry.avatar }} style={styles.lbAvatar} />
                <Text style={styles.lbName}>
                  {entry.name} {entry.isCurrentUser ? '(you)' : ''}
                </Text>
                <Text style={styles.lbStat}>{entry.distance} mi</Text>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'challenges' && (
          <View style={styles.tabContent}>
            {MOCK_CHALLENGES.map((ch) => (
              <View key={ch.id} style={styles.challengeCard}>
                <View style={styles.challengeTop}>
                  <View style={styles.challengeIconWrap}>
                    <Ionicons name="flash" size={18} color={Colors.burntOrange} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.challengeTitle}>{ch.title}</Text>
                    <Text style={styles.challengeMeta}>Ends {ch.endDate}</Text>
                  </View>
                  <TouchableOpacity style={styles.challengeJoinBtn}>
                    <Text style={styles.challengeJoinText}>
                      {ch.isJoined ? 'Joined' : 'Join'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.challengeDesc}>{ch.description}</Text>
                <View style={styles.challengeFooter}>
                  <Ionicons name="people-outline" size={13} color={Colors.textMuted} />
                  <Text style={styles.challengeParticipants}>
                    {ch.participants.toLocaleString()} participating
                  </Text>
                  <View style={styles.challengeGoalBadge}>
                    <Text style={styles.challengeGoalText}>{ch.goal}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.charcoal,
  },
  bannerContainer: {
    height: 200,
    position: 'relative',
  },
  banner: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,20,16,0.6)',
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
  },
  backPress: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15,20,16,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerContent: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  categoryBadge: {
    fontFamily: 'Oswald_500Medium',
    fontSize: 10,
    color: Colors.burntOrange,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  communityName: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 26,
    color: Colors.bone,
    marginBottom: 4,
  },
  membersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  membersText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  description: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  joinBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: Colors.burntOrange,
    borderRadius: 8,
  },
  joinBtnJoined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.textMuted,
  },
  joinBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.bone,
  },
  joinBtnTextJoined: {
    color: Colors.textMuted,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: Colors.forestGreen,
  },
  tabText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.bone,
    fontFamily: 'Inter_600SemiBold',
  },
  scroll: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
    gap: 12,
  },
  miniCard: {
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  miniCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  miniAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.mossGreen,
  },
  miniUserName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.bone,
  },
  miniDate: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
  },
  miniPhoto: {
    width: '100%',
    height: 150,
  },
  miniStats: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 6,
  },
  miniStat: {
    fontFamily: 'Oswald_500Medium',
    fontSize: 14,
    color: Colors.bone,
  },
  miniStatDot: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textMuted,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.darkCard,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: Colors.mossGreen,
  },
  memberName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.bone,
    marginBottom: 2,
  },
  memberMeta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
  memberLocation: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
  },
  subTitle: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.darkCard,
  },
  lbRowCurrent: {
    backgroundColor: Colors.forestGreen,
    borderColor: Colors.mossGreen,
  },
  lbRank: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 18,
    color: Colors.textMuted,
    width: 24,
    textAlign: 'center',
  },
  lbAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  lbName: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.bone,
  },
  lbStat: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 16,
    color: Colors.bone,
  },
  challengeCard: {
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 10,
  },
  challengeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  challengeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.forestGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.bone,
  },
  challengeMeta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  challengeJoinBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor: Colors.burntOrange,
    borderRadius: 8,
  },
  challengeJoinText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.bone,
  },
  challengeDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  challengeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  challengeParticipants: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
    flex: 1,
  },
  challengeGoalBadge: {
    backgroundColor: Colors.forestGreen,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  challengeGoalText: {
    fontFamily: 'Oswald_500Medium',
    fontSize: 11,
    color: Colors.bone,
  },
});
