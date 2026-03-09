import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StarRating from '../ui/StarRating';
import ConfirmModal from '../ui/ConfirmModal';
import Modal from '../ui/Modal';
import { InfoCard, MetaRow } from '../ui/InfoCard';
import RestaurantForm from './RestaurantForm';
import { useToast } from '../ui/Toast';
import api from '../../services/api';
import { openNavigation, isIOS, formatDate } from '../../utils/navigation';

const RestaurantDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    loadRestaurant();
  }, [id]);

  const loadRestaurant = async () => {
    try {
      const res = await api.get(`/restaurants/${id}`);
      setRestaurant(res.data);
    } catch {
      toast('Restaurant introuvable', 'error');
      navigate('/restaurants');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/restaurants/${id}`);
      toast('Restaurant supprimé', 'success');
      navigate('/restaurants');
    } catch {
      toast('Erreur lors de la suppression', 'error');
    }
  };

  const handleNav = (type) => {
    if (!restaurant) return;
    const links = openNavigation(restaurant.address, restaurant.latitude, restaurant.longitude);
    window.open(links[type], '_blank');
    setNavOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!restaurant) return null;

  const navLinks = openNavigation(restaurant.address, restaurant.latitude, restaurant.longitude);

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
          <h1 className="font-semibold text-gray-900 truncate mx-4">{restaurant.name}</h1>
          <div className="flex gap-2">
            <button onClick={() => setEditOpen(true)}
                    className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 text-sm">
              ✏️
            </button>
            <button onClick={() => setDeleteOpen(true)}
                    className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center text-red-500 text-sm">
              🗑️
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-14 pb-8 overflow-y-auto"
           style={{ paddingTop: `calc(56px + env(safe-area-inset-top))` }}>

        {/* Photo */}
        <div className="w-full h-56 bg-gray-100 overflow-hidden">
          {restaurant.photo_url ? (
            <img src={restaurant.photo_url} alt={restaurant.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">🍽️</div>
          )}
        </div>

        <div className="px-4 py-5 space-y-4">
          {/* Name + badges */}
          <div>
            <div className="flex items-start justify-between gap-2 mb-1">
              <h2 className="text-2xl font-bold text-gray-900">{restaurant.name}</h2>
              {restaurant.bar && (
                <span className="badge bg-amber-100 text-amber-700 flex-shrink-0">🍺 Bar</span>
              )}
            </div>
            {restaurant.cuisine_type && (
              <p className="text-primary-600 font-medium">{restaurant.cuisine_type}</p>
            )}
            {restaurant.rating && <StarRating value={restaurant.rating} size="lg" />}
          </div>

          {/* Phone */}
          {restaurant.phone && (
            <InfoCard
              icon="📞"
              label="Téléphone"
              value={restaurant.phone}
              onClick={() => setCallOpen(true)}
              clickable
            />
          )}

          {/* Address */}
          {restaurant.address && (
            <InfoCard
              icon="📍"
              label="Adresse"
              value={restaurant.address}
              onClick={() => setNavOpen(true)}
              clickable
            />
          )}

          {/* Visit date */}
          {restaurant.visit_date && (
            <InfoCard icon="📅" label="Date de visite" value={formatDate(restaurant.visit_date)} />
          )}

          {/* Comment */}
          {restaurant.comment && (
            <div className="ios-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">💬</span>
                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Commentaire</span>
              </div>
              <p className="text-gray-700 leading-relaxed">{restaurant.comment}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="ios-card p-4 space-y-2">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Informations</p>
            {restaurant.created_by_name && (
              <MetaRow label="Ajouté par" value={restaurant.created_by_name} />
            )}
            {restaurant.created_at && (
              <MetaRow label="Ajouté le" value={formatDate(restaurant.created_at)} />
            )}
            {restaurant.updated_by_name && (
              <MetaRow label="Modifié par" value={restaurant.updated_by_name} />
            )}
            {restaurant.updated_at && (
              <MetaRow label="Modifié le" value={formatDate(restaurant.updated_at)} />
            )}
          </div>
        </div>
      </div>

      {/* Call confirmation */}
      <Modal isOpen={callOpen} onClose={() => setCallOpen(false)} title="Appeler"
             footer={
               <div className="flex gap-3">
                 <button onClick={() => setCallOpen(false)} className="ios-button-secondary flex-1">Annuler</button>
                 <a href={`tel:${restaurant.phone}`}
                    className="flex-1 py-3 px-6 rounded-xl font-semibold text-base text-center
                               bg-green-500 text-white active:scale-95 transition-all"
                    onClick={() => setCallOpen(false)}>
                   📞 Appeler
                 </a>
               </div>
             }>
        <p className="text-gray-600">Appeler <strong>{restaurant.name}</strong> au :</p>
        <p className="text-2xl font-bold text-gray-900 mt-2">{restaurant.phone}</p>
      </Modal>

      {/* Navigation modal */}
      <Modal isOpen={navOpen} onClose={() => setNavOpen(false)} title="Naviguer vers">
        <p className="text-gray-600 mb-4">{restaurant.address}</p>
        <div className="space-y-3">
          {[
            { href: navLinks.waze,   icon: '🚗', label: 'Waze',        desc: 'Navigation en temps réel' },
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

      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Supprimer le restaurant"
        message={`Êtes-vous sûr de vouloir supprimer "${restaurant.name}" ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        danger
      />

      {/* Edit form */}
      <RestaurantForm
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        restaurant={restaurant}
        onSaved={(updated) => setRestaurant(updated)}
      />
    </div>
  );
};

export default RestaurantDetail;
