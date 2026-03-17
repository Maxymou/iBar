import StarRating from '../ui/StarRating';
import { useAuth } from '../../store/AuthContext';

const CATEGORY_LABELS = {
  cafe: { icon: '☕', label: 'Café', color: 'bg-orange-100 text-orange-700' },
  restaurant: { icon: '🍽️', label: 'Restaurant', color: 'bg-red-100 text-red-700' },
  hotel: { icon: '🏨', label: 'Hôtel', color: 'bg-purple-100 text-purple-700' },
};

const PlaceDetailContent = ({ place, onClose, onEdit, onDelete }) => {
  const { user } = useAuth();
  const cat = CATEGORY_LABELS[place.category] || CATEGORY_LABELS.restaurant;
  const isOwner = user && place.created_by === user.id;

  return (
    <>
      {/* Photo */}
      {place.photo_url && (
        <div className="h-40 overflow-hidden">
          <img src={place.photo_url} alt={place.name} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{place.name}</h3>
            <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${cat.color}`}>
              {cat.icon} {cat.label}
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center
                         justify-center text-gray-500 text-sm flex-shrink-0"
            >
              ✕
            </button>
          )}
        </div>

        {/* Rating */}
        {place.rating > 0 && (
          <div className="mb-2">
            <StarRating value={place.rating} size="sm" />
          </div>
        )}

        {/* Address */}
        {place.address && (
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
            📍 {place.address}
          </p>
        )}

        {/* Description */}
        {place.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            {place.description}
          </p>
        )}

        {/* Source */}
        {place.source === 'google_import' && (
          <p className="text-xs text-gray-400 mb-2">Importé depuis Google Maps</p>
        )}

        {/* Actions */}
        {isOwner && (onEdit || onDelete) && (
          <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            {onEdit && (
              <button
                onClick={() => onEdit(place)}
                className="flex-1 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-xl"
              >
                Modifier
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(place.id)}
                className="py-2.5 px-4 bg-red-50 dark:bg-red-900/20 text-red-600 text-sm font-medium rounded-xl"
              >
                Supprimer
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default PlaceDetailContent;
