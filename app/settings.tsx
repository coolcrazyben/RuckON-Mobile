import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useAuth } from '@/lib/auth';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, updateProfile, logout } = useAuth();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [location, setLocation] = useState(user?.location || '');
  const [weight, setWeight] = useState(user?.weight?.toString() || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasChanges =
    name !== (user?.name || '') ||
    username !== (user?.username || '') ||
    bio !== (user?.bio || '') ||
    location !== (user?.location || '') ||
    weight !== (user?.weight?.toString() || '');

  const handleSave = async () => {
    if (!hasChanges || saving) return;
    setSaving(true);
    try {
      const data: Record<string, string | number> = {};
      if (name !== (user?.name || '')) data.name = name;
      if (username !== (user?.username || '')) data.username = username;
      if (bio !== (user?.bio || '')) data.bio = bio;
      if (location !== (user?.location || '')) data.location = location;
      if (weight !== (user?.weight?.toString() || '')) {
        const w = parseInt(weight);
        if (!isNaN(w) && w > 0) data.weight = w;
      }
      await updateProfile(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to save';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.bone} />
        </TouchableOpacity>
        <Text style={styles.title}>SETTINGS</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionLabel}>PROFILE</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>NAME</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>USERNAME</Text>
          <View style={styles.inputWrap}>
            <Text style={styles.atSign}>@</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="username"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>BIO</Text>
          <View style={[styles.inputWrap, styles.bioWrap]}>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself..."
              placeholderTextColor={Colors.textMuted}
              multiline
              maxLength={200}
              textAlignVertical="top"
            />
          </View>
          <Text style={styles.charCount}>{bio.length}/200</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>LOCATION</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="location-outline" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="City, State"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>WEIGHT (lbs)</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="fitness-outline" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              placeholder="Body weight"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
            />
          </View>
        </View>

        {hasChanges && (
          <TouchableOpacity
            style={[styles.saveBtn, saved && styles.saveBtnSuccess]}
            onPress={handleSave}
            disabled={saving || saved}
          >
            {saving ? (
              <ActivityIndicator color={Colors.bone} size="small" />
            ) : saved ? (
              <>
                <Ionicons name="checkmark" size={18} color={Colors.bone} />
                <Text style={styles.saveBtnText}>Saved!</Text>
              </>
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        )}

        <Text style={[styles.sectionLabel, { marginTop: 32 }]}>ACCOUNT</Text>

        <View style={styles.menuGroup}>
          <View style={styles.menuItem}>
            <Ionicons name="mail-outline" size={20} color={Colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>Email</Text>
              <Text style={styles.menuValue}>{user?.email || 'Not set'}</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 32 }]}>APP</Text>

        <View style={styles.menuGroup}>
          <View style={styles.menuItem}>
            <Ionicons name="information-circle-outline" size={20} color={Colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>Version</Text>
              <Text style={styles.menuValue}>1.0.0</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.darkCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 20,
    color: Colors.bone,
    letterSpacing: 3,
  },
  scroll: {
    paddingHorizontal: 16,
  },
  sectionLabel: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 12,
    marginTop: 8,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontFamily: 'Oswald_500Medium',
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.darkCard,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 10,
  },
  atSign: {
    fontFamily: 'Oswald_400Regular',
    fontSize: 18,
    color: Colors.textMuted,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.bone,
  },
  bioWrap: {
    alignItems: 'flex-start',
    paddingVertical: 14,
  },
  bioInput: {
    height: 70,
    lineHeight: 20,
  },
  charCount: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.burntOrange,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  saveBtnSuccess: {
    backgroundColor: Colors.success,
  },
  saveBtnText: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 16,
    color: Colors.bone,
    letterSpacing: 1,
  },
  menuGroup: {
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.bone,
  },
  menuValue: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,80,80,0.2)',
  },
  logoutText: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 16,
    color: Colors.danger,
    letterSpacing: 1,
  },
});
