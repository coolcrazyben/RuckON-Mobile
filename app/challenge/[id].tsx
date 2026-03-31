import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getApiUrl } from '@/lib/query-client';

interface ChallengeDetail {
  id: string;
  communityId: string;
  title: string;
  description: string | null;
  challengeType: string;
  goalValue: number;
  goalUnit: string;
  startDate: string;
  endDate: string;
  createdBy: string;
  communityName: string;
  communityBanner: string | null;
  participantCount: number;
  isJoined: boolean;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysRemaining(endDate: string): number {
  const now = new Date();
  const end = new Date(endDate);
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

function getChallengeIcon(type: string): string {
  switch (type) {
    case 'distance': return 'navigate';
    case 'weight': return 'barbell';
    case 'rucks': return 'footsteps';
    default: return 'trophy';
  }
}

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const baseUrl = (() => {
    try { return getApiUrl(); } catch { return null; }
  })();

  const fetchChallenge = useCallback(async () => {
    if (!baseUrl || !id) return;
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${baseUrl}api/challenges/${id}`, { headers });
      if (res.ok) {
        setChallenge(await res.json());
      }
    } catch {}
    setLoading(false);
  }, [baseUrl, id, token]);

  useEffect(() => { fetchChallenge(); }, [fetchChallenge]);

  const handleJoinLeave = async () => {
    if (!baseUrl || !token || !challenge || joining) return;
    setJoining(true);
    const endpoint = challenge.isJoined ? 'leave' : 'join';
    try {
      const res = await fetch(`${baseUrl}api/challenges/${challenge.id}/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setChallenge({
          ...challenge,
          isJoined: !challenge.isJoined,
          participantCount: challenge.participantCount + (challenge.isJoined ? -1 : 1),
        });
      }
    } catch {}
    setJoining(false);
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const isActive = challenge ? daysRemaining(challenge.endDate) > 0 : false;

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.burntOrange} />
        </View>
      </View>
    );
  }

  if (!challenge) {
    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.bone} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingWrap}>
          <Text style={styles.emptyText}>Challenge not found</Text>
        </View>
      </View>
    );
  }

  const days = daysRemaining(challenge.endDate);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.bone} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>CHALLENGE</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <Ionicons name={getChallengeIcon(challenge.challengeType) as any} size={40} color={Colors.burntOrange} />
          </View>
          <Text style={styles.challengeTitle}>{challenge.title}</Text>
          <TouchableOpacity onPress={() => router.push(`/community/${challenge.communityId}`)}>
            <Text style={styles.communityLink}>{challenge.communityName}</Text>
          </TouchableOpacity>

          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: isActive ? Colors.success : Colors.textMuted }]} />
            <Text style={[styles.statusText, { color: isActive ? Colors.success : Colors.textMuted }]}>
              {isActive ? `${days} day${days !== 1 ? 's' : ''} remaining` : 'Completed'}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="trophy-outline" size={20} color={Colors.burntOrange} />
            <Text style={styles.statValue}>{challenge.goalValue}</Text>
            <Text style={styles.statLabel}>{challenge.goalUnit}</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="people-outline" size={20} color={Colors.burntOrange} />
            <Text style={styles.statValue}>{challenge.participantCount}</Text>
            <Text style={styles.statLabel}>Participants</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="calendar-outline" size={20} color={Colors.burntOrange} />
            <Text style={styles.statValue}>{days}</Text>
            <Text style={styles.statLabel}>Days Left</Text>
          </View>
        </View>

        {challenge.description && (
          <View style={styles.descCard}>
            <Text style={styles.descLabel}>ABOUT</Text>
            <Text style={styles.descText}>{challenge.description}</Text>
          </View>
        )}

        <View style={styles.dateCard}>
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>Start</Text>
            <Text style={styles.dateValue}>{formatDate(challenge.startDate)}</Text>
          </View>
          <View style={styles.dateDivider} />
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>End</Text>
            <Text style={styles.dateValue}>{formatDate(challenge.endDate)}</Text>
          </View>
        </View>

        {token && isActive && (
          <TouchableOpacity
            style={[styles.joinBtn, challenge.isJoined && styles.joinBtnJoined]}
            onPress={handleJoinLeave}
            disabled={joining}
          >
            <Ionicons
              name={challenge.isJoined ? 'checkmark-circle' : 'flash'}
              size={20}
              color={Colors.bone}
            />
            <Text style={styles.joinBtnText}>
              {joining ? 'Loading...' : challenge.isJoined ? 'Joined' : 'Join Challenge'}
            </Text>
          </TouchableOpacity>
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
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: Colors.textMuted,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'Oswald_700Bold',
    fontSize: 20,
    color: Colors.bone,
    letterSpacing: 3,
    textAlign: 'center',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: Colors.darkCard,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 16,
  },
  heroIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.forestGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.mossGreen,
  },
  challengeTitle: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 24,
    color: Colors.bone,
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 6,
  },
  communityLink: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.burntOrange,
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.forestGreen,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: 'Oswald_500Medium',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 4,
  },
  statValue: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 22,
    color: Colors.bone,
  },
  statLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  descCard: {
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 16,
  },
  descLabel: {
    fontFamily: 'Oswald_500Medium',
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  descText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.bone,
    lineHeight: 20,
  },
  dateCard: {
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 20,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateLabel: {
    fontFamily: 'Oswald_500Medium',
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  dateValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.bone,
  },
  dateDivider: {
    height: 1,
    backgroundColor: Colors.cardBorder,
    marginVertical: 10,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.burntOrange,
    borderRadius: 14,
    paddingVertical: 18,
  },
  joinBtnJoined: {
    backgroundColor: Colors.forestGreen,
    borderWidth: 1,
    borderColor: Colors.mossGreen,
  },
  joinBtnText: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 18,
    color: Colors.bone,
    letterSpacing: 2,
  },
});
