export const InfoCard = ({ icon, label, value, onClick, clickable }) => (
  <div
    className={`ios-card p-4 ${clickable ? 'cursor-pointer active:bg-gray-50 dark:active:bg-gray-700' : ''}`}
    onClick={onClick}
  >
    <div className="flex items-start gap-3">
      <span className="text-xl mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
        <p className={`text-gray-900 dark:text-gray-100 mt-0.5 ${clickable ? 'text-primary-600' : ''}`}>{value}</p>
      </div>
      {clickable && <span className="text-gray-300 dark:text-gray-600 mt-1">›</span>}
    </div>
  </div>
);

export const MetaRow = ({ label, value }) => (
  <div className="flex justify-between items-center">
    <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
    <span className="text-sm text-gray-900 dark:text-gray-100 font-medium">{value}</span>
  </div>
);
