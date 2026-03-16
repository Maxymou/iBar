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

const PAGE_LIMIT = 50;

const RestaurantsPage = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [view, setView] = useState('list'); // 'list' | 'map'
  const [addOpen, setAddOpen] = useState(false);
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedItems, setArchivedItems] = useState([]);
  const { location, error: gpsError, getLocation } = useGeolocation();
  const { toast } = useToast();
  const navigate = useNavigate();

  const locationLat = location?.lat;
  const locationLng = location?.lng;

  const loadRestaurants = useCallback(async (loadMore = false) => {
    const currentOffset = loadMore ? offset : 0;
    try {
      const params = new URLSearchParams({ sort, limit: PAGE_LIMIT, offset: currentOffset });
      if (search) params.set('search', search);
      if (sort === 'distance' && locationLat && locationLng) {
        params.set('lat', locationLat);
        params.set('lng', locationLng);
      }

      const res = await api.get(`/restaurants?${params}`);
      const { data, total } = res.data;
      if (loadMore) {
        setRestaurants(prev => [...prev, ...data]);
      } else {
        setRestaurants(data);
        cacheData('restaurants', data).catch(() => {});
      }
      setOffset(currentOffset + data.length);
      setHasMore(currentOffset + data.length < total);
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
      setLoadingMore(false);
    }
  }, [search, sort, locationLat, locationLng, offset]);

  useEffect(() => { setOffset(0); setLoading(true); loadRestaurants(false); }, [search, sort, locationLat, locationLng]);

  const handleLoadMore = () => {
    setLoadingMore(true);
    loadRestaurants(true);
  };

  const handleLocationSort = () => {
    if (!location) getLocation();
  };

  const handleRecenterGps = () => {
    if (location) {
      setRecenterTrigger(t => t + 1);
    } else {
      setGpsLoading(true);
      getLocation();
    }
  };

  // When location arrives after pressing GPS button, trigger recenter
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

  const handleSaved = (saved) => {
    setRestaurants(prev => {
      const exists = prev.find(r => r.id === saved.id);
      if (exists) return prev.map(r => r.id === saved.id ? saved : r);
      return [saved, ...prev];
    });
  };

  const loadArchived = async () => {
    try {
      const res = await api.get('/restaurants/archived');
      setArchivedItems(res.data);
    } catch {
      toast('Erreur lors du chargement des éléments archivés', 'error');
    }
  };

  const toggleArchived = () => {
    const next = !showArchived;
    setShowArchived(next);
    if (next) loadArchived();
  };

  const handleRestore = async (id) => {
    try {
      await api.put(`/restaurants/${id}/restore`);
      setArchivedItems(prev => prev.filter(i => i.id !== id));
      toast('Restaurant restauré', 'success');
      loadRestaurants(false);
    } catch {
      toast('Erreur lors de la restauration', 'error');
    }
  };

  const filtered = restaurants;

  return (
    <div className="h-full flex flex-col">
      {/* Sub-header */}
      <div className="px-4 pt-3 pb-2 space-y-2 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
        <SearchBar value={search} onChange={setSearch} placeholder="Rechercher un restaurant..." />
        <div className="flex items-center gap-2">
          <SortToggle sort={sort} onChange={setSort} onLocationSort={handleLocationSort} />
          <button
            onClick={toggleArchived}
            className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 whitespace-nowrap"
          >
            {showArchived ? 'Masquer supprimés' : 'Voir les supprimés'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {view === 'list' ? (
          <div className="h-full overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 && !showArchived ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400 dark:text-gray-500">
                <span className="text-5xl mb-3">🍽️</span>
                <p className="text-sm">{search ? 'Aucun résultat' : 'Aucun restaurant'}</p>
              </div>
            ) : (
              <div className="p-4 space-y-3 pb-36">
                {filtered.map(r => <RestaurantCard key={r.id} restaurant={r} />)}
                {hasMore && (
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="w-full py-3 text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50"
                  >
                    {loadingMore ? 'Chargement...' : 'Charger plus'}
                  </button>
                )}
                {showArchived && archivedItems.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">Éléments supprimés</h3>
                    <div className="space-y-3">
                      {archivedItems.map(r => (
                        <div key={r.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl opacity-60">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{r.name}</p>
                            <p className="text-xs text-gray-400">{r.address || 'Pas d\'adresse'}</p>
                          </div>
                          <button
                            onClick={() => handleRestore(r.id)}
                            className="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg whitespace-nowrap"
                          >
                            Restaurer
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {showArchived && archivedItems.length === 0 && (
                  <p className="text-center text-sm text-gray-400 mt-4">Aucun élément supprimé</p>
                )}
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
              recenterTrigger={recenterTrigger}
            />
          </div>
        )}
      </div>

      {/* View toggle — centered, above GPS/FAB */}
      <button
        onClick={() => setView(v => v === 'list' ? 'map' : 'list')}
        className="fixed left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2
                   bg-gray-900 dark:bg-gray-700 text-white text-sm font-medium rounded-full shadow-ios
                   active:scale-95 transition-transform"
        style={{ bottom: 'var(--fab-bottom)' }}
      >
        {view === 'list' ? '🗺️ Carte' : '📋 Liste'}
      </button>

      {/* GPS recenter button — above FAB, right side */}
      <button
        onClick={handleRecenterGps}
        aria-label="Recentrer sur ma position"
        className="fixed right-4 z-40 w-12 h-12 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600
                   shadow-ios flex items-center justify-center text-xl
                   active:scale-95 transition-transform"
        style={{ bottom: 'var(--gps-bottom)' }}
      >
        {gpsLoading ? (
          <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        ) : '🎯'}
      </button>

      {/* FAB — add restaurant */}
      <button
        onClick={() => setAddOpen(true)}
        aria-label="Ajouter un restaurant"
        className="fab"
        style={{ bottom: 'var(--fab-bottom)' }}
      >
        +
      </button>

      <RestaurantForm isOpen={addOpen} onClose={() => setAddOpen(false)} onSaved={handleSaved} />
    </div>
  );
};

export default RestaurantsPage;
