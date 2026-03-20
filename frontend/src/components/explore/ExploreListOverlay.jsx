import { useState, useRef } from 'react';
import PlaceCard from './PlaceCard';

const SORT_OPTIONS = [
  { key: 'recent', label: 'Récents' },
  { key: 'rating', label: 'Note' },
  { key: 'distance', label: 'Distance' },
];

const SWIPE_CLOSE_THRESHOLD = 60; // px

const ExploreListOverlay = ({ isOpen, places, loading, sort, onSortChange, onSelectPlace, onClose }) => {
  const [search, setSearch] = useState('');
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartY = useRef(null);
  const panelRef = useRef(null);

  const filtered = search
    ? places.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.address && p.address.toLowerCase().includes(search.toLowerCase()))
      )
    : places;

  const handleHandlePointerDown = (e) => {
    dragStartY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleHandlePointerMove = (e) => {
    if (dragStartY.current === null) return;
    const delta = e.clientY - dragStartY.current;
    if (delta > 0) setDragOffset(delta);
  };

  const handleHandlePointerUp = () => {
    if (dragOffset > SWIPE_CLOSE_THRESHOLD) {
      onClose();
    }
    dragStartY.current = null;
    setDragOffset(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-sheet flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative mt-16 flex-1 bg-white dark:bg-gray-900 rounded-t-2xl shadow-lg
                    flex flex-col overflow-hidden animate-slide-in-up"
        style={{
          maxHeight: 'calc(100% - 4rem)',
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          transition: dragOffset === 0 ? 'transform 0.2s ease-out' : 'none',
        }}
      >
        {/* Handle — zone de swipe */}
        <div
          className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={handleHandlePointerDown}
          onPointerMove={handleHandlePointerMove}
          onPointerUp={handleHandlePointerUp}
          onPointerCancel={handleHandlePointerUp}
        >
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-3 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Lieux</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">
                {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={onClose}
                aria-label="Fermer"
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700
                           flex items-center justify-center text-gray-500 dark:text-gray-300
                           hover:bg-gray-200 dark:hover:bg-gray-600 active:bg-gray-300 transition-colors
                           text-lg leading-none"
              >
                ×
              </button>
            </div>
          </div>

          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="ios-input w-full text-sm"
          />

          {/* Sort pills */}
          <div className="flex gap-2">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => onSortChange(opt.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all
                  ${sort === opt.key
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 pb-8">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400 dark:text-gray-500">
              <span className="text-4xl mb-2">📍</span>
              <p className="text-sm">Aucun lieu trouvé</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(place => (
                <PlaceCard key={place.id} place={place} onClick={onSelectPlace} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExploreListOverlay;
