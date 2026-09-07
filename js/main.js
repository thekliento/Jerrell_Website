/* Pr0 Social EPK - theme switch, nav, scroll reveal, video + photo modal. */
(function () {
  "use strict";

  var root = document.documentElement;
  var KEY = "pr0-theme";

  /* ---- theme ---------------------------------------------------------- */
  function applyTheme(name) {
    if (name === "brass") root.setAttribute("data-theme", "brass");
    else root.removeAttribute("data-theme");
    document.querySelectorAll(".tsw button").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.mode === name));
    });
    try { localStorage.setItem(KEY, name); } catch (e) {}
  }

  document.querySelectorAll(".tsw button").forEach(function (b) {
    b.addEventListener("click", function () { applyTheme(b.dataset.mode); });
  });

  var stored = "bone";
  try { stored = localStorage.getItem(KEY) || "bone"; } catch (e) {}
  applyTheme(stored);

  /* ---- header ---------------------------------------------------------- */
  var header = document.querySelector(".header");
  if (header) {
    var sentinel = document.createElement("div");
    sentinel.style.cssText = "position:absolute;top:0;height:1px;width:1px;";
    document.body.prepend(sentinel);
    new IntersectionObserver(function (es) {
      header.classList.toggle("is-stuck", !es[0].isIntersecting);
    }).observe(sentinel);
  }

  /* ---- nav dropdown ----------------------------------------------------
     Hover opens it and leaving closes it, on pointing devices only. A click
     locks it open until you click again, pick a link, click away or hit Esc.
     Touch devices never get the hover half, so a tap is the only opener. */
  var toggle = document.querySelector(".navtoggle");
  var nav = document.querySelector(".nav");
  if (toggle && nav) {
    var locked = false;
    var hideTimer = null;

    function setOpen(on) {
      nav.classList.toggle("is-open", on);
      toggle.setAttribute("aria-expanded", String(on));
    }
    function openNow() {
      clearTimeout(hideTimer);
      setOpen(true);
    }
    function closeSoon() {
      if (locked) return;
      clearTimeout(hideTimer);
      /* the grace period covers the gap between the button and the panel */
      hideTimer = setTimeout(function () { setOpen(false); }, 180);
    }
    function dismiss() {
      locked = false;
      toggle.classList.remove("is-locked");
      clearTimeout(hideTimer);
      setOpen(false);
    }

    toggle.addEventListener("click", function () {
      if (locked) { dismiss(); return; }
      locked = true;
      toggle.classList.add("is-locked");
      openNow();
    });

    if (window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      [toggle, nav].forEach(function (el) {
        el.addEventListener("mouseenter", openNow);
        el.addEventListener("mouseleave", closeSoon);
      });
    }

    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) dismiss();
    });
    document.addEventListener("click", function (e) {
      if (locked && !nav.contains(e.target) && !toggle.contains(e.target)) dismiss();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) { dismiss(); toggle.focus(); }
    });
  }

  /* ---- scroll reveal --------------------------------------------------- */
  var reveals = document.querySelectorAll(".reveal");
  if (reveals.length && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---- modal ----------------------------------------------------------- */
  var modal = document.getElementById("modal");
  if (!modal) return;
  var box = modal.querySelector(".modal__box");
  var lastFocus = null;

  function open(html) {
    lastFocus = document.activeElement;
    box.innerHTML = html;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-locked");
    var x = modal.querySelector(".modal__x");
    if (x) x.focus();
  }

  function close() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-locked");
    setTimeout(function () { box.innerHTML = ""; }, 320);
    if (lastFocus) lastFocus.focus();
  }

  modal.addEventListener("click", function (e) {
    if (e.target === modal || e.target.closest(".modal__x")) close();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modal.classList.contains("is-open")) close();
  });

  var X = '<button class="modal__x" aria-label="Close">' +
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">' +
    '<path d="M2 2l12 12M14 2L2 14"/></svg></button>';

  document.querySelectorAll("[data-video]").forEach(function (el) {
    el.addEventListener("click", function () {
      open(X + '<div class="modal__frame"><iframe src="https://drive.google.com/file/d/' +
        el.dataset.video + '/preview" allow="autoplay; fullscreen" allowfullscreen title="' +
        (el.dataset.title || "Video") + '"></iframe></div>' +
        '<p class="modal__cap">' + (el.dataset.title || "") + '</p>');
    });
  });

  document.querySelectorAll("[data-photo]").forEach(function (el) {
    el.addEventListener("click", function () {
      open(X + '<img class="modal__img" src="' + el.dataset.photo + '" alt="' +
        (el.dataset.title || "Pr0 Social press photo") + '">' +
        '<p class="modal__cap">' + (el.dataset.title || "") + '</p>');
    });
  });

  /* ---- booking form: composes an email, no backend required ------------- */
  var form = document.getElementById("bookform");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = new FormData(form);
      var lines = [
        "Name: " + (d.get("name") || ""),
        "Email: " + (d.get("email") || ""),
        "Inquiry: " + (d.get("type") || ""),
        "Event date: " + (d.get("date") || "not specified"),
        "Venue / location: " + (d.get("venue") || "not specified"),
        "", (d.get("message") || "")
      ];
      window.location.href = "mailto:" + form.dataset.to +
        "?subject=" + encodeURIComponent((d.get("type") || "Inquiry") + " - " + (d.get("name") || "")) +
        "&body=" + encodeURIComponent(lines.join("\n"));
    });
  }
})();
