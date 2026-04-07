import PlaceDetailContent from './PlaceDetailContent';

const PlaceDetailOverlay = ({ place, onClose, onEdit, onDelete }) => {
  return (
    // Full-screen layer: tap outside the card → close
    <div
      className="absolute inset-0 z-sheet"
      onClick={onClose}
    >
      {/* Card wrapper: stop propagation so tapping inside doesn't close */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{ paddingBottom: 'var(--sab)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="mx-4 mb-4 bg-white dark:bg-gray-800 rounded-2xl shadow-lg
                        border border-gray-200 dark:border-gray-700 overflow-hidden
                        animate-slide-in-up max-h-[70vh] overflow-y-auto">
          <PlaceDetailContent
            place={place}
            onClose={onClose}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      </div>
    </div>
  );
};

export default PlaceDetailOverlay;
