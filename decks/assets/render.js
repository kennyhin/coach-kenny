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
      var subtitle = String(deck.subtitle == null ? '' : deck.subtitle).trim();
      return '' +
        '<div class="cover">' +
          '<div class="cover-mark" aria-hidden="true"><span class="cm-1">SLAM</span><span class="cm-2">!</span></div>' +
          '<p class="cover-eyebrow mono">' + esc(deck.eyebrow || '') + '</p>' +
          '<h1 class="cover-h">' + (deck.title || '') + '</h1>' +
          (subtitle ? '<p class="cover-lede">' + subtitle + '</p>' : '') +
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
      /* One numbered spine, top to bottom. Every stage is a row hanging off the
         same rail, so there is no arrow to anchor by hand — the rail is drawn by
         the row itself and stays correct at any width or stage count. */
      var n = 0;
      var rows = '';

      var flowStep = function (kicker, head, body, extra, cls, num) {
        n += 1;
        return '<li class="flow-step' + (cls ? ' ' + cls : '') + '">' +
          '<span class="flow-n mono" aria-hidden="true">' + esc(num || String(n)) + '</span>' +
          '<div class="flow-body">' +
            (kicker ? '<p class="flow-k mono">' + esc(kicker) + '</p>' : '') +
            (head ? '<h4>' + head + '</h4>' : '') +
            (body ? '<p>' + body + '</p>' : '') +
            (extra || '') +
          '</div>' +
        '</li>';
      };

      var branchHtml = s.branch
        ? '<aside class="flow-branch">' +
            '<p class="flow-branch-k mono">' + esc(s.branch.k || 'If no parent email') + '</p>' +
            '<div class="flow-branch-b">' +
              '<h4>' + (s.branch.h || '') + '</h4>' +
              (s.branch.b ? '<p>' + s.branch.b + '</p>' : '') +
            '</div>' +
          '</aside>'
        : '';
      var branchPlaced = false;

      (s.stages || []).forEach(function (st) {
        rows += flowStep(st.k, st.h, st.b, '', '', st.n);
      });

      if (s.hub) {
        rows += flowStep(s.hub.k || 'System sends', s.hub.h, s.hub.b, '', 'flow-step-hub');
      }

      if ((s.recipients || []).length) {
        // The recipients are parallel, not more steps on the spine: they share
        // one stage marker and sit in a grid branching off it.
        var hasTo = false;
        var recs = s.recipients.map(function (r) {
          var role = String(r.role || 'CC').toUpperCase();
          var isTo = role === 'TO';
          if (isTo) hasTo = true;
          return '<article class="flow-rec' + (isTo ? ' flow-rec-to' : '') + '">' +
            '<p class="flow-role mono">' + esc(role) + '</p>' +
            '<h4>' + (r.h || '') + '</h4>' +
            (r.b ? '<p>' + r.b + '</p>' : '') +
          '</article>';
        }).join('');
        // The exception is a sibling of the cards inside the same grid: it sits
        // directly under the TO card it belongs to, and `order` keeps it there
        // once the grid collapses to a single column.
        if (hasTo && branchHtml) {
          recs += branchHtml;
          branchPlaced = true;
        }
        rows += flowStep(s.fanK || '', s.fanH || 'Who receives it', s.fanB || '',
                         '<div class="flow-recs">' + recs + '</div>', 'flow-step-fan');
      }

      // No TO card to hang it on — keep the exception visible as its own row.
      if (branchHtml && !branchPlaced) {
        rows += '<li class="flow-step flow-step-alone">' +
          '<span class="flow-n flow-n-alt mono" aria-hidden="true">!</span>' +
          '<div class="flow-body">' + branchHtml + '</div>' +
        '</li>';
      }

      return '' +
        '<div class="pad">' +
          '<header class="shead shead-wide">' +
            (s.eyebrow ? '<p class="eyebrow mono">' + esc(s.eyebrow) + '</p>' : '') +
            '<h2>' + (s.title || '') + '</h2>' +
            (s.lede ? '<p class="lede">' + s.lede + '</p>' : '') +
          '</header>' +
          '<ol class="flow">' + rows + '</ol>' +
        '</div>';
    }

    if (k === 'email') {
      var m = s.mail || {};
      var headers = [
        ['From', m.from],
        ['To', m.to],
        ['Cc', m.cc],
        ['Subject', m.subject]
      ].filter(function (row) { return row[1]; }).map(function (row) {
        return '<div class="em-row">' +
          '<span class="em-k mono">' + esc(row[0]) + '</span>' +
          '<span class="em-v' + (row[0] === 'Subject' ? ' em-subject' : '') + '">' + row[1] + '</span>' +
        '</div>';
      }).join('');

      var paras = (m.body || []).map(function (p) {
        return '<p class="em-p">' + p + '</p>';
      }).join('');

      var facts = (m.facts || []).map(function (f) {
        return '<div class="em-fact">' +
          '<span class="em-fact-k mono">' + esc(f[0] || '') + '</span>' +
          '<span class="em-fact-v">' + (f[1] || '') + '</span>' +
        '</div>';
      }).join('');

      return '' +
        '<div class="pad">' +
          '<header class="shead shead-wide">' +
            (s.eyebrow ? '<p class="eyebrow mono">' + esc(s.eyebrow) + '</p>' : '') +
            '<h2>' + (s.title || '') + '</h2>' +
            (s.lede ? '<p class="lede">' + s.lede + '</p>' : '') +
          '</header>' +
          '<article class="em">' +
            (s.example ? '<p class="em-tag mono">' + esc(s.example) + '</p>' : '') +
            '<div class="em-chrome">' + headers + '</div>' +
            '<div class="em-body">' +
              (m.badge ? '<p class="em-badge mono">' + esc(m.badge) + '</p>' : '') +
              (m.headline ? '<h3 class="em-h">' + m.headline + '</h3>' : '') +
              paras +
              (facts ? '<div class="em-facts">' + facts + '</div>' : '') +
              (m.note
                ? '<div class="em-note">' +
                    '<p class="em-note-k mono">' + esc(m.noteLabel || "Teacher's Note") + '</p>' +
                    '<p class="em-note-v">' + m.note + '</p>' +
                  '</div>'
                : '') +
              (m.footer ? '<p class="em-footer">' + m.footer + '</p>' : '') +
              (m.sentBy ? '<p class="em-sent mono">' + m.sentBy + '</p>' : '') +
            '</div>' +
          '</article>' +
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
