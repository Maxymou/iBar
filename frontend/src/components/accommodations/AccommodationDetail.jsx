import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StarRating from '../ui/StarRating';
import ConfirmModal from '../ui/ConfirmModal';
import Modal from '../ui/Modal';
import { InfoCard, MetaRow } from '../ui/InfoCard';
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
    <div className="fixed inset-0 flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-700"
           style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => navigate(-1)}
                  aria-label="Retour"
                  className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-200 text-xl">
            ‹
          </button>
          <h1 className="font-semibold text-gray-900 dark:text-white truncate mx-4">{item.name}</h1>
          <div className="flex gap-2">
            <button onClick={() => setEditOpen(true)}
                    aria-label="Modifier"
                    className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-200 text-sm">
              ✏️
            </button>
            <button onClick={() => setDeleteOpen(true)}
                    aria-label="Supprimer"
                    className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-500 text-sm">
              🗑️
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto"
           style={{ paddingTop: `calc(56px + env(safe-area-inset-top))`, WebkitOverflowScrolling: 'touch' }}>
        {/* Photo */}
        <div className="w-full h-56 bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
          {item.photo_url ? (
            <img src={item.photo_url} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">🏨</div>
          )}
        </div>

        <div className="px-4 py-5 space-y-4" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>
          {/* Name + info */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{item.name}</h2>
            <div className="flex flex-wrap gap-2 mb-2">
              {item.wifi && <span className="badge bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">📶 Wi-Fi</span>}
              {item.parking && <span className="badge bg-green-50 dark:bg-green-900/40 text-green-600 dark:text-green-400">🅿️ Parking</span>}
              {item.number_of_rooms && (
                <span className="badge bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">🛏️ {item.number_of_rooms} chambre{item.number_of_rooms > 1 ? 's' : ''}</span>
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
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Commentaire</span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{item.comment}</p>
            </div>
          )}

          <div className="ios-card p-4 space-y-2">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Informations</p>
            {item.created_by_name && <MetaRow label="Ajouté par" value={item.created_by_name} />}
            {item.created_at && <MetaRow label="Ajouté le" value={formatDate(item.created_at)} />}
            {item.updated_by_name && <MetaRow label="Modifié par" value={item.updated_by_name} />}
            {item.updated_at && <MetaRow label="Modifié le" value={formatDate(item.updated_at)} />}
          </div>
        </div>
      </div>  {/* end scrollable content */}

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
        <p className="text-gray-600 dark:text-gray-300">Appeler <strong>{item.name}</strong> au :</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{item.phone}</p>
      </Modal>

      {/* Nav modal */}
      <Modal isOpen={navOpen} onClose={() => setNavOpen(false)} title="Naviguer vers">
        <p className="text-gray-600 dark:text-gray-300 mb-4">{item.address}</p>
        <div className="space-y-3">
          {[
            { href: navLinks.waze, icon: '🚗', label: 'Waze', desc: 'Navigation en temps réel' },
            { href: navLinks.google, icon: '🗺️', label: 'Google Maps', desc: 'Itinéraire Google' },
            ...(isIOS() ? [{ href: navLinks.apple, icon: '🍎', label: 'Plans Apple', desc: 'Application Plans' }] : []),
          ].map(link => (
            <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 active:bg-gray-50 dark:active:bg-gray-800"
               onClick={() => setNavOpen(false)}>
              <span className="text-2xl">{link.icon}</span>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{link.label}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{link.desc}</p>
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

export default AccommodationDetail;
