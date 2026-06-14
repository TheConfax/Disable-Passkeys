/* Runs inside the embedded Ko-fi iframe, doing what Ko-fi won't do for an embedder:
   - match the page's dark/light theme and blend the widget's surfaces into our card;
   - report the payment-panel / thank-you-card height (and top offset) so the parent
     crops the iframe, hiding the long sign-up funnel and keeping it out of the tab order;
   - localize the widget UI to the page language (strings in i18n/kofi-strings.js).
   Lots of it fights Ko-fi's own DOM by class/selector, so it's inherently fragile —
   the comments explain the "why" of each hack. Embed-only. */
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
    // After a donation, #payment-panel is replaced by the #thanksModal success card —
    // crop to whichever is present so the long sign-up funnel below it stays cropped out
    // (else we'd fall back to the full-page scrollHeight and reveal the whole funnel).
    var panel = document.getElementById("payment-panel") || document.getElementById("thanksModal");
    var top = 0, h;
    if (panel) {
      var rect = panel.getBoundingClientRect();
      // -2px into the panel so the seam doesn't catch the white line just below it.
      h = Math.floor(rect.bottom + window.scrollY) - 2;
      // The thank-you card sits below an empty cover strip; report its top so the parent
      // crops that gap off too. The payment panel starts at 0, so top stays 0 there.
      if (panel.id === "thanksModal") top = Math.max(0, Math.floor(rect.top + window.scrollY));
    } else {
      h = Math.ceil(document.documentElement.scrollHeight); // fallback before it exists
    }
    if (h > 0) {
      try { window.parent.postMessage({ type: "kofi:height", height: h, top: top }, "*"); } catch (e) {}
    }
  }

  // Accessibility: drop everything below the panel from the tab order + a11y tree.
  function neutralizeBelowPanel() {
    var panel = document.getElementById("payment-panel") || document.getElementById("thanksModal");
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

  // Fire once when the post-donation thank-you card appears, so the parent can remember
  // the user has actually donated (stored as a `donated` flag — no UI for it yet).
  // Guarded so plain navigation can't set it: the success state is specifically
  // "#payment-panel gone (errors keep it) AND #thanksModal actually visible" — not just
  // a hidden Vue template sitting in the DOM.
  var donatedFired = false;
  function reportDonated() {
    if (donatedFired) return;
    if (document.getElementById("payment-panel")) return;     // still on the form / error state
    var modal = document.getElementById("thanksModal");
    if (!modal) return;
    var r = modal.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;                  // hidden/empty template, not a real thank-you
    donatedFired = true;
    try { window.parent.postMessage({ type: "kofi:donated" }, "*"); } catch (e) {}
  }

  function onLayout() { reportHeight(); neutralizeBelowPanel(); reportDonated(); }

  // No scrollbar; dark body matches the page's --card (#171a21) so the widget blends
  // into the card and hides Ko-fi's white corner hairline; flat panel radius so only
  // the wrapper rounds it.
  var frameStyle;
  function injectFrameStyle() {
    frameStyle = document.createElement("style");
    frameStyle.textContent =
      "html,body{overflow:clip!important}" +
      // body = the page's --card colour in both themes (#171a21 dark / #fff light).
      "html.dark body{background:#171a21!important}" +
      "html:not(.dark) body{background:#fff!important}" +
      // the panel paints its own opaque surface; make it transparent (both themes) so the
      // body colour shows through and the widget blends into the card.
      "#payment-panel,.ds-support-panel-wrapper{background:transparent!important}" +
      // After a donation the thank-you card has its own surfaces (Ko-fi's stone/beige in
      // light, a lighter slate in dark) — blend them into our card too. Keep the animated
      // cover banner, the message box and the buttons as their own distinct surfaces.
      ".body-content,.thanks-box,.thankyou-container,.kfds-srf-sidebar{background:transparent!important}" +
      // Drop the post-donation "Share this moment" panel, the "Send a message" CTA and the
      // divider above it — they open extra modals that fight the embed. #thanksModal then
      // shrinks, so reportHeight crops to the clean thank-you (message + privacy note) on its own.
      "div:has(> .small-share-panel),.coffeeshop-cta-buttons,.thanks-box hr{display:none!important}" +
      // Ko-fi's Donate button carries a coloured box-shadow that reads as a glow on the
      // blended dark card — drop it in dark.
      "html.dark #payment-panel button,html.dark .ds-support-panel-wrapper button{box-shadow:none!important}" +
      // Replace Ko-fi's jittery hover animation with our buttons' clean 1px lift.
      "#payment-panel button,.ds-support-panel-wrapper button{animation:none!important;transition:transform .15s ease!important}" +
      "#payment-panel button:hover,.ds-support-panel-wrapper button:hover{transform:translateY(-1px)!important}" +
      "#widget-cover{display:none!important}" +  // drop the cover banner above the panel
      ".kfds-lyt-width-100.kfds-btm-mrgn-16[style*='height: 12px']{display:none!important}" +  // drop the 12px spacer
      ".kfds-lyt-between-top.kfds-btm-mrgn-16:has(> .text-limit-one-line){display:none!important}" +  // redundant "Support <creator>" header (we have our own)
      "div:has(> .no-fee-nudge){display:none!important}" +  // "Payments go directly to <creator>" nudge
      ".ds-support-panel-wrapper{padding-bottom:19px!important}" +  // tighten the panel's bottom padding
      // SweetAlert adds a scrollbar-compensating padding-right on open, but overflow:clip
      // means there's no scrollbar → it just shoves the content left. Kill it.
      "body.swal2-shown{padding-right:0!important;margin-right:0!important}" +
      "#payment-panel{border-radius:0!important}";
    (document.head || document.documentElement).appendChild(frameStyle);
  }

  // --- Localize Ko-fi's main-panel UI strings to the page language. Strings live in
  //     i18n/kofi-strings.js (window.KOFI_STRINGS), loaded alongside this content script.
  //     Dictionary match on text (not fragile selectors) + a MutationObserver so it
  //     survives Ko-fi re-rendering and toggling fields. A language not in KOFI_STRINGS
  //     is a no-op (Ko-fi's English stays). {x} in a key is a variable, e.g. an amount. ---
  var uiLang = "en";
  try {
    // ?dpklang=xx on the widget URL overrides the browser language (debug language switch).
    uiLang = new URLSearchParams(location.search).get("dpklang") ||
             (navigator.language || "en").split("-")[0].toLowerCase();
  } catch (e) {}

  var strings = (window.KOFI_STRINGS && window.KOFI_STRINGS[uiLang]) || null;
  var exact = {};      // plain "English" -> "translation"
  var patterns = [];   // keys containing {x}: { re, out } (built once from the dictionary)
  for (var key in (strings || {})) {
    if (!Object.prototype.hasOwnProperty.call(strings, key)) continue;
    if (key.indexOf("{x}") === -1) { exact[key] = strings[key]; continue; }
    var esc = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\{x\\\}/g, "(.+)");
    patterns.push({ re: new RegExp("^" + esc + "$"), out: strings[key] });
  }

  // Translate one English string, or null if it's not a known key. Returning null for
  // anything already translated is what keeps the whole pass idempotent (no re-run loop).
  function trStr(s) {
    if (!s || !strings) return null;
    var k = s.replace(/\s+/g, " ").trim();  // collapse newlines/runs so split fragments match
    if (!k) return null;
    if (Object.prototype.hasOwnProperty.call(exact, k)) return exact[k];
    for (var i = 0; i < patterns.length; i++) {
      var m = k.match(patterns[i].re);
      if (m) return patterns[i].out.replace(/\{x\}/g, m[1]);
    }
    return null;
  }

  function trText(node) {
    var v = node.nodeValue;
    if (!v) return;
    var t = trStr(v);
    if (t == null) return;
    // Collapse the surrounding whitespace to a single space: Ko-fi's pretty-printed
    // newlines/indentation between fragments would otherwise force odd line breaks.
    var next = (/^\s/.test(v) ? " " : "") + t + (/\s$/.test(v) ? " " : "");
    if (next !== v) node.nodeValue = next;
  }

  function trAttr(el, name) {
    if (!el.getAttribute) return;
    var v = el.getAttribute(name);
    if (!v) return;
    var t = trStr(v);
    if (t != null && t !== v) el.setAttribute(name, t);
  }

  function translate(root) {
    if (!root) return;
    if (root.nodeType === 3) { trText(root); return; }   // a text node
    if (root.nodeType !== 1) return;                       // only elements past here
    trAttr(root, "placeholder"); trAttr(root, "aria-label");
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var n; while ((n = w.nextNode())) trText(n);
    var els = root.querySelectorAll("[placeholder],[aria-label]");
    for (var i = 0; i < els.length; i++) { trAttr(els[i], "placeholder"); trAttr(els[i], "aria-label"); }
  }

  function startLocalize() {
    if (!strings) return;  // unsupported language -> keep Ko-fi's English
    translate(document.body || document.documentElement);
    if (!window.MutationObserver) return;
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === "childList") {
          for (var j = 0; j < m.addedNodes.length; j++) translate(m.addedNodes[j]);
        } else {
          translate(m.target);  // characterData / attribute change in place
        }
      }
    }).observe(document.documentElement, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ["placeholder", "aria-label"]
    });
  }

  // Parent fell back to a fixed-height crop: restore scrolling so the cropped part stays reachable
  window.addEventListener("message", function (e) {
    if (e.source !== window.parent || !e.data || e.data.type !== "kofi:fallback") return;
    if (frameStyle) {
      frameStyle.textContent = frameStyle.textContent.replace("html,body{overflow:clip!important}", "");
    }
  });

  // The nested PayPal buttons frame reports its real content height; PayPal pins the
  // zoid container ~49px taller (blank gap), so override it (!important beats the inline
  // height) and re-crop the outer iframe.
  var ppStyle;
  window.addEventListener("message", function (e) {
    var d = e.data;
    if (!d || d.type !== "kofi:ppHeight" || typeof d.height !== "number") return;
    var h = Math.max(60, Math.min(800, Math.round(d.height)));
    if (!ppStyle) {
      ppStyle = document.createElement("style");
      (document.head || document.documentElement).appendChild(ppStyle);
    }
    ppStyle.textContent =
      'div[id^="zoid-paypal-buttons-"]{height:' + h + 'px!important;min-height:0!important}';
    onLayout();
  });

  applyTheme();          // documentElement exists at document_start
  injectFrameStyle();
  startLocalize();

  // A form validation error (e.g. invalid email) blocks the payment flow, so the PayPal
  // card form never loads — tell the PayPal frame to drop its card-button spinner.
  function hidePpSpinner() {
    var fr = document.querySelectorAll("iframe");
    for (var i = 0; i < fr.length; i++) {
      try { fr[i].contentWindow.postMessage({ type: "kofi:hideSpinner" }, "*"); } catch (e) {}
    }
  }
  if (window.MutationObserver) {
    new MutationObserver(function () {
      var errs = document.querySelectorAll(".field-validation-error");
      for (var i = 0; i < errs.length; i++) {
        if (errs[i].offsetParent !== null && errs[i].textContent.trim()) { hidePpSpinner(); return; }
      }
    }).observe(document.documentElement, {
      subtree: true, childList: true, attributes: true, attributeFilter: ["style", "class"]
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    applyTheme();        // re-apply if Ko-fi resets it on hydration
    translate(document.body || document.documentElement);  // sweep once content is in
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
