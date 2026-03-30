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
        <View style={[styles.communityBanner, { backgroundColor: Colors.forestGreen }]} />
      )}
      <View style={styles.communityOverlay} />
      <View style={styles.communityInfo}>
        <Text style={styles.communityName} numberOfLines={1}>{community.name}</Text>
        <Text style={styles.communityMeta}>{(community.memberCount || 0).toLocaleString()} members</Text>
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

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [searchText, setSearchText] = useState('');
  const [communities, setCommunities] = useState<CommunityData[]>([]);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const fetchIdRef = useRef(0);

  const baseUrl = (() => {
    try { return getApiUrl(); } catch { return null; }
  })();

  const fetchCommunities = useCallback((query: string) => {
    if (!baseUrl) {
      setLoading(false);
      return;
    }
    const id = ++fetchIdRef.current;
    const url = query
      ? `${baseUrl}api/communities?q=${encodeURIComponent(query)}`
      : `${baseUrl}api/communities`;
    fetch(url)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (fetchIdRef.current === id) {
          setCommunities(data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (fetchIdRef.current === id) {
          setLoading(false);
        }
      });
  }, [baseUrl]);

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
      fetchCommunities(searchText);
      fetchJoinedCommunities();
    }, [fetchCommunities, fetchJoinedCommunities, searchText])
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(true);
      fetchCommunities(searchText);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchText, fetchCommunities]);

  const handleToggleJoin = useCallback((id: string, joined: boolean) => {
    setJoinedIds(prev => {
      const next = new Set(prev);
      if (joined) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>EXPLORE</Text>
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
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {searchText ? 'SEARCH RESULTS' : 'COMMUNITIES'}
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
              {searchText ? 'Try a different search' : 'Communities will appear here'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={communities}
            keyExtractor={(item) => item.id}
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
});
