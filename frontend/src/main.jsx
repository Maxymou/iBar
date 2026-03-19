import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// ─── iOS PWA viewport fix ─────────────────────────────────────────────────────
// On iOS PWA standalone mode, 100dvh / 100% can become stale after orientation
// changes or keyboard open/close. We track visualViewport in real-time and
// expose several CSS custom properties:
//   --app-height     : visual viewport height (backward compat, used by map/root)
//   --vvh            : same value, semantic alias for auth pages
//   --vv-top         : visualViewport.offsetTop (non-zero when iOS scrolls for keyboard)
//   --keyboard-offset: difference between layout viewport and visual viewport
;(function initAppHeight() {
  function update() {
    const vv = window.visualViewport;
    const ih = window.innerHeight;
    const h = vv ? vv.height : ih;
    const top = vv ? vv.offsetTop : 0;
    const kbOffset = vv ? Math.max(0, ih - vv.height) : 0;
    const s = document.documentElement.style;
    s.setProperty('--app-height', h + 'px');
    s.setProperty('--vvh', h + 'px');
    s.setProperty('--vv-top', top + 'px');
    s.setProperty('--keyboard-offset', kbOffset + 'px');
  }

  update();

  const rafUpdate = () => requestAnimationFrame(update);
  let tid;
  const debounced = () => { clearTimeout(tid); tid = setTimeout(rafUpdate, 50); };

  window.addEventListener('resize', debounced);

  // iOS takes 100-500ms to settle viewport after rotation — staggered recalcs
  window.addEventListener('orientationchange', () => {
    [100, 300, 500].forEach(ms => setTimeout(rafUpdate, ms));
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', debounced);
    // scroll fires when iOS pushes the viewport up for the keyboard
    window.visualViewport.addEventListener('scroll', rafUpdate);
  }
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
