const CATEGORIES = [
  { key: null, label: 'Tous' },
  { key: 'cafe', label: 'Cafés' },
  { key: 'restaurant', label: 'Resto' },
  { key: 'hotel', label: 'Hôtels' },
];

const ExploreCategoryPill = ({ selected, onChange }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-ui pointer-events-none explore-pill-bar">
      <div className="flex justify-center">
        <div className="pointer-events-auto inline-flex bg-white dark:bg-gray-800 rounded-full
                        shadow-lg border border-gray-200 dark:border-gray-600 p-1 gap-0.5">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key || 'all'}
              onClick={() => onChange(cat.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all
                ${selected === cat.key
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExploreCategoryPill;
