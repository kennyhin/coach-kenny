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

    return '<div class="pad"><p class="lede">Unknown slide type: ' + esc(k) + '</p></div>';
  }

  /* A short human label for a slide, used in the editor list. */
  function label(s, deck) {
    if (s.kind === 'cover') return (deck && deck.title) || 'Cover';
    return s.title || s.eyebrow || s.kind;
  }

  return { slideBody: slideBody, label: label, esc: esc, imgPath: imgPath };
})();
