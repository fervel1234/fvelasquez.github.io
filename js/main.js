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
    toggle.textContent = "Show all " + lineCount + " lines";
    wrapper.appendChild(toggle);

    toggle.addEventListener("click", function () {
      var collapsed = wrapper.classList.toggle("is-collapsed");
      toggle.textContent = collapsed ? "Show all " + lineCount + " lines" : "Show less";
    });
  });
})();
