(function () {
  'use strict';

  const data = window.SOFT_MATCHUPS;
  if (!data) return;

  const teamSelect = document.getElementById('filter-offense');
  const defSelect = document.getElementById('filter-defense');
  const defList = document.getElementById('weak-defenses');
  const offenseRoot = document.getElementById('soft-offenses');
  const summaryEl = document.getElementById('soft-summary');

  function renderWeakDefenses() {
    defList.innerHTML = data.weakDefenses.map((d) => `
      <details class="def-panel" data-abbr="${d.abbr}">
        <summary class="def-summary">
          <span class="def-rank">#${d.rank}</span>
          <span class="def-name">${d.abbr} — ${d.name}</span>
          <span class="def-pts">${d.ptsAllowed.toFixed(1)} DFS pts/g allowed</span>
          <span class="team-chevron" aria-hidden="true"></span>
        </summary>
        <div class="def-body">
          <p>Higher = weaker defense — more fantasy points allowed to opposing QBs/RBs/WRs/TEs (DraftEdge DVP).</p>
        </div>
      </details>
    `).join('');
  }

  function renderOffense(off) {
    const details = document.createElement('details');
    details.className = 'team-panel soft-offense-panel';
    details.dataset.abbr = off.abbr;
    details.dataset.softDefs = off.matchups.map((m) => m.def).join(',');
    details.id = `offense-${off.abbr.toLowerCase()}`;

    const matchupRows = off.matchups.map((m) => `
      <tr>
        <td>W${m.week}</td>
        <td><span class="def-tag">#${m.defRank} ${m.def}</span></td>
        <td>${m.defName}</td>
        <td class="proj-cell">${m.ptsAllowed.toFixed(1)}</td>
      </tr>
    `).join('');

    const playerTags = off.players.length
      ? off.players.map((p) => `<span class="player-chip">${p}</span>`).join('')
      : '<span class="muted">—</span>';

    details.innerHTML = `
      <summary class="team-summary">
        <span class="team-abbr">${off.abbr}</span>
        <span class="team-title">${off.name}</span>
        <span class="team-badges">
          <span class="badge bye">Bye W${off.bye}</span>
          <span class="badge soft">${off.softCount} soft games</span>
        </span>
        <span class="team-chevron" aria-hidden="true"></span>
      </summary>
      <div class="team-body">
        <div class="team-meta">
          <p><strong>Soft matchups:</strong> ${off.softCount} games vs bottom-12 defenses (${off.softPtsTotal.toFixed(0)} total DFS pts allowed).</p>
          <p><strong>Target players:</strong> ${playerTags}</p>
        </div>
        <table class="player-table matchup-table">
          <thead>
            <tr>
              <th>Week</th>
              <th>Def</th>
              <th>Opponent</th>
              <th>DVP</th>
            </tr>
          </thead>
          <tbody>${matchupRows}</tbody>
        </table>
      </div>
    `;

    return details;
  }

  function getFilteredOffenses() {
    const teamVal = teamSelect.value;
    const defVal = defSelect.value;
    return data.offenses.filter((o) => {
      if (teamVal && o.abbr !== teamVal) return false;
      if (defVal && !o.matchups.some((m) => m.def === defVal)) return false;
      return true;
    });
  }

  function updateSummary(count) {
    summaryEl.textContent = `${count} offense${count === 1 ? '' : 's'} · Eagles bye Week ${data.eaglesBye} excluded · bottom-12 weakest defenses`;
  }

  function render() {
    const offenses = getFilteredOffenses();
    offenseRoot.innerHTML = '';
    if (offenses.length === 0) {
      offenseRoot.innerHTML = '<p class="empty-msg">No offenses match those filters.</p>';
    } else {
      offenses.forEach((o) => offenseRoot.appendChild(renderOffense(o)));
    }
    updateSummary(offenses.length);
  }

  function populateFilters() {
    data.offenses.forEach((o) => {
      const opt = document.createElement('option');
      opt.value = o.abbr;
      opt.textContent = `${o.abbr} — ${o.softCount} soft games (Bye W${o.bye})`;
      teamSelect.appendChild(opt);
    });

    data.weakDefenses.forEach((d) => {
      const opt = document.createElement('option');
      opt.value = d.abbr;
      opt.textContent = `#${d.rank} ${d.abbr} — ${d.name}`;
      defSelect.appendChild(opt);
    });
  }

  function onTeamChange() {
    render();
    const abbr = teamSelect.value;
    if (abbr) {
      const panel = document.getElementById(`offense-${abbr.toLowerCase()}`);
      if (panel) {
        panel.open = true;
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  function onDefChange() {
    render();
    const def = defSelect.value;
    if (def) {
      const first = offenseRoot.querySelector('.soft-offense-panel');
      if (first) {
        first.open = true;
        first.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderWeakDefenses();
    populateFilters();
    render();
    teamSelect.addEventListener('change', onTeamChange);
    defSelect.addEventListener('change', onDefChange);
    document.getElementById('expand-all').addEventListener('click', () => {
      document.querySelectorAll('.team-panel, .def-panel').forEach((el) => { el.open = true; });
    });
    document.getElementById('collapse-all').addEventListener('click', () => {
      document.querySelectorAll('.team-panel, .def-panel').forEach((el) => { el.open = false; });
    });
  });
})();
