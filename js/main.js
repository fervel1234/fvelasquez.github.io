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
    overlay.setAttribute("aria-label", "Expanded image");

    var overlayImg = document.createElement("img");
    overlay.appendChild(overlayImg);

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "lightbox-close";
    closeBtn.setAttribute("aria-label", "Close");
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
    toggle.textContent = "Show all " + lineCount + " lines";
    wrapper.appendChild(toggle);

    toggle.addEventListener("click", function () {
      var collapsed = wrapper.classList.toggle("is-collapsed");
      toggle.textContent = collapsed ? "Show all " + lineCount + " lines" : "Show less";
    });
  });
})();
