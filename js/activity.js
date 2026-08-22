/* ==========================================================================
   Activity graph — GitHub-style daily contribution heatmap.

   Self-contained: no dependencies, no build step, no API key. Fetches public
   contribution data for the handles in USERNAMES, merges the counts per day,
   and renders a 7-row (Sun..Sat) x ~53-column (weeks) grid of squares.

   Shading is monochrome and theme-aware: white-on-dark in dark mode (the
   site default), inverted to ink-on-light in light mode so the squares stay
   visible on a white page. All five steps come from the --act-* custom
   properties in css/styles.css — no colors are hardcoded here.
   ========================================================================== */
(function () {
  "use strict";

  /* Handles to merge. Add or remove one here and everything downstream
     (totals, levels, the summary line) follows automatically. */
  var USERNAMES = ["fervel1234", "dr-abrianas"];

  var API = "https://github-contributions-api.jogruber.de/v4/";
  var CACHE_KEY = "activity-graph-v1";
  var CACHE_TTL_MS = 4 * 60 * 60 * 1000; /* 4h — plenty for a personal site */

  /* Grid geometry, in SVG user units (= CSS px at 1:1). GitHub uses ~10px
     cells with 3px gutters; matching that keeps the visual rhythm familiar. */
  var CELL = 10;
  var GAP = 3;
  var STEP = CELL + GAP;
  var LEFT_GUTTER = 30;  /* room for the Mon/Wed/Fri labels */
  var TOP_PAD = 18;      /* room for the month labels */

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var SVG_NS = "http://www.w3.org/2000/svg";

  /* ---------- date helpers (UTC throughout, so the grid never shifts by a
     day depending on the visitor's timezone) ---------- */

  function parseDate(iso) {
    var p = iso.split("-");
    return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
  }

  function toISO(d) {
    var m = d.getUTCMonth() + 1;
    var day = d.getUTCDate();
    return d.getUTCFullYear() + "-" +
      (m < 10 ? "0" + m : m) + "-" +
      (day < 10 ? "0" + day : day);
  }

  function addDays(d, n) {
    return new Date(d.getTime() + n * 86400000);
  }

  function prettyDate(d) {
    return MONTHS[d.getUTCMonth()] + " " + d.getUTCDate() + ", " + d.getUTCFullYear();
  }

  /* ---------- data ---------- */

  function fetchContributions(username) {
    return fetch(API + encodeURIComponent(username) + "?y=last").then(function (res) {
      if (!res.ok) throw new Error("bad response for " + username);
      return res.json();
    });
  }

  /* Sum counts per date across every handle. Returns { "YYYY-MM-DD": count }. */
  function mergeContributions(datasets) {
    var byDate = {};
    datasets.forEach(function (d) {
      (d && d.contributions ? d.contributions : []).forEach(function (c) {
        if (!c || !c.date) return;
        byDate[c.date] = (byDate[c.date] || 0) + (c.count || 0);
      });
    });
    return byDate;
  }

  /* Bucket a day into 0-4. The per-handle `level` the API returns can't be
     reused once counts are summed, so levels are recomputed against the
     busiest day in the merged set — the same relative-quartile idea GitHub
     uses, which keeps the shading readable whether the peak day is 4 commits
     or 40. */
  function levelFor(count, max) {
    if (count <= 0 || max <= 0) return 0;
    var q = Math.ceil((count / max) * 4);
    return q < 1 ? 1 : (q > 4 ? 4 : q);
  }

  /* ---------- rendering ---------- */

  function el(name, attrs) {
    var node = document.createElementNS(SVG_NS, name);
    for (var k in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, k)) node.setAttribute(k, attrs[k]);
    }
    return node;
  }

  function buildGrid(byDate) {
    var dates = Object.keys(byDate).sort();
    if (!dates.length) throw new Error("no contribution data");

    var first = parseDate(dates[0]);
    var last = parseDate(dates[dates.length - 1]);

    /* Columns are calendar weeks, so back the start up to its Sunday. */
    var start = addDays(first, -first.getUTCDay());

    var max = 0;
    var total = 0;
    dates.forEach(function (k) {
      var c = byDate[k];
      total += c;
      if (c > max) max = c;
    });

    var days = Math.round((last - start) / 86400000) + 1;
    var cols = Math.ceil(days / 7);

    var width = LEFT_GUTTER + cols * STEP - GAP;
    var height = TOP_PAD + 7 * STEP - GAP;

    var svg = el("svg", {
      class: "activity-svg",
      width: width,
      height: height,
      viewBox: "0 0 " + width + " " + height,
      role: "group",
      "aria-label": total + " contributions in the last year, " +
        prettyDate(first) + " to " + prettyDate(last)
    });

    /* Weekday labels — Mon/Wed/Fri only, the way GitHub does it, so the
       column doesn't turn into a wall of text. */
    [[1, "Mon"], [3, "Wed"], [5, "Fri"]].forEach(function (pair) {
      var label = el("text", {
        class: "activity-axis",
        x: LEFT_GUTTER - 6,
        y: TOP_PAD + pair[0] * STEP + CELL - 1,
        "text-anchor": "end",
        "aria-hidden": "true"
      });
      label.textContent = pair[1];
      svg.appendChild(label);
    });

    var lastMonth = -1;

    for (var col = 0; col < cols; col++) {
      var colDate = addDays(start, col * 7);

      /* Month label whenever a column opens a new month. */
      if (colDate.getUTCMonth() !== lastMonth) {
        lastMonth = colDate.getUTCMonth();
        /* Skip a label that would be clipped at the right edge. */
        if (col < cols - 2) {
          var m = el("text", {
            class: "activity-axis",
            x: LEFT_GUTTER + col * STEP,
            y: TOP_PAD - 6,
            "aria-hidden": "true"
          });
          m.textContent = MONTHS[lastMonth];
          svg.appendChild(m);
        }
      }

      for (var row = 0; row < 7; row++) {
        var d = addDays(colDate, row);
        if (d < first || d > last) continue;

        var iso = toISO(d);
        var count = byDate[iso] || 0;
        var lvl = levelFor(count, max);

        var rect = el("rect", {
          class: "activity-cell",
          x: LEFT_GUTTER + col * STEP,
          y: TOP_PAD + row * STEP,
          width: CELL,
          height: CELL,
          rx: 2,
          "data-level": lvl,
          "data-count": count,
          "data-date": prettyDate(d),
          role: "img",
          "aria-label": count + (count === 1 ? " contribution on " : " contributions on ") + prettyDate(d)
        });
        svg.appendChild(rect);
      }
    }

    return { svg: svg, total: total, first: first, last: last };
  }

  function buildLegend() {
    var legend = document.createElement("div");
    legend.className = "activity-legend";

    var less = document.createElement("span");
    less.textContent = "Less";
    legend.appendChild(less);

    for (var i = 0; i <= 4; i++) {
      var sw = document.createElement("span");
      sw.className = "activity-swatch";
      sw.setAttribute("data-level", i);
      legend.appendChild(sw);
    }

    var more = document.createElement("span");
    more.textContent = "More";
    legend.appendChild(more);

    return legend;
  }

  /* One tooltip element, moved around on hover, rather than 365 of them. */
  function attachTooltip(scroller, svg) {
    var tip = document.createElement("div");
    tip.className = "activity-tooltip";
    tip.setAttribute("role", "presentation");
    scroller.appendChild(tip);

    function show(cell) {
      var count = cell.getAttribute("data-count");
      tip.textContent = count + (count === "1" ? " contribution" : " contributions") +
        " on " + cell.getAttribute("data-date");
      tip.classList.add("is-visible");

      /* Position relative to the scroller, accounting for its scroll offset
         so the tooltip tracks the cell when the grid is scrolled sideways. */
      var cellBox = cell.getBoundingClientRect();
      var hostBox = scroller.getBoundingClientRect();
      var left = cellBox.left - hostBox.left + scroller.scrollLeft + cellBox.width / 2;
      var top = cellBox.top - hostBox.top - 8;

      tip.style.left = left + "px";
      tip.style.top = top + "px";
    }

    function hide() { tip.classList.remove("is-visible"); }

    svg.addEventListener("mouseover", function (e) {
      var cell = e.target.closest(".activity-cell");
      if (cell) show(cell);
    });
    svg.addEventListener("mouseleave", hide);
    scroller.addEventListener("scroll", hide, { passive: true });
  }

  function render(mount, byDate) {
    var grid = buildGrid(byDate);

    mount.textContent = "";

    var summary = document.createElement("p");
    summary.className = "activity-summary";
    summary.textContent = grid.total.toLocaleString() +
      (grid.total === 1 ? " contribution" : " contributions") + " in the last year";
    mount.appendChild(summary);

    var scroller = document.createElement("div");
    scroller.className = "activity-scroll";
    scroller.appendChild(grid.svg);
    mount.appendChild(scroller);

    var footer = document.createElement("div");
    footer.className = "activity-footer";

    var handles = document.createElement("span");
    handles.className = "activity-handles";
    handles.textContent = USERNAMES.map(function (u) { return "@" + u; }).join(" + ");
    footer.appendChild(handles);
    footer.appendChild(buildLegend());
    mount.appendChild(footer);

    attachTooltip(scroller, grid.svg);

    /* Open scrolled to today, which is the interesting end of the range. */
    scroller.scrollLeft = scroller.scrollWidth;
  }

  function fail(mount) {
    mount.textContent = "";
    var p = document.createElement("p");
    p.className = "activity-error";
    p.textContent = "Activity graph unavailable right now.";
    mount.appendChild(p);
  }

  /* ---------- boot ---------- */

  function readCache() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || Date.now() - parsed.ts > CACHE_TTL_MS) return null;
      return parsed.byDate;
    } catch (e) {
      return null; /* private mode, disabled storage, corrupt JSON — just refetch */
    }
  }

  function writeCache(byDate) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), byDate: byDate }));
    } catch (e) { /* non-fatal */ }
  }

  function init() {
    var mount = document.getElementById("activity-graph");
    if (!mount) return;

    var cached = readCache();
    if (cached) {
      try {
        render(mount, cached);
        return;
      } catch (e) { /* fall through to a fresh fetch */ }
    }

    Promise.all(USERNAMES.map(fetchContributions))
      .then(function (datasets) {
        var byDate = mergeContributions(datasets);
        writeCache(byDate);
        render(mount, byDate);
      })
      .catch(function () { fail(mount); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
