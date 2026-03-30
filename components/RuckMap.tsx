import React, { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';

interface Coord {
  latitude: number;
  longitude: number;
}

interface RuckMapProps {
  currentPos: Coord | null;
  routeCoords: Coord[];
  style?: any;
}

const RuckMap = forwardRef<any, RuckMapProps>(({ currentPos, routeCoords }, ref) => {
  return (
    <View style={styles.webMap}>
      <View style={styles.webMapContent}>
        <Ionicons name="map" size={32} color={Colors.burntOrange} />
        {currentPos ? (
          <>
            <Text style={styles.webMapCoords}>
              {currentPos.latitude.toFixed(4)}°, {currentPos.longitude.toFixed(4)}°
            </Text>
            {routeCoords.length > 0 && (
              <Text style={styles.webMapPoints}>{routeCoords.length} points tracked</Text>
            )}
          </>
        ) : (
          <Text style={styles.webMapText}>Acquiring GPS...</Text>
        )}
        <Text style={styles.webMapNote}>Map view available on mobile devices</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  webMap: {
    flex: 1,
    backgroundColor: Colors.darkCard,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  webMapContent: {
    alignItems: 'center',
    gap: 6,
  },
  webMapText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
  },
  webMapCoords: {
    fontFamily: 'Oswald_400Regular',
    fontSize: 14,
    color: Colors.bone,
    marginTop: 4,
  },
  webMapPoints: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  webMapNote: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 8,
  },
});

export default RuckMap;
