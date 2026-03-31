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
  Modal,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getApiUrl } from '@/lib/query-client';

import * as Location from 'expo-location';
import RuckMap, { type RuckMapHandle } from '@/components/RuckMap';

interface CommunityOption {
  id: string;
  name: string;
  banner: string | null;
  challenges: {
    id: string;
    title: string;
    challengeType: string;
    goalValue: number;
    goalUnit: string;
    endDate: string;
    joined: boolean;
  }[];
}

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
  const [showShareModal, setShowShareModal] = useState(false);
  const [savedRuckId, setSavedRuckId] = useState<string | null>(null);
  const [savedRuckDistance, setSavedRuckDistance] = useState(0);
  const [communityOptions, setCommunityOptions] = useState<CommunityOption[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const [routeCoords, setRouteCoords] = useState<Coord[]>([]);
  const [currentPos, setCurrentPos] = useState<Coord | null>(null);
  const [gpsMiles, setGpsMiles] = useState(0);
  const [gpsElapsed, setGpsElapsed] = useState(0);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [gpsFinished, setGpsFinished] = useState(false);

  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mapRef = useRef<RuckMapHandle>(null);
  const startTimeRef = useRef<number>(0);

  const gpsIndicatorScale = useSharedValue(1);

  const baseUrl = (() => {
    try { return getApiUrl(); } catch { return null; }
  })();

  useEffect(() => {
    if (Location) {
      Location.requestForegroundPermissionsAsync().then((result) => {
        setLocationPermission(result.status === 'granted');
        if (result.status === 'granted') {
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then((loc) => {
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

    try {
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 5,
          timeInterval: 3000,
        },
        (loc) => {
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
    } catch {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      Alert.alert('GPS Error', 'Could not start location tracking. Please check your permissions.');
    }
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

  const discardRuck = useCallback(() => {
    Alert.alert(
      'Discard Ruck',
      'Are you sure you want to discard this ruck? All tracking data will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            if (watchRef.current) {
              watchRef.current.remove();
              watchRef.current = null;
            }
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            resetForm();
          },
        },
      ]
    );
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
    let ruckRouteImageUrl: string | undefined;

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
      if (mapRef.current) {
        const snapshot = await mapRef.current.takeSnapshot();
        if (snapshot) {
          ruckRouteImageUrl = snapshot;
        }
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
          routeImageUrl: ruckRouteImageUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: 'Failed to save ruck' }));
        throw new Error(data.message);
      }

      const savedData = await res.json();
      setSaved(true);
      setSavedRuckId(savedData.id);
      setSavedRuckDistance(ruckDistance);

      try {
        const commRes = await fetch(`${baseUrl}api/user/communities-with-challenges`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (commRes.ok) {
          const comms: CommunityOption[] = await commRes.json();
          if (comms.length > 0) {
            setCommunityOptions(comms);
            setSelectedCommunity(null);
            setSelectedChallenge(null);
            setTimeout(() => {
              setSaved(false);
              setShowShareModal(true);
            }, 800);
            return;
          }
        }
      } catch {}

      setTimeout(() => {
        resetForm();
      }, 1500);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Could not save ruck.';
      Alert.alert('Save Failed', message);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
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
    setSavedRuckId(null);
    setSavedRuckDistance(0);
    setShowShareModal(false);
    setCommunityOptions([]);
    setSelectedCommunity(null);
    setSelectedChallenge(null);
  };

  const handleShareToCommunity = async () => {
    if (!baseUrl || !token || !savedRuckId || !selectedCommunity || sharing) return;
    setSharing(true);
    try {
      const res = await fetch(`${baseUrl}api/rucks/${savedRuckId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          communityId: selectedCommunity,
          challengeId: selectedChallenge || undefined,
        }),
      });
      if (res.ok) {
        setShowShareModal(false);
        Alert.alert('Shared!', 'Your ruck has been posted to the community.');
        resetForm();
      } else {
        const data = await res.json().catch(() => ({ message: 'Failed to share' }));
        Alert.alert('Error', data.message);
      }
    } catch {
      Alert.alert('Error', 'Could not share ruck.');
    }
    setSharing(false);
  };

  const handleSkipShare = () => {
    setShowShareModal(false);
    resetForm();
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const gpsPace = formatPace(gpsMiles, gpsElapsed);

  if (gpsActive && mode === 'gps') {
    return (
      <View style={styles.fullScreenContainer}>
        <View style={StyleSheet.absoluteFill}>
          {locationPermission ? (
            <RuckMap ref={mapRef} currentPos={currentPos} routeCoords={routeCoords} />
          ) : (
            <View style={styles.mapFallback}>
              <Ionicons name="map-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.mapFallbackText}>Location permission required</Text>
            </View>
          )}
        </View>

        <View style={[styles.fsTopBar, { top: topPad + 8 }]}>
          <View style={styles.fsLiveBadge}>
            <View style={styles.gpsPulseDot} />
            <Text style={styles.gpsLiveText}>TRACKING</Text>
          </View>
        </View>

        <View style={[styles.fsBottomPanel, { paddingBottom: bottomPad + 90 }]}>
          <View style={styles.fsStatsRow}>
            <View style={styles.fsStatItem}>
              <Text style={styles.fsStatValue}>{gpsMiles.toFixed(2)}</Text>
              <Text style={styles.fsStatLabel}>miles</Text>
            </View>
            <View style={styles.fsStatDivider} />
            <View style={styles.fsStatItem}>
              <Text style={styles.fsStatValue}>{formatElapsed(gpsElapsed)}</Text>
              <Text style={styles.fsStatLabel}>time</Text>
            </View>
            <View style={styles.fsStatDivider} />
            <View style={styles.fsStatItem}>
              <Text style={styles.fsStatValue}>{gpsPace}</Text>
              <Text style={styles.fsStatLabel}>pace</Text>
            </View>
          </View>
          <View style={styles.fsButtonRow}>
            <TouchableOpacity style={styles.fsDiscardBtn} onPress={discardRuck}>
              <Ionicons name="trash-outline" size={20} color={Colors.bone} />
              <Text style={styles.fsDiscardText}>DISCARD</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.fsStopBtn} onPress={stopTracking}>
              <View style={styles.fsStopIcon} />
              <Text style={styles.fsStopText}>STOP</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

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
            <View style={styles.mapContainer}>
              {locationPermission ? (
                <RuckMap ref={mapRef} currentPos={currentPos} routeCoords={routeCoords} />
              ) : (
                <View style={styles.mapFallback}>
                  <Ionicons name="map-outline" size={40} color={Colors.textMuted} />
                  <Text style={styles.mapFallbackText}>Location permission required</Text>
                </View>
              )}
              {gpsFinished && routeCoords.length > 0 && (
                <View style={styles.gpsLiveRow}>
                  <Ionicons name="checkmark-circle" size={12} color={Colors.success} />
                  <Text style={[styles.gpsLiveText, { color: Colors.success }]}>ROUTE CAPTURED</Text>
                </View>
              )}
            </View>

            {gpsFinished ? (
              <View style={styles.gpsStats}>
                <View style={styles.gpsStatItem}>
                  <Text style={styles.gpsStatValue}>{gpsMiles.toFixed(2)}</Text>
                  <Text style={styles.gpsStatLabel}>miles</Text>
                </View>
                <View style={styles.gpsStatItem}>
                  <Text style={styles.gpsStatValue}>{formatElapsed(gpsElapsed)}</Text>
                  <Text style={styles.gpsStatLabel}>time</Text>
                </View>
                <View style={styles.gpsStatItem}>
                  <Text style={styles.gpsStatValue}>{gpsPace}</Text>
                  <Text style={styles.gpsStatLabel}>pace</Text>
                </View>
              </View>
            ) : null}

            {!gpsFinished && (
              <TouchableOpacity style={styles.gpsBtn} onPress={startTracking}>
                <Ionicons name="play" size={20} color={Colors.bone} />
                <Text style={styles.gpsBtnText}>Start Tracking</Text>
              </TouchableOpacity>
            )}

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

        {!saved && !saving && (mode === 'manual' ? (distance || weight || notes || hours || minutes || seconds) : gpsFinished) && (
          <TouchableOpacity style={styles.discardBtn} onPress={discardRuck}>
            <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
            <Text style={styles.discardBtnText}>Discard Ruck</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal
        visible={showShareModal}
        transparent
        animationType="slide"
        onRequestClose={handleSkipShare}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>SHARE TO COMMUNITY</Text>
              <TouchableOpacity onPress={handleSkipShare}>
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Post your {savedRuckDistance.toFixed(1)} mile ruck to a community
            </Text>

            <Text style={styles.sectionLabel}>SELECT COMMUNITY</Text>
            <FlatList
              data={communityOptions}
              keyExtractor={(item) => item.id}
              style={styles.communityList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.communityItem,
                    selectedCommunity === item.id && styles.communityItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedCommunity(item.id);
                    setSelectedChallenge(null);
                  }}
                >
                  <View style={styles.communityItemRow}>
                    <View style={styles.communityRadio}>
                      {selectedCommunity === item.id && <View style={styles.communityRadioDot} />}
                    </View>
                    <Text style={styles.communityItemName}>{item.name}</Text>
                  </View>
                  {selectedCommunity === item.id && item.challenges.length > 0 && (
                    <View style={styles.challengeSection}>
                      <Text style={styles.challengeSectionLabel}>TAG A CHALLENGE (optional)</Text>
                      {item.challenges.map((ch) => (
                        <TouchableOpacity
                          key={ch.id}
                          style={[
                            styles.challengeItem,
                            selectedChallenge === ch.id && styles.challengeItemSelected,
                          ]}
                          onPress={() => setSelectedChallenge(selectedChallenge === ch.id ? null : ch.id)}
                        >
                          <View style={styles.challengeCheck}>
                            {selectedChallenge === ch.id && (
                              <Ionicons name="checkmark" size={12} color={Colors.burntOrange} />
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.challengeItemTitle}>{ch.title}</Text>
                            <Text style={styles.challengeItemGoal}>
                              {ch.goalValue} {ch.goalUnit} {ch.joined ? '' : '(not joined)'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              )}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.skipBtn} onPress={handleSkipShare}>
                <Text style={styles.skipBtnText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.shareBtn, !selectedCommunity && styles.shareBtnDisabled]}
                onPress={handleShareToCommunity}
                disabled={!selectedCommunity || sharing}
              >
                <Ionicons name="share-outline" size={16} color={Colors.bone} />
                <Text style={styles.shareBtnText}>{sharing ? 'Sharing...' : 'Share'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  fullScreenContainer: {
    flex: 1,
    backgroundColor: Colors.charcoal,
  },
  fsTopBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  fsLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15,20,16,0.85)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 24,
  },
  fsBottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15,20,16,0.92)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    gap: 16,
  },
  fsStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  fsStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  fsStatValue: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 36,
    color: Colors.bone,
  },
  fsStatLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  fsStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(232,224,208,0.15)',
  },
  fsStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.danger,
    borderRadius: 16,
    paddingVertical: 18,
  },
  fsStopIcon: {
    width: 16,
    height: 16,
    borderRadius: 3,
    backgroundColor: Colors.bone,
  },
  fsStopText: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 18,
    color: Colors.bone,
    letterSpacing: 3,
  },
  fsButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fsDiscardBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.darkCard,
    borderRadius: 16,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  fsDiscardText: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 16,
    color: Colors.bone,
    letterSpacing: 2,
  },
  discardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    backgroundColor: 'rgba(255, 107, 107, 0.08)',
  },
  discardBtnText: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 15,
    color: '#FF6B6B',
    letterSpacing: 1.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.charcoal,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '80%',
    borderTopWidth: 1,
    borderColor: Colors.cardBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 20,
    color: Colors.bone,
    letterSpacing: 2,
  },
  modalSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 20,
  },
  sectionLabel: {
    fontFamily: 'Oswald_500Medium',
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  communityList: {
    maxHeight: 350,
  },
  communityItem: {
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  communityItemSelected: {
    borderColor: Colors.burntOrange,
  },
  communityItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  communityRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.burntOrange,
  },
  communityItemName: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 16,
    color: Colors.bone,
  },
  challengeSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  challengeSectionLabel: {
    fontFamily: 'Oswald_500Medium',
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  challengeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  challengeItemSelected: {
    backgroundColor: Colors.forestGreen,
  },
  challengeCheck: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeItemTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.bone,
  },
  challengeItemGoal: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  skipBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  skipBtnText: {
    fontFamily: 'Oswald_600SemiBold',
    fontSize: 15,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.burntOrange,
  },
  shareBtnDisabled: {
    opacity: 0.5,
  },
  shareBtnText: {
    fontFamily: 'Oswald_700Bold',
    fontSize: 15,
    color: Colors.bone,
    letterSpacing: 1,
  },
});
