import PlaceDetailContent from './PlaceDetailContent';

const PlaceDetailOverlay = ({ place, onClose, onEdit, onDelete }) => {
  return (
    <div className="absolute inset-x-0 bottom-0 z-sheet pointer-events-none"
         style={{ paddingBottom: 'var(--sab)' }}>
      <div className="pointer-events-auto mx-4 mb-4 bg-white dark:bg-gray-800 rounded-2xl
                      shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden
                      animate-slide-in-up max-h-[60vh] overflow-y-auto">
        <PlaceDetailContent
          place={place}
          onClose={onClose}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
};

export default PlaceDetailOverlay;
