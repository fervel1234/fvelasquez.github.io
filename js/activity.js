/* ==========================================================================
   Activity graph — daily blog-posting heatmap, GitHub-contributions style.

   The data source is blog.html itself: blog-admin already rewrites that file
   on every publish and every edit, so the calendar stays current with no
   changes to the publishing tool and no external API. On blog.html the cards
   are read straight out of the live DOM; elsewhere the page is fetched once
   (same-origin) and parsed.

   Shading is monochrome and theme-aware: white-on-dark in dark mode (the site
   default), inverted to ink-on-light in light mode so the squares stay visible
   on a white page. All five steps come from the --act-* custom properties in
   css/styles.css — no colors are hardcoded here.
   ========================================================================== */
(function () {
  "use strict";

  /* Resolve blog.html relative to this script, which is the one path that is
     correct from both the site root and from a post page one level down.
     Read at parse time — document.currentScript is null once we're in a
     DOMContentLoaded callback. */
  var SOURCE = (function () {
    var s = document.currentScript;
    if (s && s.src) return s.src.replace(/js\/activity\.js.*$/, "blog.html");
    return "blog.html";
  })();

  var WEEKS = 13;            /* ~3 months */
  var DAYS = WEEKS * 7;
  var RANGE_LABEL = "the last 3 months";

  /* Grid geometry, in SVG user units (= CSS px at 1:1). A 13-week window
     leaves room for squares over twice GitHub's ~10px, which is the point of
     the shorter range — a few months of posts read clearly instead of
     disappearing into a year of empty cells. */
  var CELL = 22;
  var GAP = 5;
  var STEP = CELL + GAP;
  var LEFT_GUTTER = 34;  /* room for the Mon/Wed/Fri labels */
  var TOP_PAD = 22;      /* room for the month labels */

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

  function addDays(d, n) { return new Date(d.getTime() + n * 86400000); }

  function prettyDate(d) {
    return MONTHS[d.getUTCMonth()] + " " + d.getUTCDate() + ", " + d.getUTCFullYear();
  }

  function today() {
    var n = new Date();
    return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
  }

  /* ---------- data ---------- */

  /* Pull one entry per .blog-card. Anything without a well-formed date is
     skipped rather than allowed to poison the grid. */
  function parsePosts(root) {
    var posts = [];
    var cards = root.querySelectorAll(".blog-card");
    Array.prototype.forEach.call(cards, function (card) {
      var dateEl = card.querySelector(".blog-card-date");
      if (!dateEl) return;
      var iso = dateEl.textContent.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return;
      var titleEl = card.querySelector(".blog-card-title");
      posts.push({
        date: iso,
        title: titleEl ? titleEl.textContent.trim() : "Untitled"
      });
    });
    return posts;
  }

  /* { "YYYY-MM-DD": ["Title", "Title"] } */
  function groupByDate(posts) {
    var byDate = {};
    posts.forEach(function (p) {
      (byDate[p.date] = byDate[p.date] || []).push(p.title);
    });
    return byDate;
  }

  /* Post counts are small integers, so they map to the five steps directly
     rather than being scaled against a busiest day: 1 post is the faintest
     lit square, 4-or-more is full strength. */
  function levelFor(count) {
    if (count <= 0) return 0;
    return count > 4 ? 4 : count;
  }

  function loadPosts() {
    /* On blog.html the cards are already in the document. */
    var local = document.getElementById("blog-list");
    if (local) return Promise.resolve(parsePosts(local));

    return fetch(SOURCE)
      .then(function (res) {
        if (!res.ok) throw new Error("could not load " + SOURCE);
        return res.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, "text/html");
        return parsePosts(doc);
      });
  }

  /* ---------- rendering ---------- */

  function el(name, attrs) {
    var node = document.createElementNS(SVG_NS, name);
    for (var k in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, k)) node.setAttribute(k, attrs[k]);
    }
    return node;
  }

  function plural(n, word) { return n + " " + word + (n === 1 ? "" : "s"); }

  function buildGrid(byDate) {
    var end = today();
    var first = addDays(end, -(DAYS - 1));
    /* Columns are calendar weeks, so back the start up to its Sunday. */
    var start = addDays(first, -first.getUTCDay());

    var days = Math.round((end - start) / 86400000) + 1;
    var cols = Math.ceil(days / 7);

    var width = LEFT_GUTTER + cols * STEP - GAP;
    var height = TOP_PAD + 7 * STEP - GAP;

    var total = 0;
    Object.keys(byDate).forEach(function (k) {
      var d = parseDate(k);
      if (d >= first && d <= end) total += byDate[k].length;
    });

    var svg = el("svg", {
      class: "activity-svg",
      width: width,
      height: height,
      viewBox: "0 0 " + width + " " + height,
      role: "group",
      "aria-label": plural(total, "post") + " in " + RANGE_LABEL + ", " +
        prettyDate(first) + " to " + prettyDate(end)
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
        if (col < cols - 1) { /* skip a label that would be clipped */
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
        if (d < first || d > end) continue;

        var titles = byDate[toISO(d)] || [];
        var count = titles.length;
        var label = count
          ? plural(count, "post") + " on " + prettyDate(d) + ": " + titles.join(", ")
          : "No posts on " + prettyDate(d);

        svg.appendChild(el("rect", {
          class: "activity-cell",
          x: LEFT_GUTTER + col * STEP,
          y: TOP_PAD + row * STEP,
          width: CELL,
          height: CELL,
          rx: 2,
          "data-level": levelFor(count),
          "data-label": label,
          role: "img",
          "aria-label": label
        }));
      }
    }

    return { svg: svg, total: total, first: first, end: end };
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

  /* One tooltip element, moved around on hover, rather than 371 of them. */
  function attachTooltip(scroller, svg) {
    var tip = document.createElement("div");
    tip.className = "activity-tooltip";
    tip.setAttribute("role", "presentation");
    scroller.appendChild(tip);

    function show(cell) {
      tip.textContent = cell.getAttribute("data-label");
      tip.classList.add("is-visible");

      /* Position relative to the scroller, accounting for its scroll offset
         so the tooltip tracks the cell when the grid is scrolled sideways. */
      var cellBox = cell.getBoundingClientRect();
      var hostBox = scroller.getBoundingClientRect();
      tip.style.left = (cellBox.left - hostBox.left + scroller.scrollLeft + cellBox.width / 2) + "px";
      tip.style.top = (cellBox.top - hostBox.top - 8) + "px";
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
    summary.textContent = plural(grid.total, "post") + " in " + RANGE_LABEL;
    mount.appendChild(summary);

    /* Wrapper sized to the grid, so the bordered box hugs the squares and the
       legend lines up with the grid's right edge instead of the page's. */
    var inner = document.createElement("div");
    inner.className = "activity-inner";

    var scroller = document.createElement("div");
    scroller.className = "activity-scroll";
    scroller.appendChild(grid.svg);
    inner.appendChild(scroller);

    var footer = document.createElement("div");
    footer.className = "activity-footer";
    footer.appendChild(buildLegend());
    inner.appendChild(footer);

    mount.appendChild(inner);

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

  function init() {
    var mount = document.getElementById("activity-graph");
    if (!mount) return;

    loadPosts()
      .then(function (posts) { render(mount, groupByDate(posts)); })
      .catch(function () { fail(mount); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
