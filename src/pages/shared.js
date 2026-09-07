// Shared by the extension pages (about, whatsnew): translations, colophon, the
// Ko-fi panel and the debug language switch. Loaded before the page's own script.
window.DPPage = (function () {
  "use strict";

  var lang = "en";
  try { lang = (navigator.language || "en").split("-")[0]; } catch (_) {}

  var S = (window.LOCALES && (window.LOCALES[lang] || window.LOCALES.en)) || {};
  var docLang = (window.LOCALES && window.LOCALES[lang]) ? lang : "en";

  function strings() { return S; }
  function locale() { return docLang; }

  // `skip` lists keys the page fills in itself (e.g. a count interpolated at runtime).
  function applyStrings(skip) {
    document.documentElement.lang = docLang;
    skip = skip || [];

    var nodes = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute("data-i18n");
      if (skip.indexOf(key) > -1) continue;
      var txt = S[key];
      if (txt == null) continue; // missing key → leave the static default in place
      if (nodes[i].tagName === "TITLE") document.title = txt;
      // some strings carry <strong> around UI names; they ship with the extension,
      // so there is no untrusted input to sanitize
      else if (txt.indexOf("<") > -1) nodes[i].innerHTML = txt;
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

  // Turn the support column into a thank-you. Swapping the data-i18n keys (instead of
  // just the text) keeps the debug language switch working on the new copy.
  // `animate` only when it happens live, or the effect would replay on every visit.
  function applyDonated(donated, animate) {
    if (!donated) return;
    var sec = document.querySelector(".support");
    if (!sec) return;
    sec.classList.add("donated");
    if (animate) sec.classList.add("just-donated");
    var pairs = [[sec.querySelector("h2"), "support_donated_heading"],
                 [sec.querySelector("p"), "support_donated_body"]];
    for (var i = 0; i < pairs.length; i++) {
      var el = pairs[i][0], key = pairs[i][1];
      if (!el || !S[key]) continue;
      el.setAttribute("data-i18n", key);
      el.textContent = S[key];
      // The crown gets its own element so it can be animated apart from the words, and
      // both go inside a nowrap wrapper so the line can never break between them.
      var txt = el.textContent;
      var at = txt.indexOf(CROWN);
      if (at > -1) {
        var head = txt.slice(0, at);
        var cut = head.replace(/\s+$/, "").lastIndexOf(" ");
        el.textContent = cut > -1 ? head.slice(0, cut + 1) : "";
        var wrap = document.createElement("span");
        wrap.className = "crown-wrap";
        wrap.textContent = cut > -1 ? head.slice(cut + 1) : head;
        var crown = document.createElement("span");
        crown.className = "crown";
        crown.textContent = txt.slice(at);
        wrap.appendChild(crown);
        el.appendChild(wrap);
      }
    }
  }

  var SUPPORT_KEYS = ["about_support_heading", "about_support_body"];
  var CROWN = "👑";

  function clearDonated() {
    var sec = document.querySelector(".support");
    if (!sec) return;
    sec.classList.remove("donated", "just-donated");
    var els = [sec.querySelector("h2"), sec.querySelector("p")];
    for (var i = 0; i < els.length; i++) {
      if (!els[i]) continue;
      els[i].setAttribute("data-i18n", SUPPORT_KEYS[i]);
      if (S[SUPPORT_KEYS[i]]) els[i].textContent = S[SUPPORT_KEYS[i]];
    }
  }

  // Debug (only with debug.js present): D toggles the donated state, flag included.
  function initDonatedDebug() {
    if (!(window.ENV && window.ENV.ENABLE_DEBUG)) return;
    document.addEventListener("keydown", function (e) {
      if (e.key.toLowerCase() !== "d") return;
      var sec = document.querySelector(".support");
      if (!sec) return;
      var on = sec.classList.contains("donated");
      if (on) {
        clearDonated();
        try { chrome.storage.sync.remove("donated"); } catch (_) {}
      } else {
        sec.classList.remove("just-donated");
        void sec.offsetWidth; // restart the animation instead of reusing the finished one
        applyDonated(true, true);
        try { chrome.storage.sync.set({ donated: true }); } catch (_) {}
      }
      console.log("Debug: donated " + (on ? "off" : "on"));
    });
  }

  // Show the text (hidden by .i18n-pending until now).
  function reveal() {
    document.documentElement.classList.remove("i18n-pending");
  }

  // Size the iframe to the height kofi_embed.js posts; .sized swaps the spinner for the iframe
  function initKofi() {
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
        applyDonated(true, true); // thank them right away, on the page they are looking at
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
  }

  // Debug (only with debug.js present): L cycles languages, re-rendering the page.
  function initLangDebug(render) {
    if (!(window.ENV && window.ENV.ENABLE_DEBUG)) return;
    document.addEventListener("keydown", function (e) {
      var langs = Object.keys(window.LOCALES || {});
      if (e.key.toLowerCase() !== "l" || !langs.length) return;
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
    });
  }

  return {
    strings: strings,
    locale: locale,
    applyStrings: applyStrings,
    localeNum: localeNum,
    setupSupportHeight: setupSupportHeight,
    applyColophon: applyColophon,
    applyStoreLink: applyStoreLink,
    applyDonated: applyDonated,
    initDonatedDebug: initDonatedDebug,
    reveal: reveal,
    initKofi: initKofi,
    initLangDebug: initLangDebug
  };
})();
