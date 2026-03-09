import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StarRating from '../ui/StarRating';
import ConfirmModal from '../ui/ConfirmModal';
import Modal from '../ui/Modal';
import AccommodationForm from './AccommodationForm';
import { useToast } from '../ui/Toast';
import api from '../../services/api';
import { openNavigation, isIOS, formatDate, formatPrice } from '../../utils/navigation';

const AccommodationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => { loadItem(); }, [id]);

  const loadItem = async () => {
    try {
      const res = await api.get(`/accommodations/${id}`);
      setItem(res.data);
    } catch {
      toast('Hébergement introuvable', 'error');
      navigate('/hebergements');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/accommodations/${id}`);
      toast('Hébergement supprimé', 'success');
      navigate('/hebergements');
    } catch {
      toast('Erreur lors de la suppression', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!item) return null;

  const navLinks = openNavigation(item.address, item.latitude, item.longitude);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100"
           style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => navigate(-1)}
                  className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-700">
            ‹
          </button>
          <h1 className="font-semibold text-gray-900 truncate mx-4">{item.name}</h1>
          <div className="flex gap-2">
            <button onClick={() => setEditOpen(true)}
                    className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm">
              ✏️
            </button>
            <button onClick={() => setDeleteOpen(true)}
                    className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center text-red-500 text-sm">
              🗑️
            </button>
          </div>
        </div>
      </div>

      <div className="pb-8 overflow-y-auto" style={{ paddingTop: `calc(56px + env(safe-area-inset-top))` }}>
        {/* Photo */}
        <div className="w-full h-56 bg-gray-100 overflow-hidden">
          {item.photo_url ? (
            <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">🏨</div>
          )}
        </div>

        <div className="px-4 py-5 space-y-4">
          {/* Name + info */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{item.name}</h2>
            <div className="flex flex-wrap gap-2 mb-2">
              {item.wifi && <span className="badge bg-blue-50 text-blue-600">📶 Wi-Fi</span>}
              {item.parking && <span className="badge bg-green-50 text-green-600">🅿️ Parking</span>}
              {item.number_of_rooms && (
                <span className="badge bg-gray-100 text-gray-600">🛏️ {item.number_of_rooms} chambre{item.number_of_rooms > 1 ? 's' : ''}</span>
              )}
            </div>
            {item.rating && <StarRating value={item.rating} size="lg" />}
            {item.price && (
              <p className="text-xl font-bold text-primary-600 mt-1">{formatPrice(item.price)} / nuit</p>
            )}
          </div>

          {item.phone && (
            <InfoCard icon="📞" label="Téléphone" value={item.phone}
                      onClick={() => setCallOpen(true)} clickable />
          )}

          {item.address && (
            <InfoCard icon="📍" label="Adresse" value={item.address}
                      onClick={() => setNavOpen(true)} clickable />
          )}

          {item.visit_date && (
            <InfoCard icon="📅" label="Date de visite" value={formatDate(item.visit_date)} />
          )}

          {item.comment && (
            <div className="ios-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">💬</span>
                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Commentaire</span>
              </div>
              <p className="text-gray-700 leading-relaxed">{item.comment}</p>
            </div>
          )}

          <div className="ios-card p-4 space-y-2">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Informations</p>
            {item.created_by_name && <MetaRow label="Ajouté par" value={item.created_by_name} />}
            {item.created_at && <MetaRow label="Ajouté le" value={formatDate(item.created_at)} />}
            {item.updated_by_name && <MetaRow label="Modifié par" value={item.updated_by_name} />}
            {item.updated_at && <MetaRow label="Modifié le" value={formatDate(item.updated_at)} />}
          </div>
        </div>
      </div>

      {/* Call modal */}
      <Modal isOpen={callOpen} onClose={() => setCallOpen(false)} title="Appeler"
             footer={
               <div className="flex gap-3">
                 <button onClick={() => setCallOpen(false)} className="ios-button-secondary flex-1">Annuler</button>
                 <a href={`tel:${item.phone}`}
                    className="flex-1 py-3 px-6 rounded-xl font-semibold text-base text-center bg-green-500 text-white"
                    onClick={() => setCallOpen(false)}>
                   📞 Appeler
                 </a>
               </div>
             }>
        <p className="text-gray-600">Appeler <strong>{item.name}</strong> au :</p>
        <p className="text-2xl font-bold text-gray-900 mt-2">{item.phone}</p>
      </Modal>

      {/* Nav modal */}
      <Modal isOpen={navOpen} onClose={() => setNavOpen(false)} title="Naviguer vers">
        <p className="text-gray-600 mb-4">{item.address}</p>
        <div className="space-y-3">
          {[
            { href: navLinks.waze, icon: '🚗', label: 'Waze', desc: 'Navigation en temps réel' },
            { href: navLinks.google, icon: '🗺️', label: 'Google Maps', desc: 'Itinéraire Google' },
            ...(isIOS() ? [{ href: navLinks.apple, icon: '🍎', label: 'Plans Apple', desc: 'Application Plans' }] : []),
          ].map(link => (
            <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 active:bg-gray-50"
               onClick={() => setNavOpen(false)}>
              <span className="text-2xl">{link.icon}</span>
              <div>
                <p className="font-semibold text-gray-900">{link.label}</p>
                <p className="text-sm text-gray-500">{link.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </Modal>

      <ConfirmModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Supprimer l'hébergement"
        message={`Êtes-vous sûr de vouloir supprimer "${item.name}" ?`}
        confirmLabel="Supprimer"
        danger
      />

      <AccommodationForm
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        accommodation={item}
        onSaved={(updated) => setItem(updated)}
      />
    </div>
  );
};

const InfoCard = ({ icon, label, value, onClick, clickable }) => (
  <div className={`ios-card p-4 ${clickable ? 'cursor-pointer active:bg-gray-50' : ''}`} onClick={onClick}>
    <div className="flex items-start gap-3">
      <span className="text-xl mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
        <p className={`text-gray-900 mt-0.5 ${clickable ? 'text-primary-600' : ''}`}>{value}</p>
      </div>
      {clickable && <span className="text-gray-300 mt-1">›</span>}
    </div>
  </div>
);

const MetaRow = ({ label, value }) => (
  <div className="flex justify-between items-center">
    <span className="text-sm text-gray-500">{label}</span>
    <span className="text-sm text-gray-900 font-medium">{value}</span>
  </div>
);

export default AccommodationDetail;
