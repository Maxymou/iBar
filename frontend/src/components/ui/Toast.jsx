import { useState, useEffect, createContext, useContext, useCallback } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const colors = {
    success: 'bg-green-500',
    error:   'bg-red-500',
    info:    'bg-primary-600',
    warning: 'bg-amber-500',
  };

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed top-4 left-0 right-0 flex flex-col items-center gap-2 z-[100] pointer-events-none px-4"
           style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        {toasts.map(t => (
          <div key={t.id}
               className={`${colors[t.type] || colors.info} text-white px-4 py-3 rounded-xl shadow-lg
                           text-sm font-medium animate-slide-in-up max-w-sm w-full text-center`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
};
