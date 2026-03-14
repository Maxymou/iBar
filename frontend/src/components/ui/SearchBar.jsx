const SearchBar = ({ value, onChange, placeholder = 'Rechercher...' }) => (
  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
    <input
      type="search"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 border-0 text-sm
                 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500
                 outline-none focus:ring-2 focus:ring-primary-200 transition-all"
    />
    {value && (
      <button onClick={() => onChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
        ×
      </button>
    )}
  </div>
);

export default SearchBar;
