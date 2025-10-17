// Polished client-only key redeem script
// - Replace SALT and ALLOWED_HASHES with your generated values (see tools/generate_hashes.js)
// - REDIRECT_URL should point to your main site location ("/" by default)
// - This is still client-side only and not secure for high-value entitlements.

(() => {
  'use strict';

  // TODO: set these to your generated values
  const SALT = "replace-with-long-random-salt";
  const ALLOWED_HASHES = [
    // "paste", "sha256", "hashes", "here"
  ];

  const REDIRECT_URL = "/"; // destination after successful redeem
  const MARK_IN_SESSION = true; // set sessionStorage 'unlocked'
  const PREVENT_SIMPLE_REUSE = true; // store used-hash list in localStorage for this browser only

  const form = document.getElementById('redeemForm');
  const keyInput = document.getElementById('keyInput');
  const messageEl = document.getElementById('message');
  const submitBtn = document.getElementById('submitBtn');

  function setMessage(text, mode = 'default') {
    messageEl.textContent = text;
    messageEl.className = 'message' + (mode === 'success' ? ' success' : mode === 'error' ? ' error' : '');
  }

  function disableUI(state = true) {
    submitBtn.disabled = state;
    keyInput.disabled = state;
    submitBtn.style.opacity = state ? '0.85' : '1';
  }

  async function sha256Hex(text) {
    const enc = new TextEncoder();
    const data = enc.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function markUsedInBrowser(hashed) {
    try {
      if (!PREVENT_SIMPLE_REUSE) return;
      const used = JSON.parse(localStorage.getItem('usedKeys') || '[]');
      if (!used.includes(hashed)) {
        used.push(hashed);
        localStorage.setItem('usedKeys', JSON.stringify(used));
      }
    } catch (e) {
      // ignore storage errors
    }
  }

  function wasUsedInBrowser(hashed) {
    try {
      if (!PREVENT_SIMPLE_REUSE) return false;
      const used = JSON.parse(localStorage.getItem('usedKeys') || '[]');
      return used.includes(hashed);
    } catch (e) {
      return false;
    }
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const raw = keyInput.value.trim();
    if (!raw) {
      setMessage('Please enter a key.', 'error');
      keyInput.focus();
      return;
    }

    disableUI(true);
    setMessage('Validating key…');

    try {
      // Normalization: uppercase and remove spaces for consistent user input handling
      const normalized = raw.toUpperCase().replace(/\s+/g, '');
      const toHash = SALT + normalized;
      const hashed = await sha256Hex(toHash);

      // quick local reuse check (same browser)
      if (wasUsedInBrowser(hashed)) {
        setMessage('This key was already used in this browser session.', 'error');
        disableUI(false);
        return;
      }

      const matched = ALLOWED_HASHES.includes(hashed);
      if (!matched) {
        // Friendly error with subtle shake animation via focus
        setMessage('Invalid key. Please check and try again.', 'error');
        keyInput.focus();
        disableUI(false);
        return;
      }

      // Success path
      markUsedInBrowser(hashed);
      if (MARK_IN_SESSION) sessionStorage.setItem('unlocked', '1');

      setMessage('Key accepted — redirecting you now…', 'success');

      // small delay to show success message and let the user register the change
      setTimeout(() => {
        window.location.href = REDIRECT_URL;
      }, 700);

    } catch (err) {
      console.error('Redeem error', err);
      setMessage('An unexpected error occurred. Try again later.', 'error');
      disableUI(false);
    }
  });

  // Nice UX: let Enter submit from input
  keyInput.addEventListener('input', () => {
    if (messageEl.classList.contains('error')) {
      messageEl.textContent = '';
      messageEl.className = 'message';
    }
  });

})();