const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
if (prefersDark) {
  function sendTheme() {
    chrome.runtime.sendMessage({
      type: 'THEME_CHANGE',
      mode: prefersDark.matches ? 'dark' : 'light'
    });
  }
  sendTheme();
  prefersDark.addEventListener('change', sendTheme);
}