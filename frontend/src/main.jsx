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
//   --app-height     : STABLE maximum height of the layout viewport.
//                      Derived from window.innerHeight but NEVER reduced by
//                      keyboard transitions. Only resets on orientation change.
//                      Used by html/body/#root, .app-viewport, .modal-overlay.
//   --vvh            : Visual viewport height (shrinks when keyboard is open).
//                      Used only by .auth-shell to follow the visible area.
//   --vv-top         : visualViewport.offsetTop, but forced to 0 when keyboard
//                      is closed (iOS bug: offsetTop can stay stuck after close).
//   --keyboard-offset: Height consumed by the keyboard (0 when closed).
//
// Core principle: --app-height is a HIGH-WATER MARK that only grows, never
// shrinks due to keyboard. On iOS PWA, window.innerHeight can temporarily
// report a reduced value for 300–800 ms after keyboard dismiss — writing
// that transient value to --app-height causes a visible gap at the bottom.
// By keeping the maximum observed height, the gap never appears.
// On orientation change, the high-water mark resets so the new (possibly
// shorter) landscape height is adopted correctly.
//
// Cold start problem & solution:
//   On iOS PWA cold start, window.innerHeight reports a PROVISIONAL value
//   that can be too small (missing ~34 px of safe area bottom). The CSS
//   fallback `100dvh` is correct at cold start, but once JS writes the
//   provisional innerHeight to --app-height, it OVERRIDES the correct CSS
//   fallback with a wrong value. The previous staggered recalcs (up to 1 s)
//   could all fire before iOS finalizes innerHeight — the wrong value stuck.
//   Fix: during startup, we insert a hidden probe element measuring `100dvh`
//   and feed its offsetHeight into the high-water mark. CSS 100dvh resolves
//   to the correct full-screen height even when innerHeight hasn't caught up.
//   The probe is removed after the settle period (3 s).
//
// Known iOS PWA quirks addressed here:
//   1. Provisional window.innerHeight at cold start — can be 34 px too small
//      for 1–3 s. No 'resize' fires. CSS 100dvh is correct sooner.
//      → dvh probe + 100 ms polling for 3 s at startup.
//   2. After keyboard close, iOS takes 300–800 ms to restore innerHeight.
//      → High-water mark ignores transient dips.
//   3. visualViewport.offsetTop can stay stuck at a non-zero value after close.
//      → Force --vv-top to '0px' when keyboard is considered closed.
;(function initAppHeight() {
  // ── Stable height tracking ──────────────────────────────────────────────────
  // stableHeight is the known-good full-screen height. It only increases
  // (capturing larger height values) and resets to 0 on orientation change
  // so the new orientation's height can be captured fresh.
  let stableHeight = 0;
  let lastOrientation = screen.orientation?.angle
    ?? (window.innerWidth > window.innerHeight ? 90 : 0);

  // ── dvh probe (startup only) ────────────────────────────────────────────────
  // A hidden fixed element measuring 100dvh. Its offsetHeight gives the
  // correct CSS viewport height even when window.innerHeight is provisional.
  // Active only during the startup settle period, then removed.
  let dvhProbe = document.createElement('div');
  dvhProbe.style.cssText =
    'position:fixed;top:0;left:0;width:0;height:100dvh;' +
    'pointer-events:none;visibility:hidden;z-index:-9999';
  document.documentElement.appendChild(dvhProbe);

  function readDvhProbe() {
    return dvhProbe ? dvhProbe.offsetHeight : 0;
  }

  function removeDvhProbe() {
    if (dvhProbe) { dvhProbe.remove(); dvhProbe = null; }
  }

  // Cache previous CSS values to skip no-op updates (jitter filter).
  let prevAppH = 0, prevH = 0, prevTop = 0;

  function syncViewportMetrics() {
    const vv = window.visualViewport;
    const ih = Math.round(window.innerHeight);

    // During startup, also consider the CSS 100dvh measurement.
    // On iOS PWA cold start, 100dvh resolves correctly before innerHeight.
    const dvh = readDvhProbe();
    const bestHeight = Math.max(ih, dvh);

    // ── Orientation change detection ────────────────────────────────────────
    // If orientation changed, reset the high-water mark so the new (possibly
    // shorter) height is accepted. screen.orientation.angle is most reliable;
    // fallback heuristic uses aspect ratio.
    const curOrientation = screen.orientation?.angle
      ?? (window.innerWidth > window.innerHeight ? 90 : 0);
    if (curOrientation !== lastOrientation) {
      lastOrientation = curOrientation;
      stableHeight = 0; // Reset — next measurement becomes the new baseline
    }

    // ── High-water mark update ──────────────────────────────────────────────
    // Only grow stableHeight. During keyboard open/close transitions,
    // innerHeight can temporarily dip — we ignore those dips entirely.
    // After orientation reset (stableHeight = 0), any value is accepted.
    if (bestHeight > stableHeight) {
      stableHeight = bestHeight;
    }

    // --app-height: always the stable maximum, never the transient dip.
    const appHeight = stableHeight;

    // --vvh: tracks the actual visible area (shrinks with keyboard).
    const h = vv ? Math.round(vv.height) : ih;

    // iOS keyboard is always ≥ 250 px tall. 150 px threshold avoids false
    // positives from Safari's collapsible address bar (~50 px).
    const kbOffset = Math.max(0, appHeight - h);
    const isKeyboardOpen = kbOffset > 150;

    // iOS known bug: visualViewport.offsetTop can remain stuck at a non-zero
    // value after the keyboard closes (observed on iOS 15–17). Forcing it to 0
    // when keyboard is closed prevents auth-shell from being displaced downward.
    const top = (vv && isKeyboardOpen) ? Math.round(vv.offsetTop) : 0;

    // Skip updates within 1 px — avoids unnecessary style recalcs from jitter.
    if (
      Math.abs(appHeight - prevAppH) < 1 &&
      Math.abs(h  - prevH)  < 1 &&
      Math.abs(top - prevTop) < 1
    ) return;
    prevAppH = appHeight; prevH = h; prevTop = top;

    const s = document.documentElement.style;
    s.setProperty('--app-height',      appHeight + 'px');
    s.setProperty('--vvh',             h  + 'px');
    s.setProperty('--vv-top',          top + 'px');
    s.setProperty('--keyboard-offset', kbOffset + 'px');
  }

  // ── Initial sync ────────────────────────────────────────────────────────────
  syncViewportMetrics();

  const rafSync = () => requestAnimationFrame(syncViewportMetrics);
  let tid;
  const debounced = () => { clearTimeout(tid); tid = setTimeout(rafSync, 50); };

  // ── Startup settle loop ──────────────────────────────────────────────────────
  // iOS PWA can take 1–3 s to finalize the viewport on cold start.
  // Poll every 100 ms with the dvh probe active, feeding each measurement
  // into the high-water mark. Stops after 3 s and removes the probe.
  // On desktop/Android where innerHeight is correct immediately, the loop
  // is a no-op (jitter filter skips identical values) and cleans up at 3 s.
  const settleId = setInterval(rafSync, 100);
  setTimeout(() => { clearInterval(settleId); removeDvhProbe(); }, 3000);

  // Also run once all resources are loaded (catches late viewport finalization).
  window.addEventListener('load', () => {
    [0, 100, 300].forEach(ms => setTimeout(rafSync, ms));
  });

  // ── Standard resize / viewport events ───────────────────────────────────────
  window.addEventListener('resize', debounced);

  // iOS takes up to 1 s to settle after rotation on some devices.
  // The orientation change resets stableHeight inside syncViewportMetrics,
  // then staggered recalcs capture the new correct value.
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
  // With the high-water mark, --app-height won't shrink — only --vvh changes.
  document.addEventListener('focusin', rafSync);

  // focusout fires when an input loses focus (keyboard about to close).
  // After close, iOS takes 300–800 ms to fully restore window.innerHeight.
  // Staggered recalcs still run so --vvh and --keyboard-offset recover,
  // but --app-height stays rock-solid at the high-water mark throughout.
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
