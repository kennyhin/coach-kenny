/* ============================================================
   Editor PIN gate.

   This runs in the browser, so it is a deterrent that keeps the
   editor out of casual reach — it is NOT real security, and it
   cannot be. The actual protection is that publishing a change
   requires a GitHub token with write access to the repo, which
   only Kenny has. Without that token the editor can do nothing
   but produce a JSON file on your own machine.

   The code is stored as a salted SHA-256 hash so the digits do
   not sit in the page source in plain text.
   ============================================================ */
(function () {
  'use strict';

  var SALT = 'ck-decks-v1';
  var HASH = '1b8cd500fde527333890a03d2f83d3186be28ff24064413bfcca03657a9727a4';
  var KEY  = 'ck-deck-edit-ok';

  var lock = document.getElementById('lock');
  var row  = document.getElementById('pin-row');
  var msg  = document.getElementById('lock-msg');
  if (!lock || !row) return;

  var inputs = [].slice.call(row.querySelectorAll('input'));

  function unlock() {
    lock.remove();
    document.body.style.overflow = '';
  }

  if (localStorage.getItem(KEY) === HASH) { unlock(); return; }

  document.body.style.overflow = 'hidden';
  setTimeout(function () { inputs[0].focus(); }, 60);

  function sha256(str) {
    if (!(window.crypto && window.crypto.subtle)) return Promise.resolve(null);
    return crypto.subtle
      .digest('SHA-256', new TextEncoder().encode(str))
      .then(function (buf) {
        return [].map.call(new Uint8Array(buf), function (b) {
          return b.toString(16).padStart(2, '0');
        }).join('');
      });
  }

  function value() {
    return inputs.map(function (i) { return i.value; }).join('');
  }

  function fail(text) {
    msg.textContent = text;
    lock.classList.add('bad');
    setTimeout(function () { lock.classList.remove('bad'); }, 420);
    inputs.forEach(function (i) { i.value = ''; });
    inputs[0].focus();
  }

  function attempt() {
    var v = value();
    if (v.length !== inputs.length) return;
    sha256(SALT + v).then(function (h) {
      if (h === null) {
        // No SubtleCrypto (very old browser, or a non-secure origin).
        fail('This browser cannot check the code. Open the site over https.');
        return;
      }
      if (h === HASH) {
        localStorage.setItem(KEY, HASH);
        unlock();
      } else {
        fail('That code is not right.');
      }
    });
  }

  inputs.forEach(function (input, n) {
    input.addEventListener('input', function () {
      msg.textContent = '';
      input.value = input.value.replace(/\D/g, '').slice(0, 1);
      if (input.value && n < inputs.length - 1) inputs[n + 1].focus();
      attempt();
    });

    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Backspace' && !input.value && n > 0) {
        inputs[n - 1].focus();
        inputs[n - 1].value = '';
        ev.preventDefault();
      } else if (ev.key === 'ArrowLeft' && n > 0) {
        inputs[n - 1].focus(); ev.preventDefault();
      } else if (ev.key === 'ArrowRight' && n < inputs.length - 1) {
        inputs[n + 1].focus(); ev.preventDefault();
      } else if (ev.key === 'Enter') {
        attempt();
      }
    });

    input.addEventListener('paste', function (ev) {
      var text = (ev.clipboardData || window.clipboardData).getData('text') || '';
      var digits = text.replace(/\D/g, '').slice(0, inputs.length);
      if (!digits) return;
      ev.preventDefault();
      digits.split('').forEach(function (d, k) { inputs[k].value = d; });
      inputs[Math.min(digits.length, inputs.length - 1)].focus();
      attempt();
    });
  });
})();
