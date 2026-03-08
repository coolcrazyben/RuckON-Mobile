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
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { MOCK_RUCKS } from '@/data/mockData';

const PHOTO_PLACEHOLDERS = [
  'https://images.unsplash.com/photo-1551632811-561732d1e306?w=300',
  'https://images.unsplash.com/photo-1463044304029-b857fcddcaff?w=300',
  'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=300',
  'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=300',
];

const COMMENTS = [
  { id: 'cm1', user: 'Derek Ortiz', avatar: 'https://i.pravatar.cc/150?img=3', text: 'Solid effort! Keep grinding.', time: '1h' },
  { id: 'cm2', user: 'Sarah Kline', avatar: 'https://i.pravatar.cc/150?img=5', text: 'Nice pace for that weight!', time: '2h' },
  { id: 'cm3', user: 'James Hollis', avatar: 'https://i.pravatar.cc/150?img=7', text: 'That elevation though...', time: '3h' },
];

export default function RuckDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const ruck = MOCK_RUCKS.find((r) => r.id === id) ?? MOCK_RUCKS[0];

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

  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 30 }]}
      >
        <Image source={{ uri: ruck.photo }} style={styles.heroImage} />

        <View style={styles.ruckerRow}>
          <Image source={{ uri: ruck.userAvatar }} style={styles.ruckerAvatar} />
          <View>
            <Text style={styles.ruckerName}>{ruck.userName}</Text>
            <Text style={styles.ruckDate}>{ruck.date}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="walk-outline" size={20} color={Colors.burntOrange} />
            <Text style={styles.statCardValue}>{ruck.distance}</Text>
            <Text style={styles.statCardLabel}>miles</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time-outline" size={20} color={Colors.burntOrange} />
            <Text style={styles.statCardValue}>{ruck.duration}</Text>
            <Text style={styles.statCardLabel}>duration</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="fitness-outline" size={20} color={Colors.burntOrange} />
            <Text style={styles.statCardValue}>{ruck.weight}</Text>
            <Text style={styles.statCardLabel}>lbs</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="speedometer-outline" size={20} color={Colors.burntOrange} />
            <Text style={styles.statCardValue}>{ruck.pace}</Text>
            <Text style={styles.statCardLabel}>min/mi</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trending-up-outline" size={20} color={Colors.burntOrange} />
            <Text style={styles.statCardValue}>{ruck.elevation}</Text>
            <Text style={styles.statCardLabel}>ft gain</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="barbell-outline" size={20} color={Colors.burntOrange} />
            <Text style={styles.statCardValue}>
              {(ruck.distance * ruck.weight).toFixed(0)}
            </Text>
            <Text style={styles.statCardLabel}>lbs moved</Text>
          </View>
        </View>

        <View style={styles.mapPlaceholder}>
          <Ionicons name="map-outline" size={32} color={Colors.textMuted} />
          <Text style={styles.mapPlaceholderText}>Route Map</Text>
          <View style={styles.mapRoute} />
        </View>

        {ruck.notes ? (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>NOTES</Text>
            <Text style={styles.notesText}>{ruck.notes}</Text>
          </View>
        ) : null}

        <View style={styles.photosSection}>
          <Text style={styles.sectionTitle}>PHOTOS</Text>
          <View style={styles.photosGrid}>
            {PHOTO_PLACEHOLDERS.map((p, i) => (
              <Image key={i} source={{ uri: p }} style={styles.photoThumb} />
            ))}
          </View>
        </View>

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
              {likeCount} likes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem}>
            <Ionicons name="chatbubble-outline" size={22} color={Colors.textSecondary} />
            <Text style={styles.actionLabel}>{ruck.comments} comments</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem}>
            <Ionicons name="share-outline" size={22} color={Colors.textSecondary} />
            <Text style={styles.actionLabel}>Share</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.commentsSection}>
          <Text style={styles.sectionTitle}>COMMENTS</Text>
          {COMMENTS.map((c) => (
            <View key={c.id} style={styles.commentRow}>
              <Image source={{ uri: c.avatar }} style={styles.commentAvatar} />
              <View style={styles.commentBubble}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentUser}>{c.user}</Text>
                  <Text style={styles.commentTime}>{c.time}</Text>
                </View>
                <Text style={styles.commentText}>{c.text}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
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
  mapPlaceholder: {
    marginHorizontal: 16,
    height: 200,
    backgroundColor: Colors.darkCard,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
    gap: 8,
    marginBottom: 20,
  },
  mapPlaceholderText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
  },
  mapRoute: {
    position: 'absolute',
    left: 30,
    right: 30,
    top: 60,
    height: 2,
    backgroundColor: Colors.burntOrange,
    opacity: 0.5,
    borderRadius: 1,
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
  photosSection: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  photoThumb: {
    width: '48%',
    height: 120,
    borderRadius: 10,
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
});
