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
          else el.textContent = localeNum(parseInt(el.dataset.count, 10) || 0);
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

  // Show the text (hidden by .i18n-pending until now) once it's translated + counted.
  function reveal() {
    document.documentElement.classList.remove("i18n-pending");
  }

  function render() {
    applyStrings();
    applyColophon();
    applyCountCopy(getCount());
    animateCount();
    reveal();
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
    // Fill the stat with the placeholder count (0) synchronously so its full height is
    // reserved at first paint. The async storage read below only swaps values, instead
    // of growing the card after paint (which caused the layout shift / CLS).
    applyCountCopy(getCount());
    var c0 = document.getElementById("passkey-count");
    if (c0) c0.textContent = localeNum(getCount());
    chrome.storage.sync.get("stats", function (data) {
      setRealCount(data, document.getElementById("passkey-count"));
      applyCountCopy(getCount());
      animateCount();
      reveal();   // reveal with the real count, so the count-tier copy doesn't swap in view
    });
    // Safety net: never leave the text hidden if the storage read stalls/fails.
    setTimeout(reveal, 400);

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

  // Run now, not on DOMContentLoaded: this script is at the end of <body>, so every
  // element it touches is already parsed. Deferring to DOMContentLoaded fires boot()
  // AFTER first paint, so the stat fills late and the card grows → layout shift (CLS).
  boot();

  // Size the iframe to the height kofi_embed.js posts; .sized swaps the spinner for the iframe
  var kofiSized = false;
  function kofiReveal(f) {
    if (f.parentElement) f.parentElement.classList.add("sized");
  }
  window.addEventListener("message", function (e) {
    if (e.origin !== "https://ko-fi.com") return;
    var d = e.data;
    if (!d || d.type !== "kofi:height" || typeof d.height !== "number") return;
    var f = document.getElementById("kofiframe");
    if (f && d.height > 0) {
      f.style.height = d.height + "px";
      // Pull the iframe up by the reported top offset; .kofi-embed has overflow:hidden,
      // so this crops the empty cover strip above the post-donation thank-you card.
      f.style.marginTop = d.top ? ("-" + d.top + "px") : "0";
      kofiSized = true;
      kofiReveal(f);
    }
  });

  // No height report 3s after iframe load: fixed-height crop + ask the frame to restore
  // scrolling. 518px = the payment panel (PayPal + Credit/Debit Card buttons), the
  // taller state Ko-fi lands on, so the crop doesn't hide the pay buttons.
  var kofiFrame = document.getElementById("kofiframe");
  if (kofiFrame) kofiFrame.addEventListener("load", function () {
    setTimeout(function () {
      if (kofiSized) return;
      kofiFrame.style.height = "518px";
      try { kofiFrame.contentWindow.postMessage({ type: "kofi:fallback" }, "https://ko-fi.com"); } catch (e) {}
      kofiReveal(kofiFrame);
    }, 3000);
  });

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
        // Ko-fi widget strings live in a separate frame/context, so reload the iframe
        // with a ?dpklang override to switch its language too (debug only).
        var kf = document.getElementById("kofiframe");
        if (kf) {
          var base = kf.src.replace(/[?&]dpklang=[^&]*/, "");
          kf.src = base + (base.indexOf("?") > -1 ? "&" : "?") + "dpklang=" + next;
        }
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
