// gate.js — improved access gate logic that preserves site styles and theme
// Replace VALID_KEYS with your real key(s)

(function () {
  // CONFIG: put your actual keys here (case-insensitive)
  const VALID_KEYS = ['your-key-here']; // <-- replace with real key(s)
  const ACCESS_FLAG = 'moon_access_unlocked_v3';

  function log(...args) { try { console.debug('[gate]', ...args); } catch (e) {} }

  function isUnlocked() {
    try { return localStorage.getItem(ACCESS_FLAG) === '1'; } catch (e) { return false; }
  }
  function setUnlocked() {
    try { localStorage.setItem(ACCESS_FLAG, '1'); } catch (e) {}
  }

  function hideGate() {
    const gate = document.getElementById('gateOverlay');
    if (gate) {
      gate.setAttribute('aria-hidden', 'true');
      gate.style.display = 'none';
    }
    document.documentElement.classList.remove('locked');
    document.body.style.overflow = '';
  }

  function showGate() {
    const gate = document.getElementById('gateOverlay');
    if (gate) {
      gate.setAttribute('aria-hidden', 'false');
      gate.style.display = 'flex';
    }
    document.documentElement.classList.add('locked');
    document.body.style.overflow = 'hidden';
    const input = document.getElementById('accessKeyInput');
    if (input) {
      input.focus();
      input.select();
    }
  }

  function showError(text) {
    const err = document.getElementById('keyError');
    if (!err) return;
    err.hidden = false;
    err.textContent = text;
    err.style.color = '#ff6b6b';
    const card = document.querySelector('.gate-card');
    if (card) {
      card.classList.remove('shake');
      void card.offsetWidth; // reflow
      card.classList.add('shake');
    }
  }

  function clearError() {
    const err = document.getElementById('keyError');
    if (!err) return;
    err.hidden = true;
    err.textContent = '';
  }

  function normalizeKey(s) {
    return (s + '').trim().toLowerCase();
  }

  function validateKey(input) {
    if (!input) return false;
    const normalized = normalizeKey(input);
    return VALID_KEYS.map(normalizeKey).includes(normalized);
  }

  // Ensure style.css is attached (in case something replaced head)
  function ensureStylesheet() {
    try {
      // Look for a link that points to style.css (exact or partial)
      const found = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .some(l => (l.href || '').toLowerCase().includes('/style.css'));
      if (!found) {
        log('style.css not found in document; re-attaching.');
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/style.css';
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      } else {
        log('style.css already present.');
      }
    } catch (e) {
      console.error('ensureStylesheet error', e);
    }
  }

  // Re-apply the site theme/class/title/icon after unlock
  function restoreTheme() {
    try {
      // title
      document.title = 'Moon';
      // ensure dark-mode class exists on body
      if (!document.body.classList.contains('dark-mode')) {
        document.body.classList.add('dark-mode');
      }
      // ensure favicon exists (some browsers won't change it but we'll set)
      const existingIcon = document.querySelector('link[rel~="icon"]');
      if (existingIcon) {
        existingIcon.href = '/favicon.png';
      } else {
        const icon = document.createElement('link');
        icon.rel = 'icon';
        icon.type = 'image/png';
        icon.href = '/favicon.png';
        document.head.appendChild(icon);
      }
      // ensure appended gate CSS hasn't been removed
      ensureStylesheet();
    } catch (e) {
      console.error('restoreTheme error', e);
    }
  }

  // Inject the site's main script and wait for it to load
  function injectAppScript() {
    return new Promise((resolve, reject) => {
      try {
        // Don't inject twice
        if (document.querySelector('script[data-app-script]')) {
          log('app script already injected, resolving.');
          restoreTheme();
          resolve();
          return;
        }

        // Create script element
        const s = document.createElement('script');
        s.src = '/script.js';
        s.setAttribute('data-app-script', '1');
        s.async = false;
        s.onload = function () {
          log('script.js loaded');
          // script may have mutated DOM; ensure styles and theme
          restoreTheme();
          resolve();
        };
        s.onerror = function (e) {
          console.error('Failed to load script.js', e);
          reject(new Error('script-load-failed'));
        };

        // Append at end of body (after DOM is ready)
        document.body.appendChild(s);

        // Safety timeout: if not loaded in N ms, reject
        setTimeout(() => {
          if (!document.querySelector('script[data-app-script]') || typeof window.listZones !== 'function') {
            // Try one more time to restore style in case script did something weird
            restoreTheme();
            // But don't fail silently; reject to show message
            reject(new Error('script-load-timeout'));
          }
        }, 4000);
      } catch (err) {
        reject(err);
      }
    });
  }

  // Called when user submits the key
  function unlockFlow() {
    clearError();
    const input = document.getElementById('accessKeyInput');
    if (!input) {
      console.error('Access input not found');
      return;
    }
    const val = input.value || '';
    if (validateKey(val)) {
      setUnlocked();
      hideGate();
      restoreTheme();
      injectAppScript().catch(err => {
        console.error('Failed to inject app script:', err);
        showError('Failed to load app — check console');
        // re-open gate so user sees error and can retry
        showGate();
      });
    } else {
      showError('Key not valid');
    }
  }

  // Wire up controls & gate lifecycle
  document.addEventListener('DOMContentLoaded', function () {
    const btn = document.getElementById('accessKeyButton');
    const input = document.getElementById('accessKeyInput');

    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        unlockFlow();
      });
    }
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          unlockFlow();
        } else {
          clearError(); // remove error as user types
        }
      });
      // mobile friendliness
      input.autocapitalize = 'off';
      input.autocomplete = 'off';
      input.spellcheck = false;
    }

    if (isUnlocked()) {
      // If previously unlocked, restore theme and load app
      hideGate();
      restoreTheme();
      injectAppScript().catch(err => {
        console.error(err);
        // If injection fails, show gate so user can retry
        showGate();
      });
    } else {
      showGate();
    }
  });

  // Debug helpers available in console
  window.__moonGate = {
    unlockForTesting: function () { setUnlocked(); hideGate(); injectAppScript().catch(err => console.error(err)); },
    reset: function () { localStorage.removeItem(ACCESS_FLAG); clearError(); showGate(); },
    validate: function (v) { return validateKey(v); }
  };
})();
