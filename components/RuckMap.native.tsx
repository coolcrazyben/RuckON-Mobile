import React, { forwardRef } from 'react';
import { View, StyleSheet } from 'react-native';
import NativeMapView, { Polyline, Marker } from 'react-native-maps';
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

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c22' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a3d2d' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1d2c22' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#243630' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
];

const RuckMap = forwardRef<any, RuckMapProps>(({ currentPos, routeCoords, style }, ref) => {
  if (!currentPos) {
    return (
      <View style={styles.fallback}>
        <Ionicons name="map-outline" size={40} color={Colors.textMuted} />
      </View>
    );
  }

  return (
    <NativeMapView
      ref={ref}
      style={[styles.map, style]}
      initialRegion={{
        ...currentPos,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
      showsUserLocation={false}
      mapType="standard"
      customMapStyle={darkMapStyle}
    >
      {routeCoords.length >= 2 && (
        <Polyline
          coordinates={routeCoords}
          strokeColor={Colors.burntOrange}
          strokeWidth={4}
        />
      )}
      {currentPos && (
        <Marker coordinate={currentPos}>
          <View style={styles.markerDot}>
            <View style={styles.markerInner} />
          </View>
        </Marker>
      )}
    </NativeMapView>
  );
});

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    flex: 1,
    backgroundColor: Colors.darkCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(196, 98, 45, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.burntOrange,
  },
});

export default RuckMap;
