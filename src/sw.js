const CS_ID = "disable-passkeys";
const DEFAULT_CFG = { blockGet: true, blockCreate: true, mode: 'allow', domains: [] };

function pickPatchFile({ blockGet, blockCreate }) {
  if (blockGet && blockCreate) return "patch_both.js";
  if (blockGet)               return "patch_get.js";
  if (blockCreate)            return "patch_create.js";
  return null; // OFF
}

function getMatchPatterns(domains) {
  if (!Array.isArray(domains) || domains.length === 0) return [];
  return domains.map(d => {
    if (!d) return null;
    // We assume 'd' is already a valid, normalized hostname from popup.js
    // Special case: localhost
    if (d === "localhost") return "*://localhost/*";

    // Special case: IPv6 (contains colon and brackets)
    if (d.includes(":") && d.startsWith("[") && d.endsWith("]")) {
      return `*://${d}/*`;
    }

    // Check if it's an IPv4 address (loose cause we validated earlier)
    // If it looks like an IP, treat as IP (no wildcard prefix)
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(d)) {
      return `*://${d}/*`;
    }
      
    // Standard Domain -> Add wildcard subdomain support
    return `*://*.${d}/*`;
  }).filter(Boolean);
}

function isEffectivelyOff(cfg) {
  if (!cfg.blockGet && !cfg.blockCreate) {
    return true;
  } else {
    if (cfg.mode === 'block') {
      return !Array.isArray(cfg.domains) || cfg.domains.length === 0;
    }
    return false;
  }
}

async function applyCfg(cfg) {
  // Unregister previous (ignore if not present)
  try {
    await chrome.scripting.unregisterContentScripts({ ids: [CS_ID] });
  } catch (_) {}

  // If effectively OFF, just sync visuals and exit early without registering content scripts.
  if (isEffectivelyOff(cfg)) {
    await syncVisuals(cfg);
    return;
  }

  const file = pickPatchFile(cfg);
  const patterns = getMatchPatterns(cfg.domains);

  let matches = ["<all_urls>"];
  let excludeMatches = [];

  if (cfg.mode === 'block') {
    // Block Only: Only run on these domains
    matches = patterns;
  } else {
    // Allow Only (default): Run everywhere EXCEPT these domains
    if (patterns.length > 0) {
      excludeMatches = patterns;
    }
  }

  await chrome.scripting.registerContentScripts([{
    id: CS_ID,
    matches: matches,
    excludeMatches: excludeMatches.length > 0 ? excludeMatches : undefined,
    js: [file],
    runAt: "document_start",
    allFrames: true,
    world: "MAIN",
    matchOriginAsFallback: true
  }]);

  // Ensure icon/badge are correct after registering content scripts
  await syncVisuals(cfg);
}

async function loadCfg() {
  const { cfg } = await chrome.storage.sync.get({ cfg: DEFAULT_CFG });
  return {
    blockGet: !!cfg?.blockGet,
    blockCreate: !!cfg?.blockCreate,
    mode: cfg?.mode || 'allow',
    domains: Array.isArray(cfg?.domains) ? cfg.domains : []
  };
}

// Set action icon according to current global state (isOff + themeSuffix)
async function refreshActionIcon() {
  const suffix = globalThis.themeSuffix || '';
  const iconPath = globalThis.isOff ? `img/icon32_off${suffix}.png` : `img/icon32${suffix}.png`;
  try {
    await chrome.action.setIcon({ path: iconPath });
  } catch (e) {
    // Ignore if setting icon fails
  }
}

async function updateBadgeState(cfg) {
  // Check if we are currently flashing an intervention (Green "!")
  // If so, do NOT overwrite it. The timeout will handle the restore.
  if (globalThis.isFlashing) return;

  // Check and show warning state if on, block mode, no domains
  const domains = Array.isArray(cfg.domains) ? cfg.domains : [];
  const isWarningState = (cfg.mode === 'block' && domains.length === 0 && (cfg.blockGet || cfg.blockCreate));
  // updateBadgeState only manages the badge (text/background).
  // Icon/off state is managed from applyCfg (and THEME_CHANGE via refreshActionIcon).
  if (isWarningState) {
    await chrome.action.setBadgeText({ text: "!" });
    await chrome.action.setBadgeBackgroundColor({ color: "#FFCC00" });
  } else {
    await chrome.action.setBadgeText({ text: "" });
  }
}

// Single source of truth for OFF/ON visuals (icon + badge)
async function syncVisuals(cfg) {
  try {
    globalThis.isOff = isEffectivelyOff(cfg);
    await refreshActionIcon();
    await updateBadgeState(cfg);
  } catch (_) {}
}

chrome.runtime.onInstalled.addListener(async () => {
  const cfg = await loadCfg();
  await applyCfg(cfg);
});

// Ensure badge state is restored when the service worker wakes up
// This covers re-enabling the extension or browser restart
chrome.runtime.onStartup.addListener(async () => {
  const cfg = await loadCfg();
  await applyCfg(cfg);
});

// Safety net to run immediately on top-level execution to catch service worker restarts
(async () => {
  try {
    const cfg = await loadCfg();
    // On SW wake, reflect the correct icon and badge without re-registering scripts
    await syncVisuals(cfg);
  } catch (_) {}
})();

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === 'sync' && changes.cfg) {
    const newCfg = await loadCfg();
    await applyCfg(newCfg);
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg?.type === "THEME_CHANGE") {
      const suffix = msg.mode === 'dark' ? '_dark' : '';
      globalThis.themeSuffix = suffix;
      await refreshActionIcon();
      return;
    }

    if (msg?.type === "intervention") {
      // Fetch both new 'stats' key and legacy 'cfg' to migrate if needed
      const data = await chrome.storage.sync.get(["stats", "cfg"]);
      
      let currentStats = 0;
      if (typeof data.stats === 'number') {
        currentStats = data.stats;
      } else if (data.cfg && typeof data.cfg.stats === 'number') {
        currentStats = data.cfg.stats;
      }

      const newStats = currentStats + 1;
      await chrome.storage.sync.set({ stats: newStats });

      // Visual Feedback: Flash Green "!" for 750ms
      globalThis.isFlashing = true;
      
      // Clear any existing timeout to prevent race conditions from multiple rapid events
      if (globalThis.flashTimeout) clearTimeout(globalThis.flashTimeout);
      
      await chrome.action.setBadgeText({ text: "!" });
      await chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });

      globalThis.flashTimeout = setTimeout(async () => {
         globalThis.isFlashing = false;
         globalThis.flashTimeout = null;
         // Restore previous state
         const currentCfg = await loadCfg();
         await updateBadgeState(currentCfg);
      }, 750);

      return;
    }

    if (msg?.type === "set_cfg") {
      // Legacy support or forced update if needed
      // But we prefer storage.onChanged
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
