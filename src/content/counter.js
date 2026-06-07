window.addEventListener("disable-passkeys-intervention", () => {
  try {
    chrome.runtime.sendMessage({ type: "intervention" });
  } catch (_) {
  }
});
