import { useState } from 'react';
import StarRating from '../ui/StarRating';
import { useAuth } from '../../store/AuthContext';
import { openNavigation } from '../../utils/navigation';

const CATEGORY_LABELS = {
  cafe: { icon: '☕', label: 'Café', color: 'bg-orange-100 text-orange-700' },
  restaurant: { icon: '🍽️', label: 'Restaurant', color: 'bg-red-100 text-red-700' },
  hotel: { icon: '🏨', label: 'Hôtel', color: 'bg-purple-100 text-purple-700' },
};

const PlaceDetailContent = ({ place, onClose, onEdit }) => {
  const { user } = useAuth();
  const isOwner = user && place.created_by === user.id;
  const hasPhone = Boolean(place.phone);
  const hasLocation = Boolean(place.address || (place.lat && place.lng));
  const cat = CATEGORY_LABELS[place.category];
  const nav = hasLocation ? openNavigation(place.address, place.lat, place.lng) : null;

  // Swipe-down to close — gesture must start on the photo area
  const [swipeStartY, setSwipeStartY] = useState(null);

  const handlePhotoPointerDown = (e) => {
    setSwipeStartY(e.clientY);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePhotoPointerUp = (e) => {
    if (swipeStartY === null) return;
    const deltaY = e.clientY - swipeStartY;
    setSwipeStartY(null);
    // Only close if the downward swipe is significant enough
    if (deltaY > 60) {
      onClose?.();
    }
  };

  return (
    <>
      {/* 1. Photo — also swipe-down zone */}
      <div
        className="relative h-48 bg-gray-100 dark:bg-gray-700 overflow-hidden touch-none select-none"
        onPointerDown={handlePhotoPointerDown}
        onPointerUp={handlePhotoPointerUp}
        onPointerCancel={() => setSwipeStartY(null)}
      >
        {place.photo_url ? (
          <img
            src={place.photo_url}
            alt={place.name}
            className="w-full h-full object-cover pointer-events-none"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">
            {cat?.icon || '📍'}
          </div>
        )}

        {/* 2. Edit pencil button — overlay top-right on photo */}
        {isOwner && onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(place); }}
            aria-label="Modifier ce lieu"
            className="absolute top-3 right-3 w-10 h-10 rounded-full
                       bg-white/90 backdrop-blur-sm shadow-md
                       flex items-center justify-center text-gray-700 text-lg
                       active:scale-95 transition-transform"
          >
            ✏️
          </button>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* 3. Title */}
        <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
          {place.name}
        </h3>

        {/* 4. Tags / category pills */}
        {cat && (
          <div className="flex flex-wrap gap-1.5">
            <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${cat.color}`}>
              {cat.icon} {cat.label}
            </span>
          </div>
        )}

        {/* 5. Stars */}
        {place.rating > 0 && (
          <StarRating value={place.rating} size="sm" />
        )}

        {/* 6. Comment / description */}
        {place.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {place.description}
          </p>
        )}

        {/* 7. Call button — hidden if no phone */}
        {hasPhone && (
          <a
            href={`tel:${place.phone}`}
            aria-label={`Appeler ${place.name}`}
            className="flex items-center justify-center w-full py-3.5 gap-2
                       bg-green-500 hover:bg-green-600 active:bg-green-700
                       text-white text-base font-semibold rounded-2xl
                       transition-colors shadow-sm"
          >
            <span>📞</span> Appeler
          </a>
        )}

        {/* 8. Navigation buttons — hidden if no location */}
        {nav && (
          <div className="flex gap-2">
            <a
              href={nav.waze}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Naviguer avec Waze"
              className="flex-1 py-2.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600
                         text-sm font-medium rounded-xl text-center"
            >
              Waze
            </a>
            <a
              href={nav.google}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Naviguer avec Google Maps"
              className="flex-1 py-2.5 bg-green-50 dark:bg-green-900/20 text-green-600
                         text-sm font-medium rounded-xl text-center"
            >
              Google
            </a>
            <a
              href={nav.apple}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Naviguer avec Plans"
              className="flex-1 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600
                         text-sm font-medium rounded-xl text-center"
            >
              Plans
            </a>
          </div>
        )}

        {/* Source badge */}
        {place.source === 'google_import' && (
          <p className="text-xs text-gray-400">Importé depuis Google Maps</p>
        )}
      </div>
    </>
  );
};

export default PlaceDetailContent;
