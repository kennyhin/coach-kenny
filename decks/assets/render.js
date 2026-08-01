/* ============================================================
   Shared slide renderer — used by deck.html and edit.html preview.
   Slide body text may contain simple inline HTML (<b>, entities),
   which is authored by us, so it is injected as-is. Anything that
   is a plain label is escaped.
   ============================================================ */
window.DeckRender = (function () {

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function imgPath(deck, file) {
    if (!file) return '';
    if (/^https?:|^data:|^\//.test(file)) return file;
    return 'img/' + deck.slug + '/' + file;
  }

  function steps(list) {
    if (!list || !list.length) return '';
    return '<ol class="steps">' + list.map(function (s, i) {
      return '<li class="step"><span class="step-n mono">' + (i + 1) + '</span>' +
             '<div class="step-b"><h4>' + (s.h || '') + '</h4>' +
             '<p>' + (s.b || '') + '</p></div></li>';
    }).join('') + '</ol>';
  }

  function chip(persona) {
    return persona ? '<span class="chip mono">' + esc(persona) + '</span>' : '';
  }

  /* Render one slide's inner HTML for a given deck. */
  function slideBody(s, deck) {
    var k = s.kind;

    if (k === 'cover') {
      var items = (deck.contents || []).map(function (c, i) {
        return '<li><span class="mono">' + String(i + 1).padStart(2, '0') + '</span>' + c + '</li>';
      }).join('');
      return '' +
        '<div class="cover">' +
          '<div class="cover-mark" aria-hidden="true"><span class="cm-1">SLAM</span><span class="cm-2">!</span></div>' +
          '<p class="cover-eyebrow mono">' + esc(deck.eyebrow || '') + '</p>' +
          '<h1 class="cover-h">' + (deck.title || '') + '</h1>' +
          '<p class="cover-lede">' + (deck.subtitle || '') + '</p>' +
          (items ? '<ul class="cover-meta">' + items + '</ul>' : '') +
          '<p class="cover-hint">Use <kbd>&rarr;</kbd> <kbd>&larr;</kbd> or the arrows below to move through the deck</p>' +
        '</div>';
    }

    if (k === 'divider') {
      return '' +
        '<div class="divider">' +
          (s.num ? '<p class="div-num mono">' + esc(s.num) + '</p>' : '') +
          '<h2 class="div-h">' + (s.title || '') + '</h2>' +
          '<p class="div-lede">' + (s.lede || '') + '</p>' +
          chip(s.persona) +
        '</div>';
    }

    if (k === 'shot') {
      var src = imgPath(deck, s.img);
      return '' +
        '<div class="split">' +
          '<figure class="shot">' +
            (src ? '<img src="' + esc(src) + '" alt="' + esc(s.title || '') + '" loading="lazy" decoding="async">' : '') +
          '</figure>' +
          '<div class="side">' +
            '<header class="shead">' +
              '<p class="eyebrow mono">' + esc(s.eyebrow || '') + ' ' + chip(s.persona) + '</p>' +
              '<h2>' + (s.title || '') + '</h2>' +
              '<p class="lede">' + (s.lede || '') + '</p>' +
            '</header>' +
            steps(s.steps) +
            (s.note ? '<p class="note mono">' + s.note + '</p>' : '') +
          '</div>' +
        '</div>';
    }

    if (k === 'grid') {
      var cards = (s.cards || []).map(function (c) {
        return '<article class="card"><h4>' + (c.h || '') + '</h4><p>' + (c.b || '') + '</p></article>';
      }).join('');
      return '' +
        '<div class="pad">' +
          '<header class="shead shead-wide">' +
            (s.eyebrow ? '<p class="eyebrow mono">' + esc(s.eyebrow) + '</p>' : '') +
            '<h2>' + (s.title || '') + '</h2>' +
            (s.lede ? '<p class="lede">' + s.lede + '</p>' : '') +
          '</header>' +
          '<div class="cards">' + cards + '</div>' +
        '</div>';
    }

    if (k === 'recap') {
      var cols = (s.columns || []).map(function (c) {
        var lis = (c.items || []).map(function (t) { return '<li>' + t + '</li>'; }).join('');
        return '<section class="rc"><p class="rc-k mono">' + esc(c.k || '') + '</p><ol>' + lis + '</ol></section>';
      }).join('');
      return '' +
        '<div class="pad">' +
          '<header class="shead shead-wide">' +
            (s.eyebrow ? '<p class="eyebrow mono">' + esc(s.eyebrow) + '</p>' : '') +
            '<h2>' + (s.title || '') + '</h2>' +
            (s.lede ? '<p class="lede">' + s.lede + '</p>' : '') +
          '</header>' +
          '<div class="recap">' + cols + '</div>' +
        '</div>';
    }

    if (k === 'text') {
      return '' +
        '<div class="pad">' +
          '<header class="shead shead-wide">' +
            (s.eyebrow ? '<p class="eyebrow mono">' + esc(s.eyebrow) + '</p>' : '') +
            '<h2>' + (s.title || '') + '</h2>' +
            (s.lede ? '<p class="lede">' + s.lede + '</p>' : '') +
          '</header>' +
          steps(s.steps) +
          (s.note ? '<p class="note mono">' + s.note + '</p>' : '') +
        '</div>';
    }

    if (k === 'flow') {
      var stages = (s.stages || []).map(function (st, i) {
        return (i ? '<div class="flow-arrow" aria-hidden="true"></div>' : '') +
          '<div class="flow-stage">' +
            '<span class="flow-n mono">' + esc(st.n || String(i + 1)) + '</span>' +
            '<div class="flow-stage-b">' +
              '<h4>' + (st.h || '') + '</h4>' +
              (st.b ? '<p>' + st.b + '</p>' : '') +
            '</div>' +
          '</div>';
      }).join('');

      var hub = s.hub
        ? '<div class="flow-hub">' +
            '<p class="flow-hub-k mono">' + esc(s.hub.k || 'Email') + '</p>' +
            '<h4>' + (s.hub.h || '') + '</h4>' +
            (s.hub.b ? '<p>' + s.hub.b + '</p>' : '') +
          '</div>'
        : '';

      var recipients = (s.recipients || []).map(function (r) {
        var role = String(r.role || 'CC').toUpperCase();
        var primary = role === 'TO' ? ' flow-rec-to' : '';
        return '<article class="flow-rec' + primary + '">' +
          '<p class="flow-role mono">' + esc(role) + '</p>' +
          '<h4>' + (r.h || '') + '</h4>' +
          (r.b ? '<p>' + r.b + '</p>' : '') +
          '</article>';
      }).join('');

      var branch = s.branch
        ? '<aside class="flow-branch">' +
            '<p class="flow-branch-k mono">If no parent email</p>' +
            '<h4>' + (s.branch.h || '') + '</h4>' +
            (s.branch.b ? '<p>' + s.branch.b + '</p>' : '') +
          '</aside>'
        : '';

      return '' +
        '<div class="pad">' +
          '<header class="shead shead-wide">' +
            (s.eyebrow ? '<p class="eyebrow mono">' + esc(s.eyebrow) + '</p>' : '') +
            '<h2>' + (s.title || '') + '</h2>' +
            (s.lede ? '<p class="lede">' + s.lede + '</p>' : '') +
          '</header>' +
          '<div class="flow">' +
            (stages ? '<div class="flow-stages">' + stages + '</div>' : '') +
            (hub || recipients
              ? '<div class="flow-arrow flow-arrow-down" aria-hidden="true"></div>' +
                '<div class="flow-send">' + hub +
                  (recipients ? '<div class="flow-recs">' + recipients + '</div>' : '') +
                '</div>'
              : '') +
            (branch
              ? '<div class="flow-arrow flow-arrow-down flow-arrow-branch" aria-hidden="true"></div>' + branch
              : '') +
          '</div>' +
        '</div>';
    }

    return '<div class="pad"><p class="lede">Unknown slide type: ' + esc(k) + '</p></div>';
  }

  /* A short human label for a slide, used in the editor list. */
  function label(s, deck) {
    if (s.kind === 'cover') return (deck && deck.title) || 'Cover';
    return s.title || s.eyebrow || s.kind;
  }

  /* Per-deck accent colour. The stylesheet drives every accent off --red /
     --red-fill / --glow, so a deck can re-hue itself by redefining just those.
     `light` is the darker variant used on the light theme, where a bright
     accent would not hold contrast as text. */
  function applyTheme(deck) {
    var t = deck && deck.theme;
    if (!t || !t.accent) return;
    var dark  = t.accent;
    var light = t.accentLight || t.accent;
    var glowD = t.glow || hexToRgba(dark, 0.16);
    var glowL = hexToRgba(light, 0.12);

    var css =
      ':root{--red:' + light + ';--red-fill:' + light + ';--glow:' + glowL + ';}' +
      '@media (prefers-color-scheme:dark){:root{--red:' + dark + ';--red-fill:' + dark + ';--glow:' + glowD + ';}}' +
      ':root[data-theme="dark"]{--red:' + dark + ';--red-fill:' + dark + ';--glow:' + glowD + ';}' +
      ':root[data-theme="light"]{--red:' + light + ';--red-fill:' + light + ';--glow:' + glowL + ';}';

    var el = document.getElementById('deck-theme');
    if (!el) {
      el = document.createElement('style');
      el.id = 'deck-theme';
      document.head.appendChild(el);
    }
    el.textContent = css;
  }

  function hexToRgba(hex, a) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  return {
    slideBody: slideBody, label: label, esc: esc,
    imgPath: imgPath, applyTheme: applyTheme
  };
})();
