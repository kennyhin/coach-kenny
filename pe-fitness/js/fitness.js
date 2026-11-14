/*
 * pe-fitness/js/fitness.js — small progressive enhancements for the Presidential Fitness section.
 *
 * Purpose: (1) reveal JS-only UI ([data-js-only]); (2) Print buttons; (3) benchmarks quick look
 *   (level / group / age pickers → status banner + 3 boards) and choosing which of the 4 full tables
 *   shows (URL hash keeps it, e.g. #national-girls); (4) lessons list filter chips.
 * Data source: the <script type="application/json" id="pf-data"> block that tools/build-benchmarks.mjs
 *   writes from benchmarks.csv. This file never contains numbers.
 * Follows: design-spec.md § 3 (quick look, tables, hash) and § 4 (filter chips). No dependencies.
 * Without JS every page still works: all 4 tables show stacked and all lessons are listed.
 */
(function () {
  'use strict';
  document.querySelectorAll('[data-js-only]').forEach(function (el) { el.hidden = false; });
  document.querySelectorAll('[data-print]').forEach(function (b) {
    b.addEventListener('click', function () { window.print(); });
  });

  /* ---------- Benchmarks ---------- */
  var dataEl = document.getElementById('pf-data');
  if (dataEl) {
    var D = JSON.parse(dataEl.textContent);
    var state = { level: 'Presidential', sex: 'Boys', age: '10' };
    var m = location.hash.match(/^#(presidential|national)-(boys|girls)$/);
    if (m) { state.level = cap(m[1]); state.sex = cap(m[2]); }

    var dirWords = function (id) { return D.direction[id] === 'at most' ? 'at or under' : 'at least'; };
    function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

    function render() {
      var tierN = state.level === 'National';
      // Pickers: aria-pressed + tier color on the chosen age (gold = Presidential, silver = National)
      document.querySelectorAll('.level').forEach(function (b) { on(b, b.dataset.level === state.level); });
      document.querySelectorAll('.group').forEach(function (b) { on(b, b.dataset.sex === state.sex); });
      document.querySelectorAll('.age').forEach(function (b) { on(b, b.dataset.age === state.age); b.classList.toggle('tier-n', tierN); });
      var sel = document.getElementById('age-older');
      var older = !document.querySelector('.age[data-age="' + state.age + '"]');
      sel.value = older ? state.age : '';
      sel.classList.toggle('is-on', older); sel.classList.toggle('tier-n', tierN);

      var row = D.data[state.sex][state.level][state.age];
      var missing = D.events.every(function (e) { return row[e.id] === 'missing'; });
      document.getElementById('ql-status').textContent =
        'Showing ' + state.level + ' targets for ' + state.sex + ', age ' + state.age;
      document.getElementById('ql-code').textContent = state.sex.charAt(0) + '-' + state.age;
      document.querySelector('.status-banner').classList.toggle('tier-n', tierN);
      document.getElementById('ql-missing').hidden = !missing;
      document.getElementById('ql-boards').hidden = missing;
      document.querySelectorAll('#ql-boards .score').forEach(function (el) {
        var v = row[el.dataset.event];
        el.textContent = v === 'missing' ? '—' : v;
        var u = el.nextElementSibling; // keep the unit, refresh the direction words
        u.textContent = u.textContent.replace(/ · .*$/, '') + ' · ' + dirWords(el.dataset.event);
      });
      document.querySelectorAll('#ql-boards .or').forEach(function (o) {
        o.classList.toggle('tier-p', !tierN); o.classList.toggle('tier-n', tierN);
      });
      // Full tables: show only the chosen level + group
      var key = (state.level + '-' + state.sex).toLowerCase();
      document.querySelectorAll('[data-table]').forEach(function (t) { t.hidden = t.dataset.table !== key; });
    }
    function on(b, yes) { b.classList.toggle('is-on', yes); b.setAttribute('aria-pressed', String(yes)); }
    function setHash() {
      history.replaceState(null, '', '#' + (state.level + '-' + state.sex).toLowerCase());
    }

    document.addEventListener('click', function (ev) {
      var b = ev.target.closest('.level, .group, .age');
      if (!b) return;
      if (b.dataset.level) state.level = b.dataset.level;
      if (b.dataset.sex) state.sex = b.dataset.sex;
      if (b.dataset.age) state.age = b.dataset.age;
      render(); setHash();
    });
    document.getElementById('age-older').addEventListener('change', function (e) {
      if (e.target.value) { state.age = e.target.value; render(); }
    });
    window.addEventListener('hashchange', function () {
      var h = location.hash.match(/^#(presidential|national)-(boys|girls)$/);
      if (h) { state.level = cap(h[1]); state.sex = cap(h[2]); render();
        document.getElementById('full-tables').scrollIntoView(); }
    });
    render();
    if (m) document.getElementById('full-tables').scrollIntoView();
  }

  /* ---------- Lessons filter ---------- */
  var chips = document.querySelectorAll('.filter-chip');
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      chips.forEach(function (x) { x.setAttribute('aria-pressed', String(x === c)); });
      var f = c.dataset.filter;
      document.querySelectorAll('.lesson-group').forEach(function (g) {
        g.hidden = f !== 'all' && g.dataset.band !== f;
      });
    });
  });
})();
