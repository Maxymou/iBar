import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// ─── iOS PWA viewport fix ─────────────────────────────────────────────────────
// On iOS PWA standalone mode, viewport dimensions can become stale after
// orientation changes or keyboard open/close. We track both the layout viewport
// (window.innerHeight) and the visual viewport (visualViewport.height) separately
// and expose CSS custom properties for each use case:
//
//   --app-height     : STABLE height = window.innerHeight (layout viewport).
//                      Used by html/body/#root. Never changes with keyboard.
//   --vvh            : Visual viewport height (shrinks when keyboard is open).
//                      Used only by .auth-shell to follow the visible area.
//   --vv-top         : visualViewport.offsetTop, but forced to 0 when keyboard
//                      is closed (iOS bug: offsetTop can stay stuck after close).
//   --keyboard-offset: Height consumed by the keyboard (0 when closed).
//
// Known iOS PWA quirks addressed here:
//   1. Provisional window.innerHeight at script-execution time — the correct
//      value can arrive up to ~1 s later without firing a 'resize' event.
//      → Staggered startup recalcs at 100/300/600/1000 ms.
//   2. After keyboard close, iOS takes 300–800 ms to restore window.innerHeight.
//      No 'resize' fires during that window.
//      → Staggered recalcs on 'focusout' at 50/150/300/600/1000 ms.
//   3. visualViewport.offsetTop can stay stuck at a non-zero value after close.
//      → Force --vv-top to '0px' when keyboard is considered closed.
;(function initAppHeight() {
  // Cache previous rounded values to skip updates smaller than 1 px (jitter filter).
  let prevIh = 0, prevH = 0, prevTop = 0;

  function syncViewportMetrics() {
    const vv = window.visualViewport;

    // --app-height uses window.innerHeight (layout viewport) — stable height
    // that does NOT shrink when the iOS keyboard opens.
    const ih = Math.round(window.innerHeight);

    // --vvh uses visualViewport.height — the actually visible area.
    // Shrinks by keyboard height when the iOS keyboard is open.
    const h = vv ? Math.round(vv.height) : ih;

    // iOS keyboard is always ≥ 250 px tall. 150 px threshold avoids false
    // positives from Safari's collapsible address bar (~50 px).
    const kbOffset = Math.max(0, ih - h);
    const isKeyboardOpen = kbOffset > 150;

    // iOS known bug: visualViewport.offsetTop can remain stuck at a non-zero
    // value after the keyboard closes (observed on iOS 15–17). Forcing it to 0
    // when keyboard is closed prevents auth-shell from being displaced downward.
    const top = (vv && isKeyboardOpen) ? Math.round(vv.offsetTop) : 0;

    // Skip updates within 1 px — avoids unnecessary style recalcs from jitter.
    if (
      Math.abs(ih - prevIh) < 1 &&
      Math.abs(h  - prevH)  < 1 &&
      Math.abs(top - prevTop) < 1
    ) return;
    prevIh = ih; prevH = h; prevTop = top;

    const s = document.documentElement.style;
    s.setProperty('--app-height',      ih + 'px');
    s.setProperty('--vvh',             h  + 'px');
    s.setProperty('--vv-top',          top + 'px');
    s.setProperty('--keyboard-offset', kbOffset + 'px');
  }

  // ── Initial sync ────────────────────────────────────────────────────────────
  syncViewportMetrics();

  const rafSync = () => requestAnimationFrame(syncViewportMetrics);
  let tid;
  const debounced = () => { clearTimeout(tid); tid = setTimeout(rafSync, 50); };

  // ── Staggered startup recalcs ────────────────────────────────────────────────
  // iOS PWA reports a provisional window.innerHeight at script-execution time.
  // The final stable value can arrive up to ~1 s later WITHOUT firing 'resize'.
  // Running recalcs at increasing intervals ensures we always capture it.
  [100, 300, 600, 1000].forEach(ms => setTimeout(rafSync, ms));

  // Also run once all resources are loaded (catches late viewport finalization).
  window.addEventListener('load', () => {
    [0, 100, 300].forEach(ms => setTimeout(rafSync, ms));
  });

  // ── Standard resize / viewport events ───────────────────────────────────────
  window.addEventListener('resize', debounced);

  // iOS takes up to 1 s to settle after rotation on some devices.
  window.addEventListener('orientationchange', () => {
    [100, 300, 600, 1000].forEach(ms => setTimeout(rafSync, ms));
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', debounced);
    // visualViewport.scroll fires when iOS pushes the viewport up for the keyboard.
    window.visualViewport.addEventListener('scroll', rafSync);
  }

  // ── Keyboard lifecycle ───────────────────────────────────────────────────────
  // focusin fires when an input gains focus (keyboard about to open).
  document.addEventListener('focusin', rafSync);

  // focusout fires when an input loses focus (keyboard about to close).
  // After close, iOS takes 300–800 ms to fully restore window.innerHeight.
  // No 'resize' fires during that window — staggered recalcs catch the
  // settled value once iOS finishes its keyboard-dismiss animation.
  document.addEventListener('focusout', () => {
    [50, 150, 300, 600, 1000].forEach(ms => setTimeout(rafSync, ms));
  });

  // ── Background / navigation ──────────────────────────────────────────────────
  // Recover from stale values when the PWA returns from background.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      [50, 150, 300].forEach(ms => setTimeout(rafSync, ms));
    }
  });

  // iOS does not fire a resize event on back navigation — pageshow fills the gap.
  window.addEventListener('pageshow', rafSync);
})();

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: '2rem', background: '#fee2e2', color: '#991b1b',
          fontFamily: 'monospace', whiteSpace: 'pre-wrap', minHeight: '100vh',
        }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            Erreur de l'application
          </h1>
          <p>{this.state.error.message}</p>
          <pre style={{ marginTop: '1rem', fontSize: '0.8rem', opacity: 0.8 }}>
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
