(function () {
  "use strict";

  var P = window.DPPage;

  var SHIELDS_USERS_URL =
    "https://img.shields.io/chrome-web-store/users/oapdndjfcfdeimbeemphceonhagcnlml.json";
  var usersCount = null;

  function parseShields(v) {
    if (v == null) return null;
    var s = String(v).trim().replaceAll(",", "");
    var m = s.match(/^([\d.]+)\s*([kMGTPEZY]?)/i);
    if (!m) return null;
    var n = parseFloat(m[1]);
    if (isNaN(n)) return null;
    var i = m[2] ? "kmgtpezy".indexOf(m[2].toLowerCase()) : -1;
    return Math.round(n * Math.pow(1000, i + 1));
  }

  function renderIntro() {
    var el = document.querySelector('.intro[data-i18n="about_intro_opening"]');
    if (!el) return;
    var S = P.strings();
    var txt = usersCount == null
      ? S.about_intro_opening_fallback
      : (S.about_intro_opening || "").replace("{count}", P.localeNum(usersCount));
    if (txt) el.textContent = txt;
  }

  function fetchUserCount() {
    fetch(SHIELDS_USERS_URL)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        var n = data && parseShields(data.value);
        if (n) { usersCount = n; renderIntro(); }
      })
      .catch(function () {});
  }

  function animateCount() {
    var el = document.getElementById("passkey-count");
    if (!el) return;
    var target = parseInt(el.dataset.count, 10) || 0;

    el.textContent = P.localeNum(target);   // paint final value first so a frozen clock can't strand it at 0

    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || target <= 0) return;

    requestAnimationFrame(function (t1) {
      requestAnimationFrame(function (t2) {
        if (!(t2 > t1)) return; // clock not advancing (background tab) — keep final number
        var dur = Math.min(1600, 600 + target * 12);
        var start = t2;
        el.textContent = P.localeNum(0);
        (function frame(ts) {
          var p = Math.min(1, (ts - start) / dur);
          var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
          el.textContent = P.localeNum(Math.round(target * eased));
          if (p < 1) requestAnimationFrame(frame);
          else el.textContent = P.localeNum(parseInt(el.dataset.count, 10) || 0);
        })(t2);
      });
    });
  }

  function getCount() {
    var el = document.getElementById("passkey-count");
    if (!el) return 0;
    var n = parseInt(el.dataset.count, 10);
    return isNaN(n) ? 0 : n;
  }

  // Count-dependent copy: sing/plural label + caption tier (0, 1, 2–9, 10+).
  function applyCountCopy(count) {
    var S = P.strings();
    var labelEl = document.querySelector(".stat-label");
    var capEl = document.querySelector(".stat-caption");
    if (labelEl) {
      var lkey = count === 1 ? "about_stat_label_1" : "about_stat_label";
      if (S[lkey]) labelEl.textContent = S[lkey];
    }
    if (capEl) {
      var ckey = count === 0 ? "about_stat_caption_0"
               : count === 1 ? "about_stat_caption_1"
               : count <= 9 ? "about_stat_caption_few"
               : "about_stat_caption_many";
      if (S[ckey]) capEl.textContent = S[ckey];
    }
  }

  // about_intro_opening carries the user count, filled in by renderIntro()
  function applyStrings() {
    P.applyStrings(["about_intro_opening"]);
  }

  function render() {
    applyStrings();
    renderIntro();
    P.applyColophon();
    applyCountCopy(getCount());
    animateCount();
    P.reveal();
  }

  // Public hook so the extension can re-render after injecting the real count.
  window.DisablePasskeys = { render: render };

  // Real count from storage (`stats`); fresh install reads 0.
  function setRealCount(data, el) {
    if (!el) return;
    var n = (data && typeof data.stats === "number") ? data.stats : 0;
    el.dataset.count = n;
  }

  function boot() {
    var inExt = false;
    try { inExt = !!(typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync); }
    catch (e) { inExt = false; }

    P.setupSupportHeight();

    if (!inExt) { render(); fetchUserCount(); return; } // standalone preview (no storage)

    // Translate immediately (no flash), then animate once the real count is in.
    applyStrings();
    renderIntro();
    P.applyColophon();
    P.applyStoreLink();
    fetchUserCount();
    // Fill the stat with the placeholder count (0) synchronously so its full height is
    // reserved at first paint. The async storage read below only swaps values, instead
    // of growing the card after paint (which caused the layout shift / CLS).
    applyCountCopy(getCount());
    var c0 = document.getElementById("passkey-count");
    if (c0) c0.textContent = P.localeNum(getCount());
    chrome.storage.sync.get("stats", function (data) {
      setRealCount(data, document.getElementById("passkey-count"));
      applyCountCopy(getCount());
      animateCount();
      P.reveal();   // reveal with the real count, so the count-tier copy doesn't swap in view
    });
    // Safety net: never leave the text hidden if the storage read stalls/fails.
    setTimeout(P.reveal, 400);

    // Live update if the count changes while the page is open
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area !== "sync" || !changes.stats) return;
      var el = document.getElementById("passkey-count");
      if (!el) return;
      var n = typeof changes.stats.newValue === "number" ? changes.stats.newValue : 0;
      el.dataset.count = n;
      el.textContent = P.localeNum(n);
      applyCountCopy(n);
    });
  }

  // Run now, not on DOMContentLoaded: this script is at the end of <body>, so every
  // element it touches is already parsed. Deferring to DOMContentLoaded fires boot()
  // AFTER first paint, so the stat fills late and the card grows → layout shift (CLS).
  boot();

  P.initKofi();
  P.initLangDebug(render);

  // Debug (only with debug.js present): +/- preview the count.
  if (window.ENV && window.ENV.ENABLE_DEBUG) {
    document.addEventListener("keydown", function (e) {
      var el = document.getElementById("passkey-count");
      if (!el) return;
      if (e.key === "+" || e.key === "Add") {
        el.dataset.count = (parseInt(el.dataset.count, 10) || 0) + 1;
        render();
      } else if (e.key === "-" || e.key === "Subtract") {
        el.dataset.count = Math.max(0, (parseInt(el.dataset.count, 10) || 0) - 1);
        render();
      }
    });
  }
})();
