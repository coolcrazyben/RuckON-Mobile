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
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getApiUrl } from '@/lib/query-client';

interface CommunityDetail {
  id: string;
  name: string;
  description: string | null;
  memberCount: number | null;
  banner: string | null;
  category: string | null;
  location: string | null;
  createdBy: string | null;
  creatorName: string | null;
}

interface MemberData {
  id: string;
  name: string | null;
  username: string;
  avatar: string | null;
  location: string | null;
  joinedAt: string | null;
  role: string;
}

interface FeedItem {
  type: 'ruck' | 'post';
  id: string;
  userId: string;
  userName: string | null;
  userAvatar: string | null;
  createdAt: string | null;
  distance?: number | null;
  durationSeconds?: number | null;
  weight?: number | null;
  notes?: string | null;
  postType?: string;
  content?: string | null;
  referenceId?: string | null;
}

interface LeaderboardEntry {
  userId: string;
  name: string | null;
  username: string;
  avatar: string | null;
  totalDistance: number;
  totalWeight: number;
}

interface ChallengeData {
  id: string;
  communityId: string;
  title: string;
  description: string | null;
  challengeType: string;
  goalValue: number;
  goalUnit: string;
  endDate: string;
  createdBy: string;
  participantCount: number;
  isJoined?: boolean;
}

type CommunityTab = 'feed' | 'members' | 'leaderboard' | 'challenges';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function MiniRuckCard({ item, onChallengePress }: { item: FeedItem; onChallengePress?: (referenceId: string) => void }) {
  if (item.type === 'post') {
    const isTappable = !!item.referenceId && (item.postType === 'challenge_announcement' || item.postType === 'ruck_share');
    const Wrapper = isTappable ? TouchableOpacity : View;
    const wrapperProps = isTappable
      ? { onPress: () => item.referenceId && onChallengePress?.(item.referenceId), activeOpacity: 0.8 }
      : {};
    return (
      <Wrapper style={styles.announcementCard} {...(wrapperProps as any)}>
        <View style={styles.miniCardHeader}>
          {item.userAvatar ? (
            <Image source={{ uri: item.userAvatar }} style={styles.miniAvatar} />
          ) : (
            <View style={[styles.miniAvatar, { backgroundColor: Colors.forestGreen, alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="person" size={14} color={Colors.bone} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.miniUserName}>{item.userName || 'Unknown'}</Text>
            {item.createdAt && <Text style={styles.miniDate}>{formatTimeAgo(item.createdAt)}</Text>}
          </View>
          <View style={styles.announcementBadge}>
            <Ionicons name={item.postType === 'ruck_share' ? 'share-outline' : 'flash'} size={12} color={Colors.burntOrange} />
            <Text style={styles.announcementBadgeText}>{item.postType === 'ruck_share' ? 'Shared' : 'Challenge'}</Text>
          </View>
        </View>
        {item.content && (
          <Text style={styles.announcementContent}>{item.content}</Text>
        )}
      </Wrapper>
    );
  }

  const distMiles = (item.distance || 0) / 100;
  return (
    <View style={styles.miniCard}>
      <View style={styles.miniCardHeader}>
        {item.userAvatar ? (
          <Image source={{ uri: item.userAvatar }} style={styles.miniAvatar} />
        ) : (
          <View style={[styles.miniAvatar, { backgroundColor: Colors.forestGreen, alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="person" size={14} color={Colors.bone} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.miniUserName}>{item.userName || 'Unknown'}</Text>
          {item.createdAt && <Text style={styles.miniDate}>{formatTimeAgo(item.createdAt)}</Text>}
        </View>
      </View>
      {item.notes && (
        <Text style={styles.miniNotes} numberOfLines={2}>{item.notes}</Text>
      )}
      <View style={styles.miniStats}>
        <View style={styles.miniStatItem}>
          <Ionicons name="navigate-outline" size={13} color={Colors.burntOrange} />
          <Text style={styles.miniStat}>{distMiles.toFixed(1)} mi</Text>
        </View>
        {item.weight && item.weight > 0 && (
          <View style={styles.miniStatItem}>
            <Ionicons name="barbell-outline" size={13} color={Colors.burntOrange} />
            <Text style={styles.miniStat}>{item.weight} lbs</Text>
          </View>
        )}
        {item.durationSeconds && item.durationSeconds > 0 && (
          <View style={styles.miniStatItem}>
            <Ionicons name="time-outline" size={13} color={Colors.burntOrange} />
            <Text style={styles.miniStat}>{formatDuration(item.durationSeconds)}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function PinnedChallengeCard({ challenge, isJoined, onToggleJoin, onPress }: { challenge: ChallengeData; isJoined: boolean; onToggleJoin: () => void; onPress: () => void }) {
  const endDate = new Date(challenge.endDate);
  const isExpired = endDate < new Date();
  if (isExpired) return null;

  return (
    <TouchableOpacity style={styles.pinnedChallenge} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.pinnedHeader}>
        <View style={styles.pinnedIconWrap}>
          <Ionicons
            name={challenge.challengeType === 'distance' ? 'navigate' : challenge.challengeType === 'weight' ? 'barbell' : 'footsteps'}
            size={16}
            color={Colors.burntOrange}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.pinnedTitle}>{challenge.title}</Text>
          <Text style={styles.pinnedMeta}>
            {challenge.goalValue} {challenge.goalUnit} · {challenge.participantCount} joined · Ends {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.pinnedJoinBtn, isJoined && styles.pinnedJoinBtnJoined]}
          onPress={onToggleJoin}
        >
          <Text style={[styles.pinnedJoinText, isJoined && styles.pinnedJoinTextJoined]}>
            {isJoined ? 'Joined' : 'Join'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function CommunityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();

  const [community, setCommunity] = useState<CommunityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<CommunityTab>('feed');
  const [joined, setJoined] = useState(false);
  const [joiningLoading, setJoiningLoading] = useState(false);

  const [members, setMembers] = useState<MemberData[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersLoaded, setMembersLoaded] = useState(false);

  const [feed, setFeed] = useState<FeedItem[]>([]);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(false);
  const [lbLoaded, setLbLoaded] = useState(false);

  const [challengeList, setChallengeList] = useState<ChallengeData[]>([]);
  const [joinedChallengeIds, setJoinedChallengeIds] = useState<Set<string>>(new Set());
  const [friendStatuses, setFriendStatuses] = useState<Record<string, { status: string; friendshipId?: string; direction?: string }>>({});

  const baseUrl = (() => {
    try { return getApiUrl(); } catch { return null; }
  })();

  const isCreator = community?.createdBy === user?.id;

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const fetchDetail = useCallback(async () => {
    if (!baseUrl || !id) return;
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${baseUrl}api/communities/${id}/detail`, { headers });
      if (res.ok) {
        const data = await res.json();
        setCommunity(data.community);
        setJoined(data.joined);
        setFeed(data.feed);
        setChallengeList(data.challenges);
        const joinedIds = new Set<string>();
        for (const ch of data.challenges) {
          if (ch.isJoined) joinedIds.add(ch.id);
        }
        setJoinedChallengeIds(joinedIds);
      }
    } catch {}
    setLoading(false);
  }, [baseUrl, id, token]);

  const fetchMembers = useCallback(async () => {
    if (!baseUrl || !id) return;
    setMembersLoading(true);
    try {
      const res = await fetch(`${baseUrl}api/communities/${id}/members`);
      if (res.ok) {
        const memberData = await res.json();
        setMembers(memberData);
        if (token && user) {
          const statuses: Record<string, { status: string; friendshipId?: string; direction?: string }> = {};
          const otherMembers = memberData.filter((m: MemberData) => m.id !== user.id);
          await Promise.all(otherMembers.map(async (m: MemberData) => {
            try {
              const statusRes = await fetch(`${baseUrl}api/friends/status/${m.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (statusRes.ok) statuses[m.id] = await statusRes.json();
            } catch {}
          }));
          setFriendStatuses(statuses);
        }
      }
    } catch {}
    setMembersLoading(false);
    setMembersLoaded(true);
  }, [baseUrl, id, token, user]);

  const fetchLeaderboard = useCallback(async () => {
    if (!baseUrl || !id) return;
    setLbLoading(true);
    try {
      const res = await fetch(`${baseUrl}api/communities/${id}/leaderboard`);
      if (res.ok) setLeaderboard(await res.json());
    } catch {}
    setLbLoading(false);
    setLbLoaded(true);
  }, [baseUrl, id]);

  useFocusEffect(
    useCallback(() => {
      setMembersLoaded(false);
      setLbLoaded(false);
      fetchDetail();
    }, [fetchDetail])
  );

  const handleTabChange = (tab: CommunityTab) => {
    setActiveTab(tab);
    if (tab === 'members' && !membersLoaded) fetchMembers();
    if (tab === 'leaderboard' && !lbLoaded) fetchLeaderboard();
  };

  const toggleJoin = async () => {
    if (!baseUrl || !token || joiningLoading) return;
    const endpoint = joined ? 'leave' : 'join';
    setJoiningLoading(true);
    try {
      const res = await fetch(`${baseUrl}api/communities/${id}/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setJoined(!joined);
        fetchDetail();
        if (membersLoaded) fetchMembers();
      }
    } catch {}
    setJoiningLoading(false);
  };

  const handleKickMember = (memberId: string, memberName: string | null) => {
    Alert.alert(
      'Remove Member',
      `Remove ${memberName || 'this member'} from the community?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!baseUrl || !token) return;
            try {
              const res = await fetch(`${baseUrl}api/communities/${id}/members/${memberId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                fetchMembers();
                fetchDetail();
              }
            } catch {}
          },
        },
      ],
    );
  };

  const handleSendFriendRequest = async (memberId: string) => {
    if (!baseUrl || !token) return;
    try {
      const res = await fetch(`${baseUrl}api/friends/request`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresseeId: memberId }),
      });
      if (res.ok) {
        setFriendStatuses(prev => ({ ...prev, [memberId]: { status: 'pending', direction: 'sent' } }));
      }
    } catch {}
  };

  const handleAcceptFriendFromList = async (memberId: string) => {
    const fs = friendStatuses[memberId];
    if (!baseUrl || !token || !fs?.friendshipId) return;
    try {
      const res = await fetch(`${baseUrl}api/friends/${fs.friendshipId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setFriendStatuses(prev => ({ ...prev, [memberId]: { status: 'accepted' } }));
      }
    } catch {}
  };

  const handleDeclineFriendFromList = async (memberId: string) => {
    const fs = friendStatuses[memberId];
    if (!baseUrl || !token || !fs?.friendshipId) return;
    try {
      const res = await fetch(`${baseUrl}api/friends/${fs.friendshipId}/decline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setFriendStatuses(prev => ({ ...prev, [memberId]: { status: 'none' } }));
      }
    } catch {}
  };

  const toggleChallengeJoin = async (challengeId: string) => {
    if (!baseUrl || !token) return;
    const isJoined = joinedChallengeIds.has(challengeId);
    const endpoint = isJoined ? 'leave' : 'join';
    try {
      const res = await fetch(`${baseUrl}api/challenges/${challengeId}/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setJoinedChallengeIds(prev => {
          const next = new Set(prev);
          if (isJoined) next.delete(challengeId);
          else next.add(challengeId);
          return next;
        });
        setChallengeList(prev => prev.map(ch =>
          ch.id === challengeId
            ? { ...ch, participantCount: ch.participantCount + (isJoined ? -1 : 1) }
            : ch
        ));
      }
    } catch {}
  };

  const activeChallenges = challengeList.filter(ch => new Date(ch.endDate) >= new Date());

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: topPad + 40 }]}>
        <ActivityIndicator color={Colors.burntOrange} size="large" />
      </View>
    );
  }

  if (!community) {
    return (
      <View style={[styles.container, { paddingTop: topPad + 40, alignItems: 'center' }]}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
        <Text style={[styles.communityName, { fontSize: 18, marginTop: 12 }]}>Community not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: Colors.burntOrange, fontFamily: 'Inter_600SemiBold', fontSize: 15 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.bannerContainer}>
        {community.banner ? (
          <Image source={{ uri: community.banner }} style={styles.banner} />
        ) : (
          <View style={[styles.banner, { backgroundColor: Colors.forestGreen }]} />
        )}
        <View style={styles.bannerOverlay} />
        <View style={[styles.backBtn, { top: topPad + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backPress}>
            <Ionicons name="arrow-back" size={20} color={Colors.bone} />
          </TouchableOpacity>
        </View>
        {isCreator && (
          <View style={[styles.editBtn, { top: topPad + 8 }]}>
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/edit-community', params: { communityId: id } })}
              style={styles.backPress}
            >
              <Ionicons name="pencil" size={18} color={Colors.bone} />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.bannerContent}>
          {community.category && (
            <Text style={styles.categoryBadge}>{community.category.toUpperCase()}</Text>
          )}
          <Text style={styles.communityName}>{community.name}</Text>
          <View style={styles.membersRow}>
            <Ionicons name="people" size={14} color={Colors.textSecondary} />
            <Text style={styles.membersText}>
              {(community.memberCount || 0).toLocaleString()} members
            </Text>
            {community.location && (
              <>
                <Text style={styles.membersText}> · </Text>
                <Ionicons name="location" size={12} color={Colors.textSecondary} />
                <Text style={styles.membersText}>{community.location}</Text>
              </>
            )}
          </View>
        </View>
      </View>

      <View style={styles.headerRow}>
        <Text style={styles.description} numberOfLines={2}>
          {community.description}
        </Text>
        <TouchableOpacity
          style={[styles.joinBtn, joined && styles.joinBtnJoined]}
          onPress={toggleJoin}
          disabled={joiningLoading}
        >
          {joiningLoading ? (
            <ActivityIndicator size="small" color={Colors.bone} />
          ) : (
            <Text style={[styles.joinBtnText, joined && styles.joinBtnTextJoined]}>
              {joined ? 'Joined' : 'Join'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        {(['feed', 'members', 'leaderboard', 'challenges'] as CommunityTab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, activeTab === t && styles.tabBtnActive]}
            onPress={() => handleTabChange(t)}
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
            {activeChallenges.length > 0 && (
              <View style={styles.pinnedSection}>
                <Text style={styles.pinnedLabel}>ACTIVE CHALLENGES</Text>
                {activeChallenges.map(ch => (
                  <PinnedChallengeCard
                    key={ch.id}
                    challenge={ch}
                    isJoined={joinedChallengeIds.has(ch.id)}
                    onToggleJoin={() => toggleChallengeJoin(ch.id)}
                    onPress={() => router.push(`/challenge/${ch.id}`)}
                  />
                ))}
              </View>
            )}
            {feed.length === 0 ? (
              <View style={styles.emptyTab}>
                <Ionicons name="newspaper-outline" size={36} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No activity yet from community members</Text>
              </View>
            ) : (
              feed.map((item) => (
                <MiniRuckCard
                  key={item.id}
                  item={item}
                  onChallengePress={(refId) => {
                    if (item.type === 'post' && item.postType === 'challenge_announcement') {
                      router.push(`/challenge/${refId}`);
                    } else if (item.type === 'post' && item.postType === 'ruck_share') {
                      router.push(`/ruck/${refId}`);
                    }
                  }}
                />
              ))
            )}
          </View>
        )}

        {activeTab === 'members' && (
          <View style={styles.tabContent}>
            {membersLoading ? (
              <ActivityIndicator color={Colors.burntOrange} style={{ marginTop: 30 }} />
            ) : members.length === 0 ? (
              <View style={styles.emptyTab}>
                <Ionicons name="people-outline" size={36} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No members yet</Text>
              </View>
            ) : (
              members.map((member) => (
                <View key={member.id} style={styles.memberRow}>
                  <TouchableOpacity
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                    onPress={() => {
                      if (member.id !== user?.id) {
                        router.push({ pathname: '/user-profile', params: { userId: member.id } });
                      }
                    }}
                  >
                    {member.avatar ? (
                      <Image source={{ uri: member.avatar }} style={styles.memberAvatar} />
                    ) : (
                      <View style={[styles.memberAvatar, { backgroundColor: Colors.forestGreen, alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="person" size={18} color={Colors.bone} />
                      </View>
                    )}
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.memberName}>{member.name || member.username}</Text>
                        {member.role === 'creator' && (
                          <View style={styles.creatorBadge}>
                            <Text style={styles.creatorBadgeText}>Creator</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.memberMeta}>@{member.username}</Text>
                    </View>
                  </TouchableOpacity>
                  {member.id !== user?.id && token && (() => {
                    const fs = friendStatuses[member.id];
                    if (!fs || fs.status === 'none') {
                      return (
                        <TouchableOpacity style={styles.memberFriendBtn} onPress={() => handleSendFriendRequest(member.id)}>
                          <Ionicons name="person-add-outline" size={14} color={Colors.burntOrange} />
                        </TouchableOpacity>
                      );
                    }
                    if (fs.status === 'pending' && fs.direction === 'received') {
                      return (
                        <View style={styles.memberFriendRow}>
                          <TouchableOpacity style={[styles.memberFriendBtn, styles.memberFriendBtnAccept]} onPress={() => handleAcceptFriendFromList(member.id)}>
                            <Ionicons name="checkmark" size={14} color={Colors.bone} />
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.memberFriendBtn, styles.memberFriendBtnPending]} onPress={() => handleDeclineFriendFromList(member.id)}>
                            <Ionicons name="close" size={14} color={Colors.textMuted} />
                          </TouchableOpacity>
                        </View>
                      );
                    }
                    if (fs.status === 'pending') {
                      return (
                        <View style={[styles.memberFriendBtn, styles.memberFriendBtnPending]}>
                          <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                        </View>
                      );
                    }
                    if (fs.status === 'accepted') {
                      return (
                        <View style={[styles.memberFriendBtn, styles.memberFriendBtnFriend]}>
                          <Ionicons name="people" size={14} color={Colors.mossGreen} />
                        </View>
                      );
                    }
                    return null;
                  })()}
                  {isCreator && member.role !== 'creator' && (
                    <TouchableOpacity
                      style={styles.kickBtn}
                      onPress={() => handleKickMember(member.id, member.name)}
                    >
                      <Ionicons name="remove-circle-outline" size={20} color={Colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'leaderboard' && (
          <View style={styles.tabContent}>
            <Text style={styles.subTitle}>COMMUNITY LEADERS</Text>
            {lbLoading ? (
              <ActivityIndicator color={Colors.burntOrange} style={{ marginTop: 30 }} />
            ) : leaderboard.length === 0 ? (
              <View style={styles.emptyTab}>
                <Ionicons name="trophy-outline" size={36} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No ruck data yet</Text>
              </View>
            ) : (
              leaderboard.map((entry, idx) => {
                const rank = idx + 1;
                const isCurrent = entry.userId === user?.id;
                return (
                  <View
                    key={entry.userId}
                    style={[styles.lbRow, isCurrent && styles.lbRowCurrent]}
                  >
                    <Text
                      style={[
                        styles.lbRank,
                        rank <= 3 && {
                          color:
                            rank === 1 ? Colors.gold : rank === 2 ? Colors.silver : Colors.bronze,
                        },
                      ]}
                    >
                      {rank}
                    </Text>
                    {entry.avatar ? (
                      <Image source={{ uri: entry.avatar }} style={styles.lbAvatar} />
                    ) : (
                      <View style={[styles.lbAvatar, { backgroundColor: Colors.forestGreen, alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="person" size={14} color={Colors.bone} />
                      </View>
                    )}
                    <Text style={styles.lbName}>
                      {entry.name || entry.username} {isCurrent ? '(you)' : ''}
                    </Text>
                    <Text style={styles.lbStat}>{(entry.totalDistance / 100).toFixed(1)} mi</Text>
                  </View>
                );
              })
            )}
          </View>
        )}

        {activeTab === 'challenges' && (
          <View style={styles.tabContent}>
            {isCreator && (
              <TouchableOpacity
                style={styles.createChallengeBtn}
                onPress={() => router.push({ pathname: '/create-challenge', params: { communityId: id } })}
              >
                <Ionicons name="add-circle" size={20} color={Colors.bone} />
                <Text style={styles.createChallengeBtnText}>Create Challenge</Text>
              </TouchableOpacity>
            )}
            {challengeList.length === 0 ? (
              <View style={styles.emptyTab}>
                <Ionicons name="flash-outline" size={36} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No challenges yet</Text>
                {isCreator && (
                  <Text style={[styles.emptyText, { fontSize: 12, marginTop: 4 }]}>
                    Create the first challenge for your community!
                  </Text>
                )}
              </View>
            ) : (
              challengeList.map((ch) => {
                const isJoinedCh = joinedChallengeIds.has(ch.id);
                const endDate = new Date(ch.endDate);
                const isExpired = endDate < new Date();
                return (
                  <TouchableOpacity key={ch.id} style={styles.challengeCard} onPress={() => router.push(`/challenge/${ch.id}`)} activeOpacity={0.8}>
                    <View style={styles.challengeTop}>
                      <View style={styles.challengeIconWrap}>
                        <Ionicons
                          name={ch.challengeType === 'distance' ? 'navigate' : ch.challengeType === 'weight' ? 'barbell' : 'footsteps'}
                          size={18}
                          color={Colors.burntOrange}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.challengeTitle}>{ch.title}</Text>
                        <Text style={styles.challengeMeta}>
                          {isExpired ? 'Ended' : 'Ends'} {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                      </View>
                      {!isExpired && (
                        <TouchableOpacity
                          style={[styles.challengeJoinBtn, isJoinedCh && styles.challengeJoinBtnJoined]}
                          onPress={() => toggleChallengeJoin(ch.id)}
                        >
                          <Text style={[styles.challengeJoinText, isJoinedCh && styles.challengeJoinTextJoined]}>
                            {isJoinedCh ? 'Joined' : 'Join'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {ch.description && <Text style={styles.challengeDesc}>{ch.description}</Text>}
                    <View style={styles.challengeFooter}>
                      <Ionicons name="people-outline" size={13} color={Colors.textMuted} />
                      <Text style={styles.challengeParticipants}>
                        {ch.participantCount} participating
                      </Text>
                      <View style={styles.challengeGoalBadge}>
                        <Text style={styles.challengeGoalText}>
                          {ch.goalValue} {ch.goalUnit}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
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
  editBtn: {
    position: 'absolute',
    right: 16,
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
    minWidth: 70,
    alignItems: 'center',
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
  emptyTab: {
    alignItems: 'center',
    paddingTop: 40,
    gap: 8,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  pinnedSection: {
    gap: 8,
    marginBottom: 8,
  },
  pinnedLabel: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 11,
    color: Colors.burntOrange,
    letterSpacing: 1.5,
  },
  pinnedChallenge: {
    backgroundColor: Colors.forestGreen,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.mossGreen,
  },
  pinnedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pinnedIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(196,98,45,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinnedTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.bone,
  },
  pinnedMeta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  pinnedJoinBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    backgroundColor: Colors.burntOrange,
    borderRadius: 6,
  },
  pinnedJoinBtnJoined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.textMuted,
  },
  pinnedJoinText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.bone,
  },
  pinnedJoinTextJoined: {
    color: Colors.textMuted,
  },
  announcementCard: {
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.burntOrange,
    padding: 12,
    gap: 8,
  },
  announcementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(196,98,45,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  announcementBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: Colors.burntOrange,
  },
  announcementContent: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.bone,
    lineHeight: 18,
  },
  miniCard: {
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 12,
    gap: 8,
  },
  miniCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
  miniNotes: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  miniStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  miniStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniStat: {
    fontFamily: 'Oswald_500Medium',
    fontSize: 14,
    color: Colors.bone,
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
  },
  memberMeta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  memberLocation: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
  },
  creatorBadge: {
    backgroundColor: Colors.burntOrange,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  creatorBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9,
    color: Colors.bone,
    letterSpacing: 0.5,
  },
  kickBtn: {
    padding: 6,
  },
  memberFriendBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.burntOrange,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  memberFriendBtnAccept: {
    backgroundColor: Colors.burntOrange,
    borderColor: Colors.burntOrange,
  },
  memberFriendBtnPending: {
    borderColor: Colors.cardBorder,
  },
  memberFriendBtnFriend: {
    borderColor: Colors.mossGreen,
  },
  memberFriendRow: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: 8,
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
  createChallengeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.burntOrange,
    borderRadius: 10,
    paddingVertical: 12,
  },
  createChallengeBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
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
  challengeJoinBtnJoined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.textMuted,
  },
  challengeJoinText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.bone,
  },
  challengeJoinTextJoined: {
    color: Colors.textMuted,
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
