// Decrypts this page in the browser. The page file holds only ciphertext.
// Key = PBKDF2-SHA256(PIN, salt, iter) -> AES-GCM. The derived key (never the PIN)
// is kept in sessionStorage so other note pages open without asking again.
(function () {
  var SK = 'tn-unlock';
  var data = JSON.parse(document.getElementById('tn-data').textContent);
  var form = document.getElementById('tn-form'), input = document.getElementById('tn-pin');
  var btn = document.getElementById('tn-go'), msg = document.getElementById('tn-msg');

  function fromB64(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function toB64(buf) { var u = new Uint8Array(buf), s = ''; for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); }

  function derive(pin) {
    return crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']).then(function (base) {
      return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromB64(data.salt), iterations: data.iter }, base, 256);
    });
  }
  function decrypt(bits) {
    return crypto.subtle.importKey('raw', bits, 'AES-GCM', false, ['decrypt']).then(function (k) {
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(data.iv) }, k, fromB64(data.ct));
    }).then(function (pt) { return JSON.parse(new TextDecoder().decode(pt)); });
  }
  function show(p) {
    document.title = p.title;
    var st = document.createElement('style'); st.textContent = p.css; document.head.appendChild(st);
    document.body.className = '';
    document.body.innerHTML = p.body;
    var lock = document.createElement('button');
    lock.className = 'tn-lockbtn'; lock.type = 'button'; lock.textContent = 'Lock';
    lock.addEventListener('click', function () { sessionStorage.removeItem(SK); location.reload(); });
    document.body.appendChild(lock);
    if (location.hash) { var el = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (el) el.scrollIntoView(); }
  }
  function ready() { document.body.classList.remove('tn-checking'); input.focus(); }

  if (!window.crypto || !crypto.subtle) { ready(); msg.textContent = 'This browser cannot unlock these notes.'; msg.className = 'err'; return; }

  var saved = null;
  try { saved = JSON.parse(sessionStorage.getItem(SK) || 'null'); } catch (e) {}
  if (saved && saved.salt === data.salt) {
    decrypt(fromB64(saved.bits)).then(show, function () { sessionStorage.removeItem(SK); ready(); });
  } else { ready(); }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var pin = input.value.trim(); if (!pin) return;
    btn.disabled = true; msg.className = ''; msg.textContent = 'Unlocking...';
    var bits;
    derive(pin).then(function (b) { bits = b; return decrypt(b); }).then(function (p) {
      try { sessionStorage.setItem(SK, JSON.stringify({ salt: data.salt, bits: toB64(bits) })); } catch (e) {}
      show(p);
    }, function () {
      btn.disabled = false; input.value = ''; input.focus();
      msg.className = 'err'; msg.textContent = 'That PIN did not work. Try again.';
    });
  });
})();
