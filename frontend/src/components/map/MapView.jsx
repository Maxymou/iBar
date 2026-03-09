import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const userIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
      <circle cx="12" cy="12" r="10" fill="#1d4ed8" stroke="white" stroke-width="2"/>
      <circle cx="12" cy="12" r="4" fill="white"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

const restaurantIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 48" width="40" height="48">
      <ellipse cx="20" cy="44" rx="8" ry="4" fill="rgba(0,0,0,0.2)"/>
      <path d="M20 0 C9 0 0 9 0 20 C0 32 20 48 20 48 C20 48 40 32 40 20 C40 9 31 0 20 0Z" fill="#ef4444"/>
      <text x="20" y="26" font-size="16" text-anchor="middle" fill="white">🍽️</text>
    </svg>
  `),
  iconSize: [40, 48],
  iconAnchor: [20, 48],
  popupAnchor: [0, -48],
});

const accommodationIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 48" width="40" height="48">
      <ellipse cx="20" cy="44" rx="8" ry="4" fill="rgba(0,0,0,0.2)"/>
      <path d="M20 0 C9 0 0 9 0 20 C0 32 20 48 20 48 C20 48 40 32 40 20 C40 9 31 0 20 0Z" fill="#8b5cf6"/>
      <text x="20" y="26" font-size="16" text-anchor="middle" fill="white">🏨</text>
    </svg>
  `),
  iconSize: [40, 48],
  iconAnchor: [20, 48],
  popupAnchor: [0, -48],
});

const RecenterMap = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

const MapView = ({ items, userLocation, type, onView }) => {
  const defaultCenter = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [48.8566, 2.3522]; // Paris

  const icon = type === 'restaurants' ? restaurantIcon : accommodationIcon;

  return (
    <MapContainer
      center={defaultCenter}
      zoom={13}
      className="w-full h-full"
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {userLocation && (
        <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
          <Popup>
            <div className="text-center">
              <p className="font-semibold">Vous êtes ici</p>
            </div>
          </Popup>
        </Marker>
      )}

      {items.filter(item => item.latitude && item.longitude).map(item => (
        <Marker key={item.id} position={[item.latitude, item.longitude]} icon={icon}>
          <Popup>
            <div className="text-center min-w-[120px]">
              <p className="font-semibold text-gray-900 mb-2">{item.name}</p>
              {item.address && <p className="text-xs text-gray-500 mb-2">{item.address}</p>}
              <button
                onClick={() => onView(item)}
                className="px-4 py-1.5 bg-primary-600 text-white text-xs font-medium
                           rounded-lg w-full"
              >
                Voir
              </button>
            </div>
          </Popup>
        </Marker>
      ))}

      {userLocation && <RecenterMap center={null} />}
    </MapContainer>
  );
};

export default MapView;
