(function () {
  "use strict";

  var lang = "en";
  try { lang = (navigator.language || "en").split("-")[0]; } catch (_) {}

  var S = (window.LOCALES && (window.LOCALES[lang] || window.LOCALES.en)) || {};
  var docLang = (window.LOCALES && window.LOCALES[lang]) ? lang : "en";

  var SHIELDS_USERS_URL =
    "https://img.shields.io/chrome-web-store/users/oapdndjfcfdeimbeemphceonhagcnlml.json";
  var usersCount = null;

  function applyStrings() {
    document.documentElement.lang = docLang;

    var nodes = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute("data-i18n");
      if (key === "about_intro_opening") continue;
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
    try { return Number(n).toLocaleString(document.documentElement.lang || undefined, { useGrouping: "always" }); }
    catch (e) { return String(n); }
  }

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
    var txt = usersCount == null
      ? S.about_intro_opening_fallback
      : (S.about_intro_opening || "").replace("{count}", localeNum(usersCount));
    if (txt) el.textContent = txt;
  }

  function fetchUserCount() {
    if (window.ENV && window.ENV.ENABLE_DEBUG) return; // DEBUG: skip fetch → preview fallback copy (L cycles langs)
    fetch(SHIELDS_USERS_URL)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        var n = data && parseShields(data.value);
        if (n) { usersCount = n; renderIntro(); }
      })
      .catch(function () {});
  }

  // Ko-fi min-height tracks the hero in desktop 2-col.
  function syncSupportHeight() {
    var card = document.querySelector(".card");
    var support = document.querySelector(".support");
    if (!card || !support) return;
    var desktop = window.matchMedia("(min-width: 912px)").matches;
    support.style.minHeight = desktop ? Math.max(card.offsetHeight, 497.45) + "px" : "";
  }

  function setupSupportHeight() {
    var card = document.querySelector(".card");
    if (!card) return;
    if (window.ResizeObserver) new ResizeObserver(syncSupportHeight).observe(card);
    try { window.matchMedia("(min-width: 912px)").addEventListener("change", syncSupportHeight); } catch (e) {}
    syncSupportHeight();
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

  // Chrome: CWS, Firefox: AMO
  function applyStoreLink() {
    if (location.protocol !== "moz-extension:") return;
    var el = document.getElementById("rate-link");
    if (el) el.href = "https://addons.mozilla.org/firefox/addon/disable-passkeys/";
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
    renderIntro();
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

    setupSupportHeight();

    if (!inExt) { render(); fetchUserCount(); return; } // standalone preview (no storage)

    // Translate immediately (no flash), then animate once the real count is in.
    applyStrings();
    renderIntro();
    applyColophon();
    applyStoreLink();
    fetchUserCount();
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
    // kofi_embed.js saw the thank-you card → the user actually donated. Remember it
    // (no UI yet; useful later, e.g. to exclude donors from future donation campaigns).
    if (d && d.type === "kofi:donated") {
      try { chrome.storage.sync.set({ donated: true }); } catch (_) {}
      return;
    }
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
