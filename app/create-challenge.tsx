import React, { useState } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import Colors from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getApiUrl } from '@/lib/query-client';

const CHALLENGE_TYPES = [
  { value: 'distance', label: 'Distance', icon: 'navigate', unit: 'miles', placeholder: 'e.g. 50' },
  { value: 'weight', label: 'Weight Moved', icon: 'barbell', unit: 'lbs', placeholder: 'e.g. 10000' },
  { value: 'rucks', label: 'Total Rucks', icon: 'footsteps', unit: 'rucks', placeholder: 'e.g. 10' },
] as const;

const DURATION_PRESETS = [
  { label: '1 Week', days: 7 },
  { label: '2 Weeks', days: 14 },
  { label: '1 Month', days: 30 },
  { label: '2 Months', days: 60 },
];

export default function CreateChallengeScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { communityId } = useLocalSearchParams<{ communityId: string }>();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [challengeType, setChallengeType] = useState('distance');
  const [goalValue, setGoalValue] = useState('');
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const baseUrl = (() => {
    try { return getApiUrl(); } catch { return null; }
  })();

  const selectedType = CHALLENGE_TYPES.find(t => t.value === challengeType) || CHALLENGE_TYPES[0];

  const endDate = selectedDuration
    ? new Date(Date.now() + selectedDuration * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const canSubmit = title.trim().length >= 3
    && description.trim().length >= 10
    && challengeType
    && goalValue
    && parseInt(goalValue) > 0
    && selectedDuration;

  async function handleCreate() {
    setError('');
    if (!canSubmit) {
      setError('Please fill in all fields');
      return;
    }
    if (!token || !baseUrl || !communityId) {
      setError('Missing required data');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}api/communities/${communityId}/challenges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          challengeType,
          goalValue: parseInt(goalValue),
          goalUnit: selectedType.unit,
          endDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Failed to create challenge');
        return;
      }

      Alert.alert('Challenge Created!', `"${data.title}" is now live.`, [
        { text: 'OK', onPress: () => router.back() },
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
          <Text style={styles.headerTitle}>CREATE CHALLENGE</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>CHALLENGE TITLE</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="flash-outline" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="e.g. March Miles Challenge"
              placeholderTextColor={Colors.textMuted}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>
          <Text style={styles.charCount}>{title.length}/100</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>DESCRIPTION</Text>
          <View style={[styles.inputWrap, styles.textAreaWrap]}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe the challenge, rules, and what participants should aim for..."
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
          <Text style={styles.fieldLabel}>CHALLENGE TYPE</Text>
          <View style={styles.typeRow}>
            {CHALLENGE_TYPES.map(ct => (
              <TouchableOpacity
                key={ct.value}
                style={[styles.typeCard, challengeType === ct.value && styles.typeCardActive]}
                onPress={() => {
                  setChallengeType(ct.value);
                  setGoalValue('');
                }}
              >
                <Ionicons
                  name={ct.icon as keyof typeof Ionicons.glyphMap}
                  size={22}
                  color={challengeType === ct.value ? Colors.burntOrange : Colors.textMuted}
                />
                <Text style={[styles.typeLabel, challengeType === ct.value && styles.typeLabelActive]}>
                  {ct.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>GOAL ({selectedType.unit.toUpperCase()})</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="trophy-outline" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder={selectedType.placeholder}
              placeholderTextColor={Colors.textMuted}
              value={goalValue}
              onChangeText={(t) => setGoalValue(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
            />
            <Text style={styles.unitLabel}>{selectedType.unit}</Text>
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>DURATION</Text>
          <View style={styles.durationRow}>
            {DURATION_PRESETS.map(dp => (
              <TouchableOpacity
                key={dp.days}
                style={[styles.durationChip, selectedDuration === dp.days && styles.durationChipActive]}
                onPress={() => setSelectedDuration(dp.days)}
              >
                <Text style={[styles.durationText, selectedDuration === dp.days && styles.durationTextActive]}>
                  {dp.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {endDate && (
            <Text style={styles.endDatePreview}>
              Ends {new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
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
              <Ionicons name="flash" size={20} color={Colors.bone} />
              <Text style={styles.createBtnText}>Launch Challenge</Text>
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
  unitLabel: {
    fontFamily: 'Oswald_500Medium',
    fontSize: 14,
    color: Colors.textMuted,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  typeCardActive: {
    backgroundColor: Colors.forestGreen,
    borderColor: Colors.burntOrange,
  },
  typeLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.textMuted,
  },
  typeLabelActive: {
    color: Colors.bone,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  durationChip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  durationChipActive: {
    backgroundColor: Colors.forestGreen,
    borderColor: Colors.burntOrange,
  },
  durationText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.textMuted,
  },
  durationTextActive: {
    color: Colors.bone,
  },
  endDatePreview: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
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
