import { useState, useEffect } from 'react';

// Delta (px) between innerHeight and visualViewport.height above which
// we consider the software keyboard to be open.
// Smallest iOS keyboard ≈ 260 px; 100 px avoids false positives from toolbar.
const KEYBOARD_THRESHOLD = 100;

/**
 * AuthLayout — shared wrapper for Login / Register pages.
 *
 * Provides:
 *  - iPhone PWA viewport tracking (follows visualViewport in real-time)
 *  - Landscape 2-column layout (brand left, card right)
 *  - Keyboard-open compact mode (brand hidden, form scrollable)
 *  - Safe-area insets on all 4 sides
 *
 * @param {ReactNode} brand    — logo + title JSX (displayed in .auth-brand)
 * @param {ReactNode} children — form card JSX (displayed in .auth-card)
 */
const AuthLayout = ({ children, brand }) => {
  const [isLandscape, setIsLandscape] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    // ── Landscape detection via matchMedia ──
    const mql = window.matchMedia('(orientation: landscape)');
    const onOrientation = (e) => setIsLandscape(e.matches);
    setIsLandscape(mql.matches);
    mql.addEventListener('change', onOrientation);

    // ── Keyboard detection via visualViewport ──
    const vv = window.visualViewport;
    const onViewport = () => {
      if (!vv) return;
      const delta = window.innerHeight - vv.height;
      setIsKeyboardOpen(delta > KEYBOARD_THRESHOLD);
    };
    if (vv) {
      vv.addEventListener('resize', onViewport);
      vv.addEventListener('scroll', onViewport);
    }

    return () => {
      mql.removeEventListener('change', onOrientation);
      if (vv) {
        vv.removeEventListener('resize', onViewport);
        vv.removeEventListener('scroll', onViewport);
      }
    };
  }, []);

  const shellClasses = [
    'auth-shell',
    'bg-gradient-to-br from-primary-700 to-primary-900',
    isLandscape && 'auth-landscape',
    isKeyboardOpen && 'auth-keyboard-open',
  ].filter(Boolean).join(' ');

  return (
    <div className={shellClasses}>
      <div className="auth-content">
        <div className="auth-brand">{brand}</div>
        <div className="auth-card">{children}</div>
      </div>
    </div>
  );
};

export default AuthLayout;
