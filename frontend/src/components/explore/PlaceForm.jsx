import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import ConfirmModal from '../ui/ConfirmModal';
import ImageUpload from '../ui/ImageUpload';
import StarRating from '../ui/StarRating';
import { useToast } from '../ui/Toast';
import api from '../../services/api';

const CATEGORIES = [
  { key: 'cafe', label: 'Café', icon: '☕' },
  { key: 'restaurant', label: 'Restaurant', icon: '🍽️' },
  { key: 'hotel', label: 'Hôtel', icon: '🏨' },
];

const PlaceForm = ({ isOpen, onClose, place, onSaved, mapCenter, defaultCategory, onDelete }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState('');
  const [deletePhoto, setDeletePhoto] = useState(false);
  const [googleUrl, setGoogleUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', category: defaultCategory || 'restaurant', description: '',
    address: '', phone: '', rating: 0, lat: '', lng: '',
  });

  useEffect(() => {
    if (place) {
      setForm({
        name: place.name || '',
        category: place.category || 'restaurant',
        description: place.description || '',
        address: place.address || '',
        phone: place.phone || '',
        rating: place.rating || 0,
        lat: place.lat || '',
        lng: place.lng || '',
      });
      setPreview(place.photo_url || '');
      setDeletePhoto(false);
    } else {
      setForm({
        name: '', category: defaultCategory || 'restaurant', description: '',
        address: '', phone: '', rating: 0, lat: '', lng: '',
      });
      setPreview('');
      setPhoto(null);
      setDeletePhoto(false);
      setGoogleUrl('');
    }
  }, [place, isOpen, defaultCategory]);

  useEffect(() => {
    return () => {
      if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handlePhotoChange = (file) => {
    if (file) {
      setPhoto(file);
      setPreview(URL.createObjectURL(file));
      setDeletePhoto(false);
    } else {
      setPhoto(null);
      setPreview('');
      setDeletePhoto(true);
    }
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      toast('Géolocalisation non supportée', 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setForm(p => ({ ...p, lat, lng }));
        reverseGeocode(lat, lng);
        toast('Position récupérée', 'success');
      },
      () => toast('Impossible d\'obtenir la position', 'error')
    );
  };

  const handleUseMapCenter = () => {
    if (mapCenter) {
      const lat = mapCenter.lat.toFixed(6);
      const lng = mapCenter.lng.toFixed(6);
      setForm(p => ({ ...p, lat, lng }));
      reverseGeocode(lat, lng);
      toast('Centre de la carte utilisé', 'success');
    }
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await api.post('/geocode/reverse', { lat, lng });
      if (res.data.address) {
        setForm(p => ({ ...p, address: res.data.address }));
      }
    } catch {
      // Silently fail
    }
  };

  const handleGoogleImport = async () => {
    if (!googleUrl.trim()) return;
    setImporting(true);
    try {
      const res = await api.post('/places/import-google', { google_maps_url: googleUrl });
      const data = res.data;
      setForm(p => ({
        ...p,
        name: data.name || p.name,
        address: data.address || p.address,
        lat: data.lat ? String(data.lat) : p.lat,
        lng: data.lng ? String(data.lng) : p.lng,
      }));
      setGoogleUrl('');
      toast('Données importées depuis Google Maps', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Erreur lors de l\'import', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast('Le nom est obligatoire', 'error');
      return;
    }
    if (!form.lat || !form.lng) {
      toast('La localisation est obligatoire', 'error');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined) fd.append(k, v); });
      if (photo) fd.append('photo', photo);
      if (deletePhoto && place) fd.append('remove_photo', 'true');

      let res;
      if (place) {
        res = await api.put(`/places/${place.id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        res = await api.post('/places', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      onSaved(res.data);
      onClose();
      toast(place ? 'Lieu modifié' : 'Lieu ajouté', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Erreur lors de l\'enregistrement', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await onDelete(place.id);
      onClose();
    } catch {
      // Error is handled in the parent's handleDelete
    }
  };

  const set = (field) => (e) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={place ? 'Modifier le lieu' : 'Ajouter un lieu'}
        footer={
          <div className="space-y-3">
            <div className="flex gap-3">
              <button onClick={onClose} className="ios-button-secondary flex-1">Annuler</button>
              <button onClick={handleSubmit} disabled={loading}
                      className="ios-button-primary flex-1 disabled:opacity-50">
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>

            {/* Delete — only in edit mode, visually separated */}
            {place && onDelete && (
              <div className="pt-1 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => setConfirmDeleteOpen(true)}
                  aria-label="Supprimer ce lieu"
                  className="w-full py-3 text-red-600 text-sm font-medium rounded-xl
                             bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40
                             active:bg-red-200 transition-colors"
                >
                  🗑️ Supprimer ce lieu
                </button>
              </div>
            )}
          </div>
        }
      >
        <div className="space-y-4">
          {/* Google Maps Import */}
          {!place && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl space-y-2">
              <label className="block text-xs font-medium text-blue-700 dark:text-blue-300">
                Importer depuis Google Maps
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={googleUrl}
                  onChange={e => setGoogleUrl(e.target.value)}
                  placeholder="Coller un lien Google Maps..."
                  className="ios-input flex-1 text-sm"
                />
                <button
                  onClick={handleGoogleImport}
                  disabled={importing || !googleUrl.trim()}
                  className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl
                             disabled:opacity-50 whitespace-nowrap"
                >
                  {importing ? '...' : 'Importer'}
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Photo</label>
            <ImageUpload value={photo} onChange={handlePhotoChange} preview={preview} />
          </div>

          <FormField label="Nom *">
            <input type="text" value={form.name} onChange={set('name')}
                   placeholder="Nom du lieu" className="ios-input" />
          </FormField>

          {/* Category */}
          <FormField label="Catégorie *">
            <div className="flex gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, category: cat.key }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors
                    ${form.category === cat.key
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
          </FormField>

          <FormField label="Description">
            <textarea value={form.description} onChange={set('description')} rows={3}
                      placeholder="Description du lieu..." className="ios-input resize-none" />
          </FormField>

          <FormField label="Note">
            <StarRating value={form.rating} onChange={v => setForm(p => ({ ...p, rating: v }))} size="lg" />
          </FormField>

          {/* Location */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Localisation *</label>
            <div className="flex gap-2">
              <button type="button" onClick={handleGeolocate}
                      className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium">
                📍 GPS
              </button>
              <button type="button" onClick={handleUseMapCenter}
                      className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium">
                🗺️ Centre carte
              </button>
            </div>
            <div className="flex gap-2">
              <input type="number" value={form.lat} onChange={set('lat')}
                     placeholder="Latitude" step="any" className="ios-input flex-1 text-sm" />
              <input type="number" value={form.lng} onChange={set('lng')}
                     placeholder="Longitude" step="any" className="ios-input flex-1 text-sm" />
            </div>
          </div>

          <FormField label="Adresse">
            <input type="text" value={form.address} onChange={set('address')}
                   placeholder="Adresse (remplie automatiquement)" className="ios-input" />
          </FormField>

          <FormField label="Telephone">
            <input type="tel" value={form.phone} onChange={set('phone')}
                   placeholder="Numero de telephone" className="ios-input" />
          </FormField>
        </div>
      </Modal>

      {/* Delete confirmation */}
      {place && (
        <ConfirmModal
          isOpen={confirmDeleteOpen}
          onClose={() => setConfirmDeleteOpen(false)}
          onConfirm={handleConfirmDelete}
          title="Supprimer ce lieu"
          message={`Êtes-vous sûr de vouloir supprimer "${place.name}" ? Cette action est irréversible.`}
          confirmLabel="Supprimer"
          danger
        />
      )}
    </>
  );
};

const FormField = ({ label, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">{label}</label>
    {children}
  </div>
);

export default PlaceForm;
