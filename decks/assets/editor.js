/* ============================================================
   Deck editor — edits decks/data/<slug>.json in the browser.
   Save routes: Export (download / copy) or direct commit to
   GitHub with a fine-grained token the user supplies.
   ============================================================ */
(function () {
  'use strict';

  var OWNER  = 'kennyhin';
  var REPO   = 'coach-kenny';
  var BRANCH = 'main';
  var TOKEN_KEY = 'ck-gh-token';

  var P    = new URLSearchParams(location.search);
  var slug = P.get('d') || 'slam-reservations';
  var E    = DeckRender.esc;

  var deck = null;      // working copy
  var sel  = 0;         // selected slide index
  var editingDeck = false;
  var fileSha = null;   // sha of data/<slug>.json, for the commit
  var dirty = false;

  var KINDS = [
    ['cover',   'Cover'],
    ['divider', 'Section divider'],
    ['shot',    'Screenshot + steps'],
    ['text',    'Steps only (no image)'],
    ['flow',    'Flow diagram'],
    ['email',   'Email mockup'],
    ['grid',    'Card grid'],
    ['recap',   'Recap columns']
  ];

  /* ---------- small helpers ---------- */
  var $ = function (id) { return document.getElementById(id); };

  function toast(msg, kind) {
    var t = $('toast');
    t.textContent = msg;
    t.className = 'toast show' + (kind ? ' ' + kind : '');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.className = 'toast'; }, 4200);
  }

  function markDirty() {
    dirty = true;
    $('btn-save').textContent = 'Save •';
  }
  function markClean() {
    dirty = false;
    $('btn-save').textContent = 'Save';
  }

  window.addEventListener('beforeunload', function (ev) {
    if (dirty) { ev.preventDefault(); ev.returnValue = ''; }
  });

  /* UTF-8 safe base64 for the GitHub contents API */
  function b64encode(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = '';
    for (var i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(bin);
  }

  function json() { return JSON.stringify(deck, null, 2) + '\n'; }

  /* ---------- theme ---------- */
  var saved = localStorage.getItem('ck-theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
  $('btn-theme').addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-theme');
    if (!cur) cur = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    var n = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', n);
    localStorage.setItem('ck-theme', n);
  });

  /* ---------- load ---------- */
  $('btn-view').href = 'deck.html?d=' + encodeURIComponent(slug);

  fetch('data/decks.json').then(function (r) { return r.json(); }).then(function (m) {
    $('deckswitch').innerHTML = (m.decks || []).map(function (d) {
      return '<a class="dtab" href="edit.html?d=' + encodeURIComponent(d.slug) + '"' +
             (d.slug === slug ? ' aria-current="page"' : '') + '>' +
             (d.icon || '') + ' ' + E(d.title) + '</a>';
    }).join('');
  }).catch(function () {});

  fetch('data/' + slug + '.json?t=' + Date.now())
    .then(function (r) {
      if (!r.ok) throw new Error('Deck "' + slug + '" not found');
      return r.json();
    })
    .then(function (d) {
      deck = d;
      if (!deck.slides) deck.slides = [];
      DeckRender.applyTheme(deck);
      renderList();
      renderForm();
    })
    .catch(function (err) {
      $('ed-title').textContent = 'Could not load deck';
      $('form').innerHTML = '<p class="lede">' + E(err.message) + '</p>';
    });

  /* ---------- slide list ---------- */
  function renderList() {
    $('slidelist').innerHTML = deck.slides.map(function (s, n) {
      return '<li class="sl-item" data-i="' + n + '" tabindex="0" role="button"' +
             (n === sel && !editingDeck ? ' aria-current="true"' : '') + '>' +
        '<span class="sl-n">' + String(n + 1).padStart(2, '0') + '</span>' +
        '<span class="sl-t">' +
          '<span class="sl-title">' + E(DeckRender.label(s, deck)) + '</span>' +
          '<span class="sl-kind">' + E(s.kind) + '</span>' +
        '</span></li>';
    }).join('');

    [].slice.call($('slidelist').children).forEach(function (li) {
      var go = function () {
        sel = parseInt(li.dataset.i, 10);
        editingDeck = false;
        renderList(); renderForm();
      };
      li.addEventListener('click', go);
      li.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') { go(); ev.preventDefault(); }
      });
    });
  }

  /* ---------- field builders ---------- */
  function textField(labelTxt, value, onInput, hint, multiline) {
    var wrap = document.createElement('div');
    wrap.className = 'field';
    var id = 'f' + Math.random().toString(36).slice(2, 8);
    var el = document.createElement(multiline ? 'textarea' : 'input');
    if (!multiline) el.type = 'text';
    el.id = id;
    el.value = value == null ? '' : value;
    el.addEventListener('input', function () { onInput(el.value); markDirty(); });
    var lab = document.createElement('label');
    lab.setAttribute('for', id);
    lab.textContent = labelTxt;
    wrap.appendChild(lab);
    wrap.appendChild(el);
    if (hint) {
      var h = document.createElement('p');
      h.className = 'field-hint';
      h.innerHTML = hint;
      wrap.appendChild(h);
    }
    return wrap;
  }

  function selectField(labelTxt, value, opts, onChange) {
    var wrap = document.createElement('div');
    wrap.className = 'field';
    var id = 'f' + Math.random().toString(36).slice(2, 8);
    var sel2 = document.createElement('select');
    sel2.id = id;
    opts.forEach(function (o) {
      var op = document.createElement('option');
      op.value = o[0]; op.textContent = o[1];
      if (o[0] === value) op.selected = true;
      sel2.appendChild(op);
    });
    sel2.addEventListener('change', function () { onChange(sel2.value); markDirty(); });
    var lab = document.createElement('label');
    lab.setAttribute('for', id);
    lab.textContent = labelTxt;
    wrap.appendChild(lab); wrap.appendChild(sel2);
    return wrap;
  }

  /* Colour swatch + hex box, kept in sync both ways */
  function colorField(labelTxt, value, onChange, hint) {
    var wrap = document.createElement('div');
    wrap.className = 'field';
    var id = 'f' + Math.random().toString(36).slice(2, 8);
    var lab = document.createElement('label');
    lab.setAttribute('for', id);
    lab.textContent = labelTxt;

    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:.5rem;align-items:center';

    var swatch = document.createElement('input');
    swatch.type = 'color';
    swatch.id = id;
    swatch.value = /^#[0-9a-f]{6}$/i.test(value) ? value : '#C8102E';
    swatch.style.cssText =
      'width:2.6rem;height:2.6rem;padding:2px;border-radius:8px;cursor:pointer;' +
      'border:1px solid var(--line-2);background:var(--surface)';

    var hex = document.createElement('input');
    hex.type = 'text';
    hex.value = value || '';
    hex.spellcheck = false;
    hex.style.flex = '1';

    swatch.addEventListener('input', function () {
      hex.value = swatch.value.toUpperCase();
      onChange(hex.value); markDirty();
    });
    hex.addEventListener('input', function () {
      var v = hex.value.trim();
      if (/^#[0-9a-f]{6}$/i.test(v)) swatch.value = v;
      onChange(v); markDirty();
    });

    row.appendChild(swatch);
    row.appendChild(hex);
    wrap.appendChild(lab);
    wrap.appendChild(row);
    if (hint) {
      var h = document.createElement('p');
      h.className = 'field-hint';
      h.textContent = hint;
      wrap.appendChild(h);
    }
    return wrap;
  }

  /* A repeatable list of {h,b} pairs (steps / cards) */
  function pairList(title, arr, keyH, keyB, labelH, labelB, onStructural) {
    var sec = document.createElement('div');
    sec.className = 'ed-sec';
    var h3 = document.createElement('h3');
    h3.textContent = title;
    sec.appendChild(h3);

    var rows = document.createElement('div');
    rows.className = 'rows';
    arr.forEach(function (item, n) {
      var row = document.createElement('div');
      row.className = 'row';
      var top = document.createElement('div');
      top.className = 'row-top';
      var num = document.createElement('span');
      num.className = 'row-n';
      num.textContent = String(n + 1).padStart(2, '0');
      top.appendChild(num);

      [['↑', n === 0, function () { arr.splice(n - 1, 0, arr.splice(n, 1)[0]); }],
       ['↓', n === arr.length - 1, function () { arr.splice(n + 1, 0, arr.splice(n, 1)[0]); }],
       ['✕', false, function () { arr.splice(n, 1); }]
      ].forEach(function (b) {
        var btn = document.createElement('button');
        btn.className = 'xbtn';
        btn.textContent = b[0];
        btn.disabled = b[1];
        btn.addEventListener('click', function () { b[2](); markDirty(); onStructural(); });
        top.appendChild(btn);
      });
      row.appendChild(top);
      row.appendChild(textField(labelH, item[keyH], function (v) { item[keyH] = v; renderList(); }));
      row.appendChild(textField(labelB, item[keyB], function (v) { item[keyB] = v; }, null, true));
      rows.appendChild(row);
    });
    sec.appendChild(rows);

    var add = document.createElement('button');
    add.className = 'addbtn';
    add.textContent = '+ Add';
    add.addEventListener('click', function () {
      var o = {}; o[keyH] = ''; o[keyB] = '';
      arr.push(o); markDirty(); onStructural();
    });
    sec.appendChild(add);
    return sec;
  }

  /* A repeatable list of plain strings */
  function stringList(title, arr, itemLabel, onStructural) {
    var sec = document.createElement('div');
    sec.className = 'ed-sec';
    var h3 = document.createElement('h3');
    h3.textContent = title;
    sec.appendChild(h3);

    var rows = document.createElement('div');
    rows.className = 'rows';
    arr.forEach(function (val, n) {
      var row = document.createElement('div');
      row.className = 'row';
      var top = document.createElement('div');
      top.className = 'row-top';
      var num = document.createElement('span');
      num.className = 'row-n';
      num.textContent = String(n + 1).padStart(2, '0');
      top.appendChild(num);
      [['↑', n === 0, function () { arr.splice(n - 1, 0, arr.splice(n, 1)[0]); }],
       ['↓', n === arr.length - 1, function () { arr.splice(n + 1, 0, arr.splice(n, 1)[0]); }],
       ['✕', false, function () { arr.splice(n, 1); }]
      ].forEach(function (b) {
        var btn = document.createElement('button');
        btn.className = 'xbtn'; btn.textContent = b[0]; btn.disabled = b[1];
        btn.addEventListener('click', function () { b[2](); markDirty(); onStructural(); });
        top.appendChild(btn);
      });
      row.appendChild(top);
      row.appendChild(textField(itemLabel + ' ' + (n + 1), val, function (v) { arr[n] = v; }, null, true));
      rows.appendChild(row);
    });
    sec.appendChild(rows);
    var add = document.createElement('button');
    add.className = 'addbtn';
    add.textContent = '+ Add';
    add.addEventListener('click', function () { arr.push(''); markDirty(); onStructural(); });
    sec.appendChild(add);
    return sec;
  }

  /* ---------- form ---------- */
  function renderForm() {
    var f = $('form');
    f.innerHTML = '';

    if (editingDeck) {
      $('ed-title').textContent = 'Deck settings';
      f.appendChild(textField('Deck title', deck.title, function (v) { deck.title = v; }));
      f.appendChild(textField('Eyebrow (small line above the title)', deck.eyebrow, function (v) { deck.eyebrow = v; }));
      f.appendChild(textField('Subtitle', deck.subtitle, function (v) { deck.subtitle = v; }, null, true));
      if (!deck.contents) deck.contents = [];
      f.appendChild(stringList('Contents list on the cover', deck.contents, 'Item', function () { renderForm(); renderPreview(); }));

      // ---- accent colour ----
      if (!deck.theme) deck.theme = {};
      var tsec = document.createElement('div');
      tsec.className = 'ed-sec';
      var th3 = document.createElement('h3');
      th3.textContent = 'Deck colour';
      tsec.appendChild(th3);
      var tg = document.createElement('div');
      tg.className = 'grid2';
      tg.appendChild(colorField('Accent (dark theme)', deck.theme.accent || '#C8102E', function (v) {
        deck.theme.accent = v; DeckRender.applyTheme(deck); renderPreview();
      }, 'The bright version, used on the dark background.'));
      tg.appendChild(colorField('Accent (light theme)', deck.theme.accentLight || deck.theme.accent || '#C8102E', function (v) {
        deck.theme.accentLight = v; DeckRender.applyTheme(deck); renderPreview();
      }, 'A darker shade, so it stays readable on white.'));
      tsec.appendChild(tg);
      var clr = document.createElement('button');
      clr.className = 'addbtn';
      clr.textContent = 'Reset to SLAM red';
      clr.addEventListener('click', function () {
        delete deck.theme;
        var el = document.getElementById('deck-theme');
        if (el) el.remove();
        markDirty(); renderForm(); renderPreview();
      });
      tsec.appendChild(clr);
      f.appendChild(tsec);

      // ---- sections (acts) ----
      if (!deck.acts) deck.acts = [];
      f.appendChild(pairList('Sections (the groups in the top progress bar)', deck.acts, 'id', 'label',
        'Section id (used by slides)', 'Section name shown on screen',
        function () { renderForm(); renderPreview(); }));

      renderPreview();
      return;
    }

    var s = deck.slides[sel];
    if (!s) { f.innerHTML = '<p class="lede">No slide selected.</p>'; return; }
    $('ed-title').textContent = 'Slide ' + (sel + 1) + ' — ' + DeckRender.label(s, deck);

    var acts = (deck.acts || []).map(function (a) { return [a.id, a.label || a.id]; });
    if (!acts.length) acts = [['', '(none)']];

    var g = document.createElement('div');
    g.className = 'grid2';
    g.appendChild(selectField('Slide type', s.kind, KINDS, function (v) {
      s.kind = v; renderList(); renderForm();
    }));
    g.appendChild(selectField('Section (act)', s.act || '', acts, function (v) {
      s.act = v; renderList(); renderPreview();
    }));
    f.appendChild(g);

    if (s.kind === 'cover') {
      var p = document.createElement('p');
      p.className = 'field-hint';
      p.innerHTML = 'The cover is built from <b>Deck settings</b> — title, eyebrow, subtitle and contents list.';
      f.appendChild(p);
      renderPreview();
      return;
    }

    if (s.kind === 'divider') {
      f.appendChild(textField('Part label', s.num, function (v) { s.num = v; renderPreview(); }, 'e.g. <b>Part 1</b>'));
    } else {
      f.appendChild(textField('Eyebrow', s.eyebrow, function (v) { s.eyebrow = v; renderPreview(); }, 'e.g. <b>Step 3</b>'));
    }
    f.appendChild(textField('Title', s.title, function (v) { s.title = v; renderList(); renderPreview(); }));
    f.appendChild(textField('Intro line', s.lede, function (v) { s.lede = v; renderPreview(); }, null, true));

    if (s.kind === 'shot' || s.kind === 'divider') {
      f.appendChild(textField('Persona chip', s.persona, function (v) { s.persona = v; renderPreview(); },
        'Small tag, e.g. <b>Teacher / Staff</b>. Leave blank to hide.'));
    }

    if (s.kind === 'shot') {
      f.appendChild(imageField(s));
    }

    if (s.kind === 'shot' || s.kind === 'text') {
      if (!s.steps) s.steps = [];
      f.appendChild(pairList('Numbered steps', s.steps, 'h', 'b', 'Step heading', 'Step text',
        function () { renderForm(); renderPreview(); }));
      f.appendChild(textField('Green note (optional)', s.note, function (v) { s.note = v; renderPreview(); },
        'The highlighted aside under the steps. Leave blank to hide.', true));
    }

    if (s.kind === 'flow') {
      if (!s.stages) s.stages = [];
      if (!s.recipients) s.recipients = [];
      if (!s.hub) s.hub = { k: 'System sends', h: '', b: '' };
      if (!s.branch) s.branch = { h: '', b: '' };
      f.appendChild(pairList('Flow stages', s.stages, 'h', 'b', 'Stage heading', 'Stage text',
        function () { renderForm(); renderPreview(); }));
      var hubSec = document.createElement('div');
      hubSec.className = 'ed-sec';
      hubSec.innerHTML = '<h3>Send hub</h3>';
      hubSec.appendChild(textField('Hub label', s.hub.k, function (v) { s.hub.k = v; renderPreview(); }, 'e.g. <b>System sends</b>'));
      hubSec.appendChild(textField('Hub heading', s.hub.h, function (v) { s.hub.h = v; renderPreview(); }));
      hubSec.appendChild(textField('Hub text', s.hub.b, function (v) { s.hub.b = v; renderPreview(); }, null, true));
      f.appendChild(hubSec);
      var recSec = document.createElement('div');
      recSec.className = 'ed-sec';
      var rh = document.createElement('h3');
      rh.textContent = 'Recipients';
      recSec.appendChild(rh);
      s.recipients.forEach(function (r, n) {
        var row = document.createElement('div');
        row.className = 'row';
        var top = document.createElement('div');
        top.className = 'row-top';
        var num = document.createElement('span');
        num.className = 'row-n';
        num.textContent = 'Recipient ' + (n + 1);
        top.appendChild(num);
        [['↑', n === 0, function () { s.recipients.splice(n - 1, 0, s.recipients.splice(n, 1)[0]); }],
         ['↓', n === s.recipients.length - 1, function () { s.recipients.splice(n + 1, 0, s.recipients.splice(n, 1)[0]); }],
         ['✕', false, function () { s.recipients.splice(n, 1); }]
        ].forEach(function (b) {
          var btn = document.createElement('button');
          btn.className = 'xbtn'; btn.textContent = b[0]; btn.disabled = b[1];
          btn.addEventListener('click', function () { b[2](); markDirty(); renderForm(); renderPreview(); });
          top.appendChild(btn);
        });
        row.appendChild(top);
        row.appendChild(textField('Role (TO / CC)', r.role, function (v) { r.role = v; renderPreview(); }));
        row.appendChild(textField('Who', r.h, function (v) { r.h = v; renderPreview(); }));
        row.appendChild(textField('Detail', r.b, function (v) { r.b = v; renderPreview(); }, null, true));
        recSec.appendChild(row);
      });
      var addRec = document.createElement('button');
      addRec.className = 'addbtn';
      addRec.textContent = '+ Add recipient';
      addRec.addEventListener('click', function () {
        s.recipients.push({ role: 'CC', h: '', b: '' });
        markDirty(); renderForm(); renderPreview();
      });
      recSec.appendChild(addRec);
      f.appendChild(recSec);
      var brSec = document.createElement('div');
      brSec.className = 'ed-sec';
      brSec.innerHTML = '<h3>No-email branch</h3>';
      brSec.appendChild(textField('Branch heading', s.branch.h, function (v) { s.branch.h = v; renderPreview(); }));
      brSec.appendChild(textField('Branch text', s.branch.b, function (v) { s.branch.b = v; renderPreview(); }, null, true));
      f.appendChild(brSec);
    }

    if (s.kind === 'email') {
      if (!s.mail) s.mail = { from: '', to: '', cc: '', subject: '', badge: '', headline: '', body: [], facts: [], noteLabel: "Teacher's Note", note: '', footer: '', sentBy: '' };
      if (!s.mail.body) s.mail.body = [];
      if (!s.mail.facts) s.mail.facts = [];
      f.appendChild(textField('Example tag (optional)', s.example, function (v) { s.example = v; renderPreview(); },
        'Small label above the mock, e.g. Example — names are fictional'));
      var mailSec = document.createElement('div');
      mailSec.className = 'ed-sec';
      mailSec.innerHTML = '<h3>Inbox headers</h3>';
      mailSec.appendChild(textField('From', s.mail.from, function (v) { s.mail.from = v; renderPreview(); }));
      mailSec.appendChild(textField('To', s.mail.to, function (v) { s.mail.to = v; renderPreview(); }));
      mailSec.appendChild(textField('Cc', s.mail.cc, function (v) { s.mail.cc = v; renderPreview(); }));
      mailSec.appendChild(textField('Subject', s.mail.subject, function (v) { s.mail.subject = v; renderPreview(); }));
      f.appendChild(mailSec);
      var bodySec = document.createElement('div');
      bodySec.className = 'ed-sec';
      bodySec.innerHTML = '<h3>Email body</h3>';
      bodySec.appendChild(textField('Badge line', s.mail.badge, function (v) { s.mail.badge = v; renderPreview(); }, 'e.g. Accountability Check — Probation'));
      bodySec.appendChild(textField('Headline', s.mail.headline, function (v) { s.mail.headline = v; renderPreview(); }));
      bodySec.appendChild(stringList('Body paragraphs', s.mail.body, 'Paragraph', function () { renderForm(); renderPreview(); }));
      f.appendChild(bodySec);
      var factSec = document.createElement('div');
      factSec.className = 'ed-sec';
      var fh = document.createElement('h3');
      fh.textContent = 'Info grid';
      factSec.appendChild(fh);
      s.mail.facts.forEach(function (fact, n) {
        var row = document.createElement('div');
        row.className = 'row';
        var top = document.createElement('div');
        top.className = 'row-top';
        var num = document.createElement('span');
        num.className = 'row-n';
        num.textContent = 'Fact ' + (n + 1);
        top.appendChild(num);
        [['↑', n === 0, function () { s.mail.facts.splice(n - 1, 0, s.mail.facts.splice(n, 1)[0]); }],
         ['↓', n === s.mail.facts.length - 1, function () { s.mail.facts.splice(n + 1, 0, s.mail.facts.splice(n, 1)[0]); }],
         ['✕', false, function () { s.mail.facts.splice(n, 1); }]
        ].forEach(function (b) {
          var btn = document.createElement('button');
          btn.className = 'xbtn'; btn.textContent = b[0]; btn.disabled = b[1];
          btn.addEventListener('click', function () { b[2](); markDirty(); renderForm(); renderPreview(); });
          top.appendChild(btn);
        });
        row.appendChild(top);
        row.appendChild(textField('Label', fact[0], function (v) { fact[0] = v; renderPreview(); }));
        row.appendChild(textField('Value', fact[1], function (v) { fact[1] = v; renderPreview(); }));
        factSec.appendChild(row);
      });
      var addFact = document.createElement('button');
      addFact.className = 'addbtn';
      addFact.textContent = '+ Add fact';
      addFact.addEventListener('click', function () {
        s.mail.facts.push(['', '']);
        markDirty(); renderForm(); renderPreview();
      });
      factSec.appendChild(addFact);
      f.appendChild(factSec);
      f.appendChild(textField('Note label', s.mail.noteLabel, function (v) { s.mail.noteLabel = v; renderPreview(); }));
      f.appendChild(textField("Teacher's note (highlighted)", s.mail.note, function (v) { s.mail.note = v; renderPreview(); }, null, true));
      f.appendChild(textField('Footer blurb', s.mail.footer, function (v) { s.mail.footer = v; renderPreview(); }, null, true));
      f.appendChild(textField('Sent-by line', s.mail.sentBy, function (v) { s.mail.sentBy = v; renderPreview(); }));
      f.appendChild(textField('Green note (optional)', s.note, function (v) { s.note = v; renderPreview(); },
        'The highlighted aside under the mock. Leave blank to hide.', true));
    }

    if (s.kind === 'grid') {
      if (!s.cards) s.cards = [];
      f.appendChild(pairList('Cards', s.cards, 'h', 'b', 'Card heading', 'Card text',
        function () { renderForm(); renderPreview(); }));
    }

    if (s.kind === 'recap') {
      if (!s.columns) s.columns = [];
      var sec = document.createElement('div');
      sec.className = 'ed-sec';
      var h3 = document.createElement('h3');
      h3.textContent = 'Recap columns';
      sec.appendChild(h3);
      s.columns.forEach(function (col, n) {
        var row = document.createElement('div');
        row.className = 'row';
        var top = document.createElement('div');
        top.className = 'row-top';
        var num = document.createElement('span');
        num.className = 'row-n';
        num.textContent = 'Column ' + (n + 1);
        top.appendChild(num);
        [['↑', n === 0, function () { s.columns.splice(n - 1, 0, s.columns.splice(n, 1)[0]); }],
         ['↓', n === s.columns.length - 1, function () { s.columns.splice(n + 1, 0, s.columns.splice(n, 1)[0]); }],
         ['✕', false, function () { s.columns.splice(n, 1); }]
        ].forEach(function (b) {
          var btn = document.createElement('button');
          btn.className = 'xbtn'; btn.textContent = b[0]; btn.disabled = b[1];
          btn.addEventListener('click', function () { b[2](); markDirty(); renderForm(); renderPreview(); });
          top.appendChild(btn);
        });
        row.appendChild(top);
        row.appendChild(textField('Column heading', col.k, function (v) { col.k = v; renderPreview(); }));
        if (!col.items) col.items = [];
        row.appendChild(stringList('Lines', col.items, 'Line', function () { renderForm(); renderPreview(); }));
        sec.appendChild(row);
      });
      var add = document.createElement('button');
      add.className = 'addbtn';
      add.textContent = '+ Add column';
      add.addEventListener('click', function () {
        s.columns.push({ k: '', items: [''] });
        markDirty(); renderForm(); renderPreview();
      });
      sec.appendChild(add);
      f.appendChild(sec);
    }

    renderPreview();
  }

  /* ---------- image field (with optional GitHub upload) ---------- */
  function imageField(s) {
    var sec = document.createElement('div');
    sec.className = 'ed-sec';
    var h3 = document.createElement('h3');
    h3.textContent = 'Screenshot';
    sec.appendChild(h3);

    if (s.img) {
      var t = document.createElement('div');
      t.className = 'thumb';
      var im = document.createElement('img');
      im.src = DeckRender.imgPath(deck, s.img);
      im.alt = '';
      t.appendChild(im);
      sec.appendChild(t);
    }

    sec.appendChild(textField('Image file name', s.img, function (v) {
      s.img = v; renderPreview();
    }, 'A file inside <code>decks/img/' + E(deck.slug) + '/</code>, e.g. <code>03-step1.jpg</code>. A full https:// URL also works.'));

    var up = document.createElement('div');
    up.className = 'field';
    var lab = document.createElement('label');
    lab.textContent = 'Replace image';
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    var hint = document.createElement('p');
    hint.className = 'field-hint';
    hint.innerHTML = hasToken()
      ? 'Uploads to the repo and points this slide at it.'
      : 'Connect GitHub first (⚙ GitHub) to upload images from here. Otherwise add the file to <code>decks/img/' + E(deck.slug) + '/</code> yourself and type its name above.';
    input.disabled = !hasToken();
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (file) uploadImage(file, s);
    });
    up.appendChild(lab); up.appendChild(input); up.appendChild(hint);
    sec.appendChild(up);
    return sec;
  }

  /* ---------- preview ---------- */
  function renderPreview() {
    var host = $('preview');
    if (editingDeck) {
      var cover = deck.slides.filter(function (x) { return x.kind === 'cover'; })[0] || { kind: 'cover' };
      host.innerHTML = '<section class="slide">' + DeckRender.slideBody(cover, deck) + '</section>';
      return;
    }
    var s = deck.slides[sel];
    if (!s) { host.innerHTML = ''; return; }
    host.innerHTML = '<section class="slide slide-' + E(s.kind) + '">' +
                     DeckRender.slideBody(s, deck) + '</section>';
  }

  /* ---------- slide actions ---------- */
  $('btn-add-slide').addEventListener('click', function () {
    var lastAct = (deck.slides[sel] && deck.slides[sel].act) || '';
    deck.slides.splice(sel + 1, 0, {
      kind: 'shot', act: lastAct, eyebrow: '', title: 'New slide', lede: '', steps: []
    });
    sel = sel + 1;
    editingDeck = false;
    markDirty(); renderList(); renderForm();
  });

  $('btn-up').addEventListener('click', function () {
    if (sel === 0) return;
    deck.slides.splice(sel - 1, 0, deck.slides.splice(sel, 1)[0]);
    sel--; markDirty(); renderList(); renderForm();
  });
  $('btn-down').addEventListener('click', function () {
    if (sel >= deck.slides.length - 1) return;
    deck.slides.splice(sel + 1, 0, deck.slides.splice(sel, 1)[0]);
    sel++; markDirty(); renderList(); renderForm();
  });
  $('btn-dupe').addEventListener('click', function () {
    deck.slides.splice(sel + 1, 0, JSON.parse(JSON.stringify(deck.slides[sel])));
    sel++; markDirty(); renderList(); renderForm();
  });
  $('btn-del').addEventListener('click', function () {
    if (deck.slides.length <= 1) { toast('A deck needs at least one slide.', 'bad'); return; }
    if (!confirm('Delete slide ' + (sel + 1) + '?')) return;
    deck.slides.splice(sel, 1);
    if (sel >= deck.slides.length) sel = deck.slides.length - 1;
    markDirty(); renderList(); renderForm();
  });
  $('btn-deck').addEventListener('click', function () {
    editingDeck = true; renderList(); renderForm();
  });

  /* ---------- export ---------- */
  $('btn-export').addEventListener('click', function () {
    $('exp-json').value = json();
    $('exp-path').textContent = 'decks/data/' + slug + '.json';
    $('sheet-export').hidden = false;
  });
  $('exp-close').addEventListener('click', function () { $('sheet-export').hidden = true; });
  $('exp-copy').addEventListener('click', function () {
    var ta = $('exp-json');
    ta.select();
    navigator.clipboard.writeText(ta.value).then(
      function () { toast('Copied. Paste it into GitHub and commit.', 'ok'); },
      function () { document.execCommand('copy'); toast('Copied.', 'ok'); }
    );
  });
  $('exp-download').addEventListener('click', function () {
    var blob = new Blob([json()], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = slug + '.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    toast('Downloaded ' + slug + '.json', 'ok');
  });

  /* ---------- GitHub ---------- */
  function hasToken() { return !!localStorage.getItem(TOKEN_KEY); }
  function token() { return localStorage.getItem(TOKEN_KEY) || ''; }

  $('btn-gh').addEventListener('click', function () {
    $('gh-token').value = '';
    $('sheet-gh').hidden = false;
  });
  $('gh-cancel').addEventListener('click', function () { $('sheet-gh').hidden = true; });
  $('gh-forget').addEventListener('click', function () {
    localStorage.removeItem(TOKEN_KEY);
    $('sheet-gh').hidden = true;
    toast('Token removed from this browser.', 'ok');
    renderForm();
  });
  $('gh-save').addEventListener('click', function () {
    var v = $('gh-token').value.trim();
    if (!v) { toast('Paste a token first.', 'bad'); return; }
    localStorage.setItem(TOKEN_KEY, v);
    $('sheet-gh').hidden = true;
    toast('Connected. Save now commits straight to GitHub.', 'ok');
    renderForm();
  });

  function api(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({
      'Authorization': 'Bearer ' + token(),
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }, opts.headers || {});
    return fetch('https://api.github.com/repos/' + OWNER + '/' + REPO + path, opts);
  }

  function getSha(path) {
    return api('/contents/' + path + '?ref=' + BRANCH)
      .then(function (r) {
        if (r.status === 404) return null;
        if (!r.ok) throw new Error('GitHub read failed (' + r.status + ')');
        return r.json().then(function (j) { return j.sha; });
      });
  }

  function putFile(path, contentB64, message, sha) {
    var body = { message: message, content: contentB64, branch: BRANCH };
    if (sha) body.sha = sha;
    return api('/contents/' + path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) throw new Error(j.message || ('GitHub write failed (' + r.status + ')'));
        return j;
      });
    });
  }

  $('btn-save').addEventListener('click', function () {
    if (!hasToken()) {
      $('exp-json').value = json();
      $('exp-path').textContent = 'decks/data/' + slug + '.json';
      $('sheet-export').hidden = false;
      toast('No GitHub token set — export the file instead, or press ⚙ GitHub to connect.');
      return;
    }
    var btn = $('btn-save');
    btn.disabled = true; btn.textContent = 'Saving…';
    var path = 'decks/data/' + slug + '.json';

    getSha(path)
      .then(function (sha) {
        fileSha = sha;
        return putFile(path, b64encode(json()), 'Update ' + slug + ' deck from the editor', sha);
      })
      .then(function () {
        markClean();
        toast('Saved. The live deck updates in about a minute.', 'ok');
      })
      .catch(function (err) {
        toast(err.message + ' — use Export to save it by hand.', 'bad');
      })
      .then(function () {
        btn.disabled = false;
        if (!dirty) btn.textContent = 'Save';
      });
  });

  function uploadImage(file, slide) {
    if (!hasToken()) { toast('Connect GitHub first.', 'bad'); return; }
    var name = file.name.replace(/[^\w.\-]+/g, '-').toLowerCase();
    var path = 'decks/img/' + deck.slug + '/' + name;
    toast('Uploading ' + name + '…');

    var reader = new FileReader();
    reader.onload = function () {
      var bytes = new Uint8Array(reader.result);
      var bin = '';
      for (var i = 0; i < bytes.length; i += 0x8000) {
        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      }
      var b64 = btoa(bin);
      getSha(path)
        .then(function (sha) { return putFile(path, b64, 'Add deck image ' + name, sha); })
        .then(function () {
          slide.img = name;
          markDirty();
          toast('Uploaded. Press Save to publish the slide change.', 'ok');
          renderForm();
        })
        .catch(function (err) { toast(err.message, 'bad'); });
    };
    reader.readAsArrayBuffer(file);
  }
})();
