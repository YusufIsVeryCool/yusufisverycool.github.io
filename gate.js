// gate.js — improved access gate logic for Moon site
// - Case-insensitive key comparison (trimmed)
// - Focus handling and Enter key support
// - Injects script.js after unlock and waits for load
// - Console logging + debug helpers

(function () {
  // CONFIG: replace with your real keys (case-insensitive)
  // Example: ['moon2025','anotherKey']
  const VALID_KEYS = ['your-key-here']; // <-- replace me!
  const ACCESS_FLAG = 'moon_access_unlocked_v2';

  function debugLog(...args) { try { console.debug('[gate]', ...args); } catch (e) {} }

  function isUnlocked() {
    try { return localStorage.getItem(ACCESS_FLAG) === '1'; } catch (e) { return false; }
  }
  function setUnlocked() {
    try { localStorage.setItem(ACCESS_FLAG, '1'); } catch (e) {}
  }
  function clearUnlocked() {
    try { localStorage.removeItem(ACCESS_FLAG); } catch (e) {}
  }

  function hideGate() {
    const gate = document.getElementById('gateOverlay');
    if (gate) { gate.setAttribute('aria-hidden', 'true'); gate.style.display = 'none'; }
    document.documentElement.classList.remove('locked');
    document.body.style.overflow = '';
  }

  function showGate() {
    const gate = document.getElementById('gateOverlay');
    if (gate) { gate.setAttribute('aria-hidden', 'false'); gate.style.display = 'flex'; }
    document.documentElement.classList.add('locked');
    document.body.style.overflow = 'hidden';
    const input = document.getElementById('accessKeyInput');
    if (input) { input.focus(); input.select(); }
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
      // trigger reflow to restart animation
      void card.offsetWidth;
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

  function injectAppScript() {
    return new Promise((resolve, reject) => {
      // avoid injecting twice
      if (document.querySelector('script[data-app-script]')) {
        debugLog('App script already injected.');
        resolve();
        return;
      }

      const s = document.createElement('script');
      s.src = 'script.js';
      s.setAttribute('data-app-script', '1');
      s.async = false;
      s.onload = () => {
        debugLog('script.js loaded');
        resolve();
      };
      s.onerror = (e) => {
        console.error('Failed to load script.js', e);
        reject(new Error('script-load-failed'));
      };
      document.body.appendChild(s);

      // safety timeout
      setTimeout(() => {
        if (!document.querySelector('script[src="script.js"]')) {
          reject(new Error('script-insert-failed'));
        }
      }, 3000);
    });
  }

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
      // ensure title and favicon are set
      document.title = 'Moon';
      const icon = document.querySelector('link[rel~="icon"]');
      if (icon) icon.href = '/favicon.png';

      // inject script and handle failure
      injectAppScript().catch(err => {
        console.error('Failed to inject app script:', err);
        // show minimal fallback message
        showError('Failed to load app — check console');
        // re-show gate as a fallback
        showGate();
      });
    } else {
      showError('Key not valid');
    }
  }

  // wire up DOM controls
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
        // allow typing normally, Enter triggers unlock
        if (e.key === 'Enter') {
          e.preventDefault();
          unlockFlow();
        } else {
          // clear error on typing
          clearError();
        }
      });
      // mobile-friendly: enable autocapitalize=off
      input.autocapitalize = 'off';
      input.autocomplete = 'off';
      input.spellcheck = false;
    }

    // if previously unlocked, hide and inject immediately
    if (isUnlocked()) {
      hideGate();
      injectAppScript().catch(err => console.error(err));
    } else {
      showGate();
    }
  });

  // debug console helpers
  window.__moonGate = {
    unlockForTesting: function() { setUnlocked(); hideGate(); injectAppScript().catch(err => console.error(err)); },
    reset: function() { clearUnlocked(); clearError(); showGate(); },
    validate: function(v) { return validateKey(v); }
  };
})();
