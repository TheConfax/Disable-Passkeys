/* Runs inside the embedded Ko-fi iframe — does three things Ko-fi won't do for an
   embedder: match the page's dark/light theme, report the panel height so the parent
   can size the iframe, and keep the cropped footer out of the tab order (accessibility).
   Embed-only. */
(function () {
  "use strict";
  // Only when embedded inside our own About page — not top-level ko-fi.com, and not
  // a ko-fi widget embedded on some third-party site.
  var me = (chrome.runtime && chrome.runtime.getURL("").replace(/\/$/, "")) || "";
  var parent = location.ancestorOrigins && location.ancestorOrigins[0];
  if (!me || parent !== me) return;

  var mq = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");

  function applyTheme() {
    var dark = !!(mq && mq.matches);
    var el = document.documentElement;
    el.setAttribute("data-theme", dark ? "dark" : "light");
    el.classList.toggle("dark", dark);
  }

  // Report the panel's bottom so the parent crops the iframe there (cuts the
  // "Powered by Ko-fi" credit + the white footer below).
  function reportHeight() {
    var panel = document.getElementById("payment-panel");
    // -2px into the panel so the seam doesn't catch the white line just below it.
    var h = panel
      ? Math.floor(panel.getBoundingClientRect().bottom + window.scrollY) - 2
      : Math.ceil(document.documentElement.scrollHeight); // fallback before it exists
    if (h > 0) {
      try { window.parent.postMessage({ type: "kofi:height", height: h }, "*"); } catch (e) {}
    }
  }

  // Accessibility: drop everything below the panel from the tab order + a11y tree.
  function neutralizeBelowPanel() {
    var panel = document.getElementById("payment-panel");
    if (!panel) return;
    var cut = panel.getBoundingClientRect().bottom - 1;
    var els = document.querySelectorAll("a, button, input, select, textarea, [tabindex], iframe, area, [contenteditable]");
    for (var i = 0; i < els.length; i++) {
      if (panel.contains(els[i])) continue;
      if (els[i].getBoundingClientRect().top >= cut) {
        els[i].setAttribute("tabindex", "-1");
        els[i].setAttribute("aria-hidden", "true");
      }
    }
  }

  function onLayout() { reportHeight(); neutralizeBelowPanel(); }

  // No scrollbar; dark body hides Ko-fi's white corner hairline; flat panel radius
  // so only the wrapper rounds it.
  function injectFrameStyle() {
    var s = document.createElement("style");
    s.textContent =
      "html,body{overflow:clip!important}" +
      "html.dark body{background:rgb(25,32,37)!important}" +
      "#payment-panel{border-radius:0!important}";
    (document.head || document.documentElement).appendChild(s);
  }

  applyTheme();          // documentElement exists at document_start
  injectFrameStyle();

  document.addEventListener("DOMContentLoaded", function () {
    applyTheme();        // re-apply if Ko-fi resets it on hydration
    onLayout();
    // Track later layout shifts.
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(onLayout);
      ro.observe(document.documentElement);
      if (document.body) ro.observe(document.body);
    }
    setTimeout(onLayout, 300);
    setTimeout(onLayout, 1200);
  });

  if (mq) {
    var onChange = function () { applyTheme(); };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }
})();
