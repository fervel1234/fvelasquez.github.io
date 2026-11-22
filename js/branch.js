/* branch^n — "first principles" prerequisite circuit.
   Topics are IC chips, the three books are socketed parts at the bottom,
   and every prerequisite is a Manhattan circuit trace from the bottom of
   one chip to the top of the next (or straight across for same-row
   co-requisites). Traces grow in on load, then pulses of light run along
   them from prerequisite to topic. "Main" traces (calc I → II → III,
   physics I → II → thermal, chem I → II) pulse as one chained run in
   increasing order; every cross-topic trace pulses on its own clock.
   Everything lives in one SVG with a fixed viewBox so it scales as a unit. */
(function () {
  var host = document.getElementById("fp-chart");
  if (!host) return;

  var SVG_NS = "http://www.w3.org/2000/svg";
  var W = 1000;
  var COL_X = [100, 300, 500, 700, 900];
  var GUTTERS = [200, 400, 600, 800];
  var CHIP_W = 150, CHIP_H = 44;
  var BOOK_W = 150, BOOK_H = 196;
  var TIER_Y = [40, 194, 348, 502, 808]; // top edge of each row
  var LANE = 8;                          // spacing between parallel traces
  var DRAW_SPEED = 900;                  // px/s traces grow on load
  var PULSE_SPEED = 420;                 // px/s light travels
  var PULSE_LEN = 46;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Course chips link to their catalog entry (Wright = City Colleges catalog).
  var CCC = "https://catalog.ccc.edu/search/?P=";
  var UIC = "https://catalog.uic.edu/search/?P=";

  var NODES = [
    { id: "calc1", label: "MATH 207", href: CCC + "MATH%20207", tier: 0, col: 1 },
    { id: "phys1", label: "PHYSICS 235", href: CCC + "PHYSICS%20235", tier: 0, col: 2 },
    { id: "chem1", label: "CHEM 201", href: CCC + "CHEM%20201", tier: 0, col: 3 },
    { id: "calc2", label: "MATH 208", href: CCC + "MATH%20208", tier: 1, col: 1 },
    { id: "phys2", label: "PHYSICS 236", href: CCC + "PHYSICS%20236", tier: 1, col: 2 },
    { id: "chem2", label: "CHEM 203", href: CCC + "CHEM%20203", tier: 1, col: 3 },
    { id: "calc3", label: "MATH 209", href: CCC + "MATH%20209", tier: 2, col: 0 },
    { id: "linalg", label: "MATH 212", href: CCC + "MATH%20212", tier: 2, col: 1 },
    { id: "diffeq", label: "MATH 210", href: CCC + "MATH%20210", tier: 2, col: 2 },
    { id: "circuits", label: "ECE 225", href: UIC + "ECE%20225", tier: 2, col: 3 },
    { id: "thermal", label: "PHYS 260", href: UIC + "PHYS%20260", tier: 2, col: 4 },
    { id: "griffiths", book: true, tier: 3, col: 2,
      img: "assets/images/branch/griffiths-qm-3e.jpg",
      lines: ["intro to quantum", "mechanics, 3e"],
      title: "Introduction to Quantum Mechanics (3rd ed.) — David J. Griffiths & Darrell F. Schroeter" },
    { id: "qalg", book: true, tier: 4, col: 1,
      img: "assets/images/branch/bloch-sphere.svg",
      imgDark: "assets/images/branch/bloch-sphere-dark.svg",
      lines: ["quantum algorithms", "from first principles"],
      title: "Quantum Algorithms from First Principles: Derivations and Implementation Guides to Shor, Grover, Hamiltonian Simulation, Quantum Chemistry, Linear Algebra, and Block Encoding Algorithms" },
    { id: "neaman", book: true, tier: 4, col: 3,
      img: "assets/images/branch/neamen-semiconductors-4e.jpg",
      lines: ["semiconductor physics", "and devices, 4e"],
      title: "Semiconductor Physics and Devices (4th ed.) — Donald A. Neamen" }
  ];

  // [from, to, main?] — main = the same subject continuing to its next course.
  var EDGES = [
    ["calc1", "calc2", true], ["calc2", "calc3", true],
    ["phys1", "phys2", true], ["phys2", "thermal", true],
    ["chem1", "chem2", true],
    ["calc1", "phys1"], ["calc2", "phys2"],
    ["calc2", "linalg"], ["calc2", "diffeq"],
    ["phys2", "circuits"], ["diffeq", "circuits"],
    ["calc3", "griffiths"], ["linalg", "griffiths"], ["diffeq", "griffiths"], ["thermal", "griffiths"],
    ["griffiths", "qalg"], ["griffiths", "neaman"],
    ["linalg", "qalg"],
    ["chem2", "neaman"], ["circuits", "neaman"], ["thermal", "neaman"]
  ];

  var byId = {};
  NODES.forEach(function (n) {
    n.w = n.book ? BOOK_W : CHIP_W;
    n.h = n.book ? BOOK_H : CHIP_H;
    n.x = COL_X[n.col] - n.w / 2;
    n.y = TIER_Y[n.tier];
    n.cx = COL_X[n.col];
    n.out = []; n["in"] = [];
    byId[n.id] = n;
  });

  var edges = EDGES.map(function (e) {
    var a = byId[e[0]], b = byId[e[1]];
    var ed = { from: a, to: b, main: !!e[2], side: a.tier === b.tier };
    if (!ed.side) { a.out.push(ed); b["in"].push(ed); }
    return ed;
  });

  /* Skip-row traces leave through a gutter between columns: the one that
     makes the shortest detour. */
  edges.forEach(function (ed) {
    if (ed.side || ed.to.tier === ed.from.tier + 1) return;
    var best = null;
    GUTTERS.forEach(function (g) {
      var cost = Math.abs(g - ed.from.cx) + Math.abs(g - ed.to.cx);
      if (best === null || cost < best.cost) best = { g: g, cost: cost };
    });
    ed.gutter = best.g;
  });

  /* Ports: spread each chip's pins across its edge, ordered by where the
     trace heads so neighbouring traces don't cross right at the chip. */
  function spread(list, node, key) {
    list.sort(function (p, q) { return key(p) - key(q); });
    var usable = node.w * 0.7;
    list.forEach(function (ed, i) {
      var x = list.length === 1 ? node.cx
        : node.cx - usable / 2 + usable * i / (list.length - 1);
      x = Math.round(x / 4) * 4;
      if (node === ed.from) ed.sx = x; else ed.tx = x;
    });
  }
  NODES.forEach(function (n) {
    spread(n.out, n, function (ed) { return ed.gutter || ed.to.cx; });
    spread(n["in"], n, function (ed) { return ed.gutter || ed.from.cx; });
  });

  /* Lanes: every horizontal run lives in the gap under a row; overlapping
     runs in the same gap get different y (greedy interval colouring). */
  var gapRuns = {};
  function addRun(gap, ed, key, x0, x1) {
    (gapRuns[gap] = gapRuns[gap] || []).push({ ed: ed, key: key, lo: Math.min(x0, x1), hi: Math.max(x0, x1) });
  }
  edges.forEach(function (ed) {
    if (ed.side) return;
    var a = ed.from, b = ed.to;
    if (ed.gutter == null) {
      addRun(a.tier, ed, "only", ed.sx, ed.tx);
    } else {
      addRun(a.tier, ed, "first", ed.sx, ed.gutter);
      addRun(b.tier - 1, ed, "last", ed.gutter, ed.tx);
    }
  });
  Object.keys(gapRuns).forEach(function (gap) {
    var runs = gapRuns[gap].sort(function (p, q) { return p.lo - q.lo; });
    var laneEnds = [];
    runs.forEach(function (r) {
      var k = 0;
      while (k < laneEnds.length && laneEnds[k] >= r.lo - LANE) k++;
      laneEnds[k] = r.hi;
      r.lane = k;
    });
    var n = laneEnds.length;
    var rowBottom = Math.max.apply(null, NODES.filter(function (nd) { return nd.tier === +gap; })
      .map(function (nd) { return nd.y + nd.h; }));
    var mid = (rowBottom + TIER_Y[+gap + 1]) / 2;
    runs.forEach(function (r) {
      var y = mid + (r.lane - (n - 1) / 2) * LANE * 2;
      r.ed[r.key + "Y"] = Math.round(y);
    });
  });

  // Several traces can share a gutter: offset them side by side.
  var gutterUse = {};
  edges.forEach(function (ed) {
    if (ed.gutter == null) return;
    var k = gutterUse[ed.gutter] = (gutterUse[ed.gutter] || 0) + 1;
    ed.gx = ed.gutter + (k % 2 ? 1 : -1) * Math.floor(k / 2) * LANE;
  });

  edges.forEach(function (ed) {
    var a = ed.from, b = ed.to, pts;
    if (ed.side) {
      var y = a.y + a.h / 2;
      pts = [[a.x + a.w, y], [b.x, y]];
    } else if (ed.gutter == null) {
      pts = [[ed.sx, a.y + a.h], [ed.sx, ed.onlyY], [ed.tx, ed.onlyY], [ed.tx, b.y]];
    } else {
      pts = [[ed.sx, a.y + a.h], [ed.sx, ed.firstY], [ed.gx, ed.firstY],
             [ed.gx, ed.lastY], [ed.tx, ed.lastY], [ed.tx, b.y]];
    }
    ed.poly = polyline(pts.filter(function (p, i) {
      return i === 0 || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1];
    }));
  });

  function polyline(pts) {
    var cum = [0];
    for (var i = 1; i < pts.length; i++) {
      cum.push(cum[i - 1] + Math.abs(pts[i][0] - pts[i - 1][0]) + Math.abs(pts[i][1] - pts[i - 1][1]));
    }
    return { pts: pts, cum: cum, len: cum[cum.length - 1] };
  }

  function svgEl(tag, attrs, parent) {
    var el = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  }

  /* Same schematic symbols as the circuit nav (js/main.js). */
  var COMP_LEN = 28;
  var COMPONENTS = {
    resistor: ["M-14 0H-10L-8 -5L-4 5L0 -5L4 5L8 -5L10 0H14"],
    capacitor: ["M-14 0H-3M3 0H14", "M-3 -7V7M3 -7V7"],
    inductor: ["M-14 0H-10a3.33 3.33 0 0 1 6.67 0a3.33 3.33 0 0 1 6.67 0a3.33 3.33 0 0 1 6.67 0H14"],
    diode: ["M-14 0H-5M5 0H14M5 -6V6", "M-5 -6V6L5 0Z"],
    led: ["M-14 0H-5M5 0H14M5 -6V6", "M-5 -6V6L5 0Z", "M0 -8L4 -13M3 -8L7 -13", "M4 -13l-2.5 .5M4 -13l-.5 2.5M7 -13l-2.5 .5M7 -13l-.5 2.5"],
    fuse: ["M-14 0H14", "M-8 -4H8V4H-8Z"]
  };
  var COMP_TYPES = Object.keys(COMPONENTS);

  var bottom = Math.max.apply(null, NODES.map(function (n) { return n.y + n.h; }));
  var svg = svgEl("svg", { "class": "fp-svg", viewBox: "0 0 " + W + " " + (bottom + 20),
                           role: "img", "aria-labelledby": "fp-title" });
  svgEl("title", { id: "fp-title" }, svg).textContent =
    "prerequisite circuit: intro math, physics and chemistry courses wired down to three books";
  var defs = svgEl("defs", {}, svg);
  var glow = svgEl("filter", { id: "fp-glow", x: "-50%", y: "-50%", width: "200%", height: "200%" }, defs);
  svgEl("feGaussianBlur", { stdDeviation: "3", result: "b" }, glow);
  var merge = svgEl("feMerge", {}, glow);
  svgEl("feMergeNode", { "in": "b" }, merge);
  svgEl("feMergeNode", { "in": "SourceGraphic" }, merge);

  var traceLayer = svgEl("g", {}, svg);
  var pulseLayer = svgEl("g", { filter: "url(#fp-glow)" }, svg);
  var compLayer = svgEl("g", {}, svg);
  var nodeLayer = svgEl("g", {}, svg);

  edges.forEach(function (ed, i) {
    var d = "M" + ed.poly.pts.map(function (p) { return p[0] + " " + p[1]; }).join(" L");
    ed.path = svgEl("path", { "class": "fp-trace" + (ed.main ? " is-main" : ""), d: d }, traceLayer);
    ed.pulse = svgEl("path", { "class": "fp-pulse", d: d }, pulseLayer);
    ed.pulse.style.strokeDasharray = PULSE_LEN + " " + (ed.poly.len + PULSE_LEN);
    ed.pulse.style.strokeDashoffset = PULSE_LEN;
    ed.pin = svgEl("circle", { "class": "fp-pin", cx: ed.poly.pts[0][0], cy: ed.poly.pts[0][1], r: 2.5 }, compLayer);
    var end = ed.poly.pts[ed.poly.pts.length - 1];
    ed.pad = svgEl("circle", { "class": "fp-pad", cx: end[0], cy: end[1], r: 3.5 }, compLayer);
    ed.comps = placeComponent(ed, i);
    if (!reduceMotion) {
      ed.path.style.strokeDasharray = ed.poly.len;
      ed.path.style.strokeDashoffset = ed.poly.len;
    }
  });

  /* One symbol on the longest straight run of each longer trace. The
     type is picked from the edge index so the layout is stable per load. */
  function placeComponent(ed, i) {
    var pts = ed.poly.pts, best = null;
    for (var k = 1; k < pts.length; k++) {
      var a = pts[k - 1], b = pts[k];
      var room = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
      if (room >= COMP_LEN + 30 && (!best || room > best.room)) best = { k: k, room: room };
    }
    if (!best || ed.side) return [];
    var a = pts[best.k - 1], b = pts[best.k];
    var cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2;
    var angle = b[0] > a[0] ? 0 : b[0] < a[0] ? 180 : b[1] > a[1] ? 90 : -90;
    var type = COMP_TYPES[(i * 7 + 3) % COMP_TYPES.length];
    var g = svgEl("g", { "class": "fp-comp comp-" + type,
                         transform: "translate(" + cx + " " + cy + ") rotate(" + angle + ")" }, compLayer);
    svgEl("rect", { "class": "fp-comp-gap", x: -COMP_LEN / 2, y: -2, width: COMP_LEN, height: 4 }, g);
    COMPONENTS[type].forEach(function (d) { svgEl("path", { d: d }, g); });
    return [{ g: g, dist: ed.poly.cum[best.k - 1] + Math.abs(cx - a[0]) + Math.abs(cy - a[1]) }];
  }

  /* Chips: a body with pin stubs along the top and bottom edges. */
  NODES.forEach(function (n) {
    var g = n.href
      ? svgEl("a", { "class": "fp-node is-link", href: n.href, target: "_blank", rel: "noopener" }, nodeLayer)
      : svgEl("g", { "class": "fp-node" + (n.book ? " is-book" : ""), tabindex: "0" }, nodeLayer);
    n.g = g;
    svgEl("title", {}, g).textContent = n.title || (n.href ? n.label + " — course overview" : n.label);
    var stubs = "";
    for (var x = n.x + 12; x <= n.x + n.w - 12; x += 12) {
      stubs += "M" + x + " " + n.y + "v-5M" + x + " " + (n.y + n.h) + "v5";
    }
    svgEl("path", { "class": "fp-stubs", d: stubs }, g);
    svgEl("rect", { "class": "fp-body", x: n.x, y: n.y, width: n.w, height: n.h, rx: 3 }, g);
    // Pin-1 notch, like a real DIP package.
    svgEl("path", { "class": "fp-notch", d: "M" + (n.x + 8) + " " + n.y + "a5 5 0 0 0 10 0" }, g);
    if (!n.book) {
      svgEl("text", { "class": "fp-label", x: n.cx, y: n.y + n.h / 2 + 5, "text-anchor": "middle" }, g)
        .textContent = n.label;
      return;
    }
    var imgW = 104, imgH = 134, ix = n.cx - imgW / 2, iy = n.y + 12;
    svgEl("image", { "class": n.imgDark ? "fp-img-light" : "", href: n.img, x: ix, y: iy,
                     width: imgW, height: imgH, preserveAspectRatio: "xMidYMid meet" }, g);
    if (n.imgDark) {
      svgEl("image", { "class": "fp-img-dark", href: n.imgDark, x: ix, y: iy,
                       width: imgW, height: imgH, preserveAspectRatio: "xMidYMid meet" }, g);
    }
    n.lines.forEach(function (line, k) {
      svgEl("text", { "class": "fp-label fp-book-label", x: n.cx, y: iy + imgH + 18 + k * 15, "text-anchor": "middle" }, g)
        .textContent = line;
    });
  });

  host.appendChild(svg);

  /* Hovering / focusing a chip lights every trace touching it. */
  NODES.forEach(function (n) {
    function hot(on) {
      edges.forEach(function (ed) {
        if (ed.from === n || ed.to === n) ed.path.classList.toggle("is-hot", on);
      });
    }
    n.g.addEventListener("mouseenter", function () { hot(true); });
    n.g.addEventListener("mouseleave", function () { hot(false); });
    n.g.addEventListener("focus", function () { hot(true); });
    n.g.addEventListener("blur", function () { hot(false); });
  });

  if (reduceMotion) return;

  /* Main chains run in course order: a pulse that finishes one main trace
     hands off to the next main trace out of the chip it arrived at. */
  var chains = [];
  edges.forEach(function (ed) {
    if (!ed.main) return;
    var hasParent = edges.some(function (o) { return o.main && o.to === ed.from; });
    if (hasParent) return;
    var chain = [ed], cur = ed;
    for (;;) {
      var next = edges.filter(function (o) { return o.main && o.from === cur.to; })[0];
      if (!next) break;
      chain.push(next); cur = next;
    }
    chains.push(chain);
  });

  // Each animated thing is a "runner": a sequence of edges plus a clock.
  var runners = chains.map(function (chain, i) {
    return { edges: chain, period: 0, offset: i * 700, gap: 1400 };
  });
  edges.forEach(function (ed, i) {
    if (ed.main) return;
    runners.push({ edges: [ed], offset: 400 + ((i * 977) % 2600), gap: 2200 + ((i * 613) % 2400) });
  });
  runners.forEach(function (r) {
    r.travel = r.edges.map(function (ed) { return ed.poly.len / PULSE_SPEED * 1000; });
    r.total = r.travel.reduce(function (s, t) { return s + t; }, 0);
    r.period = r.total + r.gap;
  });

  var drawEnd = 0;
  edges.forEach(function (ed) {
    ed.drawStart = ed.from.tier * 260;
    ed.drawMs = ed.poly.len / DRAW_SPEED * 1000;
    drawEnd = Math.max(drawEnd, ed.drawStart + ed.drawMs);
  });
  NODES.forEach(function (n) { n.g.style.animationDelay = (n.tier * 260) + "ms"; });
  host.classList.add("is-animating");

  var t0 = performance.now();
  function frame(now) {
    var t = now - t0;
    edges.forEach(function (ed) {
      if (ed.drawn) return;
      var f = Math.min(1, Math.max(0, (t - ed.drawStart) / ed.drawMs));
      ed.path.style.strokeDashoffset = ed.poly.len * (1 - f);
      ed.comps.forEach(function (c) { if (f * ed.poly.len >= c.dist) c.g.classList.add("is-on"); });
      if (f >= 1) {
        ed.drawn = true;
        ed.path.style.strokeDasharray = "none";
        ed.pad.classList.add("is-on");
      }
    });

    var live = edges.map(function () { return -1; });
    if (t > drawEnd) {
      var pt = t - drawEnd;
      runners.forEach(function (r) {
        var local = pt - r.offset;
        if (local < 0) return;
        local %= r.period;
        for (var k = 0; k < r.edges.length; k++) {
          if (local < r.travel[k]) { live[edges.indexOf(r.edges[k])] = local / r.travel[k]; return; }
          local -= r.travel[k];
        }
      });
    }
    edges.forEach(function (ed, i) {
      var p = live[i];
      // Dash sits before the start at p=0 and past the end at p=1.
      ed.pulse.style.strokeDashoffset = p < 0 ? PULSE_LEN : PULSE_LEN - p * (ed.poly.len + PULSE_LEN);
      var d = p * ed.poly.len;
      ed.comps.forEach(function (c) { c.g.classList.toggle("is-live", p >= 0 && Math.abs(d - c.dist) < COMP_LEN); });
      ed.pad.classList.toggle("is-live", p > 0.92);
    });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
