import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import Colors from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getApiUrl } from '@/lib/query-client';

interface CommunityData {
  id: string;
  name: string;
  description: string | null;
  memberCount: number | null;
  banner: string | null;
  category: string | null;
  location: string | null;
}

const CATEGORIES = ['All', 'General', 'Events', 'Local', 'Training', 'Military', 'Challenges', 'Gear', 'Social'];

function CommunityCard({
  community,
  token,
  baseUrl,
  isJoined,
  onToggleJoin,
}: {
  community: CommunityData;
  token: string | null;
  baseUrl: string | null;
  isJoined: boolean;
  onToggleJoin: (id: string, join: boolean) => void;
}) {
  const [joining, setJoining] = useState(false);

  const toggleJoin = async () => {
    if (!token || !baseUrl || joining) return;
    const endpoint = isJoined ? 'leave' : 'join';
    setJoining(true);
    try {
      const res = await fetch(`${baseUrl}api/communities/${community.id}/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        onToggleJoin(community.id, !isJoined);
      }
    } catch {} finally {
      setJoining(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.communityCard}
      onPress={() => router.push({ pathname: '/community/[id]', params: { id: community.id } })}
      activeOpacity={0.85}
    >
      {community.banner ? (
        <Image source={{ uri: community.banner }} style={styles.communityBanner} />
      ) : (
        <View style={[styles.communityBanner, { backgroundColor: Colors.forestGreen }]}>
          <Ionicons name="people" size={32} color={Colors.mossGreen} style={{ alignSelf: 'center', marginTop: 60 }} />
        </View>
      )}
      <View style={styles.communityOverlay} />
      <View style={styles.communityInfo}>
        {community.category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{community.category}</Text>
          </View>
        )}
        <Text style={styles.communityName} numberOfLines={1}>{community.name}</Text>
        <View style={styles.communityMetaRow}>
          <Ionicons name="people-outline" size={11} color={Colors.textSecondary} />
          <Text style={styles.communityMeta}>{(community.memberCount || 0).toLocaleString()} members</Text>
        </View>
        {community.location && (
          <View style={styles.communityMetaRow}>
            <Ionicons name="location-outline" size={11} color={Colors.textSecondary} />
            <Text style={styles.communityMeta} numberOfLines={1}>{community.location}</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.joinBtn, isJoined && styles.joinBtnJoined]}
          onPress={toggleJoin}
          disabled={joining}
        >
          {joining ? (
            <ActivityIndicator size="small" color={Colors.bone} />
          ) : (
            <Text style={[styles.joinBtnText, isJoined && styles.joinBtnTextJoined]}>
              {isJoined ? 'Joined' : 'Join'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function CommunityListItem({
  community,
  token,
  baseUrl,
  isJoined,
  onToggleJoin,
}: {
  community: CommunityData;
  token: string | null;
  baseUrl: string | null;
  isJoined: boolean;
  onToggleJoin: (id: string, join: boolean) => void;
}) {
  const [joining, setJoining] = useState(false);

  const toggleJoin = async () => {
    if (!token || !baseUrl || joining) return;
    const endpoint = isJoined ? 'leave' : 'join';
    setJoining(true);
    try {
      const res = await fetch(`${baseUrl}api/communities/${community.id}/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        onToggleJoin(community.id, !isJoined);
      }
    } catch {} finally {
      setJoining(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() => router.push({ pathname: '/community/[id]', params: { id: community.id } })}
      activeOpacity={0.85}
    >
      {community.banner ? (
        <Image source={{ uri: community.banner }} style={styles.listThumb} />
      ) : (
        <View style={[styles.listThumb, { backgroundColor: Colors.forestGreen, alignItems: 'center', justifyContent: 'center' }]}>
          <Ionicons name="people" size={18} color={Colors.bone} />
        </View>
      )}
      <View style={styles.listInfo}>
        <Text style={styles.listName} numberOfLines={1}>{community.name}</Text>
        <Text style={styles.listMeta}>
          {(community.memberCount || 0).toLocaleString()} members
          {community.location ? ` · ${community.location}` : ''}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.joinBtnSmall, isJoined && styles.joinBtnSmallJoined]}
        onPress={toggleJoin}
        disabled={joining}
      >
        {joining ? (
          <ActivityIndicator size="small" color={Colors.bone} />
        ) : (
          <Text style={[styles.joinBtnSmallText, isJoined && styles.joinBtnSmallTextJoined]}>
            {isJoined ? 'Joined' : 'Join'}
          </Text>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [communities, setCommunities] = useState<CommunityData[]>([]);
  const [nearbyCommunities, setNearbyCommunities] = useState<CommunityData[]>([]);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const fetchIdRef = useRef(0);

  const baseUrl = (() => {
    try { return getApiUrl(); } catch { return null; }
  })();

  const fetchCommunities = useCallback((query: string, category: string) => {
    if (!baseUrl) {
      setLoading(false);
      return;
    }
    const id = ++fetchIdRef.current;
    let url = `${baseUrl}api/communities`;
    const params: string[] = [];
    if (query) params.push(`q=${encodeURIComponent(query)}`);
    if (category && category !== 'All') params.push(`category=${encodeURIComponent(category)}`);
    if (params.length) url += `?${params.join('&')}`;

    fetch(url)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (fetchIdRef.current === id) setCommunities(data);
      })
      .catch(() => {})
      .finally(() => {
        if (fetchIdRef.current === id) setLoading(false);
      });
  }, [baseUrl]);

  const fetchNearby = useCallback(() => {
    if (!baseUrl || !token) return;
    fetch(`${baseUrl}api/communities/nearby`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then(setNearbyCommunities)
      .catch(() => {});
  }, [baseUrl, token]);

  const fetchJoinedCommunities = useCallback(() => {
    if (!baseUrl || !token) return;
    fetch(`${baseUrl}api/user/communities`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then((data: CommunityData[]) => {
        setJoinedIds(new Set(data.map(c => c.id)));
      })
      .catch(() => {});
  }, [baseUrl, token]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchCommunities(searchText, selectedCategory);
      fetchJoinedCommunities();
      fetchNearby();
    }, [fetchCommunities, fetchJoinedCommunities, fetchNearby, searchText, selectedCategory])
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(true);
      fetchCommunities(searchText, selectedCategory);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchText, selectedCategory, fetchCommunities]);

  const handleToggleJoin = useCallback((id: string, joined: boolean) => {
    setJoinedIds(prev => {
      const next = new Set(prev);
      if (joined) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const showNearby = !searchText && selectedCategory === 'All' && nearbyCommunities.length > 0;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>EXPLORE</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => router.push('/create-community')}
        >
          <Ionicons name="add" size={18} color={Colors.bone} />
          <Text style={styles.createBtnText}>Create</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search communities..."
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
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScrollView}
      >
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.filterText, selectedCategory === cat && styles.filterTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {showNearby && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="location" size={14} color={Colors.burntOrange} />
                <Text style={styles.sectionTitle}>NEAR {user?.location?.toUpperCase() || 'YOU'}</Text>
              </View>
            </View>
            <FlatList
              data={nearbyCommunities.slice(0, 8)}
              keyExtractor={(item) => `nearby-${item.id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
              renderItem={({ item }) => (
                <CommunityCard
                  community={item}
                  token={token}
                  baseUrl={baseUrl}
                  isJoined={joinedIds.has(item.id)}
                  onToggleJoin={handleToggleJoin}
                />
              )}
              scrollEnabled={true}
            />
          </>
        )}

        <View style={[styles.sectionHeader, showNearby && { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>
            {searchText ? 'SEARCH RESULTS' : selectedCategory !== 'All' ? selectedCategory.toUpperCase() : 'ALL COMMUNITIES'}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.burntOrange} style={{ marginTop: 40 }} />
        ) : communities.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>
              {searchText ? 'No communities found' : 'No communities yet'}
            </Text>
            <Text style={styles.emptyText}>
              {searchText ? 'Try a different search' : 'Be the first to create one!'}
            </Text>
            {!searchText && (
              <TouchableOpacity
                style={styles.emptyCreateBtn}
                onPress={() => router.push('/create-community')}
              >
                <Text style={styles.emptyCreateBtnText}>Create Community</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.listContainer}>
            {communities.map(item => (
              <CommunityListItem
                key={item.id}
                community={item}
                token={token}
                baseUrl={baseUrl}
                isJoined={joinedIds.has(item.id)}
                onToggleJoin={handleToggleJoin}
              />
            ))}
          </View>
        )}

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 28,
    color: Colors.bone,
    letterSpacing: 3,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.burntOrange,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  createBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.bone,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
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
  filterScrollView: {
    maxHeight: 40,
    marginBottom: 12,
  },
  filterRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  filterChipActive: {
    backgroundColor: Colors.burntOrange,
    borderColor: Colors.burntOrange,
  },
  filterText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.textMuted,
  },
  filterTextActive: {
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
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  communityCard: {
    width: 170,
    height: 220,
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
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(196,98,45,0.3)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 6,
  },
  categoryBadgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 9,
    color: Colors.burntOrange,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  communityName: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 15,
    color: Colors.bone,
    marginBottom: 4,
  },
  communityMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  communityMeta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textSecondary,
  },
  joinBtn: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    backgroundColor: Colors.burntOrange,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
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
  listContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.darkCard,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  listThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.bone,
    marginBottom: 2,
  },
  listMeta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
  },
  joinBtnSmall: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    backgroundColor: Colors.burntOrange,
    borderRadius: 6,
  },
  joinBtnSmallJoined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.textMuted,
  },
  joinBtnSmallText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.bone,
  },
  joinBtnSmallTextJoined: {
    color: Colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 18,
    color: Colors.bone,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
  },
  emptyCreateBtn: {
    marginTop: 12,
    backgroundColor: Colors.burntOrange,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyCreateBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.bone,
  },
});
