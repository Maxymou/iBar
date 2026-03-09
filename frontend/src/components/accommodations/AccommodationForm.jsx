import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import ImageUpload from '../ui/ImageUpload';
import StarRating from '../ui/StarRating';
import { useToast } from '../ui/Toast';
import api from '../../services/api';

const Toggle = ({ value, onChange, label }) => (
  <label className="flex items-center gap-3 cursor-pointer">
    <div className={`w-12 h-7 rounded-full transition-colors flex items-center px-1
                    ${value ? 'bg-primary-600' : 'bg-gray-300'}`}
         onClick={onChange}>
      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform
                      ${value ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
    <span className="text-sm font-medium text-gray-700">{label}</span>
  </label>
);

const AccommodationForm = ({ isOpen, onClose, accommodation, onSaved }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState('');
  const [form, setForm] = useState({
    name: '', phone: '', address: '', comment: '', price: '',
    number_of_rooms: '', wifi: false, parking: false, rating: 0,
    visit_date: '', latitude: '', longitude: '',
  });

  useEffect(() => {
    if (accommodation) {
      setForm({
        name: accommodation.name || '',
        phone: accommodation.phone || '',
        address: accommodation.address || '',
        comment: accommodation.comment || '',
        price: accommodation.price || '',
        number_of_rooms: accommodation.number_of_rooms || '',
        wifi: accommodation.wifi || false,
        parking: accommodation.parking || false,
        rating: accommodation.rating || 0,
        visit_date: accommodation.visit_date ? accommodation.visit_date.split('T')[0] : '',
        latitude: accommodation.latitude || '',
        longitude: accommodation.longitude || '',
      });
      setPreview(accommodation.photo_url || '');
    } else {
      setForm({ name: '', phone: '', address: '', comment: '', price: '',
                number_of_rooms: '', wifi: false, parking: false, rating: 0,
                visit_date: '', latitude: '', longitude: '' });
      setPreview('');
      setPhoto(null);
    }
  }, [accommodation, isOpen]);

  const handlePhotoChange = (file) => {
    setPhoto(file);
    if (file) setPreview(URL.createObjectURL(file));
    else setPreview(accommodation?.photo_url || '');
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) return toast('Géolocalisation non supportée', 'error');
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
    if (!form.name.trim()) return toast('Le nom est obligatoire', 'error');
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '' && v !== null) fd.append(k, v); });
      if (photo) fd.append('photo', photo);

      const res = accommodation
        ? await api.put(`/accommodations/${accommodation.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        : await api.post('/accommodations', fd, { headers: { 'Content-Type': 'multipart/form-data' } });

      onSaved(res.data);
      onClose();
      toast(accommodation ? 'Hébergement modifié' : 'Hébergement ajouté', 'success');
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
      title={accommodation ? 'Modifier l\'hébergement' : 'Ajouter un hébergement'}
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

        {[
          { label: 'Nom *', field: 'name', type: 'text', placeholder: 'Nom de l\'hébergement' },
          { label: 'Téléphone', field: 'phone', type: 'tel', placeholder: '+33 1 23 45 67 89' },
          { label: 'Adresse', field: 'address', type: 'text', placeholder: 'Adresse complète' },
          { label: 'Prix / nuit (€)', field: 'price', type: 'number', placeholder: '0.00' },
          { label: 'Nombre de chambres', field: 'number_of_rooms', type: 'number', placeholder: '0' },
        ].map(({ label, field, type, placeholder }) => (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
            <input type={type} value={form[field]} onChange={set(field)}
                   placeholder={placeholder} className="ios-input" />
          </div>
        ))}

        <div className="space-y-3 py-2">
          <Toggle value={form.wifi} onChange={() => setForm(p => ({ ...p, wifi: !p.wifi }))} label="📶 Wi-Fi disponible" />
          <Toggle value={form.parking} onChange={() => setForm(p => ({ ...p, parking: !p.parking }))} label="🅿️ Parking disponible" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Note</label>
          <StarRating value={form.rating} onChange={v => setForm(p => ({ ...p, rating: v }))} size="lg" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Date de visite</label>
          <input type="date" value={form.visit_date} onChange={set('visit_date')} className="ios-input" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Commentaire</label>
          <textarea value={form.comment} onChange={set('comment')} rows={3}
                    placeholder="Vos impressions..." className="ios-input resize-none" />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Localisation GPS</label>
          <button type="button" onClick={handleGeolocate}
                  className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium">
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

export default AccommodationForm;
