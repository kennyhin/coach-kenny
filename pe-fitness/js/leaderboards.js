/* pe-fitness/js/leaderboards.js — render the mile award leaderboard from
   data/mile-leaderboard.json, with the in-page sample payload as fallback. */
(function () {
  var DATA_URL = "data/mile-leaderboard.json";
  var GRADES = ["3", "4", "5"];
  var LEVELS = ["Presidential", "National"];

  function $(sel, root) { return (root || document).querySelector(sel); }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function embeddedPayload() {
    var node = document.getElementById("mile-lb-data");
    if (!node) return null;
    try { return JSON.parse(node.textContent || ""); } catch (err) { return null; }
  }

  function groupBoards(rows) {
    var boards = {};
    GRADES.forEach(function (grade) {
      boards[grade] = {};
      LEVELS.forEach(function (level) {
        boards[grade][level] = (rows || [])
          .filter(function (row) { return String(row.grade) === grade && row.level === level; })
          .slice()
          .sort(function (a, b) {
            return (a.timeSeconds - b.timeSeconds) || String(a.name).localeCompare(String(b.name), "en", { sensitivity: "base" });
          })
          .map(function (row, index) {
            return { name: row.name, homeroom: row.homeroom, time: row.time, place: index + 1 };
          });
      });
    });
    return boards;
  }

  function tableHtml(rows) {
    if (!rows.length) return '<p class="mile-lb-empty">No times in this group yet.</p>';
    return "<table>" + rows.map(function (row) {
      return '<tr><td class="rk">' + esc(String(row.place)) + '</td><td class="nm">' +
        esc(row.name) + '</td><td class="hr">' + esc(row.homeroom) +
        '</td><td class="t">' + esc(row.time) + "</td></tr>";
    }).join("") + "</table>";
  }

  function applyPayload(payload) {
    var root = $("[data-mile-board]");
    if (!root || !payload) return;
    var sample = payload.sample === true;
    root.setAttribute("data-sample", sample ? "true" : "false");
    var status = $("[data-mile-status]", root);
    if (status) {
      status.className = "mile-lb-status " + (sample ? "is-sample" : "is-live");
      if (sample) {
        status.innerHTML = '<p class="mile-lb-kicker">Sample data</p><h2>These names and times are sample data</h2><p>They are fictional scores so you can see the layout. Live class scores are not in this public repository.</p>';
      } else {
        status.innerHTML = '<p class="mile-lb-kicker">Class mile times</p><p>First name and last initial only. Only students who met a Presidential or National mile target are listed.</p>';
      }
    }
    var boards = groupBoards(payload.rows);
    var colNodes = root.querySelectorAll(".mile-lb-col");
    GRADES.forEach(function (grade, index) {
      var col = colNodes[index];
      if (!col) return;
      var pres = boards[grade].Presidential;
      var nat = boards[grade].National;
      col.innerHTML = "<h2>Grade " + esc(grade) + "</h2>" +
        '<h3 class="p">Presidential <span>' + pres.length + "</span></h3>" + tableHtml(pres) +
        '<h3 class="n">National <span>' + nat.length + "</span></h3>" + tableHtml(nat);
    });
  }

  applyPayload(embeddedPayload());

  if (!window.fetch) return;
  fetch(DATA_URL, { credentials: "omit" })
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (data) {
      if (!data || !Array.isArray(data.rows)) return;
      applyPayload(data);
    })
    .catch(function () { /* keep the in-page sample or built rows */ });
})();
