/* pe-fitness/js/leaderboards.js — render official-category leaderboards from
   the in-page payload, data/mile-leaderboard.json, or the optional Roll Call feed. */
(function () {
  var DATA_URL = "data/mile-leaderboard.json";
  var AGE_GROUPS = [8, 9, 10, 11];
  var LEVELS = ["Presidential", "National", "Unawarded"];
  var EMPTY_NOTE = "Results coming after testing.";
  var EVENTS = [
    { id: "mile", label: "One-mile run", sort: "lowest" },
    { id: "pacer", label: "20m beep test (PACER)", sort: "highest" },
    { id: "push_ups", label: "Right-angle push-ups", sort: "highest" },
    { id: "pull_ups", label: "Pull-ups", sort: "highest" },
    { id: "curl_ups", label: "Curl-ups", sort: "highest" },
    { id: "plank", label: "Plank", sort: "highest" }
  ];
  var EVENT_BY_ID = {};
  EVENTS.forEach(function (event) { EVENT_BY_ID[event.id] = event; });

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function syncStickyOffset() {
    var header = $(".site-header");
    if (!header) return;
    document.documentElement.style.setProperty("--lb-sticky-top", Math.ceil(header.getBoundingClientRect().height) + "px");
  }

  function embeddedPayload() {
    var node = document.getElementById("mile-lb-data");
    if (!node) return null;
    try { return JSON.parse(node.textContent || ""); } catch (err) { return null; }
  }

  function asPagePayload(data) {
    if (!data || typeof data !== "object") return null;
    if (data.events) return data;
    if (!Array.isArray(data.rows)) return null;
    var events = {};
    EVENTS.forEach(function (event) {
      events[event.id] = { rows: event.id === "mile" ? data.rows : [], sample: event.id === "mile" ? data.sample === true : false };
    });
    return {
      sample: data.sample === true,
      title: data.title,
      subtitle: data.subtitle,
      events: events
    };
  }

  function eventSort(eventId) {
    return (EVENT_BY_ID[eventId] || { sort: "lowest" }).sort;
  }

  function groupBoards(rows, eventId) {
    var boards = {};
    var sort = eventSort(eventId);
    AGE_GROUPS.forEach(function (ageGroup) {
      boards[ageGroup] = {};
      LEVELS.forEach(function (level) {
        boards[ageGroup][level] = (rows || [])
          .filter(function (row) {
            var awarded = row.level === "Presidential" || row.level === "National";
            if (Number(row.ageGroup) !== ageGroup) return false;
            if (level === "Unawarded") return !awarded;
            return row.level === level;
          })
          .slice()
          .sort(function (a, b) {
            var left = a.value != null ? a.value : a.timeSeconds;
            var right = b.value != null ? b.value : b.timeSeconds;
            var delta = sort === "highest" ? right - left : left - right;
            return delta || String(a.name).localeCompare(String(b.name), "en", { sensitivity: "base" });
          })
          .map(function (row, index) {
            return {
              name: row.name,
              homeroom: row.homeroom,
              display: row.display || row.time,
              place: index + 1,
              ageGroup: row.ageGroup
            };
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
        '</td><td class="t">' + esc(row.display) + "</td></tr>";
    }).join("") + "</table>";
  }

  function columnsHtml(rows, eventId) {
    var boards = groupBoards(rows, eventId);
    return AGE_GROUPS.map(function (ageGroup) {
      var pres = boards[ageGroup].Presidential;
      var nat = boards[ageGroup].National;
      var other = boards[ageGroup].Unawarded;
      var html = "<h2>Age " + esc(String(ageGroup)) + "</h2>";
      if (pres.length || nat.length) {
        html += '<h3 class="p">Presidential <span>' + pres.length + "</span></h3>" + tableHtml(pres);
        html += '<h3 class="n">National <span>' + nat.length + "</span></h3>" + tableHtml(nat);
      }
      if (other.length) {
        html += '<h3 class="u">Recorded times <span>' + other.length + "</span></h3>" + tableHtml(other);
      }
      if (!pres.length && !nat.length && !other.length) {
        html += '<p class="mile-lb-empty">No times in this group yet.</p>';
      }
      return '<div class="mile-lb-col">' + html + "</div>";
    }).join("");
  }

  function renderEvent(root, event, bucket) {
    var rows = (bucket && bucket.rows) || [];
    var sample = bucket && bucket.sample === true;
    var heading = $("h3", root);
    if (heading) {
      var tag = sample && rows.length ? ' <span class="lb-sample-tag">Sample data</span>' : "";
      heading.innerHTML = esc(event.label) + tag;
    }
    var empty = !rows.length;
    var existingCols = root.querySelector(".mile-lb-cols");
    var existingEmpty = root.querySelector(".lb-event-empty");
    var lede = root.querySelector(".lb-event-lede");
    if (lede) lede.remove();
    if (empty) {
      if (existingCols) existingCols.remove();
      if (!existingEmpty) {
        var note = document.createElement("p");
        note.className = "lb-event-empty";
        note.textContent = EMPTY_NOTE;
        root.appendChild(note);
      } else {
        existingEmpty.textContent = EMPTY_NOTE;
      }
      return;
    }
    if (existingEmpty) existingEmpty.remove();
    if (event.id === "mile") {
      var intro = document.createElement("p");
      intro.className = "lb-event-lede";
      intro.textContent = "Mile run Oct 5–16, 2026 · Fastest first. Only students who met a Presidential or National target are listed.";
      root.insertBefore(intro, existingCols || null);
    }
    if (!existingCols) {
      existingCols = document.createElement("div");
      existingCols.className = "mile-lb-cols";
      root.appendChild(existingCols);
    }
    existingCols.innerHTML = columnsHtml(rows, event.id);
  }

  function applyPayload(raw) {
    var payload = asPagePayload(raw);
    var root = $("[data-mile-board]");
    if (!root || !payload) return;
    var sample = payload.sample === true;
    root.setAttribute("data-sample", sample ? "true" : "false");
    var status = $("[data-mile-status]", root);
    if (status) {
      status.className = "mile-lb-status " + (sample ? "is-sample" : "is-live");
      if (sample) {
        status.innerHTML = '<p class="mile-lb-kicker">Sample data</p><h2>These names and times are sample data</h2><p>They are fictional scores so you can see the layout. Live class scores are not in this public repository. Events still waiting on testing show an empty state, not made-up results.</p>';
      } else {
        status.innerHTML = '<p class="mile-lb-kicker">Class results</p><p>First name and last initial only. Boards list students who met a Presidential or National target. Events that have not been tested yet say so below.</p>';
      }
    }
    EVENTS.forEach(function (event) {
      var node = root.querySelector('[data-lb-event="' + event.id + '"]');
      if (!node) return;
      var bucket = payload.events[event.id] || { rows: [], sample: false };
      node.setAttribute("data-sample", bucket.sample ? "true" : "false");
      renderEvent(node, event, bucket);
    });
  }

  function payloadFromFeed(data) {
    if (!data || data.enabled !== true || !Array.isArray(data.boards)) return null;
    var events = {};
    EVENTS.forEach(function (event) { events[event.id] = { rows: [], sample: false }; });
    data.boards.forEach(function (board) {
      var bucket = events[board.eventId];
      if (!bucket) return;
      (board.rows || []).forEach(function (row) {
        bucket.rows.push({
          name: row.name,
          ageGroup: row.ageGroup != null ? row.ageGroup : board.ageGroup,
          homeroom: row.homeroom,
          time: row.display,
          display: row.display,
          value: row.value,
          timeSeconds: row.value,
          level: row.award || null
        });
      });
    });
    var hasRows = EVENTS.some(function (event) { return events[event.id].rows.length; });
    if (!hasRows) return null;
    return {
      sample: false,
      title: "Presidential Fitness Leaderboards",
      subtitle: "Presidential Fitness Test · Grades 3–5 · Grouped by age on test day",
      events: events
    };
  }

  function highlightCategory() {
    var links = $$("[data-cat-link]");
    if (!links.length) return;
    var current = links[0].getAttribute("data-cat-link");
    var offset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--lb-sticky-top")) || 96;
    $$(".lb-category").forEach(function (section) {
      var top = section.getBoundingClientRect().top;
      if (top <= offset + 72) current = section.id;
    });
    links.forEach(function (link) {
      link.classList.toggle("is-current", link.getAttribute("data-cat-link") === current);
    });
  }

  syncStickyOffset();
  applyPayload(embeddedPayload());
  highlightCategory();
  window.addEventListener("resize", function () { syncStickyOffset(); highlightCategory(); });
  window.addEventListener("scroll", highlightCategory, { passive: true });

  function loadJson(url) {
    return fetch(url, { credentials: "omit" }).then(function (res) { return res.ok ? res.json() : null; });
  }

  var feedUrl = (window.PE_LEADERBOARD_FEED_URL || "").trim();
  if (feedUrl && window.fetch) {
    loadJson(feedUrl).then(function (data) {
      var live = payloadFromFeed(data);
      if (live) applyPayload(live);
    }).catch(function () { /* keep sample */ });
  } else if (window.fetch) {
    loadJson(DATA_URL).then(function (data) {
      var page = asPagePayload(data);
      if (page) applyPayload(page);
    }).catch(function () { /* keep the in-page sample */ });
  }
})();
