export const InfoCard = ({ icon, label, value, onClick, clickable }) => (
  <div
    className={`ios-card p-4 ${clickable ? 'cursor-pointer active:bg-gray-50' : ''}`}
    onClick={onClick}
  >
    <div className="flex items-start gap-3">
      <span className="text-xl mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
        <p className={`text-gray-900 mt-0.5 ${clickable ? 'text-primary-600' : ''}`}>{value}</p>
      </div>
      {clickable && <span className="text-gray-300 mt-1">›</span>}
    </div>
  </div>
);

export const MetaRow = ({ label, value }) => (
  <div className="flex justify-between items-center">
    <span className="text-sm text-gray-500">{label}</span>
    <span className="text-sm text-gray-900 font-medium">{value}</span>
  </div>
);
