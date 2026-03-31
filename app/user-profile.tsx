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
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getApiUrl } from '@/lib/query-client';

interface UserProfile {
  id: string;
  username: string;
  name: string | null;
  avatar: string | null;
  bio: string | null;
  location: string | null;
  friendCount: number;
  ruckStats: {
    totalMiles: number;
    totalRucks: number;
    weightMoved: number;
  };
}

interface FriendshipStatus {
  status: string;
  friendshipId?: string;
  direction?: 'sent' | 'received';
}

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [friendStatus, setFriendStatus] = useState<FriendshipStatus>({ status: 'none' });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const baseUrl = (() => {
    try { return getApiUrl(); } catch { return null; }
  })();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const isOwnProfile = user?.id === userId;

  const loadProfile = useCallback(async () => {
    if (!baseUrl || !userId) { setLoading(false); return; }
    try {
      const profileRes = await fetch(`${baseUrl}api/users/${userId}/profile`);
      if (profileRes.ok) setProfile(await profileRes.json());

      if (token && !isOwnProfile) {
        const statusRes = await fetch(`${baseUrl}api/friends/status/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (statusRes.ok) setFriendStatus(await statusRes.json());
      }
    } catch {}
    setLoading(false);
  }, [baseUrl, userId, token, isOwnProfile]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadProfile();
    }, [loadProfile])
  );

  const handleAddFriend = async () => {
    if (!baseUrl || !token || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${baseUrl}api/friends/request`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ addresseeId: userId }),
      });
      if (res.ok) {
        setFriendStatus({ status: 'pending', direction: 'sent' });
      } else {
        const data = await res.json();
        Alert.alert('Error', data.message || 'Failed to send request');
      }
    } catch {}
    setActionLoading(false);
  };

  const handleAcceptRequest = async () => {
    if (!baseUrl || !token || !friendStatus.friendshipId || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${baseUrl}api/friends/${friendStatus.friendshipId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setFriendStatus({ status: 'accepted' });
        if (profile) setProfile({ ...profile, friendCount: profile.friendCount + 1 });
      }
    } catch {}
    setActionLoading(false);
  };

  const handleUnfriend = () => {
    Alert.alert(
      'Remove Friend',
      `Remove ${profile?.name || 'this person'} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!baseUrl || !token) return;
            setActionLoading(true);
            try {
              await fetch(`${baseUrl}api/friends/${userId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              setFriendStatus({ status: 'none' });
              if (profile) setProfile({ ...profile, friendCount: Math.max(0, profile.friendCount - 1) });
            } catch {}
            setActionLoading(false);
          },
        },
      ],
    );
  };

  const renderFriendButton = () => {
    if (isOwnProfile || !token) return null;

    if (actionLoading) {
      return (
        <View style={styles.friendBtn}>
          <ActivityIndicator size="small" color={Colors.bone} />
        </View>
      );
    }

    if (friendStatus.status === 'accepted') {
      return (
        <TouchableOpacity style={[styles.friendBtn, styles.friendBtnAccepted]} onPress={handleUnfriend}>
          <Ionicons name="people" size={16} color={Colors.bone} />
          <Text style={styles.friendBtnText}>Friends</Text>
        </TouchableOpacity>
      );
    }

    if (friendStatus.status === 'pending') {
      if (friendStatus.direction === 'received') {
        return (
          <TouchableOpacity style={styles.friendBtn} onPress={handleAcceptRequest}>
            <Ionicons name="checkmark" size={16} color={Colors.bone} />
            <Text style={styles.friendBtnText}>Accept</Text>
          </TouchableOpacity>
        );
      }
      return (
        <View style={[styles.friendBtn, styles.friendBtnPending]}>
          <Ionicons name="time-outline" size={16} color={Colors.textMuted} />
          <Text style={[styles.friendBtnText, { color: Colors.textMuted }]}>Pending</Text>
        </View>
      );
    }

    return (
      <TouchableOpacity style={styles.friendBtn} onPress={handleAddFriend}>
        <Ionicons name="person-add" size={16} color={Colors.bone} />
        <Text style={styles.friendBtnText}>Add Friend</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: topPad + 40 }]}>
        <ActivityIndicator color={Colors.burntOrange} size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { paddingTop: topPad + 40, alignItems: 'center' }]}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.errorText}>User not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: Colors.burntOrange, fontFamily: 'Inter_600SemiBold' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={[Colors.forestGreen, Colors.charcoal]}
        style={[styles.banner, { paddingTop: topPad + 12 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.bone} />
        </TouchableOpacity>

        <View style={styles.profileHead}>
          {profile.avatar ? (
            <Image source={{ uri: profile.avatar }} style={styles.profileAvatar} />
          ) : (
            <View style={[styles.profileAvatar, styles.profileAvatarPlaceholder]}>
              <Ionicons name="person" size={36} color={Colors.textMuted} />
            </View>
          )}
        </View>

        <Text style={styles.profileName}>{profile.name || profile.username}</Text>
        <Text style={styles.profileHandle}>@{profile.username}</Text>

        {profile.location ? (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color={Colors.textSecondary} />
            <Text style={styles.locationText}>{profile.location}</Text>
          </View>
        ) : null}

        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

        <View style={styles.actionRow}>
          {renderFriendButton()}
        </View>
      </LinearGradient>

      <View style={styles.statsCard}>
        <View style={styles.statBlock}>
          <Text style={styles.statNum}>{profile.ruckStats.totalMiles.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Miles</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={styles.statNum}>{profile.ruckStats.totalRucks}</Text>
          <Text style={styles.statLabel}>Rucks</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}>
          <Text style={styles.statNum}>{profile.friendCount}</Text>
          <Text style={styles.statLabel}>Friends</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.charcoal,
  },
  banner: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  profileHead: {
    marginBottom: 12,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: Colors.burntOrange,
  },
  profileAvatarPlaceholder: {
    backgroundColor: Colors.darkCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 26,
    color: Colors.bone,
    marginBottom: 2,
  },
  profileHandle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  locationText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  bio: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  actionRow: {
    marginTop: 12,
  },
  friendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.burntOrange,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  friendBtnAccepted: {
    backgroundColor: Colors.forestGreen,
    borderWidth: 1,
    borderColor: Colors.mossGreen,
  },
  friendBtnPending: {
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  friendBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.bone,
  },
  statsCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: -16,
    backgroundColor: Colors.darkCard,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 24,
    color: Colors.bone,
  },
  statLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.cardBorder,
  },
  errorText: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 18,
    color: Colors.bone,
    marginTop: 12,
  },
});
