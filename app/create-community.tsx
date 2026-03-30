import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getApiUrl } from '@/lib/query-client';
import { US_CITIES } from '@/data/usCities';

const CATEGORIES = [
  { value: 'General', icon: 'people', label: 'General' },
  { value: 'Events', icon: 'calendar', label: 'Events' },
  { value: 'Local', icon: 'location', label: 'Local' },
  { value: 'Training', icon: 'barbell', label: 'Training' },
  { value: 'Military', icon: 'shield', label: 'Military' },
  { value: 'Challenges', icon: 'trophy', label: 'Challenges' },
  { value: 'Gear', icon: 'bag-handle', label: 'Gear' },
  { value: 'Social', icon: 'chatbubbles', label: 'Social' },
] as const;

export default function CreateCommunityScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const baseUrl = (() => {
    try { return getApiUrl(); } catch { return null; }
  })();

  const suggestions = useMemo(() => {
    if (!location || location.length < 2) return [];
    const q = location.toLowerCase();
    return US_CITIES.filter(c => c.toLowerCase().includes(q)).slice(0, 6);
  }, [location]);

  function selectCity(city: string) {
    setLocation(city);
    setShowSuggestions(false);
  }

  const canSubmit = name.trim().length >= 3 && description.trim().length >= 10 && category && location.trim();

  async function handleCreate() {
    setError('');
    if (!canSubmit) {
      setError('Please fill in all fields');
      return;
    }
    if (!token || !baseUrl) {
      setError('Please log in to create a community');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}api/communities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          category,
          location: location.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to create community');
        return;
      }

      Alert.alert('Community Created!', `${data.name} is now live.`, [
        { text: 'View Community', onPress: () => router.replace({ pathname: '/community/[id]', params: { id: data.id } }) },
        { text: 'Back to Explore', onPress: () => router.back() },
      ]);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
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
          <Text style={styles.title}>CREATE COMMUNITY</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>COMMUNITY NAME</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="people-outline" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Tampa Bay Ruckers"
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
              placeholder="What's this community about? Goals, activities, who should join..."
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
                key={cat.value}
                style={[styles.categoryChip, category === cat.value && styles.categoryChipActive]}
                onPress={() => setCategory(cat.value)}
              >
                <Ionicons
                  name={cat.icon as keyof typeof Ionicons.glyphMap}
                  size={16}
                  color={category === cat.value ? Colors.bone : Colors.textMuted}
                />
                <Text style={[styles.categoryText, category === cat.value && styles.categoryTextActive]}>
                  {cat.label}
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
              placeholder="City, State or Nationwide"
              placeholderTextColor={Colors.textMuted}
              value={location}
              onChangeText={(t) => { setLocation(t); setShowSuggestions(true); }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
          </View>
          {showSuggestions && suggestions.length > 0 && (
            <View style={styles.suggestionsBox}>
              {suggestions.map(city => (
                <TouchableOpacity
                  key={city}
                  style={styles.suggestionItem}
                  onPress={() => selectCity(city)}
                >
                  <Ionicons name="location" size={14} color={Colors.burntOrange} />
                  <Text style={styles.suggestionText}>{city}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.createBtn, !canSubmit && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={loading || !canSubmit}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={Colors.bone} />
          ) : (
            <>
              <Ionicons name="add-circle" size={20} color={Colors.bone} />
              <Text style={styles.createBtnText}>Create Community</Text>
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
  title: {
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
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
  suggestionsBox: {
    backgroundColor: Colors.darkCard,
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  suggestionText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
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
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.burntOrange,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
  },
  createBtnDisabled: {
    opacity: 0.5,
  },
  createBtnText: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 18,
    color: Colors.bone,
    letterSpacing: 1,
  },
});
