import { loadCfg } from "./config.js";
import { applyCfg } from "./blocker.js";
import { syncVisuals, setTheme, flashIntervention } from "./visuals.js";
import { bumpStats } from "./stats.js";
import { ensureInstalledAt, maybeOpenAboutCampaign } from "./campaigns.js";

chrome.runtime.onInstalled.addListener(async () => {
  await ensureInstalledAt();
  await applyCfg(await loadCfg());
});

chrome.runtime.onStartup.addListener(async () => {
  await applyCfg(await loadCfg());
  await maybeOpenAboutCampaign();
});

// On SW wake, reflect the correct icon/badge without re-registering scripts
(async () => {
  try { await syncVisuals(await loadCfg()); } catch (_) {}
})();

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === 'sync' && changes.cfg) {
    await applyCfg(await loadCfg());
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "THEME_CHANGE") {
    setTheme(msg.mode);
    return;
  }
  if (msg?.type === "intervention") {
    (async () => {
      await flashIntervention();
      await bumpStats().catch(() => {});
    })();
    return true;
  }
});
