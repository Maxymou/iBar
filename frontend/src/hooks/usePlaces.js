import { useState, useCallback, useRef } from 'react';
import api from '../services/api';
import { cacheData, getCachedData } from '../services/offline';

const usePlaces = () => {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const fetchPlaces = useCallback(async ({ bbox, category, search, sort, lat, lng, limit } = {}) => {
    // Cancel previous request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (bbox) params.set('bbox', bbox);
      if (category) params.set('category', category);
      if (search) params.set('search', search);
      if (sort) params.set('sort', sort);
      if (lat) params.set('lat', lat);
      if (lng) params.set('lng', lng);
      if (limit) params.set('limit', limit);

      const res = await api.get(`/places?${params}`, { signal: controller.signal });
      const data = res.data.data || [];
      setPlaces(data);
      cacheData('places', data).catch(() => {});
      return data;
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return;

      if (!navigator.onLine) {
        const cached = await getCachedData('places');
        if (cached && cached.length > 0) {
          setPlaces(cached);
          return cached;
        }
      }
      setError('Erreur lors du chargement des lieux');
    } finally {
      setLoading(false);
    }
  }, []);

  const createPlace = useCallback(async (formData) => {
    const res = await api.post('/places', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    setPlaces(prev => [res.data, ...prev]);
    return res.data;
  }, []);

  const updatePlace = useCallback(async (id, formData) => {
    const res = await api.put(`/places/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    setPlaces(prev => prev.map(p => p.id === id ? res.data : p));
    return res.data;
  }, []);

  const deletePlace = useCallback(async (id) => {
    await api.delete(`/places/${id}`);
    setPlaces(prev => prev.filter(p => p.id !== id));
  }, []);

  return {
    places,
    loading,
    error,
    fetchPlaces,
    createPlace,
    updatePlace,
    deletePlace,
  };
};

export default usePlaces;
