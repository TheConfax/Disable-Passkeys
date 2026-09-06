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
  render();

  P.initKofi();
  P.initLangDebug(render);
})();
