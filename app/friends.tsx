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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import Colors from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getApiUrl } from '@/lib/query-client';

interface FriendData {
  id: string;
  name: string | null;
  username: string;
  avatar: string | null;
  location: string | null;
  friendshipId: string;
}

interface PendingRequest {
  id: string;
  requesterId: string;
  requesterName: string | null;
  requesterUsername: string;
  requesterAvatar: string | null;
  createdAt: string | null;
}

type FriendsTab = 'friends' | 'pending';

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [tab, setTab] = useState<FriendsTab>('friends');
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const baseUrl = (() => {
    try { return getApiUrl(); } catch { return null; }
  })();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const loadData = useCallback(async () => {
    if (!baseUrl || !token) { setLoading(false); return; }
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [friendsRes, pendingRes] = await Promise.all([
        fetch(`${baseUrl}api/friends`, { headers }),
        fetch(`${baseUrl}api/friends/pending`, { headers }),
      ]);
      if (friendsRes.ok) setFriends(await friendsRes.json());
      if (pendingRes.ok) setPending(await pendingRes.json());
    } catch {}
    setLoading(false);
  }, [baseUrl, token]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData])
  );

  const handleAccept = async (requestId: string) => {
    if (!baseUrl || !token) return;
    try {
      const res = await fetch(`${baseUrl}api/friends/${requestId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) loadData();
    } catch {}
  };

  const handleDecline = async (requestId: string) => {
    if (!baseUrl || !token) return;
    try {
      const res = await fetch(`${baseUrl}api/friends/${requestId}/decline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPending(prev => prev.filter(p => p.id !== requestId));
      }
    } catch {}
  };

  const handleUnfriend = (friendId: string, friendName: string | null) => {
    Alert.alert(
      'Remove Friend',
      `Remove ${friendName || 'this person'} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!baseUrl || !token) return;
            try {
              await fetch(`${baseUrl}api/friends/${friendId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              setFriends(prev => prev.filter(f => f.id !== friendId));
            } catch {}
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.bone} />
        </TouchableOpacity>
        <Text style={styles.title}>Friends</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'friends' && styles.tabBtnActive]}
          onPress={() => setTab('friends')}
        >
          <Text style={[styles.tabText, tab === 'friends' && styles.tabTextActive]}>
            Friends ({friends.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'pending' && styles.tabBtnActive]}
          onPress={() => setTab('pending')}
        >
          <Text style={[styles.tabText, tab === 'pending' && styles.tabTextActive]}>
            Requests ({pending.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.burntOrange} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {tab === 'friends' && (
            friends.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>No friends yet</Text>
                <Text style={styles.emptyText}>Add friends from community member lists or user profiles</Text>
              </View>
            ) : (
              friends.map(f => (
                <View key={f.id} style={styles.friendRow}>
                  <TouchableOpacity
                    style={styles.friendInfo}
                    onPress={() => router.push({ pathname: '/user-profile', params: { userId: f.id } })}
                  >
                    {f.avatar ? (
                      <Image source={{ uri: f.avatar }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <Ionicons name="person" size={18} color={Colors.textMuted} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.friendName}>{f.name || f.username}</Text>
                      <Text style={styles.friendUsername}>@{f.username}</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.unfriendBtn}
                    onPress={() => handleUnfriend(f.id, f.name)}
                  >
                    <Ionicons name="person-remove-outline" size={16} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ))
            )
          )}

          {tab === 'pending' && (
            pending.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="mail-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>No pending requests</Text>
                <Text style={styles.emptyText}>Friend requests you receive will appear here</Text>
              </View>
            ) : (
              pending.map(p => (
                <View key={p.id} style={styles.friendRow}>
                  <TouchableOpacity
                    style={styles.friendInfo}
                    onPress={() => router.push({ pathname: '/user-profile', params: { userId: p.requesterId } })}
                  >
                    {p.requesterAvatar ? (
                      <Image source={{ uri: p.requesterAvatar }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <Ionicons name="person" size={18} color={Colors.textMuted} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.friendName}>{p.requesterName || p.requesterUsername}</Text>
                      <Text style={styles.friendUsername}>@{p.requesterUsername}</Text>
                    </View>
                  </TouchableOpacity>
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => handleAccept(p.id)}
                    >
                      <Ionicons name="checkmark" size={18} color={Colors.bone} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.declineBtn}
                      onPress={() => handleDecline(p.id)}
                    >
                      <Ionicons name="close" size={18} color={Colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )
          )}
        </ScrollView>
      )}
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
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 22,
    color: Colors.bone,
    letterSpacing: 1,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.darkCard,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  tabBtnActive: {
    backgroundColor: Colors.forestGreen,
    borderColor: Colors.mossGreen,
  },
  tabText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.bone,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 60,
    gap: 8,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  friendInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: Colors.mossGreen,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.darkCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.bone,
  },
  friendUsername: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  unfriendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.forestGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.burntOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.forestGreen,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 20,
    color: Colors.bone,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 19,
  },
});
