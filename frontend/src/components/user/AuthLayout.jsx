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
    const checkKeyboard = () => {
      if (!vv) return;
      const delta = window.innerHeight - vv.height;
      setIsKeyboardOpen(delta > KEYBOARD_THRESHOLD);
    };
    if (vv) {
      vv.addEventListener('resize', checkKeyboard);
      vv.addEventListener('scroll', checkKeyboard);
    }

    // ── Re-evaluate after orientation change ──
    // iOS may report a transitional visualViewport.height immediately after
    // orientationchange, leading to a false keyboard-open detection.
    // A 300ms delay lets the viewport settle before we re-check.
    const onOrientationChange = () => setTimeout(checkKeyboard, 300);
    window.addEventListener('orientationchange', onOrientationChange);

    // ── Re-evaluate on back navigation ──
    // iOS does not fire a resize event on pageshow, so the keyboard state
    // can be stale when the user navigates back to a login/register page.
    const onPageShow = () => setTimeout(checkKeyboard, 50);
    window.addEventListener('pageshow', onPageShow);

    // ── Re-evaluate after keyboard close ──
    // After focusout, iOS takes 300–800 ms to restore visualViewport.height to
    // its full value. The visualViewport.resize listener fires earlier with a
    // transitional value that can leave isKeyboardOpen stuck at true.
    // Staggered rechecks ensure the final settled state is reflected.
    const onFocusOut = () => {
      [50, 150, 300, 600, 1000].forEach(ms => setTimeout(checkKeyboard, ms));
    };
    document.addEventListener('focusout', onFocusOut);

    return () => {
      mql.removeEventListener('change', onOrientation);
      if (vv) {
        vv.removeEventListener('resize', checkKeyboard);
        vv.removeEventListener('scroll', checkKeyboard);
      }
      window.removeEventListener('orientationchange', onOrientationChange);
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('focusout', onFocusOut);
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
