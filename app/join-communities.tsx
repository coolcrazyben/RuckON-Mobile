import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getApiUrl } from '@/lib/query-client';

interface CommunityItem {
  id: string;
  name: string;
  description: string | null;
  memberCount: number | null;
  banner: string | null;
  category: string | null;
  location: string | null;
}

export default function JoinCommunitiesScreen() {
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  const [communities, setCommunities] = useState<CommunityItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const baseUrl = (() => {
    try {
      return getApiUrl();
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    fetchCommunities();
  }, []);

  const [error, setError] = useState('');

  async function fetchCommunities(query?: string) {
    try {
      setLoading(true);
      setError('');
      if (!baseUrl) {
        setError('Server connection not configured');
        return;
      }
      let url: string;
      if (query) {
        url = `${baseUrl}api/communities?q=${encodeURIComponent(query)}`;
      } else if (token && user?.location) {
        url = `${baseUrl}api/communities/nearby`;
      } else {
        url = `${baseUrl}api/communities`;
      }
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        setCommunities(data);
      } else {
        setError('Failed to load communities');
      }
    } catch (e: unknown) {
      console.error('Failed to fetch communities:', e);
      setError('Could not connect to server');
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(text: string) {
    setSearchQuery(text);
    if (text.length === 0) {
      fetchCommunities();
    } else if (text.length >= 2) {
      fetchCommunities(text);
    }
  }

  async function toggleJoin(communityId: string) {
    if (!token || !baseUrl) return;
    const isJoined = joinedIds.has(communityId);
    const endpoint = isJoined ? 'leave' : 'join';

    try {
      const res = await fetch(`${baseUrl}api/communities/${communityId}/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setJoinedIds((prev) => {
          const next = new Set(prev);
          if (isJoined) {
            next.delete(communityId);
          } else {
            next.add(communityId);
          }
          return next;
        });
      }
    } catch (e) {
      console.error('Failed to toggle community:', e);
    }
  }

  function handleFinish() {
    router.replace('/(tabs)');
  }

  function renderCommunity({ item }: { item: CommunityItem }) {
    const isJoined = joinedIds.has(item.id);
    return (
      <View style={styles.communityCard}>
        <Image
          source={{ uri: item.banner || 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400' }}
          style={styles.communityBanner}
        />
        <View style={styles.communityOverlay} />
        <View style={styles.communityContent}>
          <View style={styles.communityInfo}>
            <Text style={styles.communityName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.communityMeta} numberOfLines={1}>
              {item.memberCount?.toLocaleString() || 0} members
              {item.location ? ` · ${item.location}` : ''}
            </Text>
            {item.description && (
              <Text style={styles.communityDesc} numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={[styles.joinBtn, isJoined && styles.joinBtnJoined]}
            onPress={() => toggleJoin(item.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isJoined ? 'checkmark' : 'add'}
              size={16}
              color={isJoined ? Colors.textMuted : Colors.bone}
            />
            <Text style={[styles.joinBtnText, isJoined && styles.joinBtnTextJoined]}>
              {isJoined ? 'Joined' : 'Join'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[Colors.forestGreen, Colors.charcoal, Colors.charcoal]}
      style={styles.gradient}
    >
      <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
        <View style={styles.header}>
          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, styles.stepDotComplete]} />
            <View style={[styles.stepLine, styles.stepLineActive]} />
            <View style={[styles.stepDot, styles.stepDotActive]} />
          </View>
          <Text style={styles.stepLabel}>Step 2 of 2</Text>
        </View>

        <Text style={styles.title}>Join Communities</Text>
        <Text style={styles.subtitle}>
          Find rucking groups near you. This is optional — you can always join later.
        </Text>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search communities..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {joinedIds.size > 0 && (
          <View style={styles.joinedBadge}>
            <Ionicons name="people" size={14} color={Colors.burntOrange} />
            <Text style={styles.joinedBadgeText}>
              {joinedIds.size} communit{joinedIds.size === 1 ? 'y' : 'ies'} joined
            </Text>
          </View>
        )}

        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={24} color={Colors.danger} />
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity onPress={() => fetchCommunities()} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.burntOrange} />
          </View>
        ) : (
          <FlatList
            data={communities}
            keyExtractor={(item) => item.id}
            renderItem={renderCommunity}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={40} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No communities found</Text>
              </View>
            }
          />
        )}

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={handleFinish}
            activeOpacity={0.7}
          >
            <Text style={styles.skipBtnText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={handleFinish}
            activeOpacity={0.8}
          >
            <Text style={styles.doneBtnText}>
              {joinedIds.size > 0 ? "Let's Go!" : 'Continue'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color={Colors.bone} />
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.cardBorder,
  },
  stepDotActive: {
    backgroundColor: Colors.burntOrange,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stepDotComplete: {
    backgroundColor: Colors.success,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: Colors.cardBorder,
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: Colors.burntOrange,
  },
  stepLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
  title: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 28,
    color: Colors.bone,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.darkCard,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.bone,
  },
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(196, 98, 45, 0.15)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  joinedBadgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.burntOrange,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingTop: 60,
  },
  errorMessage: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.danger,
    textAlign: 'center',
  },
  retryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: Colors.burntOrange,
    borderRadius: 8,
    marginTop: 4,
  },
  retryBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.bone,
  },
  listContent: {
    gap: 12,
    paddingBottom: 100,
  },
  communityCard: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    height: 140,
  },
  communityBanner: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  communityOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,20,16,0.75)',
  },
  communityContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  communityInfo: {
    flex: 1,
    marginRight: 12,
  },
  communityName: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 18,
    color: Colors.bone,
    marginBottom: 4,
  },
  communityMeta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  communityDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
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
    fontSize: 13,
    color: Colors.bone,
  },
  joinBtnTextJoined: {
    color: Colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textMuted,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 12,
    backgroundColor: Colors.charcoal,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  skipBtn: {
    height: 48,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  skipBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: Colors.textSecondary,
  },
  doneBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 48,
    backgroundColor: Colors.burntOrange,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  doneBtnText: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 16,
    color: Colors.bone,
    letterSpacing: 0.5,
  },
});
