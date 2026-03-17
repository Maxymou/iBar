import { useAuth } from '../../store/AuthContext';

const ExploreTopBar = ({ onUserClick, onListClick, listOpen }) => {
  const { user } = useAuth();

  return (
    <div className="absolute top-0 left-0 right-0 z-ui pointer-events-none explore-top-bar">
      <div className="flex items-center justify-between px-4 pt-3">
        {/* User button */}
        <button
          onClick={onUserClick}
          className="pointer-events-auto w-11 h-11 rounded-full bg-white dark:bg-gray-800
                     shadow-lg border border-gray-200 dark:border-gray-600
                     flex items-center justify-center overflow-hidden"
        >
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-primary-700 dark:text-primary-400 font-bold text-lg">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          )}
        </button>

        {/* App title */}
        <div className="pointer-events-none flex items-center gap-1.5 bg-white/80 dark:bg-gray-800/80
                        backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm">
          <span className="text-lg">🍸</span>
          <span className="text-sm font-bold text-gray-900 dark:text-white">IBar</span>
        </div>

        {/* List button */}
        <button
          onClick={onListClick}
          className="pointer-events-auto w-11 h-11 rounded-full bg-white dark:bg-gray-800
                     shadow-lg border border-gray-200 dark:border-gray-600
                     flex items-center justify-center text-xl"
        >
          {listOpen ? '✕' : '📋'}
        </button>
      </div>
    </div>
  );
};

export default ExploreTopBar;
