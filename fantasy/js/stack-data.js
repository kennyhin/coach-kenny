/**
 * Eagles stack complements — rosters verified against ESPN team pages.
 * Criteria: high-volume passing QB, top pass + rush offense, bye ≠ PHI (W9),
 * schedule has NO games vs PHI or DEN (2025 schedule as 2026 proxy).
 * PHI & DEN rosters excluded (you stack Eagles; avoid Denver's defense).
 */
window.EAGLES_STACK = {
  eaglesBye: 9,
  rosterAsOf: '2026-08-02',
  rosterSource: 'https://www.espn.com/nfl/players',
  scheduleSource: '2025 NFL schedule (2026 proxy)',
  excludedNote: 'Only teams with zero games vs Philadelphia or Denver. PHI & DEN rosters excluded.',
  teams: [
    {
      abbr: 'BAL',
      name: 'Baltimore Ravens',
      bye: 7,
      passRank: 8,
      rushRank: 1,
      qb: { name: 'Lamar Jackson', note: 'Efficient + rush yards — top offense' },
      wr1: 'Zay Flowers',
      players: [
        { pos: 'QB', name: 'Lamar Jackson', adp: 38, proj: 328 },
        { pos: 'RB', name: 'Derrick Henry', adp: 16, proj: 285 },
        { pos: 'WR', name: 'Zay Flowers', adp: 34.5, proj: 259 },
        { pos: 'WR', name: 'Rashod Bateman', adp: 148, proj: 165 },
        { pos: 'TE', name: 'Mark Andrews', adp: 98, proj: 188 },
      ],
    },
    {
      abbr: 'ATL',
      name: 'Atlanta Falcons',
      bye: 5,
      passRank: 11,
      rushRank: 6,
      qb: { name: 'Michael Penix Jr.', note: 'Penix + Tua Tagovailoa compete post-ACL' },
      wr1: 'Drake London',
      players: [
        { pos: 'QB', name: 'Michael Penix Jr.', adp: 125, proj: 242 },
        { pos: 'QB', name: 'Tua Tagovailoa', adp: 999, proj: 165 },
        { pos: 'RB', name: 'Bijan Robinson', adp: 1.5, proj: 347 },
        { pos: 'WR', name: 'Drake London', adp: 32, proj: 268 },
        { pos: 'TE', name: 'Kyle Pitts', adp: 155, proj: 155 },
      ],
    },
    {
      abbr: 'SEA',
      name: 'Seattle Seahawks',
      bye: 8,
      passRank: 18,
      rushRank: 13,
      qb: { name: 'Sam Darnold', note: 'Volume-friendly system' },
      wr1: 'Jaxon Smith-Njigba',
      players: [
        { pos: 'QB', name: 'Sam Darnold', adp: 165, proj: 228 },
        { pos: 'WR', name: 'Jaxon Smith-Njigba', adp: 22, proj: 285 },
        { pos: 'RB', name: 'Jadarian Price', adp: 92, proj: 215 },
        { pos: 'RB', name: 'Zach Charbonnet', adp: 148, proj: 178 },
        { pos: 'WR', name: 'Cooper Kupp', adp: 95, proj: 195 },
        { pos: 'WR', name: 'Rashid Shaheed', adp: 128, proj: 172 },
      ],
    },
    {
      abbr: 'SF',
      name: 'San Francisco 49ers',
      bye: 14,
      passRank: 14,
      rushRank: 3,
      qb: { name: 'Brock Purdy', note: 'Efficient high-scoring offense' },
      wr1: 'Mike Evans',
      players: [
        { pos: 'QB', name: 'Brock Purdy', adp: 105, proj: 252 },
        { pos: 'RB', name: 'Christian McCaffrey', adp: 5, proj: 325 },
        { pos: 'WR', name: 'Mike Evans', adp: 38, proj: 255 },
        { pos: 'WR', name: 'Deebo Samuel', adp: 72, proj: 218 },
        { pos: 'WR', name: 'Christian Kirk', adp: 217, proj: 165 },
        { pos: 'TE', name: 'George Kittle', adp: 42, proj: 228 },
      ],
    },
  ],
};
