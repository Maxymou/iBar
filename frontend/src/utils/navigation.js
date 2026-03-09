// Detect iOS
export const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Open navigation app
export const openNavigation = (address, lat, lng) => {
  const encoded = encodeURIComponent(address || `${lat},${lng}`);
  const coord = lat && lng ? `${lat},${lng}` : null;

  return {
    waze: coord
      ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
      : `https://waze.com/ul?q=${encoded}&navigate=yes`,
    google: coord
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encoded}`,
    apple: coord
      ? `maps://maps.apple.com/?daddr=${lat},${lng}`
      : `maps://maps.apple.com/?q=${encoded}`,
  };
};

// Format distance
export const formatDistance = (km) => {
  if (km === null || km === undefined) return null;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
};

// Format date in French
export const formatDate = (dateStr) => {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
};

// Format currency
export const formatPrice = (price) => {
  if (!price && price !== 0) return null;
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price);
};
