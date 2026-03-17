import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PlaceDetailContent from './PlaceDetailContent';
import PlaceForm from './PlaceForm';
import { useToast } from '../ui/Toast';
import api from '../../services/api';

const PlaceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    const fetchPlace = async () => {
      try {
        const res = await api.get(`/places/${id}`);
        setPlace(res.data);
      } catch (err) {
        if (err.response?.status === 404) {
          toast('Lieu introuvable', 'error');
        } else {
          toast('Erreur lors du chargement', 'error');
        }
        navigate('/', { replace: true });
      } finally {
        setLoading(false);
      }
    };
    fetchPlace();
  }, [id]);

  const handleDelete = async (placeId) => {
    try {
      await api.delete(`/places/${placeId}`);
      toast('Lieu supprimé', 'success');
      navigate('/', { replace: true });
    } catch {
      toast('Erreur lors de la suppression', 'error');
    }
  };

  const handleEdit = () => {
    setEditOpen(true);
  };

  const handleSaved = (saved) => {
    setPlace(saved);
    setEditOpen(false);
    toast('Lieu modifié', 'success');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!place) return null;

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 overflow-y-auto">
      {/* Back button */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700"
           style={{ paddingTop: 'var(--sat)' }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300"
          >
            ←
          </button>
          <h1 className="text-base font-semibold text-gray-900 dark:text-white truncate">
            {place.name}
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-sm mt-4 mx-4 overflow-hidden">
        <PlaceDetailContent
          place={place}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      {/* Edit form */}
      <PlaceForm
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        place={place}
        onSaved={handleSaved}
      />
    </div>
  );
};

export default PlaceDetailPage;
