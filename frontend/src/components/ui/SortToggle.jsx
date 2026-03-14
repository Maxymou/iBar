const SortToggle = ({ sort, onChange, onLocationSort }) => {
  const options = [
    { value: 'recent', label: 'Récent' },
    { value: 'rating', label: '⭐ Note' },
    { value: 'distance', label: '📍 Distance' },
  ];

  const handleChange = (value) => {
    if (value === 'distance') {
      onLocationSort?.();
    }
    onChange(value);
  };

  return (
    <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => handleChange(opt.value)}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all
                      ${sort === opt.value
                        ? 'bg-white dark:bg-gray-600 text-primary-700 dark:text-primary-300 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400'}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

export default SortToggle;
