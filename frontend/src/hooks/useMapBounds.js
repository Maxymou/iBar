import { useState, useCallback, useRef } from 'react';

const useMapBounds = () => {
  const [bounds, setBounds] = useState(null);
  const [center, setCenter] = useState(null);
  const mapRef = useRef(null);

  const onMapMove = useCallback((map) => {
    const b = map.getBounds();
    const c = map.getCenter();
    setBounds({
      south: b.getSouth(),
      west: b.getWest(),
      north: b.getNorth(),
      east: b.getEast(),
    });
    setCenter({ lat: c.lat, lng: c.lng });
  }, []);

  const getBboxString = useCallback(() => {
    if (!bounds) return null;
    return `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
  }, [bounds]);

  return {
    bounds,
    center,
    mapRef,
    onMapMove,
    getBboxString,
  };
};

export default useMapBounds;
