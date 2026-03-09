const StarRating = ({ value, onChange, size = 'md' }) => {
  const sizeClass = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl';

  if (onChange) {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`${sizeClass} transition-transform active:scale-110`}
          >
            {star <= (value || 0) ? '★' : '☆'}
          </button>
        ))}
      </div>
    );
  }

  if (!value) return null;

  return (
    <div className={`flex gap-0.5 ${sizeClass}`}>
      {[1, 2, 3, 4, 5].map(star => (
        <span key={star} className={star <= Math.round(value) ? 'text-amber-400' : 'text-gray-200'}>
          ★
        </span>
      ))}
    </div>
  );
};

export default StarRating;
