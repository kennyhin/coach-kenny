const STORAGE_KEY = 'coachkenny-fantasy-draft-contract-year-ranks';

const POSITIONS = [
  { key: 'qb', label: 'QB', className: 'qb' },
  { key: 'rb', label: 'RB', className: 'rb' },
  { key: 'wr', label: 'WR', className: 'wr' },
  { key: 'te', label: 'TE', className: 'te' },
];

let dragId = null;

function loadOrder() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveOrder(order) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
}

function defaultOrder() {
  const order = {};
  for (const pos of POSITIONS) {
    const players = [...window.CONTRACT_YEAR_PLAYERS[pos.key]];
    players.sort((a, b) => a.adp - b.adp);
    order[pos.key] = players.map((p) => p.id);
  }
  return order;
}

function playerById(id) {
  for (const pos of POSITIONS) {
    const found = window.CONTRACT_YEAR_PLAYERS[pos.key].find((p) => p.id === id);
    if (found) return found;
  }
  return null;
}

function formatAdp(adp) {
  if (adp >= 999) return 'UDFA';
  if (adp <= 12) {
    const round = Math.floor((adp - 1) / 12) + 1;
    const pick = Math.round(((adp - 1) % 12) + 1);
    return `${round}.${String(pick).padStart(2, '0')}`;
  }
  return adp.toFixed(1);
}

function renderCard(player, rank) {
  const li = document.createElement('li');
  li.className = 'player-card';
  li.draggable = true;
  li.dataset.id = player.id;
  li.innerHTML = `
    <span class="rank">${rank}</span>
    <div class="player-main">
      <div class="name">${player.name}</div>
      <div class="meta">${player.team} · ${player.note}</div>
    </div>
    <div class="stats">
      <div class="adp">ADP ${formatAdp(player.adp)}</div>
      <div class="proj">${player.proj}<span class="proj-label"> pts</span></div>
    </div>
  `;

  li.addEventListener('dragstart', (e) => {
    dragId = player.id;
    li.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', player.id);
  });

  li.addEventListener('dragend', () => {
    dragId = null;
    li.classList.remove('dragging');
    document.querySelectorAll('.player-card.drag-over').forEach((el) => el.classList.remove('drag-over'));
  });

  li.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (dragId && dragId !== player.id) li.classList.add('drag-over');
  });

  li.addEventListener('dragleave', () => li.classList.remove('drag-over'));

  li.addEventListener('drop', (e) => {
    e.preventDefault();
    li.classList.remove('drag-over');
    const fromId = e.dataTransfer.getData('text/plain');
    if (!fromId || fromId === player.id) return;
    reorder(fromId, player.id);
  });

  return li;
}

function getCurrentOrder() {
  return window.__boardOrder;
}

function reorder(fromId, toId) {
  const order = getCurrentOrder();
  let posKey = null;
  for (const pos of POSITIONS) {
    if (order[pos.key].includes(fromId) && order[pos.key].includes(toId)) {
      posKey = pos.key;
      break;
    }
  }
  if (!posKey) return;

  const list = order[posKey];
  const fromIdx = list.indexOf(fromId);
  const toIdx = list.indexOf(toId);
  if (fromIdx < 0 || toIdx < 0) return;

  list.splice(fromIdx, 1);
  list.splice(toIdx, 0, fromId);
  saveOrder(order);
  renderBoard(order);
}

function renderBoard(order) {
  window.__boardOrder = order;
  const board = document.getElementById('board');
  board.innerHTML = '';

  for (const pos of POSITIONS) {
    const col = document.createElement('section');
    col.className = `column ${pos.className}`;
    col.dataset.position = pos.key;

    const ids = order[pos.key] || [];
    col.innerHTML = `
      <div class="column-header">
        <h2>${pos.label}</h2>
        <span class="count">${ids.length}</span>
      </div>
    `;

    const list = document.createElement('ul');
    list.className = 'player-list';
    list.dataset.position = pos.key;

    if (ids.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-drop';
      empty.textContent = 'Drop players here';
      col.appendChild(empty);
    } else {
      ids.forEach((id, i) => {
        const player = playerById(id);
        if (player) list.appendChild(renderCard(player, i + 1));
      });
      col.appendChild(list);
    }

    list.addEventListener('dragover', (e) => e.preventDefault());
    list.addEventListener('drop', (e) => {
      e.preventDefault();
      const fromId = e.dataTransfer.getData('text/plain');
      if (!fromId) return;
      const fromPlayer = playerById(fromId);
      if (!fromPlayer) return;
      const targetPos = pos.key;
      const sourcePos = POSITIONS.find((p) => order[p.key].includes(fromId))?.key;
      if (!sourcePos) return;

      order[sourcePos] = order[sourcePos].filter((x) => x !== fromId);
      if (sourcePos !== targetPos) {
        order[targetPos].push(fromId);
      } else if (!order[targetPos].includes(fromId)) {
        order[targetPos].push(fromId);
      }
      saveOrder(order);
      renderBoard(order);
    });

    board.appendChild(col);
  }
}

function resetRankings() {
  const order = defaultOrder();
  saveOrder(order);
  renderBoard(order);
}

document.addEventListener('DOMContentLoaded', () => {
  const saved = loadOrder();
  const order = saved || defaultOrder();

  // Merge in any new players added since last save
  for (const pos of POSITIONS) {
    const allIds = window.CONTRACT_YEAR_PLAYERS[pos.key].map((p) => p.id);
    const existing = new Set(order[pos.key] || []);
    for (const id of allIds) {
      if (!existing.has(id)) order[pos.key].push(id);
    }
    order[pos.key] = (order[pos.key] || []).filter((id) => allIds.includes(id));
  }

  saveOrder(order);
  renderBoard(order);

  document.getElementById('reset-btn').addEventListener('click', () => {
    if (confirm('Reset all rankings to ADP order?')) resetRankings();
  });
});
