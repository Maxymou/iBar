import StarRating from '../ui/StarRating';

const CATEGORY_LABELS = {
  cafe: { icon: '☕', label: 'Café' },
  restaurant: { icon: '🍽️', label: 'Restaurant' },
  hotel: { icon: '🏨', label: 'Hôtel' },
};

const PlaceCard = ({ place, onClick }) => {
  const { name, photo_url, address, category, rating, distance } = place;
  const cat = CATEGORY_LABELS[category] || CATEGORY_LABELS.restaurant;

  return (
    <div
      className="ios-card flex gap-3 p-3 active:scale-[0.98] transition-transform cursor-pointer"
      onClick={() => onClick(place)}
    >
      {/* Photo */}
      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-700">
        {photo_url ? (
          <img src={photo_url} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">{cat.icon}</div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate text-sm">{name}</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700
                         text-gray-600 dark:text-gray-300 flex-shrink-0">
            {cat.label}
          </span>
        </div>

        {address && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{address}</p>
        )}

        <div className="flex items-center justify-between mt-1">
          {rating ? (
            <StarRating value={rating} size="sm" />
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-500">Pas de note</span>
          )}
          {distance != null && (
            <span className="text-xs text-gray-400">
              {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlaceCard;
