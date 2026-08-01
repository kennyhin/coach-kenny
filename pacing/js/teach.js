(function () {
  'use strict';

  var GRADES = ['Kinder', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'];
  var SECTIONS = [
    { key: 'answer', label: 'Answer to the question' },
    { key: 'objective', label: 'Learning objective' },
    { key: 'equipment', label: 'Equipment' },
    { key: 'opening', label: 'Opening' },
    { key: 'skillInstruction', label: 'Skill instruction' },
    { key: 'guidedPractice', label: 'Guided practice' },
    { key: 'gameApplication', label: 'Game / application' },
    { key: 'closure', label: 'Closure' },
    { key: 'cues', label: 'Teaching cues' },
    { key: 'assessment', label: 'Assessment' },
    { key: 'adaptations', label: 'Adaptations' },
    { key: 'safety', label: 'Safety notes' }
  ];

  var pacing = null;
  var guides = null;
  var grade = 'Kinder';
  var weekKey = '';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function weekRows(g) {
    return (pacing.grades[g] || []).filter(function (r) { return r.kind === 'week'; });
  }

  function guideFor(g, wk) {
    return guides && guides.guides && guides.guides[g] && guides.guides[g][wk] || null;
  }

  function weekSlug(wk) {
    return wk.replace(/\s+/g, '-');
  }

  function parseHash() {
    var h = (location.hash || '').replace(/^#/, '');
    if (!h) return;
    var parts = h.split('/');
    if (parts.length >= 2 && GRADES.indexOf(parts[0]) > -1) {
      grade = parts[0];
      weekKey = parts.slice(1).join(' ').replace(/-/g, ' ');
    }
  }

  function setHash() {
    if (!weekKey) return;
    var next = '#' + grade + '/' + weekSlug(weekKey);
    if (location.hash !== next) history.replaceState(null, '', next);
  }

  function renderTabs() {
    document.getElementById('teachTabs').innerHTML = GRADES.map(function (g) {
      return '<button class="pg-tab" role="tab" data-g="' + esc(g) + '" ' +
             'aria-selected="' + (g === grade) + '">' + esc(g) + '</button>';
    }).join('');
  }

  function renderWeekList() {
    var rows = weekRows(grade);
    if (!weekKey && rows.length) weekKey = rows[0].week;

    var list = document.getElementById('teachWeekList');
    list.innerHTML = rows.map(function (r) {
      var has = !!guideFor(grade, r.week);
      return '<li><button type="button" data-wk="' + esc(r.week) + '" ' +
        'aria-current="' + (r.week === weekKey) + '">' +
        esc(r.week) +
        (has ? ' \u2713' : '') +
        '<span class="tw-dates">' + esc(r.dates) + '</span></button></li>';
    }).join('');

    document.getElementById('teachLayout').classList.toggle('has-sidebar', rows.length > 0);
  }

  function pacingRef(row) {
    if (!row) return '';
    function f(label, val) {
      if (!val) return '';
      return '<div><dt>' + esc(label) + '</dt><dd>' + esc(val) + '</dd></div>';
    }
    return '<div class="teach-pacing-ref"><h3>From the pacing map</h3><dl>' +
      f('Unit', row.unit) +
      f('Weekly focus', row.focus) +
      f('Activity', row.activity) +
      f('Assessment', row.assessment) +
      f('Vocabulary', row.vocab) +
      f('Nevada standard', row.standards) +
      f('Notes', row.notes) +
    '</dl></div>';
  }

  function renderPanel() {
    var host = document.getElementById('teachPanel');
    var rows = weekRows(grade);
    var row = rows.filter(function (r) { return r.week === weekKey; })[0];
    if (!row) {
      host.innerHTML = '<p class="teach-pending">Pick a week from the list.</p>';
      return;
    }

    var guide = guideFor(grade, weekKey);
    var html = '<div class="teach-panel-head">' +
      '<h2>' + esc(row.week) + ' \u00b7 ' + esc(grade) + '</h2>' +
      '<div class="teach-panel-meta">' +
        '<span>' + esc(row.dates) + '</span>' +
        (row.days ? '<span>' + esc(row.days) + ' student days</span>' : '') +
        (row.unit ? '<span>' + esc(row.unit) + '</span>' : '') +
      '</div>' +
    '</div>';

    if (row.question) {
      html += '<p class="teach-question">' + esc(row.question) + '</p>';
    }

    if (guide) {
      html += '<div class="teach-sections">';
      SECTIONS.forEach(function (s) {
        var val = guide[s.key];
        if (!val) return;
        html += '<section class="teach-sec"><h3>' + esc(s.label) + '</h3>';
        if (Array.isArray(val)) {
          html += '<ul>' + val.map(function (li) { return '<li>' + esc(li) + '</li>'; }).join('') + '</ul>';
        } else {
          html += '<p>' + esc(val).replace(/\n/g, '<br>') + '</p>';
        }
        html += '</section>';
      });
      html += '</div>';
    } else {
      html += '<div class="teach-pending">' +
        '<p><strong>Teacher guide not published yet.</strong></p>' +
        '<p>The full answer, lesson flow, cues, and safety notes for this week are being written. ' +
        'Use the pacing-map details below until this guide is ready.</p>' +
      '</div>';
    }

    html += pacingRef(row);
    host.innerHTML = html;
    setHash();
  }

  function render() {
    renderTabs();
    renderWeekList();
    renderPanel();
  }

  function bind() {
    document.getElementById('teachTabs').addEventListener('click', function (e) {
      var b = e.target.closest('.pg-tab');
      if (!b) return;
      grade = b.dataset.g;
      weekKey = '';
      render();
    });

    document.getElementById('teachWeekList').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-wk]');
      if (!b) return;
      weekKey = b.dataset.wk;
      renderWeekList();
      renderPanel();
    });
  }

  function start() {
    parseHash();
    bind();
    render();
  }

  function load() {
    Promise.all([
      fetch('../data/pacing.json').then(function (r) {
        if (!r.ok) throw new Error('pacing HTTP ' + r.status);
        return r.json();
      }),
      fetch('../data/teacher-guides.json').then(function (r) {
        if (!r.ok) throw new Error('guides HTTP ' + r.status);
        return r.json();
      })
    ]).then(function (res) {
      pacing = res[0];
      guides = res[1];
      start();
    }).catch(function (err) {
      document.getElementById('teachPanel').innerHTML =
        '<p class="teach-pending">Could not load guide data (' + esc(err.message) + ').</p>';
    });
  }

  document.addEventListener('teach-unlocked', load);
  if (sessionStorage.getItem('ck-pacing-teach-ok')) load();
})();
