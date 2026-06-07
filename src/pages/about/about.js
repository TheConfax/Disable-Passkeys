(function () {
  "use strict";

  var lang = "en";
  try { lang = (navigator.language || "en").split("-")[0]; } catch (_) {}

  var S = (window.LOCALES && (window.LOCALES[lang] || window.LOCALES.en)) || {};
  var docLang = (window.LOCALES && window.LOCALES[lang]) ? lang : "en";

  function applyStrings() {
    document.documentElement.lang = docLang;

    var nodes = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute("data-i18n");
      var txt = S[key];
      if (txt == null) continue; // missing key → leave the element empty
      if (nodes[i].tagName === "TITLE") document.title = txt;
      else nodes[i].textContent = txt;
    }

    var linksNav = document.querySelector(".links");
    if (linksNav && S.about_links_label) linksNav.setAttribute("aria-label", S.about_links_label);
    var stat = document.querySelector(".stat");
    if (stat && S.about_stat_group) stat.setAttribute("aria-label", S.about_stat_group);
  }

  function localeNum(n) {
    try { return Number(n).toLocaleString(document.documentElement.lang || undefined); }
    catch (e) { return String(n); }
  }

  function getVersion() {
    try {
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getManifest) {
        return chrome.runtime.getManifest().version;
      }
    } catch (e) { /* not running inside the extension */ }
    return null;
  }

  // Colophon: "Name vVersion · Copyright" (version omitted outside the extension).
  function applyColophon() {
    var el = document.getElementById("colophon");
    if (!el) return;
    var G = window.GLOBAL || {};
    var v = getVersion();
    var nameVer = G.title + (v ? " v" + v : "");
    el.textContent = [nameVer, G.copyright].filter(Boolean).join(" · ");
  }

  function animateCount() {
    var el = document.getElementById("passkey-count");
    if (!el) return;
    var target = parseInt(el.dataset.count, 10) || 0;

    el.textContent = localeNum(target);   // paint final value first so a frozen clock can't strand it at 0

    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || target <= 0) return;

    requestAnimationFrame(function (t1) {
      requestAnimationFrame(function (t2) {
        if (!(t2 > t1)) return; // clock not advancing (background tab) — keep final number
        var dur = Math.min(1600, 600 + target * 12);
        var start = t2;
        el.textContent = localeNum(0);
        (function frame(ts) {
          var p = Math.min(1, (ts - start) / dur);
          var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
          el.textContent = localeNum(Math.round(target * eased));
          if (p < 1) requestAnimationFrame(frame);
          else el.textContent = localeNum(target);
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

  function render() {
    applyStrings();
    applyColophon();
    applyCountCopy(getCount());
    animateCount();
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

    if (!inExt) { render(); return; } // standalone preview (no storage)

    // Translate immediately (no flash), then animate once the real count is in.
    applyStrings();
    applyColophon();
    chrome.storage.sync.get("stats", function (data) {
      setRealCount(data, document.getElementById("passkey-count"));
      applyCountCopy(getCount());
      animateCount();
    });

    // Live update if the count changes while the page is open
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area !== "sync" || !changes.stats) return;
      var el = document.getElementById("passkey-count");
      if (!el) return;
      var n = typeof changes.stats.newValue === "number" ? changes.stats.newValue : 0;
      el.dataset.count = n;
      el.textContent = localeNum(n);
      applyCountCopy(n);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  // Size the Ko-fi iframe to the height kofi_embed.js measures inside the frame and
  // posts here (iframe starts at height 0 in CSS, so no flash).
  var kofiSized = false;
  window.addEventListener("message", function (e) {
    if (e.origin !== "https://ko-fi.com") return;
    var d = e.data;
    if (!d || d.type !== "kofi:height" || typeof d.height !== "number") return;
    var f = document.getElementById("kofiframe");
    if (f && d.height > 0) { f.style.height = d.height + "px"; kofiSized = true; }
  });

  // Fallback height if the in-frame script never reports (e.g. standalone preview).
  setTimeout(function () {
    if (kofiSized) return;
    var f = document.getElementById("kofiframe");
    if (f) f.style.height = "600px";
  }, 2500);

  // Debug (only with debug.js present): L cycles languages, +/- preview the count.
  if (window.ENV && window.ENV.ENABLE_DEBUG) {
    document.addEventListener("keydown", function (e) {
      var langs = Object.keys(window.LOCALES || {});
      var el = document.getElementById("passkey-count");

      if (e.key.toLowerCase() === "l" && langs.length) {
        var next = langs[(langs.indexOf(docLang) + 1) % langs.length];
        docLang = next;
        S = window.LOCALES[next] || {};
        render();
        console.log("Debug: switched to " + next);
      } else if ((e.key === "+" || e.key === "Add") && el) {
        el.dataset.count = (parseInt(el.dataset.count, 10) || 0) + 1;
        render();
      } else if ((e.key === "-" || e.key === "Subtract") && el) {
        el.dataset.count = Math.max(0, (parseInt(el.dataset.count, 10) || 0) - 1);
        render();
      }
    });
  }
})();
