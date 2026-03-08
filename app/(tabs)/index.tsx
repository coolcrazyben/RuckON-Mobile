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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { MOCK_RUCKS, type Ruck } from '@/data/mockData';

const ANNOUNCEMENT = {
  id: 'ann1',
  title: 'March Miles Challenge',
  body: 'Ruck 50 miles this month. 1,847 members participating. Join the challenge now!',
};

function RuckCard({ ruck }: { ruck: Ruck }) {
  const [liked, setLiked] = useState(ruck.liked);
  const [likeCount, setLikeCount] = useState(ruck.likes);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleLike = () => {
    scale.value = withSpring(1.3, { damping: 3 }, () => {
      scale.value = withSpring(1);
    });
    setLiked((prev) => !prev);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
  };

  return (
    <TouchableOpacity
      onPress={() => router.push({ pathname: '/ruck/[id]', params: { id: ruck.id } })}
      activeOpacity={0.9}
    >
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Image source={{ uri: ruck.userAvatar }} style={styles.avatar} />
          <View style={styles.headerInfo}>
            <Text style={styles.userName}>{ruck.userName}</Text>
            <Text style={styles.cardDate}>{ruck.date}</Text>
          </View>
          <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textMuted} />
        </View>

        <Image source={{ uri: ruck.photo }} style={styles.ruckPhoto} />

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{ruck.distance}</Text>
            <Text style={styles.statLabel}>miles</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{ruck.weight}</Text>
            <Text style={styles.statLabel}>lbs</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{ruck.duration}</Text>
            <Text style={styles.statLabel}>duration</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{ruck.pace}</Text>
            <Text style={styles.statLabel}>min/mi</Text>
          </View>
        </View>

        {ruck.notes ? (
          <Text style={styles.notes} numberOfLines={2}>{ruck.notes}</Text>
        ) : null}

        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
            <Animated.View style={animatedStyle}>
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={22}
                color={liked ? Colors.burntOrange : Colors.textSecondary}
              />
            </Animated.View>
            <Text style={[styles.actionCount, liked && { color: Colors.burntOrange }]}>
              {likeCount}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push({ pathname: '/ruck/[id]', params: { id: ruck.id } })}
          >
            <Ionicons name="chatbubble-outline" size={20} color={Colors.textSecondary} />
            <Text style={styles.actionCount}>{ruck.comments}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="share-outline" size={21} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function AnnouncementCard() {
  return (
    <View style={styles.announcementCard}>
      <View style={styles.announcementBadge}>
        <Ionicons name="megaphone" size={14} color={Colors.burntOrange} />
        <Text style={styles.announcementBadgeText}>COMMUNITY</Text>
      </View>
      <Text style={styles.announcementTitle}>{ANNOUNCEMENT.title}</Text>
      <Text style={styles.announcementBody}>{ANNOUNCEMENT.body}</Text>
      <TouchableOpacity style={styles.announcementCta}>
        <Text style={styles.announcementCtaText}>Join Challenge</Text>
        <Ionicons name="arrow-forward" size={14} color={Colors.burntOrange} />
      </TouchableOpacity>
    </View>
  );
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const [feed, setFeed] = useState<'friends' | 'global'>('friends');
  const [refreshing, setRefreshing] = useState(false);

  const filteredRucks = MOCK_RUCKS.filter((r) => {
    if (feed === 'friends') return !r.isGlobal || r.userId === 'me';
    return true;
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  type FeedItem =
    | { type: 'ruck'; data: Ruck }
    | { type: 'announcement' };

  const feedItems: FeedItem[] = [
    { type: 'announcement' },
    ...filteredRucks.map((r) => ({ type: 'ruck' as const, data: r })),
  ];

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.wordmark}>RUCKON</Text>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={24} color={Colors.bone} />
        </TouchableOpacity>
      </View>

      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, feed === 'friends' && styles.toggleActive]}
          onPress={() => setFeed('friends')}
        >
          <Text style={[styles.toggleText, feed === 'friends' && styles.toggleTextActive]}>
            Friends
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, feed === 'global' && styles.toggleActive]}
          onPress={() => setFeed('global')}
        >
          <Text style={[styles.toggleText, feed === 'global' && styles.toggleTextActive]}>
            Global
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={feedItems}
        keyExtractor={(item, idx) =>
          item.type === 'ruck' ? item.data.id : `ann-${idx}`
        }
        renderItem={({ item }) => {
          if (item.type === 'announcement') return <AnnouncementCard />;
          return <RuckCard ruck={item.data} />;
        }}
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
  toggleRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: Colors.darkCard,
    borderRadius: 10,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleActive: {
    backgroundColor: Colors.burntOrange,
  },
  toggleText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.textMuted,
  },
  toggleTextActive: {
    color: Colors.bone,
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
  ruckPhoto: {
    width: '100%',
    height: 200,
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
    paddingBottom: 12,
    lineHeight: 18,
  },
  cardActions: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    paddingTop: 12,
    gap: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionCount: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  announcementCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: Colors.forestGreen,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.mossGreen,
  },
  announcementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  announcementBadgeText: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 11,
    color: Colors.burntOrange,
    letterSpacing: 1.5,
  },
  announcementTitle: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 20,
    color: Colors.bone,
    marginBottom: 6,
  },
  announcementBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  announcementCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  announcementCtaText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.burntOrange,
  },
});
