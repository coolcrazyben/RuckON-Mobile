import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import {
  MOCK_COMMUNITIES,
  MOCK_USERS,
  MOCK_CHALLENGES,
  type Community,
  type User,
  type Challenge,
} from '@/data/mockData';

function CommunityCard({ community }: { community: Community }) {
  const [joined, setJoined] = useState(community.isJoined);
  return (
    <TouchableOpacity
      style={styles.communityCard}
      onPress={() => router.push({ pathname: '/community/[id]', params: { id: community.id } })}
      activeOpacity={0.85}
    >
      <Image source={{ uri: community.banner }} style={styles.communityBanner} />
      <View style={styles.communityOverlay} />
      <View style={styles.communityInfo}>
        <Text style={styles.communityName} numberOfLines={1}>{community.name}</Text>
        <Text style={styles.communityMeta}>{community.memberCount.toLocaleString()} members</Text>
        <TouchableOpacity
          style={[styles.joinBtn, joined && styles.joinBtnJoined]}
          onPress={(e) => { e.stopPropagation(); setJoined((p) => !p); }}
        >
          <Text style={[styles.joinBtnText, joined && styles.joinBtnTextJoined]}>
            {joined ? 'Joined' : 'Join'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function FriendCard({ user }: { user: User }) {
  const [following, setFollowing] = useState(user.isFollowing);
  return (
    <View style={styles.friendCard}>
      <Image source={{ uri: user.avatar }} style={styles.friendAvatar} />
      <Text style={styles.friendName} numberOfLines={1}>{user.name}</Text>
      <Text style={styles.friendMutual} numberOfLines={1}>
        {user.mutualFriends > 0 ? `${user.mutualFriends} mutual` : user.location}
      </Text>
      <TouchableOpacity
        style={[styles.addBtn, following && styles.addBtnFollowing]}
        onPress={() => setFollowing((p) => !p)}
      >
        <Text style={[styles.addBtnText, following && styles.addBtnTextFollowing]}>
          {following ? 'Following' : 'Follow'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function ChallengeRow({ challenge }: { challenge: Challenge }) {
  const [joined, setJoined] = useState(challenge.isJoined);
  return (
    <View style={styles.challengeRow}>
      <View style={styles.challengeLeft}>
        <View style={styles.challengeIconWrap}>
          <Ionicons name="flash" size={18} color={Colors.burntOrange} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.challengeTitle}>{challenge.title}</Text>
          <Text style={styles.challengeMeta}>
            {challenge.goal} · ends {challenge.endDate}
          </Text>
          <Text style={styles.challengeParticipants}>
            {challenge.participants.toLocaleString()} participants
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.challengeJoinBtn, joined && styles.challengeJoinBtnJoined]}
        onPress={() => setJoined((p) => !p)}
      >
        <Text style={[styles.challengeJoinText, joined && styles.challengeJoinTextJoined]}>
          {joined ? 'Joined' : 'Join'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState('');
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>EXPLORE</Text>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search communities, people..."
          placeholderTextColor={Colors.textMuted}
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>TRENDING COMMUNITIES</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={MOCK_COMMUNITIES}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          renderItem={({ item }) => <CommunityCard community={item} />}
          scrollEnabled={true}
        />

        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>SUGGESTED FRIENDS</Text>
        </View>
        <FlatList
          data={MOCK_USERS.filter((u) => u.id !== 'me')}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          renderItem={({ item }) => <FriendCard user={item} />}
          scrollEnabled={true}
        />

        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>ACTIVE CHALLENGES</Text>
        </View>
        <View style={styles.challengesList}>
          {MOCK_CHALLENGES.map((ch) => (
            <ChallengeRow key={ch.id} challenge={ch} />
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.charcoal,
  },
  headerRow: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 28,
    color: Colors.bone,
    letterSpacing: 3,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: Colors.darkCard,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.bone,
  },
  scroll: {
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  seeAll: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.burntOrange,
  },
  communityCard: {
    width: 160,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.darkCard,
  },
  communityBanner: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  communityOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,20,16,0.55)',
  },
  communityInfo: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 12,
  },
  communityName: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 15,
    color: Colors.bone,
    marginBottom: 2,
  },
  communityMeta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  joinBtn: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    backgroundColor: Colors.burntOrange,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  joinBtnJoined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.textMuted,
  },
  joinBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.bone,
  },
  joinBtnTextJoined: {
    color: Colors.textMuted,
  },
  friendCard: {
    width: 110,
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  friendAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: Colors.mossGreen,
  },
  friendName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.bone,
    textAlign: 'center',
    marginBottom: 2,
  },
  friendMutual: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 10,
  },
  addBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    backgroundColor: Colors.burntOrange,
    borderRadius: 6,
  },
  addBtnFollowing: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.textMuted,
  },
  addBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.bone,
  },
  addBtnTextFollowing: {
    color: Colors.textMuted,
  },
  challengesList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  challengeRow: {
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  challengeLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
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
    marginBottom: 2,
  },
  challengeMeta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  challengeParticipants: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
  },
  challengeJoinBtn: {
    paddingVertical: 7,
    paddingHorizontal: 16,
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
});
