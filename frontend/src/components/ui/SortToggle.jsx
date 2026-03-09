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
    <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => handleChange(opt.value)}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all
                      ${sort === opt.value
                        ? 'bg-white text-primary-700 shadow-sm'
                        : 'text-gray-500'}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

export default SortToggle;
