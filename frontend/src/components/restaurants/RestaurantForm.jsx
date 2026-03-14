import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import ImageUpload from '../ui/ImageUpload';
import StarRating from '../ui/StarRating';
import { useToast } from '../ui/Toast';
import api from '../../services/api';

const RestaurantForm = ({ isOpen, onClose, restaurant, onSaved }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState('');
  const [deletePhoto, setDeletePhoto] = useState(false);
  const [form, setForm] = useState({
    name: '', phone: '', address: '', bar: false,
    cuisine_type: '', rating: 0, comment: '', visit_date: '',
    latitude: '', longitude: '',
  });

  useEffect(() => {
    if (restaurant) {
      setForm({
        name: restaurant.name || '',
        phone: restaurant.phone || '',
        address: restaurant.address || '',
        bar: restaurant.bar || false,
        cuisine_type: restaurant.cuisine_type || '',
        rating: restaurant.rating || 0,
        comment: restaurant.comment || '',
        visit_date: restaurant.visit_date ? restaurant.visit_date.split('T')[0] : '',
        latitude: restaurant.latitude || '',
        longitude: restaurant.longitude || '',
      });
      setPreview(restaurant.photo_url || '');
      setDeletePhoto(false);
    } else {
      setForm({ name: '', phone: '', address: '', bar: false, cuisine_type: '',
                rating: 0, comment: '', visit_date: '', latitude: '', longitude: '' });
      setPreview('');
      setPhoto(null);
      setDeletePhoto(false);
    }
  }, [restaurant, isOpen]);

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
        setForm(p => ({ ...p, latitude: pos.coords.latitude.toFixed(6),
                              longitude: pos.coords.longitude.toFixed(6) }));
        toast('Position récupérée', 'success');
      },
      () => toast('Impossible d\'obtenir la position', 'error')
    );
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast('Le nom est obligatoire', 'error');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '' && v !== null) fd.append(k, v); });
      if (photo) fd.append('photo', photo);
      if (deletePhoto && restaurant) fd.append('remove_photo', 'true');

      let res;
      if (restaurant) {
        res = await api.put(`/restaurants/${restaurant.id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        res = await api.post('/restaurants', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      onSaved(res.data);
      onClose();
      toast(restaurant ? 'Restaurant modifié' : 'Restaurant ajouté', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Erreur lors de l\'enregistrement', 'error');
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) =>
    setForm(p => ({ ...p, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={restaurant ? 'Modifier le restaurant' : 'Ajouter un restaurant'}
      footer={
        <div className="flex gap-3">
          <button onClick={onClose} className="ios-button-secondary flex-1">Annuler</button>
          <button onClick={handleSubmit} disabled={loading}
                  className="ios-button-primary flex-1 disabled:opacity-50">
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Photo</label>
          <ImageUpload value={photo} onChange={handlePhotoChange} preview={preview} />
        </div>

        <FormField label="Nom *">
          <input type="text" value={form.name} onChange={set('name')}
                 placeholder="Nom du restaurant" className="ios-input" />
        </FormField>

        <FormField label="Téléphone">
          <input type="tel" value={form.phone} onChange={set('phone')}
                 placeholder="+33 1 23 45 67 89" className="ios-input" />
        </FormField>

        <FormField label="Adresse">
          <input type="text" value={form.address} onChange={set('address')}
                 placeholder="Adresse complète" className="ios-input" />
        </FormField>

        <FormField label="Type de cuisine">
          <input type="text" value={form.cuisine_type} onChange={set('cuisine_type')}
                 placeholder="Français, Italien, Japonais..." className="ios-input" />
        </FormField>

        <div className="flex items-center gap-3 py-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <div className={`w-12 h-7 rounded-full transition-colors flex items-center px-1
                            ${form.bar ? 'bg-primary-600' : 'bg-gray-300'}`}
                 onClick={() => setForm(p => ({ ...p, bar: !p.bar }))}>
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform
                              ${form.bar ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">🍺 C'est aussi un bar</span>
          </label>
        </div>

        <FormField label="Note">
          <StarRating value={form.rating} onChange={v => setForm(p => ({ ...p, rating: v }))} size="lg" />
        </FormField>

        <FormField label="Date de visite">
          <input type="date" value={form.visit_date} onChange={set('visit_date')} className="ios-input" />
        </FormField>

        <FormField label="Commentaire">
          <textarea value={form.comment} onChange={set('comment')} rows={3}
                    placeholder="Vos impressions..." className="ios-input resize-none" />
        </FormField>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Localisation GPS</label>
          <button type="button" onClick={handleGeolocate}
                  className="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium">
            📍 Utiliser ma position actuelle
          </button>
          <div className="flex gap-2">
            <input type="number" value={form.latitude} onChange={set('latitude')}
                   placeholder="Latitude" step="any" className="ios-input flex-1 text-sm" />
            <input type="number" value={form.longitude} onChange={set('longitude')}
                   placeholder="Longitude" step="any" className="ios-input flex-1 text-sm" />
          </div>
        </div>
      </div>
    </Modal>
  );
};

const FormField = ({ label, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">{label}</label>
    {children}
  </div>
);

export default RestaurantForm;
