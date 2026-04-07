import { useState, useCallback, useRef } from 'react';
import api from '../services/api';
import { cachePlaces, getCachedPlaces } from '../services/offline';

const usePlaces = () => {
  const [places, setPlaces] = useState([]);
  const [listPlaces, setListPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);
  const listAbortRef = useRef(null);

  // Fetch places visible on the map (with bbox — viewport-scoped)
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
      cachePlaces(data, category).catch(() => {});
      return data;
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return;

      if (!navigator.onLine) {
        const cached = await getCachedPlaces(category);
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

  // Fetch all places matching business filters (no bbox — for the list view)
  const fetchListPlaces = useCallback(async ({ category, search, sort, lat, lng, limit } = {}) => {
    // Cancel previous list request
    if (listAbortRef.current) listAbortRef.current.abort();
    const controller = new AbortController();
    listAbortRef.current = controller;

    try {
      const params = new URLSearchParams();
      // Intentionally no bbox: the list must show all matching places regardless of viewport
      if (category) params.set('category', category);
      if (search) params.set('search', search);
      if (sort) params.set('sort', sort);
      if (lat) params.set('lat', lat);
      if (lng) params.set('lng', lng);
      if (limit) params.set('limit', limit);

      const res = await api.get(`/places?${params}`, { signal: controller.signal });
      const data = res.data.data || [];
      setListPlaces(data);
      return data;
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return;

      if (!navigator.onLine) {
        const cached = await getCachedPlaces(category);
        if (cached && cached.length > 0) {
          setListPlaces(cached);
          return cached;
        }
      }
    }
  }, []);

  const createPlace = useCallback(async (formData) => {
    const res = await api.post('/places', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    setPlaces(prev => [res.data, ...prev]);
    setListPlaces(prev => [res.data, ...prev]);
    return res.data;
  }, []);

  const updatePlace = useCallback(async (id, formData) => {
    const res = await api.put(`/places/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    setPlaces(prev => prev.map(p => p.id === id ? res.data : p));
    setListPlaces(prev => prev.map(p => p.id === id ? res.data : p));
    return res.data;
  }, []);

  const deletePlace = useCallback(async (id) => {
    await api.delete(`/places/${id}`);
    setPlaces(prev => prev.filter(p => p.id !== id));
    setListPlaces(prev => prev.filter(p => p.id !== id));
  }, []);

  return {
    places,
    listPlaces,
    loading,
    error,
    fetchPlaces,
    fetchListPlaces,
    createPlace,
    updatePlace,
    deletePlace,
  };
};

export default usePlaces;
