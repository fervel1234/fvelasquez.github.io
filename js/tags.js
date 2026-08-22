/* ==========================================================================
   Tag filtering for the blog / research / projects listings.

   Tags are read from the cards themselves — the .tag elements the publishing
   tool writes into each card — so the filter bar builds itself and needs no
   separate index to keep in sync. A listing with no tags shows no filter bar
   at all.

   The card markup is only ever read, never rewritten, so blog-admin's regex
   patching of a listing file is unaffected.
   ========================================================================== */
(function () {
  "use strict";

  var LISTS = ["blog-list", "research-list", "projects-list"];

  function textOf(node) {
    return (node.textContent || "").trim();
  }

  /* Every distinct tag in this listing, with how many cards carry it. */
  function collectTags(cards) {
    var counts = {};
    cards.forEach(function (card) {
      tagsOf(card).forEach(function (t) {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    return counts;
  }

  function tagsOf(card) {
    var out = [];
    Array.prototype.forEach.call(card.querySelectorAll(".tag"), function (el) {
      var t = textOf(el);
      if (t && out.indexOf(t) === -1) out.push(t);
    });
    return out;
  }

  function makeChip(label, count, value) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tag-chip";
    btn.setAttribute("data-tag", value);
    btn.setAttribute("aria-pressed", "false");
    btn.appendChild(document.createTextNode(label));
    if (count != null) {
      var n = document.createElement("span");
      n.className = "tag-count";
      n.textContent = count;
      btn.appendChild(n);
    }
    return btn;
  }

  /* Read a tag out of the URL so a filtered view can be linked to directly. */
  function tagFromHash() {
    var m = /^#tag=(.+)$/.exec(window.location.hash || "");
    return m ? decodeURIComponent(m[1]) : "";
  }

  function init() {
    var list = null;
    for (var i = 0; i < LISTS.length && !list; i++) {
      list = document.getElementById(LISTS[i]);
    }
    if (!list) return;

    var cards = Array.prototype.slice.call(list.querySelectorAll(".blog-card"));
    if (!cards.length) return;

    var counts = collectTags(cards);
    var names = Object.keys(counts).sort(function (a, b) {
      return a.localeCompare(b);
    });

    /* No tags anywhere in this listing — leave the page exactly as it was. */
    if (!names.length) return;

    var bar = document.getElementById("tag-filter");
    if (!bar) return;

    var label = document.createElement("span");
    label.className = "tag-filter-label";
    label.textContent = "Filter";
    bar.appendChild(label);

    var chips = [makeChip("All", cards.length, "")];
    names.forEach(function (n) { chips.push(makeChip(n, counts[n], n)); });
    chips.forEach(function (c) { bar.appendChild(c); });

    var empty = document.createElement("p");
    empty.className = "tag-empty";
    empty.textContent = "No posts with that tag yet.";
    list.parentNode.insertBefore(empty, list.nextSibling);

    function apply(tag, updateHash) {
      var shown = 0;
      cards.forEach(function (card) {
        var match = !tag || tagsOf(card).indexOf(tag) !== -1;
        card.style.display = match ? "" : "none";
        if (match) shown++;
      });

      chips.forEach(function (c) {
        c.setAttribute("aria-pressed", c.getAttribute("data-tag") === tag ? "true" : "false");
      });

      empty.classList.toggle("is-visible", shown === 0);

      if (updateHash) {
        var hash = tag ? "#tag=" + encodeURIComponent(tag) : "";
        if (hash) {
          window.location.hash = hash;
        } else if (window.location.hash) {
          /* Clear the fragment without adding a history entry or jumping. */
          history.replaceState(null, "", window.location.pathname + window.location.search);
        }
      }
    }

    bar.addEventListener("click", function (e) {
      var chip = e.target.closest(".tag-chip");
      if (chip) apply(chip.getAttribute("data-tag"), true);
    });

    window.addEventListener("hashchange", function () {
      apply(names.indexOf(tagFromHash()) !== -1 ? tagFromHash() : "", false);
    });

    bar.classList.add("is-ready");

    var initial = tagFromHash();
    apply(names.indexOf(initial) !== -1 ? initial : "", false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
