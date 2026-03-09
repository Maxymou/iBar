import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import RestaurantCard from './RestaurantCard';
import RestaurantForm from './RestaurantForm';
import MapView from '../map/MapView';
import SearchBar from '../ui/SearchBar';
import SortToggle from '../ui/SortToggle';
import { useToast } from '../ui/Toast';
import useGeolocation from '../../hooks/useGeolocation';
import api from '../../services/api';
import { cacheData, getCachedData } from '../../services/offline';

const RestaurantsPage = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [view, setView] = useState('list'); // 'list' | 'map'
  const [addOpen, setAddOpen] = useState(false);
  const { location, getLocation } = useGeolocation();
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadRestaurants = useCallback(async () => {
    try {
      const params = new URLSearchParams({ sort });
      if (search) params.set('search', search);
      if (sort === 'distance' && location) {
        params.set('lat', location.lat);
        params.set('lng', location.lng);
      }

      const res = await api.get(`/restaurants?${params}`);
      setRestaurants(res.data);
      cacheData('restaurants', res.data).catch(() => {});
    } catch (err) {
      if (!navigator.onLine) {
        const cached = await getCachedData('restaurants');
        setRestaurants(cached);
        toast('Mode hors ligne – données en cache', 'warning');
      } else {
        toast('Erreur lors du chargement', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [search, sort, location]);

  useEffect(() => { loadRestaurants(); }, [loadRestaurants]);

  const handleLocationSort = () => {
    if (!location) getLocation();
  };

  const handleSaved = (saved) => {
    setRestaurants(prev => {
      const exists = prev.find(r => r.id === saved.id);
      if (exists) return prev.map(r => r.id === saved.id ? saved : r);
      return [saved, ...prev];
    });
  };

  const filtered = restaurants.filter(r =>
    !search || r.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.address?.toLowerCase().includes(search.toLowerCase()) ||
    r.cuisine_type?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      {/* Sub-header */}
      <div className="px-4 pt-3 pb-2 space-y-2 bg-white border-b border-gray-100">
        <SearchBar value={search} onChange={setSearch} placeholder="Rechercher un restaurant..." />
        <SortToggle sort={sort} onChange={setSort} onLocationSort={handleLocationSort} />
      </div>

      {/* View toggle */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30">
        <button
          onClick={() => setView(v => v === 'list' ? 'map' : 'list')}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium
                     rounded-full shadow-ios active:scale-95 transition-transform"
        >
          {view === 'list' ? '🗺️ Carte' : '📋 Liste'}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {view === 'list' ? (
          <div className="h-full overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <span className="text-5xl mb-3">🍽️</span>
                <p className="text-sm">{search ? 'Aucun résultat' : 'Aucun restaurant'}</p>
              </div>
            ) : (
              <div className="p-4 space-y-3 pb-32">
                {filtered.map(r => <RestaurantCard key={r.id} restaurant={r} />)}
              </div>
            )}
          </div>
        ) : (
          <div className="h-full">
            <MapView
              items={filtered}
              userLocation={location}
              type="restaurants"
              onView={r => navigate(`/restaurants/${r.id}`)}
            />
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setAddOpen(true)}
        className="fab"
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      >
        +
      </button>

      {/* Add form */}
      <RestaurantForm isOpen={addOpen} onClose={() => setAddOpen(false)} onSaved={handleSaved} />
    </div>
  );
};

export default RestaurantsPage;
