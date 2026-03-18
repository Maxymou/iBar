import { useState, useEffect, useCallback, useRef } from 'react';
import ExploreTopBar from './ExploreTopBar';
import ExploreCategoryPill from './ExploreCategoryPill';
import ExploreFloatingActions from './ExploreFloatingActions';
import ExploreListOverlay from './ExploreListOverlay';
import PlaceMapView from './PlaceMapView';
import PlaceForm from './PlaceForm';
import PlaceDetailOverlay from './PlaceDetailOverlay';
import useGeolocation from '../../hooks/useGeolocation';
import usePlaces from '../../hooks/usePlaces';
import useMapBounds from '../../hooks/useMapBounds';
import { useToast } from '../ui/Toast';

const ExplorePage = ({ onUserClick }) => {
  const [category, setCategory] = useState(null);
  const [listOpen, setListOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [editPlace, setEditPlace] = useState(null);
  const [sort, setSort] = useState('recent');
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const [recenterCoords, setRecenterCoords] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  const { location, error: gpsError, getLocation } = useGeolocation();
  const hasInitialCenter = useRef(false);
  const { places, loading, fetchPlaces, deletePlace } = usePlaces();
  const { center, onMapMove, getBboxString } = useMapBounds();
  const { toast } = useToast();

  const debounceRef = useRef(null);

  // Auto-request GPS on mount to center map on user position
  useEffect(() => {
    if (!location) getLocation();
  }, []);

  // Center map on first GPS fix (only once)
  useEffect(() => {
    if (location && !hasInitialCenter.current) {
      hasInitialCenter.current = true;
      setRecenterTrigger(t => t + 1);
    }
  }, [location]);

  // Fetch places when map moves or category changes
  const handleMapMove = useCallback((map) => {
    onMapMove(map);

    // Debounce API calls on map move
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const b = map.getBounds();
      const bbox = `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`;
      fetchPlaces({
        bbox,
        category,
        sort,
        lat: location?.lat,
        lng: location?.lng,
      });
    }, 300);
  }, [category, sort, location, fetchPlaces, onMapMove]);

  // Refetch when category or sort changes (use current bounds)
  useEffect(() => {
    const bbox = getBboxString();
    if (bbox) {
      fetchPlaces({
        bbox,
        category,
        sort,
        lat: location?.lat,
        lng: location?.lng,
      });
    }
  }, [category, sort]);

  // GPS handling
  const handleGpsClick = () => {
    if (location) {
      setRecenterTrigger(t => t + 1);
    } else {
      setGpsLoading(true);
      getLocation();
    }
  };

  useEffect(() => {
    if (location && gpsLoading) {
      setGpsLoading(false);
      setRecenterTrigger(t => t + 1);
    }
  }, [location]);

  useEffect(() => {
    if (gpsError && gpsLoading) {
      setGpsLoading(false);
      toast('Position GPS indisponible', 'warning');
    }
  }, [gpsError]);

  const handleSelectPlace = (place) => {
    // Recenter map on the selected place
    setRecenterCoords([place.lat, place.lng]);
    setRecenterTrigger(t => t + 1);
    setSelectedPlace(place);
    setListOpen(false);
  };

  const handleSaved = useCallback((saved) => {
    // Refetch current view
    const bbox = getBboxString();
    if (bbox) {
      fetchPlaces({ bbox, category, sort, lat: location?.lat, lng: location?.lng });
    }
    setAddOpen(false);
    setEditPlace(null);
  }, [getBboxString, fetchPlaces, category, sort, location]);

  const handleDelete = useCallback(async (id) => {
    try {
      await deletePlace(id);
      setSelectedPlace(null);
      toast('Lieu supprimé', 'success');
    } catch {
      toast('Erreur lors de la suppression', 'error');
    }
  }, [deletePlace, toast]);

  const handleEdit = (place) => {
    setSelectedPlace(null);
    setEditPlace(place);
    setAddOpen(true);
  };

  return (
    <div className="relative h-full w-full">
      {/* Full screen map */}
      <PlaceMapView
        places={places}
        userLocation={location}
        onMapMove={handleMapMove}
        onSelectPlace={handleSelectPlace}
        recenterTrigger={recenterTrigger}
        recenterCenter={recenterCoords}
      />

      {/* Top bar */}
      <ExploreTopBar
        onUserClick={onUserClick}
        onListClick={() => setListOpen(!listOpen)}
        listOpen={listOpen}
      />

      {/* Category pills */}
      <ExploreCategoryPill selected={category} onChange={setCategory} />

      {/* Floating actions */}
      <ExploreFloatingActions
        onGpsClick={handleGpsClick}
        onAddClick={() => { setEditPlace(null); setAddOpen(true); }}
        gpsLoading={gpsLoading}
      />

      {/* List overlay */}
      <ExploreListOverlay
        isOpen={listOpen}
        places={places}
        loading={loading}
        sort={sort}
        onSortChange={setSort}
        onSelectPlace={handleSelectPlace}
        onClose={() => setListOpen(false)}
      />

      {/* Place detail overlay */}
      {selectedPlace && (
        <PlaceDetailOverlay
          place={selectedPlace}
          onClose={() => setSelectedPlace(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Add/Edit form */}
      <PlaceForm
        isOpen={addOpen}
        onClose={() => { setAddOpen(false); setEditPlace(null); }}
        place={editPlace}
        onSaved={handleSaved}
        mapCenter={center}
        defaultCategory={category}
      />
    </div>
  );
};

export default ExplorePage;
