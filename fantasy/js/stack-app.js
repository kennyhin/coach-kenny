(function () {
  'use strict';

  const data = window.EAGLES_STACK;
  if (!data) return;

  const teamSelect = document.getElementById('filter-team');
  const wr1Select = document.getElementById('filter-wr1');
  const stackRoot = document.getElementById('stack-teams');
  const summaryEl = document.getElementById('stack-summary');

  function formatAdp(adp) {
    if (adp >= 999) return 'UDFA';
    if (adp <= 12) {
      const round = Math.floor((adp - 1) / 12) + 1;
      const pick = Math.round(((adp - 1) % 12) + 1);
      return `${round}.${String(pick).padStart(2, '0')}`;
    }
    return adp.toFixed(1);
  }

  function posClass(pos) {
    return pos.toLowerCase();
  }

  function renderTeam(team) {
    const details = document.createElement('details');
    details.className = 'team-panel';
    details.dataset.abbr = team.abbr;
    details.dataset.wr1 = team.wr1;
    details.id = `team-${team.abbr.toLowerCase()}`;

    details.innerHTML = `
      <summary class="team-summary">
        <span class="team-abbr">${team.abbr}</span>
        <span class="team-title">${team.name}</span>
        <span class="team-badges">
          <span class="badge bye">Bye W${team.bye}</span>
          <span class="badge wr1">${team.wr1}</span>
        </span>
        <span class="team-chevron" aria-hidden="true"></span>
      </summary>
      <div class="team-body">
        <div class="team-meta">
          <p><strong>QB:</strong> ${team.qb.name} — ${team.qb.note}</p>
          <p><strong>Offense ranks (2025 proxy):</strong> Pass #${team.passRank} · Rush #${team.rushRank}</p>
          <p><strong>Schedule:</strong> No games vs PHI or DEN (${data.scheduleSource || '2025 proxy'})</p>
        </div>
        <table class="player-table">
          <thead>
            <tr>
              <th>Pos</th>
              <th>Player</th>
              <th>ADP</th>
              <th>Proj</th>
            </tr>
          </thead>
          <tbody>
            ${team.players.map((p) => `
              <tr>
                <td><span class="pos-tag ${posClass(p.pos)}">${p.pos}</span></td>
                <td>${p.name}${p.name === team.wr1 ? ' <span class="wr1-star">WR1</span>' : ''}</td>
                <td>${formatAdp(p.adp)}</td>
                <td class="proj-cell">${p.proj}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    return details;
  }

  function getFilteredTeams() {
    const teamVal = teamSelect.value;
    const wr1Val = wr1Select.value;
    return data.teams.filter((t) => {
      if (teamVal && t.abbr !== teamVal) return false;
      if (wr1Val && t.wr1 !== wr1Val) return false;
      return true;
    });
  }

  function updateSummary(count) {
    const src = data.rosterSource ? ` · rosters via ESPN (${data.rosterAsOf || 'current'})` : '';
    summaryEl.textContent = `${count} team${count === 1 ? '' : 's'} · bye ≠ Eagles (W${data.eaglesBye}) · no PHI/DEN on schedule${src}`;
  }

  function render() {
    const teams = getFilteredTeams();
    stackRoot.innerHTML = '';
    if (teams.length === 0) {
      stackRoot.innerHTML = '<p class="empty-msg">No teams match those filters.</p>';
    } else {
      teams.forEach((t) => stackRoot.appendChild(renderTeam(t)));
    }
    updateSummary(teams.length);
  }

  function populateFilters() {
    data.teams.forEach((t) => {
      const opt = document.createElement('option');
      opt.value = t.abbr;
      opt.textContent = `${t.abbr} — ${t.name} (Bye W${t.bye})`;
      teamSelect.appendChild(opt);
    });

    const wr1s = [...new Set(data.teams.map((t) => t.wr1))].sort();
    wr1s.forEach((name) => {
      const team = data.teams.find((t) => t.wr1 === name);
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = `${name} (${team.abbr})`;
      wr1Select.appendChild(opt);
    });
  }

  function onWr1Change() {
    const wr1 = wr1Select.value;
    if (wr1) {
      const team = data.teams.find((t) => t.wr1 === wr1);
      if (team) teamSelect.value = team.abbr;
    }
    render();
    if (wr1) {
      const panel = document.getElementById(`team-${data.teams.find((t) => t.wr1 === wr1).abbr.toLowerCase()}`);
      if (panel) {
        panel.open = true;
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  function onTeamChange() {
    const abbr = teamSelect.value;
    if (abbr) {
      const team = data.teams.find((t) => t.abbr === abbr);
      if (team) wr1Select.value = team.wr1;
    } else {
      wr1Select.value = '';
    }
    render();
    if (abbr) {
      const panel = document.getElementById(`team-${abbr.toLowerCase()}`);
      if (panel) {
        panel.open = true;
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    populateFilters();
    render();
    teamSelect.addEventListener('change', onTeamChange);
    wr1Select.addEventListener('change', onWr1Change);
    document.getElementById('expand-all').addEventListener('click', () => {
      stackRoot.querySelectorAll('.team-panel').forEach((el) => { el.open = true; });
    });
    document.getElementById('collapse-all').addEventListener('click', () => {
      stackRoot.querySelectorAll('.team-panel').forEach((el) => { el.open = false; });
    });
  });
})();
