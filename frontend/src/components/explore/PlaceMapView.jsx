import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from '../../store/ThemeContext';

// Fix leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const userIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
      <circle cx="12" cy="12" r="10" fill="#1d4ed8" stroke="white" stroke-width="2"/>
      <circle cx="12" cy="12" r="4" fill="white"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

const makeIcon = (color, emoji) => new L.Icon({
  iconUrl: 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 48" width="40" height="48">
      <ellipse cx="20" cy="44" rx="8" ry="4" fill="rgba(0,0,0,0.2)"/>
      <path d="M20 0 C9 0 0 9 0 20 C0 32 20 48 20 48 C20 48 40 32 40 20 C40 9 31 0 20 0Z" fill="${color}"/>
      <text x="20" y="26" font-size="16" text-anchor="middle" fill="white">${emoji}</text>
    </svg>
  `),
  iconSize: [40, 48],
  iconAnchor: [20, 48],
  popupAnchor: [0, -48],
});

const ICONS = {
  cafe: makeIcon('#d97706', '☕'),
  restaurant: makeIcon('#ef4444', '🍽️'),
  hotel: makeIcon('#8b5cf6', '🏨'),
};

// ─── iOS PWA resize fix ────────────────────────────────────────────────────
// After orientation changes on iOS PWA, the Leaflet container may have a new
// size but the map's internal cache is stale. invalidateSize() forces Leaflet
// to re-read its container dimensions and redraw tiles accordingly.
//
// Additional coverage beyond plain 'resize':
//   - Staggered invalidation on mount: catches late container sizing from
//     iOS PWA viewport stabilisation (~600 ms after launch).
//   - focusout: after keyboard close, iOS may briefly mis-report the viewport
//     height; staggered recalcs ensure Leaflet re-reads the final size.
//   - visibilitychange: map container can change size while the PWA is in
//     the background (e.g. rotation while backgrounded).
const MapResizeHandler = () => {
  const map = useMap();

  useEffect(() => {
    const invalidate = () => map.invalidateSize({ animate: false });

    // Immediate invalidation + staggered follow-ups for iOS PWA late sizing.
    invalidate();
    [100, 300, 600].forEach(ms => setTimeout(invalidate, ms));

    let tid;
    const debounced = () => { clearTimeout(tid); tid = setTimeout(invalidate, 100); };

    const onOrientation = () => {
      // 200 ms for the first pass, then a slower follow-up for older devices.
      setTimeout(invalidate, 200);
      setTimeout(invalidate, 600);
    };

    // After keyboard close: iOS viewport height can take 300–800 ms to settle;
    // staggered recalcs ensure Leaflet always reflects the final container size.
    const onFocusOut = () => {
      [150, 400, 800].forEach(ms => setTimeout(invalidate, ms));
    };

    // Recover from a stale container size after the PWA returns from background.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') setTimeout(invalidate, 100);
    };

    window.addEventListener('resize', debounced);
    window.addEventListener('orientationchange', onOrientation);
    document.addEventListener('focusout', onFocusOut);
    document.addEventListener('visibilitychange', onVisibility);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', debounced);
    }

    return () => {
      clearTimeout(tid);
      window.removeEventListener('resize', debounced);
      window.removeEventListener('orientationchange', onOrientation);
      document.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('visibilitychange', onVisibility);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', debounced);
      }
    };
  }, [map]);

  return null;
};

const MapEvents = ({ onMapMove }) => {
  const map = useMap();

  useMapEvents({
    moveend: () => onMapMove(map),
    zoomend: () => onMapMove(map),
  });

  // Fire initial bounds
  useEffect(() => {
    onMapMove(map);
  }, []);

  return null;
};

const RecenterMap = ({ center, trigger }) => {
  const map = useMap();
  const prevTrigger = useRef(trigger);

  useEffect(() => {
    if (trigger !== prevTrigger.current && center) {
      map.setView(center, 15, { animate: true });
      prevTrigger.current = trigger;
    }
  }, [trigger, center, map]);

  return null;
};

// Inner component to access map instance for closing popups on selection
const PlaceMarkers = ({ places, onSelectPlace }) => {
  const map = useMap();

  return places.filter(p => p.lat && p.lng).map(place => (
    <Marker
      key={place.id}
      position={[place.lat, place.lng]}
      icon={ICONS[place.category] || ICONS.restaurant}
    >
      <Popup>
        <div className="text-center min-w-[140px]">
          <p className="font-semibold text-gray-900 mb-1">{place.name}</p>
          <p className="text-xs text-gray-500 mb-1 capitalize">{place.category}</p>
          {place.address && <p className="text-xs text-gray-400 mb-2">{place.address}</p>}
          <button
            onClick={() => {
              map.closePopup();
              onSelectPlace(place);
            }}
            className="px-4 py-1.5 bg-primary-600 text-white text-xs font-medium
                       rounded-lg w-full"
          >
            Voir
          </button>
        </div>
      </Popup>
    </Marker>
  ));
};

const TILE_LAYERS = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  },
};

const PlaceMapView = ({ places, userLocation, onMapMove, onSelectPlace, recenterTrigger, recenterCenter, mapStyle = 'standard' }) => {
  const { effectiveTheme } = useTheme();
  const tileKey = mapStyle === 'satellite' ? 'satellite' : effectiveTheme;
  const tiles = TILE_LAYERS[tileKey] || TILE_LAYERS.dark;

  const defaultCenter = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [48.8566, 2.3522];

  // Use recenterCenter (e.g. selected place) if provided, else user location
  const currentRecenterTarget = recenterCenter
    || (userLocation ? [userLocation.lat, userLocation.lng] : null);

  return (
    <MapContainer
      center={defaultCenter}
      zoom={13}
      className="w-full h-full"
      zoomControl={false}
    >
      <TileLayer
        key={tileKey}
        attribution={tiles.attribution}
        url={tiles.url}
      />

      <MapResizeHandler />
      <MapEvents onMapMove={onMapMove} />

      {userLocation && (
        <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
          <Popup>
            <div className="text-center">
              <p className="font-semibold">Vous êtes ici</p>
            </div>
          </Popup>
        </Marker>
      )}

      <PlaceMarkers places={places} onSelectPlace={onSelectPlace} />

      <RecenterMap
        center={currentRecenterTarget}
        trigger={recenterTrigger}
      />
    </MapContainer>
  );
};

export default PlaceMapView;
