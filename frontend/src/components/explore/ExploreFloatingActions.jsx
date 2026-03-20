const ExploreFloatingActions = ({ onGpsClick, onAddClick, gpsLoading, satellite, onSatelliteToggle }) => {
  return (
    <div className="fixed right-4 z-ui pointer-events-none flex flex-col gap-3 explore-fabs">
      {/* Satellite toggle button */}
      <button
        onClick={onSatelliteToggle}
        aria-label={satellite ? 'Vue carte standard' : 'Vue satellite'}
        className={`pointer-events-auto w-12 h-12 rounded-full
                   border shadow-lg
                   flex items-center justify-center text-xl
                   active:scale-95 transition-all
                   ${satellite
                     ? 'bg-primary-600 border-primary-500 text-white'
                     : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                   }`}
      >
        {satellite ? '🗺️' : '🛰️'}
      </button>

      {/* GPS button */}
      <button
        onClick={onGpsClick}
        aria-label="Recentrer sur ma position"
        className="pointer-events-auto w-12 h-12 rounded-full bg-white dark:bg-gray-800
                   border border-gray-200 dark:border-gray-600 shadow-lg
                   flex items-center justify-center text-xl
                   active:scale-95 transition-transform"
      >
        {gpsLoading ? (
          <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        ) : '🎯'}
      </button>

      {/* Add button */}
      <button
        onClick={onAddClick}
        aria-label="Ajouter un lieu"
        className="pointer-events-auto w-14 h-14 rounded-full bg-primary-600
                   shadow-lg flex items-center justify-center text-white text-2xl font-light
                   active:scale-95 transition-transform"
      >
        +
      </button>
    </div>
  );
};

export default ExploreFloatingActions;
