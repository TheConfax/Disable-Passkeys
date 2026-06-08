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

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg?.type === "THEME_CHANGE") {
      await setTheme(msg.mode);
      return;
    }

    if (msg?.type === "intervention") {
      await bumpStats();
      await flashIntervention();
      return;
    }

    if (msg?.type === "set_cfg") {
      const cfg = {
        blockGet: !!msg.cfg?.blockGet,
        blockCreate: !!msg.cfg?.blockCreate,
        mode: msg.cfg?.mode || 'allow',
        domains: Array.isArray(msg.cfg?.domains) ? msg.cfg.domains : []
      };
      await chrome.storage.sync.set({ cfg });
      sendResponse({ ok: true });
    }
  })();
  return true;
});
