import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AccommodationCard from './AccommodationCard';
import AccommodationForm from './AccommodationForm';
import MapView from '../map/MapView';
import SearchBar from '../ui/SearchBar';
import SortToggle from '../ui/SortToggle';
import { useToast } from '../ui/Toast';
import useGeolocation from '../../hooks/useGeolocation';
import api from '../../services/api';
import { cacheData, getCachedData } from '../../services/offline';

const AccommodationsPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [view, setView] = useState('list');
  const [addOpen, setAddOpen] = useState(false);
  const { location, getLocation } = useGeolocation();
  const { toast } = useToast();
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ sort });
      if (search) params.set('search', search);
      if (sort === 'distance' && location) {
        params.set('lat', location.lat);
        params.set('lng', location.lng);
      }

      const res = await api.get(`/accommodations?${params}`);
      setItems(res.data);
      cacheData('accommodations', res.data).catch(() => {});
    } catch {
      if (!navigator.onLine) {
        const cached = await getCachedData('accommodations');
        setItems(cached);
        toast('Mode hors ligne – données en cache', 'warning');
      } else {
        toast('Erreur lors du chargement', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [search, sort, location]);

  useEffect(() => { load(); }, [load]);

  const handleSaved = (saved) => {
    setItems(prev => {
      const exists = prev.find(i => i.id === saved.id);
      if (exists) return prev.map(i => i.id === saved.id ? saved : i);
      return [saved, ...prev];
    });
  };

  const filtered = items.filter(i =>
    !search || i.name?.toLowerCase().includes(search.toLowerCase()) ||
    i.address?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      {/* Sub-header */}
      <div className="px-4 pt-3 pb-2 space-y-2 bg-white border-b border-gray-100">
        <SearchBar value={search} onChange={setSearch} placeholder="Rechercher un hébergement..." />
        <SortToggle sort={sort} onChange={setSort} onLocationSort={() => { if (!location) getLocation(); }} />
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
                <span className="text-5xl mb-3">🏨</span>
                <p className="text-sm">{search ? 'Aucun résultat' : 'Aucun hébergement'}</p>
              </div>
            ) : (
              <div className="p-4 space-y-3 pb-32">
                {filtered.map(i => <AccommodationCard key={i.id} accommodation={i} />)}
              </div>
            )}
          </div>
        ) : (
          <div className="h-full">
            <MapView
              items={filtered}
              userLocation={location}
              type="accommodations"
              onView={i => navigate(`/hebergements/${i.id}`)}
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

      <AccommodationForm isOpen={addOpen} onClose={() => setAddOpen(false)} onSaved={handleSaved} />
    </div>
  );
};

export default AccommodationsPage;
