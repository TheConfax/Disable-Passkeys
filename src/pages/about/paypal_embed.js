/* Runs inside the PayPal iframe(s) Ko-fi nests in our About page. Cross-origin from
   Ko-fi, so kofi_embed.js can't reach it. Jobs: recolor PayPal's legal text for dark
   mode; report the real content height up to the Ko-fi frame so it can shrink the zoid
   button container (which PayPal pins ~49px taller than its content → blank gap); and
   show a spinner while PayPal lazy-loads the inline card form. Embed-only. */
(function () {
  "use strict";
  // Only when ultimately embedded inside our own About page (ancestors: ko-fi.com,
  // then our extension). Never on real paypal.com or third-party embeds.
  var me = (chrome.runtime && chrome.runtime.getURL("").replace(/\/$/, "")) || "";
  var ancestors = location.ancestorOrigins;
  var nested = false;
  for (var i = 0; ancestors && i < ancestors.length; i++) {
    if (ancestors[i] === me) { nested = true; break; }
  }
  if (!me || !nested) return;

  var style = document.createElement("style");
  style.textContent =
    // Let the doc shrink to its content so body height reflects the real height.
    "html.height-100{height:auto!important;min-height:0!important}" +
    // PayPal's default legal-text color is rgb(44, 46, 47) (#2c2e2f); spans inherit.
    // Dark mode only — leave PayPal's native colors in light mode.
    "@media (prefers-color-scheme: dark){" +
    "[style*='color: rgb(44, 46, 47)']{color:#8f94a4!important}" +
    // The 'Cancel and go back' close (X) inherits a dark currentColor — match it to the
    // same muted tone we use for PayPal's legal/billing text.
    "button[aria-label='Cancel and go back']{color:#8f94a4!important}}";
  (document.head || document.documentElement).appendChild(style);

  // Only the buttons frame (direct child of Ko-fi) reports height — not the deeper
  // card-fields PayPal frame, whose parent is PayPal itself.
  var parentOrigin = ancestors && ancestors[0];
  if (!parentOrigin || parentOrigin.indexOf("ko-fi") === -1) return;

  var last = 0;
  function reportHeight() {
    var b = document.body;
    if (!b) return;
    var h = Math.ceil(b.getBoundingClientRect().height);
    if (h > 40 && h !== last) {
      last = h;
      try { window.parent.postMessage({ type: "kofi:ppHeight", height: h }, "*"); } catch (e) {}
    }
  }

  reportHeight();
  document.addEventListener("DOMContentLoaded", reportHeight);
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(reportHeight);
    ro.observe(document.documentElement);
    if (document.body) ro.observe(document.body);
  }
  setTimeout(reportHeight, 400);
  setTimeout(reportHeight, 1500);

  // PayPal gives no feedback while it lazy-loads the inline card form (~seconds).
  // Overlay a spinner from the card-button click until the form is laid out.
  // pointer-events:none so it's purely visual and never interferes with PayPal.
  var spinner;
  function cardFieldsHeight() {
    var cf = document.getElementById("card-fields-container");
    return cf ? cf.getBoundingClientRect().height : 0;
  }
  function hideSpinner() {
    if (spinner) { spinner.remove(); spinner = null; }
  }
  function showSpinner() {
    if (spinner) return;
    spinner = document.createElement("div");
    spinner.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;" +
      "justify-content:center;pointer-events:none;background:rgba(0,0,0,0.08)";
    var dot = document.createElement("div");
    dot.style.cssText =
      "width:30px;height:30px;border-radius:50%;border:3px solid rgba(127,127,127,0.3);" +
      "border-top-color:#2c8eff;animation:dpk-ppspin .8s linear infinite";
    var st = document.createElement("style");
    st.textContent = "@keyframes dpk-ppspin{to{transform:rotate(360deg)}}";
    spinner.appendChild(st);
    spinner.appendChild(dot);
    (document.body || document.documentElement).appendChild(spinner);
  }

  var spinTimer;
  document.addEventListener("click", function (e) {
    if (!e.target || !e.target.closest) return;
    if (!e.target.closest(".paypal-button-number-1")) return;  // card button only
    if (cardFieldsHeight() > 8) return;                        // already taking over
    showSpinner();
    var tries = 0;
    clearInterval(spinTimer);
    spinTimer = setInterval(function () {
      // Hand off the moment PayPal's own UI (its spinner) appears, so the two don't
      // overlap; ~9s timeout as a safety net.
      if (cardFieldsHeight() > 8 || ++tries > 60) {
        clearInterval(spinTimer);
        hideSpinner();
      }
    }, 80);
  }, true);

  // The Ko-fi frame signals when a form validation error blocks the flow (the card
  // form will never load) — kill the spinner instead of letting it spin to timeout.
  window.addEventListener("message", function (e) {
    if (e.data && e.data.type === "kofi:hideSpinner") {
      clearInterval(spinTimer);
      hideSpinner();
    }
  });
})();
