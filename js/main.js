(function () {
  "use strict";

  /* Theme toggle: the inline script in <head> already set data-theme
     (defaulting to dark) before paint. This just flips it on click. */
  var root = document.documentElement;
  var toggleBtn = document.getElementById("theme-toggle");

  if (toggleBtn) {
    toggleBtn.addEventListener("click", function () {
      var current = root.getAttribute("data-theme") === "light" ? "light" : "dark";
      var next = current === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      localStorage.setItem("theme", next);
    });
  }

  /* Mobile nav toggle */
  var navToggle = document.querySelector(".nav-toggle");
  var navLinks = document.querySelector(".nav-links");
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", function () {
      var isOpen = navLinks.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
    navLinks.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        navLinks.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* Footer year */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* Lightbox: click any in-post image to view it full-size; click the
     overlay, the close button, or press Escape to dismiss. */
  var postImages = document.querySelectorAll(".post-body img");
  if (postImages.length) {
    var overlay = document.createElement("div");
    overlay.className = "lightbox-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "expanded image");

    var overlayImg = document.createElement("img");
    overlay.appendChild(overlayImg);

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "lightbox-close";
    closeBtn.setAttribute("aria-label", "close");
    closeBtn.innerHTML = "&times;";
    overlay.appendChild(closeBtn);

    document.body.appendChild(overlay);

    function openLightbox(img) {
      overlayImg.src = img.currentSrc || img.src;
      overlayImg.alt = img.alt || "";
      overlay.classList.add("is-open");
      document.body.style.overflow = "hidden";
    }

    function closeLightbox() {
      overlay.classList.remove("is-open");
      document.body.style.overflow = "";
    }

    postImages.forEach(function (img) {
      img.addEventListener("click", function () { openLightbox(img); });
    });

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeLightbox();
    });
    closeBtn.addEventListener("click", closeLightbox);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("is-open")) closeLightbox();
    });
  }

  /* Collapse long code blocks in blog posts to ~10 lines with a toggle to
     expand — purely presentational (see .code-collapse in styles.css),
     the code itself is never touched. Runs on every post automatically,
     no per-post regeneration needed. */
  var CODE_COLLAPSE_LINE_LIMIT = 10;
  document.querySelectorAll(".post-body pre").forEach(function (pre) {
    var codeEl = pre.querySelector("code");
    if (!codeEl) return;

    var lineCount = codeEl.textContent.replace(/\n$/, "").split("\n").length;
    if (lineCount <= CODE_COLLAPSE_LINE_LIMIT) return;

    var wrapper = document.createElement("div");
    wrapper.className = "code-collapse is-collapsed";
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "code-collapse-toggle";
    toggle.textContent = "show all " + lineCount + " lines";
    wrapper.appendChild(toggle);

    toggle.addEventListener("click", function () {
      var collapsed = wrapper.classList.toggle("is-collapsed");
      toggle.textContent = collapsed ? "show all " + lineCount + " lines" : "show less";
    });
  });

  /* Circuit nav: the header shows only the name, with a left-to-right strobe
     (CSS, per letter). Hovering it (tapping on touch screens) grows one
     circuit trace per section down from the top of the page with random 90°
     turns; once a trace is drawn, one electron per letter runs along it and
     each arrival fades in the next letter of that section's name. The menu
     is rebuilt with fresh random traces every time it opens. Labels come
     from the existing .nav-links list, so relative hrefs stay correct on
     every page (including blog/ posts). */
  (function () {
    var nameLink = document.querySelector(".nav-name");
    var header = document.querySelector(".site-header");
    var sourceLinks = document.querySelectorAll(".nav-links a");
    if (!nameLink || !header || !sourceLinks.length) return;

    var SVG_NS = "http://www.w3.org/2000/svg";
    var DRAW_SPEED = 1500;   // px/s the trace grows
    var ELECTRON_SPEED = 900; // px/s an electron travels
    var ELECTRON_GAP = 110;  // ms between electrons on one trace
    var TRACE_STAGGER = 80;  // ms between traces starting
    var GRID = 8;            // traces snap to an 8px grid

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    /* Strobe: one span per letter, delays step left to right. */
    var nameText = nameLink.textContent.trim();
    nameLink.textContent = "";
    nameLink.setAttribute("aria-label", nameText + " — menu");
    nameLink.setAttribute("aria-haspopup", "true");
    nameLink.setAttribute("aria-expanded", "false");
    Array.prototype.forEach.call(nameText, function (ch, i) {
      var span = document.createElement("span");
      span.className = "nav-name-char";
      span.setAttribute("aria-hidden", "true");
      span.textContent = ch;
      span.style.animationDelay = (i * 0.07) + "s";
      nameLink.appendChild(span);
    });

    /* Section data: href + characters (sup-wrapped chars stay superscript). */
    var items = Array.prototype.map.call(sourceLinks, function (a) {
      var chars = [];
      a.childNodes.forEach(function (node) {
        var isSup = node.nodeType === 1 && node.tagName === "SUP";
        Array.prototype.forEach.call(node.textContent, function (ch) {
          chars.push({ ch: ch, sup: isSup });
        });
      });
      return { href: a.getAttribute("href"), chars: chars };
    });

    var overlay = document.createElement("div");
    overlay.className = "circuit-menu";
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "circuit-svg");
    svg.setAttribute("aria-hidden", "true");
    var labelNav = document.createElement("nav");
    labelNav.setAttribute("aria-label", "site sections");
    overlay.appendChild(svg);
    overlay.appendChild(labelNav);
    document.body.appendChild(overlay);

    var isOpen = false;
    var runId = 0;
    var region = null; // area the pointer can roam without closing

    function rand(min, max) { return min + Math.random() * (max - min); }
    function snap(v) { return Math.round(v / GRID) * GRID; }
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    /* Manhattan path from (sx, 0) down to (ex, ey): alternating vertical
       drops and horizontal jogs at random, increasing y levels; the last
       jog lands on ex so the final segment drops straight onto the pad. */
    function makePath(sx, sy, ex, ey, yMin, xMax, lastMin) {
      var span = ey - 20 - yMin;
      var turns = clamp(Math.floor(rand(2, 5)), 1, Math.max(1, Math.floor(span / 16)));
      var levels = [];
      for (var i = 0; i < turns - 1; i++) levels.push(snap(rand(yMin, ey - 20)));
      levels.sort(function (a, b) { return a - b; });
      // The final jog happens at or below lastMin so (in the one-column
      // phone layout) the last drop onto the pad never passes other pads.
      var floor = Math.max(lastMin, levels.length ? levels[levels.length - 1] + GRID : yMin);
      levels.push(snap(rand(floor, ey - 16)));
      var pts = [[sx, sy]];
      var x = sx;
      levels.forEach(function (y, i) {
        pts.push([x, y]);
        var nx;
        if (i === levels.length - 1) {
          nx = ex;
        } else {
          var jog = rand(24, 90) * (Math.random() < 0.5 ? -1 : 1);
          nx = snap(clamp(x + jog, 12, xMax));
        }
        pts.push([nx, y]);
        x = nx;
      });
      pts.push([ex, ey]);
      // Drop zero-length segments so corner math stays clean.
      return pts.filter(function (p, i) {
        return i === 0 || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1];
      });
    }

    function polyline(pts) {
      var cum = [0];
      for (var i = 1; i < pts.length; i++) {
        cum.push(cum[i - 1] + Math.abs(pts[i][0] - pts[i - 1][0]) + Math.abs(pts[i][1] - pts[i - 1][1]));
      }
      return { pts: pts, cum: cum, len: cum[cum.length - 1] };
    }

    function pointAt(poly, d) {
      var pts = poly.pts, cum = poly.cum;
      for (var i = 1; i < pts.length; i++) {
        if (d <= cum[i]) {
          var seg = cum[i] - cum[i - 1] || 1;
          var t = (d - cum[i - 1]) / seg;
          return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t,
                  pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
        }
      }
      return pts[pts.length - 1];
    }

    function svgEl(tag, attrs) {
      var el = document.createElementNS(SVG_NS, tag);
      for (var k in attrs) el.setAttribute(k, attrs[k]);
      return el;
    }

    /* Schematic symbols, drawn along +x centered on (0, 0) and spanning
       x = -14..14; each is rotated onto the trace segment it sits on. A
       thin bg-colored "gap" rect hides the trace line under the symbol. */
    var COMP_LEN = 28;
    var COMPONENTS = {
      resistor: ["M-14 0H-10L-8 -5L-4 5L0 -5L4 5L8 -5L10 0H14"],
      capacitor: ["M-14 0H-3M3 0H14", "M-3 -7V7M3 -7V7"],
      inductor: ["M-14 0H-10a3.33 3.33 0 0 1 6.67 0a3.33 3.33 0 0 1 6.67 0a3.33 3.33 0 0 1 6.67 0H14"],
      diode: ["M-14 0H-5M5 0H14M5 -6V6", "M-5 -6V6L5 0Z"],
      led: ["M-14 0H-5M5 0H14M5 -6V6", "M-5 -6V6L5 0Z", "M0 -8L4 -13M3 -8L7 -13", "M4 -13l-2.5 .5M4 -13l-.5 2.5M7 -13l-2.5 .5M7 -13l-.5 2.5"],
      polarcap: ["M-14 0H-3M3 0H14", "M-3 -7V7", "M4 -7Q1 0 4 7", "M-8 -8H-4M-6 -10V-6"],
      fuse: ["M-14 0H14", "M-8 -4H8V4H-8Z"],
      ic: ["M-14 0H-8M8 0H14", "M-8 -6H8V6H-8Z", "M-4 -6V-10M0 -6V-10M4 -6V-10M-4 6V10M0 6V10M4 6V10"]
    };
    var COMP_TYPES = Object.keys(COMPONENTS);

    /* Picks 1-2 straight segments long enough to hold a symbol (and below
       the header, so it is visible) and drops a random component on each. */
    function placeComponents(poly, yMin, boxIsClear) {
      var pts = poly.pts, cum = poly.cum, spots = [];
      var visibleTop = yMin + 8;
      // Skip the final drop: it runs right beside its own label's text.
      for (var i = 1; i < pts.length - 1; i++) {
        var a = pts[i - 1], b = pts[i];
        var cx, cy, room;
        if (a[1] === b[1]) { // horizontal run
          if (a[1] < visibleTop) continue;
          room = Math.abs(b[0] - a[0]);
          cx = (a[0] + b[0]) / 2; cy = a[1];
        } else { // vertical run: only the part below the header counts
          var y0 = Math.max(Math.min(a[1], b[1]), visibleTop), y1 = Math.max(a[1], b[1]);
          room = y1 - y0;
          cx = a[0]; cy = (y0 + y1) / 2;
        }
        // Symbols stick out up to ~14px each side of the line; that whole box
        // has to stay clear of label text too, not just the trace.
        var half = COMP_LEN / 2;
        var box = a[1] === b[1] ? [cx - half, cy - 14, cx + half, cy + 14] : [cx - 14, cy - half, cx + 14, cy + half];
        if (room >= COMP_LEN + 16 && boxIsClear(box)) spots.push({ i: i, cx: cx, cy: cy });
      }
      spots.sort(function () { return Math.random() - 0.5; });
      var count = spots.length > 1 && Math.random() < 0.55 ? 2 : Math.min(1, spots.length);
      return spots.slice(0, count).map(function (sp) {
        var a = pts[sp.i - 1], b = pts[sp.i];
        var angle = b[0] > a[0] ? 0 : b[0] < a[0] ? 180 : b[1] > a[1] ? 90 : -90;
        var cx = sp.cx, cy = sp.cy;
        var type = COMP_TYPES[Math.floor(Math.random() * COMP_TYPES.length)];
        var g = svgEl("g", { "class": "circuit-comp comp-" + type,
                             transform: "translate(" + cx + " " + cy + ") rotate(" + angle + ")" });
        g.appendChild(svgEl("rect", { "class": "circuit-comp-gap", x: -COMP_LEN / 2, y: -2, width: COMP_LEN, height: 4 }));
        COMPONENTS[type].forEach(function (d) { g.appendChild(svgEl("path", { d: d })); });
        // Distance along the trace where the symbol's center sits.
        var dist = cum[sp.i - 1] + Math.abs(cx - a[0]) + Math.abs(cy - a[1]);
        return { g: g, dist: dist, type: type };
      });
    }

    function build(id) {
      var W = window.innerWidth;
      var H = window.innerHeight;
      var headerBottom = header.getBoundingClientRect().bottom;
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      labelNav.textContent = "";

      var cols = W >= 1000 ? 4 : W >= 560 ? 2 : 1;
      var rows = Math.ceil(items.length / cols);
      var top = headerBottom + 64;
      var rowGap = clamp((H - top - 50) / Math.max(1, rows - 1 || 1), 56, 84);
      var areaW = Math.min(W - 32, 1100);
      var areaLeft = (W - areaW) / 2;
      var slotW = areaW / cols;

      // Pass 1: create and place every label first, so pass 2 can route each
      // trace around all of them.
      var CLEAR = 16; // min gap between any trace/component and label text
      var colBase = [];
      for (var c = 0; c < cols; c++) {
        // Lower rows step 24px left, so a straight drop to a lower pad
        // passes left of the pads/labels above it (the fallback route).
        colBase.push(areaLeft + c * slotW + 16 + 24 * (rows - 1) + rand(0, 24));
      }
      var layout = items.map(function (item, i) {
        var col = i % cols;
        var row = Math.floor(i / cols);
        var label = document.createElement("a");
        label.className = "circuit-label";
        label.href = item.href;
        var charEls = [];
        item.chars.forEach(function (c) {
          var span = document.createElement("span");
          span.className = "circuit-char";
          span.textContent = c.ch;
          if (c.sup) {
            var sup = document.createElement("sup");
            sup.appendChild(span);
            label.appendChild(sup);
          } else {
            label.appendChild(span);
          }
          charEls.push(span);
        });
        labelNav.appendChild(label);
        var labelW = label.offsetWidth;
        var labelH = label.offsetHeight;

        // Endpoint pad with the label to its right.
        var ex = snap(cols === 1 ? Math.min(W * 0.42, W - labelW - 40) : colBase[col] - 24 * row);
        var ey = snap(top + row * rowGap + (cols === 1 ? 0 : rand(-8, 8)));
        label.style.left = (ex + 12) + "px";
        label.style.top = ey + "px";
        return { item: item, label: label, charEls: charEls, ex: ex, ey: ey,
                 labelW: labelW, labelH: labelH, row: row };
      });

      // Keep-out box around label k (pad + text), grown by CLEAR. For a
      // trace's own label the pad is its target, so only the text counts.
      function keepOut(L, own) {
        return { l: (own ? L.ex + 12 : L.ex - 4) - CLEAR, r: L.ex + 12 + L.labelW + CLEAR,
                 t: L.ey - L.labelH / 2 - CLEAR, b: L.ey + L.labelH / 2 + CLEAR };
      }
      function isClear(pts, own) {
        for (var j = 1; j < pts.length; j++) {
          var x0 = Math.min(pts[j - 1][0], pts[j][0]), x1 = Math.max(pts[j - 1][0], pts[j][0]);
          var y0 = Math.min(pts[j - 1][1], pts[j][1]), y1 = Math.max(pts[j - 1][1], pts[j][1]);
          for (var k = 0; k < layout.length; k++) {
            // The last drop lands on its own pad, right beside its own text.
            if (k === own && j === pts.length - 1) continue;
            var r = keepOut(layout[k], k === own);
            if (x1 >= r.l && x0 <= r.r && y1 >= r.t && y0 <= r.b) return false;
          }
        }
        return true;
      }

      // Every trace starts at a pin under the name, as if the name were a
      // chip. Pins go left to right in the order of their targets, and each
      // trace first runs along its own level of a short bus under the name
      // (outermost targets on the highest level) so the fan-out nests
      // instead of tangling.
      var nameBox = nameLink.getBoundingClientRect();
      var pinY = Math.round(nameBox.bottom - 4);
      var pinLeft = nameBox.left + 14, pinSpan = nameBox.width - 28;
      var BUS_GAP = 4;
      var byX = layout.map(function (L, i) { return i; })
        .sort(function (a, b) { return layout[a].ex - layout[b].ex || layout[a].ey - layout[b].ey; });
      var pins = [];
      byX.forEach(function (idx, rank) {
        pins[idx] = { x: Math.round(pinLeft + (rank + 0.5) * pinSpan / layout.length) };
      });
      layout.map(function (L, i) { return i; })
        .sort(function (a, b) { return Math.abs(layout[b].ex - pins[b].x) - Math.abs(layout[a].ex - pins[a].x); })
        .forEach(function (idx, level) { pins[idx].bus = pinY + 10 + level * BUS_GAP; });
      var busBottom = pinY + 10 + layout.length * BUS_GAP;

      function tidy(pts) {
        return pts.filter(function (p, i) {
          return i === 0 || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1];
        });
      }

      // Pass 2: random routes, re-rolled until one keeps clear of all labels.
      var traces = layout.map(function (L, i) {
        var item = L.item, label = L.label, charEls = L.charEls;
        var ex = L.ex, ey = L.ey, labelW = L.labelW;
        // One column: traces stay in a lane left of the labels. Wider
        // layouts can wander across the whole page.
        var xMax = cols === 1 ? ex - 16 : W - 12;
        var pin = pins[i];
        var below = busBottom + 8; // random turns only happen under the bus
        var lastMin = cols === 1 ? ey - rowGap + 16 : below;
        var pts = null;
        for (var tries = 0; tries < 40 && !pts; tries++) {
          var sx = cols === 1 ? snap(rand(12, xMax)) : snap(clamp(ex + rand(-70, 70), 12, xMax));
          var cand = tidy([[pin.x, pinY], [pin.x, pin.bus]]
            .concat(makePath(sx, pin.bus, ex, ey, below, xMax, lastMin)));
          if (isClear(cand, i)) pts = cand;
        }
        if (!pts) {
          // Fallback that is clear by construction: along its bus level, then
          // one column: down its own lane at the left edge and a short jog
          // onto the pad; otherwise a straight drop (lower rows sit 24px left
          // of the pads above).
          var lane = snap(12 + i * GRID);
          // Clear of its own label, or centered between rows when they're tight.
          var jogY = Math.max(ey - Math.ceil(L.labelH / 2) - CLEAR, Math.round(ey - rowGap / 2));
          pts = tidy(cols === 1
            ? [[pin.x, pinY], [pin.x, pin.bus], [lane, pin.bus], [lane, jogY], [ex, jogY], [ex, ey]]
            : [[pin.x, pinY], [pin.x, pin.bus], [ex, pin.bus], [ex, ey]]);
        }
        var poly = polyline(pts);

        var path = svgEl("path", {
          "class": "circuit-trace",
          d: "M" + poly.pts.map(function (p) { return p[0] + " " + p[1]; }).join(" L")
        });
        path.style.strokeDasharray = poly.len;
        path.style.strokeDashoffset = reduceMotion ? 0 : poly.len;
        svg.appendChild(path);
        svg.appendChild(svgEl("circle", { "class": "circuit-pin", cx: pin.x, cy: pinY, r: 2 }));
        var pad = svgEl("circle", { "class": "circuit-pad", cx: ex, cy: ey, r: 4 });
        svg.appendChild(pad);
        var comps = placeComponents(poly, busBottom, function (box) {
          return layout.every(function (o) {
            var t = { l: o.ex - 4 - 10, r: o.ex + 12 + o.labelW + 10,
                      t: o.ey - o.labelH / 2 - 10, b: o.ey + o.labelH / 2 + 10 };
            return box[2] < t.l || box[0] > t.r || box[3] < t.t || box[1] > t.b;
          });
        });
        comps.forEach(function (c) {
          if (reduceMotion) c.g.classList.add("is-on");
          svg.appendChild(c.g);
        });

        label.addEventListener("mouseenter", function () { path.classList.add("is-hot"); });
        label.addEventListener("mouseleave", function () { path.classList.remove("is-hot"); });
        label.addEventListener("focus", function () { path.classList.add("is-hot"); });
        label.addEventListener("blur", function () { path.classList.remove("is-hot"); });

        // One electron per visible character (spaces just appear with the rest).
        var electrons = [];
        charEls.forEach(function (el, j) {
          if (item.chars[j].ch.trim() === "") { el.classList.add("is-lit"); return; }
          electrons.push({ charEl: el, node: null, halo: null, done: false });
        });

        return { label: label, path: path, pad: pad, poly: poly, electrons: electrons, comps: comps,
                 start: i * TRACE_STAGGER, drawn: false, ex: ex, ey: ey, labelW: labelW };
      });

      // Region the pointer can roam: from the top of the page down to the
      // bottom edge of the lowest label row, spanning the name and labels.
      // Crossing out of it closes the menu immediately.
      var nr = nameLink.getBoundingClientRect();
      var minX = nr.left, maxXr = nr.right, maxY = nr.bottom;
      traces.forEach(function (t) {
        var lr = t.label.getBoundingClientRect();
        minX = Math.min(minX, t.ex - 10);
        maxXr = Math.max(maxXr, lr.right);
        maxY = Math.max(maxY, lr.bottom);
      });
      region = { left: minX - 24, right: maxXr + 24, top: 0, bottom: maxY };

      if (reduceMotion) {
        traces.forEach(function (t) {
          t.pad.classList.add("is-on");
          t.electrons.forEach(function (e) { e.charEl.classList.add("is-lit"); });
        });
        return;
      }

      var t0 = performance.now();
      function frame(now) {
        if (id !== runId) return; // menu closed or rebuilt: stop this run
        var elapsed = now - t0;
        var busy = false;

        traces.forEach(function (t) {
          var drawMs = t.poly.len / DRAW_SPEED * 1000;
          var local = elapsed - t.start;
          if (local < 0) { busy = true; return; }

          if (!t.drawn) {
            var f = Math.min(1, local / drawMs);
            t.path.style.strokeDashoffset = t.poly.len * (1 - f);
            // Each component snaps in as the growing trace reaches it.
            t.comps.forEach(function (c) {
              if (f * t.poly.len >= c.dist - COMP_LEN / 2) c.g.classList.add("is-on");
            });
            if (f < 1) { busy = true; return; }
            t.drawn = true;
            t.pad.classList.add("is-on");
          }

          var travelMs = t.poly.len / ELECTRON_SPEED * 1000;
          var hits = t.comps.map(function () { return false; });
          t.electrons.forEach(function (e, j) {
            if (e.done) return;
            busy = true;
            var p = (local - drawMs - j * ELECTRON_GAP) / travelMs;
            if (p <= 0) return;
            if (!e.node) {
              e.halo = svgEl("circle", { "class": "circuit-halo", r: 6 });
              e.node = svgEl("circle", { "class": "circuit-electron", r: 2.4 });
              svg.appendChild(e.halo);
              svg.appendChild(e.node);
            }
            if (p >= 1) {
              e.done = true;
              svg.removeChild(e.node);
              svg.removeChild(e.halo);
              e.charEl.classList.add("is-lit");
              return;
            }
            var dNow = p * t.poly.len;
            t.comps.forEach(function (c, k) {
              if (Math.abs(dNow - c.dist) < COMP_LEN / 2) hits[k] = true;
            });
            var pt = pointAt(t.poly, dNow);
            e.node.setAttribute("cx", pt[0]); e.node.setAttribute("cy", pt[1]);
            e.halo.setAttribute("cx", pt[0]); e.halo.setAttribute("cy", pt[1]);
          });
          // A component glows while an electron is inside it (LEDs light up).
          t.comps.forEach(function (c, k) { c.g.classList.toggle("is-live", hits[k]); });
        });

        if (busy) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    function open() {
      if (isOpen) return;
      isOpen = true;
      runId++;
      document.documentElement.classList.add("circuit-open");
      nameLink.setAttribute("aria-expanded", "true");
      overlay.classList.add("is-open");
      build(runId);
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      runId++; // stops any running animation frame loop
      document.documentElement.classList.remove("circuit-open");
      nameLink.setAttribute("aria-expanded", "false");
      overlay.classList.remove("is-open");
    }

    if (canHover) {
      nameLink.addEventListener("mouseenter", open);
      document.addEventListener("mousemove", function (e) {
        if (!isOpen || !region) return;
        var inside = e.clientX >= region.left && e.clientX <= region.right &&
                     e.clientY >= region.top && e.clientY <= region.bottom;
        if (!inside) close();
      });
      document.documentElement.addEventListener("mouseleave", close);
    }
    // With a mouse, hover opens the circuit and a click goes home as usual.
    // Touch screens can't hover, so the first tap opens the circuit and a
    // second tap (while it's open) goes home.
    if (!canHover) {
      nameLink.addEventListener("click", function (e) {
        if (!isOpen) { e.preventDefault(); open(); }
      });
    }

    // Keyboard: focusing the name opens it; tabbing out of the menu closes it.
    nameLink.addEventListener("focus", function () { if (nameLink.matches(":focus-visible")) open(); });
    document.addEventListener("focusin", function (e) {
      if (isOpen && e.target !== nameLink && !overlay.contains(e.target)) close();
    });
    overlay.addEventListener("click", function (e) {
      if (!e.target.closest(".circuit-label")) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen) { close(); nameLink.blur(); }
    });
    // Only a width change re-lays out the circuit; phone browsers fire
    // height-only resizes while scrolling (address bar showing/hiding).
    var lastWidth = window.innerWidth;
    window.addEventListener("resize", function () {
      if (window.innerWidth !== lastWidth) { lastWidth = window.innerWidth; close(); }
    });
  })();
})();
