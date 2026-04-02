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
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { getApiUrl } from '@/lib/query-client';
import { useAuth } from '@/lib/auth';
import RuckMap from '@/components/RuckMap';
import { formatDuration, formatPace, timeAgo } from '@/lib/format';

interface RuckDetail {
  ruck: {
    id: string;
    userId: string;
    distance: number | null;
    durationSeconds: number | null;
    weight: number | null;
    notes: string | null;
    routeCoordinates: string | null;
    routeImageUrl: string | null;
    createdAt: string | null;
    userName: string | null;
    userAvatar: string | null;
  };
  likeCount: number;
  commentCount: number;
  liked: boolean;
}

interface Comment {
  id: string;
  userId: string;
  content: string;
  createdAt: string | null;
  userName: string | null;
  userAvatar: string | null;
}

export default function RuckDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const baseUrl = (() => {
    try { return getApiUrl(); } catch { return null; }
  })();

  const [detail, setDetail] = useState<RuckDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const loadData = useCallback(() => {
    if (!baseUrl || !id) {
      setLoading(false);
      return;
    }
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    Promise.all([
      fetch(`${baseUrl}api/rucks/${id}`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`${baseUrl}api/rucks/${id}/comments`, { headers }).then(r => r.ok ? r.json() : []),
    ])
      .then(([ruckDetail, ruckComments]) => {
        if (ruckDetail) {
          setDetail(ruckDetail);
          setLiked(ruckDetail.liked);
          setLikeCount(ruckDetail.likeCount);
        }
        setComments(ruckComments || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [baseUrl, id, token]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData])
  );

  const handleLike = async () => {
    if (!baseUrl || !id || !token) return;
    scale.value = withSpring(1.3, { damping: 3 }, () => {
      scale.value = withSpring(1);
    });
    setLiked(prev => !prev);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);

    try {
      const res = await fetch(`${baseUrl}api/rucks/${id}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        setLikeCount(data.likeCount);
      }
    } catch {}
  };

  const handleComment = async () => {
    if (!baseUrl || !id || !token || !commentText.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`${baseUrl}api/rucks/${id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: commentText.trim() }),
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments(prev => [newComment, ...prev]);
        setCommentText('');
      }
    } catch {}
    setPosting(false);
  };

  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={Colors.burntOrange} style={{ marginTop: 100 }} />
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>Ruck not found</Text>
        </View>
      </View>
    );
  }

  const { ruck } = detail;
  const miles = ((ruck.distance || 0) / 100).toFixed(1);
  const duration = ruck.durationSeconds ? formatDuration(ruck.durationSeconds) : '--';
  const pace = ruck.durationSeconds ? formatPace(ruck.distance || 0, ruck.durationSeconds) : '--';
  const lbsMoved = Math.round(((ruck.distance || 0) / 100) * (ruck.weight || 0));
  const dateLabel = ruck.createdAt ? timeAgo(ruck.createdAt) : '';

  let routeCoords: Array<{ latitude: number; longitude: number }> = [];
  if (ruck.routeCoordinates) {
    try {
      routeCoords = JSON.parse(ruck.routeCoordinates);
    } catch {}
  }
  const hasRoute = routeCoords.length >= 2;
  const lastCoord = routeCoords.length > 0 ? routeCoords[routeCoords.length - 1] : null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 30 }]}
      >
        {ruck.routeImageUrl ? (
          <Image source={{ uri: ruck.routeImageUrl }} style={styles.heroImage} />
        ) : null}

        <TouchableOpacity
          style={styles.ruckerRow}
          onPress={() => router.push({ pathname: '/user-profile', params: { userId: ruck.userId } })}
        >
          {ruck.userAvatar ? (
            <Image source={{ uri: ruck.userAvatar }} style={styles.ruckerAvatar} />
          ) : (
            <View style={[styles.ruckerAvatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={18} color={Colors.textMuted} />
            </View>
          )}
          <View>
            <Text style={styles.ruckerName}>{ruck.userName || 'Rucker'}</Text>
            <Text style={styles.ruckDate}>{dateLabel}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="walk-outline" size={20} color={Colors.burntOrange} />
            <Text style={styles.statCardValue}>{miles}</Text>
            <Text style={styles.statCardLabel}>miles</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time-outline" size={20} color={Colors.burntOrange} />
            <Text style={styles.statCardValue}>{duration}</Text>
            <Text style={styles.statCardLabel}>duration</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="fitness-outline" size={20} color={Colors.burntOrange} />
            <Text style={styles.statCardValue}>{ruck.weight || 0}</Text>
            <Text style={styles.statCardLabel}>lbs</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="speedometer-outline" size={20} color={Colors.burntOrange} />
            <Text style={styles.statCardValue}>{pace}</Text>
            <Text style={styles.statCardLabel}>min/mi</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trending-up-outline" size={20} color={Colors.burntOrange} />
            <Text style={styles.statCardValue}>{lbsMoved}</Text>
            <Text style={styles.statCardLabel}>lbs moved</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="barbell-outline" size={20} color={Colors.burntOrange} />
            <Text style={styles.statCardValue}>{ruck.weight || 0}</Text>
            <Text style={styles.statCardLabel}>pack wt</Text>
          </View>
        </View>

        {hasRoute ? (
          <View style={styles.mapContainer}>
            <RuckMap currentPos={lastCoord} routeCoords={routeCoords} style={styles.mapInner} />
          </View>
        ) : (
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.mapPlaceholderText}>No route recorded</Text>
          </View>
        )}

        {ruck.notes ? (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>NOTES</Text>
            <Text style={styles.notesText}>{ruck.notes}</Text>
          </View>
        ) : null}

        <View style={styles.actionsBar}>
          <TouchableOpacity style={styles.actionItem} onPress={handleLike}>
            <Animated.View style={animatedStyle}>
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={24}
                color={liked ? Colors.burntOrange : Colors.textSecondary}
              />
            </Animated.View>
            <Text style={[styles.actionLabel, liked && { color: Colors.burntOrange }]}>
              {likeCount} {likeCount === 1 ? 'like' : 'likes'}
            </Text>
          </TouchableOpacity>
          <View style={styles.actionItem}>
            <Ionicons name="chatbubble-outline" size={22} color={Colors.textSecondary} />
            <Text style={styles.actionLabel}>
              {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
            </Text>
          </View>
        </View>

        <View style={styles.commentsSection}>
          <Text style={styles.sectionTitle}>COMMENTS</Text>

          {token ? (
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor={Colors.textMuted}
                value={commentText}
                onChangeText={setCommentText}
                maxLength={500}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!commentText.trim() || posting) && styles.sendBtnDisabled]}
                onPress={handleComment}
                disabled={!commentText.trim() || posting}
              >
                {posting ? (
                  <ActivityIndicator size="small" color={Colors.bone} />
                ) : (
                  <Ionicons name="send" size={18} color={Colors.bone} />
                )}
              </TouchableOpacity>
            </View>
          ) : null}

          {comments.length === 0 ? (
            <Text style={styles.noComments}>No comments yet. Be the first!</Text>
          ) : (
            comments.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.commentRow}
                onPress={() => router.push({ pathname: '/user-profile', params: { userId: c.userId } })}
              >
                {c.userAvatar ? (
                  <Image source={{ uri: c.userAvatar }} style={styles.commentAvatar} />
                ) : (
                  <View style={[styles.commentAvatar, styles.avatarPlaceholder]}>
                    <Ionicons name="person" size={14} color={Colors.textMuted} />
                  </View>
                )}
                <View style={styles.commentBubble}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentUser}>{c.userName || 'Rucker'}</Text>
                    <Text style={styles.commentTime}>{c.createdAt ? timeAgo(c.createdAt) : ''}</Text>
                  </View>
                  <Text style={styles.commentText}>{c.content}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.charcoal,
  },
  scroll: {
    paddingBottom: 40,
  },
  heroImage: {
    width: '100%',
    height: 240,
  },
  ruckerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  ruckerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: Colors.burntOrange,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.darkCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruckerName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: Colors.bone,
  },
  ruckDate: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
  },
  statCard: {
    width: '31%',
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  statCardValue: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 20,
    color: Colors.bone,
  },
  statCardLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mapContainer: {
    marginHorizontal: 16,
    height: 200,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 20,
  },
  mapInner: {
    width: '100%',
    height: '100%',
  },
  mapPlaceholder: {
    marginHorizontal: 16,
    height: 120,
    backgroundColor: Colors.darkCard,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 8,
    marginBottom: 20,
  },
  mapPlaceholderText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
  },
  notesSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  notesText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  actionsBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 24,
    marginBottom: 20,
    marginTop: 12,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  commentsSection: {
    paddingHorizontal: 16,
  },
  commentInputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1,
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.bone,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    maxHeight: 80,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.burntOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  noComments: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  commentRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  commentBubble: {
    flex: 1,
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentUser: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.bone,
  },
  commentTime: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
  },
  commentText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 100,
    gap: 12,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.textMuted,
  },
});
