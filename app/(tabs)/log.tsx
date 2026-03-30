import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { useAuth } from '@/lib/auth';
import { getApiUrl } from '@/lib/query-client';

import * as Location from 'expo-location';
import RuckMap from '@/components/RuckMap';

interface Coord {
  latitude: number;
  longitude: number;
}

function haversineDistance(c1: Coord, c2: Coord): number {
  const R = 3958.8;
  const dLat = ((c2.latitude - c1.latitude) * Math.PI) / 180;
  const dLon = ((c2.longitude - c1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((c1.latitude * Math.PI) / 180) *
      Math.cos((c2.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatPace(miles: number, seconds: number): string {
  if (miles <= 0 || seconds <= 0) return '--:--';
  const paceMin = seconds / 60 / miles;
  const mins = Math.floor(paceMin);
  const secs = Math.round((paceMin - mins) * 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export default function LogRuckScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [mode, setMode] = useState<'manual' | 'gps'>('manual');
  const [distance, setDistance] = useState('');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [gpsActive, setGpsActive] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [routeCoords, setRouteCoords] = useState<Coord[]>([]);
  const [currentPos, setCurrentPos] = useState<Coord | null>(null);
  const [gpsMiles, setGpsMiles] = useState(0);
  const [gpsElapsed, setGpsElapsed] = useState(0);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [gpsFinished, setGpsFinished] = useState(false);

  const watchRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);

  const gpsIndicatorScale = useSharedValue(1);
  const gpsStyle = useAnimatedStyle(() => ({
    transform: [{ scale: gpsIndicatorScale.value }],
  }));

  const baseUrl = (() => {
    try { return getApiUrl(); } catch { return null; }
  })();

  useEffect(() => {
    if (Location) {
      Location.requestForegroundPermissionsAsync().then((result: any) => {
        setLocationPermission(result.status === 'granted');
        if (result.status === 'granted') {
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then((loc: any) => {
            setCurrentPos({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
          }).catch(() => {});
        }
      });
    }
  }, []);

  const startTracking = useCallback(async () => {
    if (!Location || !locationPermission) {
      Alert.alert('Location Required', 'Please enable location permissions to use GPS tracking.');
      return;
    }

    setRouteCoords([]);
    setGpsMiles(0);
    setGpsElapsed(0);
    setGpsFinished(false);
    startTimeRef.current = Date.now();

    gpsIndicatorScale.value = withTiming(1.2, { duration: 300 }, () => {
      gpsIndicatorScale.value = withTiming(1);
    });

    timerRef.current = setInterval(() => {
      setGpsElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 5,
        timeInterval: 3000,
      },
      (loc: any) => {
        const newCoord: Coord = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setCurrentPos(newCoord);
        setRouteCoords((prev) => {
          const updated = [...prev, newCoord];
          if (updated.length >= 2) {
            let total = 0;
            for (let i = 1; i < updated.length; i++) {
              total += haversineDistance(updated[i - 1], updated[i]);
            }
            setGpsMiles(total);
          }
          return updated;
        });
      }
    );
    watchRef.current = sub;
    setGpsActive(true);
  }, [locationPermission, gpsIndicatorScale]);

  const stopTracking = useCallback(() => {
    if (watchRef.current) {
      watchRef.current.remove();
      watchRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setGpsActive(false);
    setGpsFinished(true);
    setGpsElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
  }, []);

  useEffect(() => {
    return () => {
      if (watchRef.current) watchRef.current.remove();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleSave = async () => {
    if (saving) return;

    let ruckDistance: number;
    let ruckDurationSeconds: number | undefined;
    let ruckWeight: number | undefined;
    let ruckNotes: string | undefined;
    let ruckRouteCoordinates: string | undefined;

    if (mode === 'gps') {
      if (!gpsFinished) {
        if (gpsActive) {
          stopTracking();
        } else {
          Alert.alert('No Data', 'Start and complete a GPS tracking session first.');
          return;
        }
      }
      ruckDistance = gpsMiles;
      ruckDurationSeconds = gpsElapsed;
      ruckWeight = weight ? parseInt(weight) : undefined;
      ruckNotes = notes || undefined;
      if (routeCoords.length > 0) {
        ruckRouteCoordinates = JSON.stringify(routeCoords);
      }
    } else {
      if (!distance) {
        Alert.alert('Missing Info', 'Please enter a distance.');
        return;
      }
      ruckDistance = parseFloat(distance);
      if (isNaN(ruckDistance) || ruckDistance <= 0) {
        Alert.alert('Invalid Distance', 'Please enter a valid distance.');
        return;
      }
      const h = parseInt(hours) || 0;
      const m = parseInt(minutes) || 0;
      const s = parseInt(seconds) || 0;
      if (h > 0 || m > 0 || s > 0) {
        ruckDurationSeconds = h * 3600 + m * 60 + s;
      }
      ruckWeight = weight ? parseInt(weight) : undefined;
      ruckNotes = notes || undefined;
    }

    if (!baseUrl || !token) {
      Alert.alert('Error', 'Not connected to server.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${baseUrl}api/rucks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          distance: ruckDistance,
          durationSeconds: ruckDurationSeconds,
          weight: ruckWeight,
          notes: ruckNotes,
          routeCoordinates: ruckRouteCoordinates,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: 'Failed to save ruck' }));
        throw new Error(data.message);
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
        setGpsFinished(false);
        setRouteCoords([]);
        setGpsMiles(0);
        setGpsElapsed(0);
      }, 1500);
    } catch (e: any) {
      Alert.alert('Save Failed', e.message || 'Could not save ruck.');
    } finally {
      setSaving(false);
    }
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const gpsPace = formatPace(gpsMiles, gpsElapsed);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>LOG RUCK</Text>
      </View>

      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'manual' && styles.modeBtnActive]}
          onPress={() => { if (!gpsActive) setMode('manual'); }}
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
          onPress={() => { if (!gpsActive) setMode('gps'); }}
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
            <View style={styles.mapContainer}>
              {locationPermission ? (
                <RuckMap
                  ref={mapRef}
                  currentPos={currentPos}
                  routeCoords={routeCoords}
                />
              ) : (
                <View style={styles.mapFallback}>
                  <Ionicons name="map-outline" size={40} color={Colors.textMuted} />
                  <Text style={styles.mapFallbackText}>Location permission required</Text>
                </View>
              )}
              {gpsActive && (
                <View style={styles.gpsLiveRow}>
                  <View style={styles.gpsPulseDot} />
                  <Text style={styles.gpsLiveText}>TRACKING ACTIVE</Text>
                </View>
              )}
              {gpsFinished && !gpsActive && routeCoords.length > 0 && (
                <View style={styles.gpsLiveRow}>
                  <Ionicons name="checkmark-circle" size={12} color={Colors.success} />
                  <Text style={[styles.gpsLiveText, { color: Colors.success }]}>ROUTE CAPTURED</Text>
                </View>
              )}
            </View>
            <View style={styles.gpsStats}>
              <View style={styles.gpsStatItem}>
                <Text style={styles.gpsStatValue}>
                  {gpsActive || gpsFinished ? gpsMiles.toFixed(2) : '--'}
                </Text>
                <Text style={styles.gpsStatLabel}>miles</Text>
              </View>
              <View style={styles.gpsStatItem}>
                <Text style={styles.gpsStatValue}>
                  {gpsActive || gpsFinished ? formatElapsed(gpsElapsed) : '--:--'}
                </Text>
                <Text style={styles.gpsStatLabel}>time</Text>
              </View>
              <View style={styles.gpsStatItem}>
                <Text style={styles.gpsStatValue}>{gpsActive || gpsFinished ? gpsPace : '--:--'}</Text>
                <Text style={styles.gpsStatLabel}>pace</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.gpsBtn, gpsActive && styles.gpsBtnStop]}
              onPress={gpsActive ? stopTracking : startTracking}
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
                  numberOfLines={3}
                  value={notes}
                  onChangeText={setNotes}
                  textAlignVertical="top"
                />
              </View>
            </View>
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
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, saved && styles.saveBtnSuccess, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={saving || saved}
        >
          {saved ? (
            <>
              <Ionicons name="checkmark" size={20} color={Colors.bone} />
              <Text style={styles.saveBtnText}>Ruck Saved!</Text>
            </>
          ) : saving ? (
            <Text style={styles.saveBtnText}>Saving...</Text>
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
    height: 80,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  gpsSection: {
    gap: 16,
  },
  mapContainer: {
    height: 280,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapFallback: {
    flex: 1,
    backgroundColor: Colors.darkCard,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapFallbackText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
  },
  gpsLiveRow: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15,20,16,0.85)',
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
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 18,
    color: Colors.bone,
    letterSpacing: 2,
  },
});
