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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useAuth } from '@/lib/auth';

const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useAuth();
  const [gender, setGender] = useState('');
  const [weight, setWeight] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleContinue() {
    setError('');
    if (!gender) {
      setError('Please select your gender');
      return;
    }
    if (!weight.trim() || isNaN(Number(weight)) || Number(weight) <= 0) {
      setError('Please enter a valid weight');
      return;
    }
    if (!location.trim()) {
      setError('Please enter your location');
      return;
    }

    setLoading(true);
    try {
      await completeOnboarding({
        gender,
        weight: Number(weight),
        location: location.trim(),
      });
      router.replace('/join-communities');
    } catch (e: any) {
      setError(e.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient
      colors={[Colors.forestGreen, Colors.charcoal, Colors.charcoal]}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.stepIndicator}>
              <View style={[styles.stepDot, styles.stepDotActive]} />
              <View style={styles.stepLine} />
              <View style={styles.stepDot} />
            </View>
            <Text style={styles.stepLabel}>Step 1 of 2</Text>
          </View>

          <Text style={styles.title}>Tell Us About Yourself</Text>
          <Text style={styles.subtitle}>
            Help us personalize your rucking experience
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={Colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>GENDER</Text>
          <View style={styles.genderGrid}>
            {GENDER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.genderOption,
                  gender === option && styles.genderOptionSelected,
                ]}
                onPress={() => setGender(option)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.genderOptionText,
                    gender === option && styles.genderOptionTextSelected,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>BODY WEIGHT (LBS)</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="barbell-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. 180"
              placeholderTextColor={Colors.textMuted}
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
            />
            <Text style={styles.inputSuffix}>lbs</Text>
          </View>

          <Text style={styles.label}>LOCATION</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="location-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Chicago, IL"
              placeholderTextColor={Colors.textMuted}
              value={location}
              onChangeText={setLocation}
              autoCapitalize="words"
            />
          </View>

          <TouchableOpacity
            style={[styles.continueBtn, loading && styles.continueBtnDisabled]}
            onPress={handleContinue}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={Colors.bone} />
            ) : (
              <>
                <Text style={styles.continueBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color={Colors.bone} />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
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
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: Colors.cardBorder,
    marginHorizontal: 8,
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
    marginBottom: 28,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(196, 67, 45, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(196, 67, 45, 0.3)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.danger,
    flex: 1,
  },
  label: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  genderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  genderOption: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  genderOptionSelected: {
    backgroundColor: Colors.burntOrange,
    borderColor: Colors.burntOrange,
  },
  genderOptionText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  genderOptionTextSelected: {
    color: Colors.bone,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 14,
    marginBottom: 24,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.bone,
  },
  inputSuffix: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.textMuted,
  },
  continueBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.burntOrange,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  continueBtnDisabled: {
    opacity: 0.7,
  },
  continueBtnText: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 18,
    color: Colors.bone,
    letterSpacing: 1,
  },
});
