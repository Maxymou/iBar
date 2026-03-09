import { useNavigate } from 'react-router-dom';
import StarRating from '../ui/StarRating';
import { formatDistance, formatPrice } from '../../utils/navigation';

const AccommodationCard = ({ accommodation }) => {
  const navigate = useNavigate();
  const { name, photo_url, address, rating, price, wifi, parking, number_of_rooms, distance } = accommodation;

  return (
    <div
      className="ios-card flex gap-3 p-3 active:scale-[0.98] transition-transform cursor-pointer"
      onClick={() => navigate(`/hebergements/${accommodation.id}`)}
    >
      {/* Photo */}
      <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
        {photo_url ? (
          <img src={photo_url} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">🏨</div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 truncate">{name}</h3>

        {/* Badges */}
        <div className="flex flex-wrap gap-1 mt-0.5">
          {wifi && <span className="badge bg-blue-50 text-blue-600">📶 Wifi</span>}
          {parking && <span className="badge bg-green-50 text-green-600">🅿️</span>}
          {number_of_rooms && (
            <span className="badge bg-gray-100 text-gray-600">{number_of_rooms} ch.</span>
          )}
        </div>

        {address && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">📍 {address}</p>
        )}

        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center gap-2">
            {rating ? <StarRating value={rating} size="sm" /> : <span className="text-xs text-gray-400">Pas de note</span>}
            {price && <span className="text-xs font-semibold text-primary-600">{formatPrice(price)}</span>}
          </div>
          {distance != null && (
            <span className="text-xs text-gray-400">{formatDistance(distance)}</span>
          )}
        </div>
      </div>

      <div className="flex items-center text-gray-300 flex-shrink-0">›</div>
    </div>
  );
};

export default AccommodationCard;
