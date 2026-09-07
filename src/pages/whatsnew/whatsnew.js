(function () {
  "use strict";

  var P = window.DPPage;

  function render() {
    P.applyStrings();
    P.applyColophon();
    P.reveal();
  }

  // Run now, not on DOMContentLoaded: this script sits at the end of <body>, so every
  // element it touches is already parsed, and the text is revealed before first paint.
  P.setupSupportHeight();
  P.applyStoreLink();

  var inExt = false;
  try { inExt = !!(typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync); }
  catch (e) { inExt = false; }

  if (!inExt) {
    render();
  } else {
    // Reveal only once we know whether to thank the user, or the heading would swap in view.
    chrome.storage.sync.get("donated", function (data) {
      render();
      P.applyDonated(data && data.donated); // last, like about: same order in both pages
    });
    setTimeout(P.reveal, 400); // safety net if the storage read stalls
  }

  P.initKofi();
  P.initLangDebug(render);
  P.initDonatedDebug();
})();
