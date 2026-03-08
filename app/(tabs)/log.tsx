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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import Colors from '@/constants/colors';

export default function LogRuckScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'manual' | 'gps'>('manual');
  const [distance, setDistance] = useState('');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [gpsActive, setGpsActive] = useState(false);
  const [saved, setSaved] = useState(false);

  const gpsIndicatorScale = useSharedValue(1);

  const gpsStyle = useAnimatedStyle(() => ({
    transform: [{ scale: gpsIndicatorScale.value }],
  }));

  const handleGpsToggle = () => {
    setGpsActive((prev) => {
      if (!prev) {
        gpsIndicatorScale.value = withTiming(1.2, { duration: 300 }, () => {
          gpsIndicatorScale.value = withTiming(1);
        });
      }
      return !prev;
    });
  };

  const handleSave = () => {
    if (!distance && mode === 'manual') {
      Alert.alert('Missing Info', 'Please enter a distance.');
      return;
    }
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setDistance('');
      setHours('');
      setMinutes('');
      setSeconds('');
      setWeight('');
      setNotes('');
      setGpsActive(false);
    }, 1500);
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>LOG RUCK</Text>
      </View>

      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'manual' && styles.modeBtnActive]}
          onPress={() => setMode('manual')}
        >
          <Ionicons
            name="create-outline"
            size={16}
            color={mode === 'manual' ? Colors.bone : Colors.textMuted}
          />
          <Text style={[styles.modeBtnText, mode === 'manual' && styles.modeBtnTextActive]}>
            Manual Entry
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'gps' && styles.modeBtnActive]}
          onPress={() => setMode('gps')}
        >
          <Ionicons
            name="navigate-outline"
            size={16}
            color={mode === 'gps' ? Colors.bone : Colors.textMuted}
          />
          <Text style={[styles.modeBtnText, mode === 'gps' && styles.modeBtnTextActive]}>
            GPS Tracking
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        {mode === 'gps' ? (
          <View style={styles.gpsSection}>
            <View style={styles.mapPlaceholder}>
              <View style={styles.mapGrid} />
              <Animated.View style={[styles.gpsPin, gpsStyle]}>
                <Ionicons name="navigate" size={28} color={Colors.burntOrange} />
              </Animated.View>
              {gpsActive && (
                <View style={styles.gpsLiveRow}>
                  <View style={styles.gpsPulseDot} />
                  <Text style={styles.gpsLiveText}>TRACKING ACTIVE</Text>
                </View>
              )}
            </View>
            <View style={styles.gpsStats}>
              <View style={styles.gpsStatItem}>
                <Text style={styles.gpsStatValue}>{gpsActive ? '0.0' : '--'}</Text>
                <Text style={styles.gpsStatLabel}>miles</Text>
              </View>
              <View style={styles.gpsStatItem}>
                <Text style={styles.gpsStatValue}>{gpsActive ? '00:00' : '--:--'}</Text>
                <Text style={styles.gpsStatLabel}>time</Text>
              </View>
              <View style={styles.gpsStatItem}>
                <Text style={styles.gpsStatValue}>{gpsActive ? '--:--' : '--'}</Text>
                <Text style={styles.gpsStatLabel}>pace</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.gpsBtn, gpsActive && styles.gpsBtnStop]}
              onPress={handleGpsToggle}
            >
              <Ionicons
                name={gpsActive ? 'stop' : 'play'}
                size={20}
                color={Colors.bone}
              />
              <Text style={styles.gpsBtnText}>
                {gpsActive ? 'Stop Tracking' : 'Start Tracking'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formSection}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>DISTANCE (miles)</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="walk-outline" size={18} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="0.0"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                  value={distance}
                  onChangeText={setDistance}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>DURATION</Text>
              <View style={styles.durationRow}>
                <View style={[styles.inputWrap, { flex: 1 }]}>
                  <TextInput
                    style={[styles.input, { textAlign: 'center' }]}
                    placeholder="hh"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={2}
                    value={hours}
                    onChangeText={setHours}
                  />
                </View>
                <Text style={styles.durationColon}>:</Text>
                <View style={[styles.inputWrap, { flex: 1 }]}>
                  <TextInput
                    style={[styles.input, { textAlign: 'center' }]}
                    placeholder="mm"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={2}
                    value={minutes}
                    onChangeText={setMinutes}
                  />
                </View>
                <Text style={styles.durationColon}>:</Text>
                <View style={[styles.inputWrap, { flex: 1 }]}>
                  <TextInput
                    style={[styles.input, { textAlign: 'center' }]}
                    placeholder="ss"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={2}
                    value={seconds}
                    onChangeText={setSeconds}
                  />
                </View>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>WEIGHT CARRIED (lbs)</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="fitness-outline" size={18} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                  value={weight}
                  onChangeText={setWeight}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>NOTES</Text>
              <View style={[styles.inputWrap, styles.notesWrap]}>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  placeholder="How did it go? Route notes, conditions..."
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  numberOfLines={4}
                  value={notes}
                  onChangeText={setNotes}
                  textAlignVertical="top"
                />
              </View>
            </View>

            <TouchableOpacity style={styles.photoBtn}>
              <Ionicons name="camera-outline" size={20} color={Colors.textSecondary} />
              <Text style={styles.photoBtnText}>Add Photos</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, saved && styles.saveBtnSuccess]}
          onPress={handleSave}
          activeOpacity={0.85}
        >
          {saved ? (
            <>
              <Ionicons name="checkmark" size={20} color={Colors.bone} />
              <Text style={styles.saveBtnText}>Ruck Saved!</Text>
            </>
          ) : (
            <Text style={styles.saveBtnText}>Save Ruck</Text>
          )}
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
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 28,
    color: Colors.bone,
    letterSpacing: 3,
  },
  modeToggle: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: Colors.darkCard,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
    borderRadius: 8,
  },
  modeBtnActive: {
    backgroundColor: Colors.forestGreen,
  },
  modeBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.textMuted,
  },
  modeBtnTextActive: {
    color: Colors.bone,
  },
  scroll: {
    paddingHorizontal: 16,
  },
  formSection: {
    gap: 16,
  },
  fieldGroup: {},
  fieldLabel: {
    fontFamily: 'Oswald_500Medium',
    fontSize: 11,
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
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 10,
  },
  input: {
    flex: 1,
    fontFamily: 'Oswald_400Regular',
    fontSize: 20,
    color: Colors.bone,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  durationColon: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 24,
    color: Colors.textMuted,
  },
  notesWrap: {
    alignItems: 'flex-start',
    paddingVertical: 14,
  },
  notesInput: {
    height: 100,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.darkCard,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderStyle: 'dashed',
    justifyContent: 'center',
  },
  photoBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  gpsSection: {
    gap: 16,
  },
  mapPlaceholder: {
    height: 260,
    backgroundColor: Colors.darkCard,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  mapGrid: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.08,
    borderWidth: 1,
    borderColor: Colors.mossGreen,
  },
  gpsPin: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsLiveRow: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15,20,16,0.8)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  gpsPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  gpsLiveText: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 11,
    color: Colors.success,
    letterSpacing: 1,
  },
  gpsStats: {
    flexDirection: 'row',
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  gpsStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  gpsStatValue: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 28,
    color: Colors.bone,
  },
  gpsStatLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.burntOrange,
    borderRadius: 12,
    paddingVertical: 16,
  },
  gpsBtnStop: {
    backgroundColor: Colors.danger,
  },
  gpsBtnText: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 16,
    color: Colors.bone,
    letterSpacing: 1,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.burntOrange,
    borderRadius: 14,
    paddingVertical: 18,
    marginTop: 24,
  },
  saveBtnSuccess: {
    backgroundColor: Colors.success,
  },
  saveBtnText: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 18,
    color: Colors.bone,
    letterSpacing: 2,
  },
});
