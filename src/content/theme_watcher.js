const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
if (prefersDark) {
  // Mirror of sendTheme in popup/popup.js — keep the THEME_CHANGE message in sync.
  function sendTheme() {
    try {
      chrome.runtime.sendMessage({
        type: 'THEME_CHANGE',
        mode: prefersDark.matches ? 'dark' : 'light'
      }).catch(() => {});
    } catch (_) {}
  }
  sendTheme();
  prefersDark.addEventListener('change', sendTheme);
}