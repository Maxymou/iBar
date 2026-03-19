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
;(function initAppHeight() {
  // Cache previous rounded values to skip updates smaller than 1px (jitter filter).
  let prevIh = 0, prevH = 0, prevTop = 0;

  function update() {
    const vv = window.visualViewport;

    // --app-height uses window.innerHeight (layout viewport) — this is the
    // stable "app shell" height that does NOT shrink when the keyboard opens.
    // Using visualViewport.height here (previous behaviour) caused html/body to
    // shrink and left a blank strip at the bottom of the screen.
    const ih = Math.round(window.innerHeight);

    // --vvh uses visualViewport.height — this is the actually visible area.
    // It shrinks by ~keyboard height when the iOS keyboard is open.
    const h = vv ? Math.round(vv.height) : ih;

    // iOS keyboard is always ≥ 250px tall. A 150px threshold avoids false
    // positives from Safari's collapsible address bar (~50px).
    const kbOffset = Math.max(0, ih - h);
    const isKeyboardOpen = kbOffset > 150;

    // iOS known bug: visualViewport.offsetTop can remain stuck at a non-zero
    // value after the keyboard closes (observed on iOS 15–17). Forcing it to 0
    // when the keyboard is considered closed prevents auth-shell from being
    // displaced downward by a stale offset.
    const top = (vv && isKeyboardOpen) ? Math.round(vv.offsetTop) : 0;

    // Skip if nothing changed by more than 1px — avoids unnecessary style recalcs.
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

  update();

  const rafUpdate = () => requestAnimationFrame(update);
  let tid;
  const debounced = () => { clearTimeout(tid); tid = setTimeout(rafUpdate, 50); };

  window.addEventListener('resize', debounced);

  // iOS takes up to 1 s to settle after rotation on some devices.
  // Staggered recalcs ensure we capture the final stable value.
  window.addEventListener('orientationchange', () => {
    [100, 300, 600, 1000].forEach(ms => setTimeout(rafUpdate, ms));
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', debounced);
    // visualViewport.scroll fires when iOS pushes the viewport upward for the keyboard.
    window.visualViewport.addEventListener('scroll', rafUpdate);
  }

  // Recover from stale values when the PWA returns from background.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') setTimeout(rafUpdate, 50);
  });

  // iOS does not fire a resize event on back navigation — pageshow fills the gap.
  window.addEventListener('pageshow', rafUpdate);
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
