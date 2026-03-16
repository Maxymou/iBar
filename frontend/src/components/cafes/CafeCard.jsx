import { useNavigate } from 'react-router-dom';
import StarRating from '../ui/StarRating';
import { formatDistance } from '../../utils/navigation';

const CafeCard = ({ cafe }) => {
  const navigate = useNavigate();
  const { name, photo_url, address, has_food, rating, specialty, distance } = cafe;

  return (
    <div
      className="ios-card flex gap-3 p-3 active:scale-[0.98] transition-transform cursor-pointer"
      onClick={() => navigate(`/cafes/${cafe.id}`)}
    >
      {/* Photo */}
      <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-700">
        {photo_url ? (
          <img src={photo_url} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">☕</div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">{name}</h3>
          <div className="flex gap-1 flex-shrink-0">
            {has_food && (
              <span className="badge bg-orange-100 text-orange-700">🥐 Restauration</span>
            )}
          </div>
        </div>

        {specialty && (
          <p className="text-xs text-primary-600 font-medium mt-0.5">{specialty}</p>
        )}

        {address && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">📍 {address}</p>
        )}

        <div className="flex items-center justify-between mt-1.5">
          {rating ? (
            <StarRating value={rating} size="sm" />
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-500">Pas de note</span>
          )}
          {distance != null && (
            <span className="text-xs text-gray-400">{formatDistance(distance)}</span>
          )}
        </div>
      </div>

      {/* Chevron */}
      <div className="flex items-center text-gray-300 dark:text-gray-600 flex-shrink-0">›</div>
    </div>
  );
};

export default CafeCard;
