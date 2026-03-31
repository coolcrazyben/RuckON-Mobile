import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getApiUrl } from '@/lib/query-client';

const CATEGORIES = ["General", "Events", "Local", "Training", "Military", "Challenges", "Gear", "Social"];

export default function EditCommunityScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { communityId } = useLocalSearchParams<{ communityId: string }>();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [banner, setBanner] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  const baseUrl = (() => {
    try { return getApiUrl(); } catch { return null; }
  })();

  useEffect(() => {
    if (!baseUrl || !communityId) return;
    fetch(`${baseUrl}api/communities/${communityId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setName(data.name || '');
          setDescription(data.description || '');
          setCategory(data.category || '');
          setLocation(data.location || '');
          setBanner(data.banner || null);
        }
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [baseUrl, communityId]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      const mimeType = result.assets[0].mimeType || 'image/jpeg';
      setBanner(`data:${mimeType};base64,${result.assets[0].base64}`);
    }
  };

  const canSubmit = name.trim().length >= 3
    && description.trim().length >= 10
    && category
    && location.trim().length >= 1;

  async function handleSave() {
    setError('');
    if (!canSubmit) {
      setError('Please fill in all required fields');
      return;
    }
    if (!token || !baseUrl || !communityId) {
      setError('Missing required data');
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, string> = {
        name: name.trim(),
        description: description.trim(),
        category,
        location: location.trim(),
      };
      if (banner) body.banner = banner;

      const res = await fetch(`${baseUrl}api/communities/${communityId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to update community');
        return;
      }

      Alert.alert('Updated!', 'Community updated successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 40, alignItems: 'center' }]}>
        <ActivityIndicator color={Colors.burntOrange} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.bone} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>EDIT COMMUNITY</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>COVER IMAGE</Text>
          <TouchableOpacity style={styles.bannerPicker} onPress={pickImage}>
            {banner ? (
              <Image source={{ uri: banner }} style={styles.bannerPreview} />
            ) : (
              <View style={styles.bannerPlaceholder}>
                <Ionicons name="image-outline" size={32} color={Colors.textMuted} />
                <Text style={styles.bannerPlaceholderText}>Tap to select cover image</Text>
              </View>
            )}
            <View style={styles.bannerOverlayBtn}>
              <Ionicons name="camera" size={18} color={Colors.bone} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>COMMUNITY NAME</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="people-outline" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="Community name"
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={setName}
              maxLength={50}
            />
          </View>
          <Text style={styles.charCount}>{name.length}/50</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>DESCRIPTION</Text>
          <View style={[styles.inputWrap, styles.textAreaWrap]}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your community..."
              placeholderTextColor={Colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
          </View>
          <Text style={styles.charCount}>{description.length}/500</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>CATEGORY</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>LOCATION</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="location-outline" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Austin, TX or Nationwide"
              placeholderTextColor={Colors.textMuted}
              value={location}
              onChangeText={setLocation}
              maxLength={100}
            />
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.saveBtn, !canSubmit && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={loading || !canSubmit}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={Colors.bone} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={Colors.bone} />
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
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
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.darkCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 22,
    color: Colors.bone,
    letterSpacing: 2,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  bannerPicker: {
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    position: 'relative',
  },
  bannerPreview: {
    width: '100%',
    height: '100%',
  },
  bannerPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bannerPlaceholderText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
  },
  bannerOverlayBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.burntOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.darkCard,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  textAreaWrap: {
    alignItems: 'flex-start',
    minHeight: 100,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.bone,
  },
  textArea: {
    minHeight: 80,
  },
  charCount: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  categoryChipActive: {
    backgroundColor: Colors.forestGreen,
    borderColor: Colors.burntOrange,
  },
  categoryText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.textMuted,
  },
  categoryTextActive: {
    color: Colors.bone,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(220,38,38,0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.danger,
    flex: 1,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.burntOrange,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 18,
    color: Colors.bone,
    letterSpacing: 1,
  },
});
