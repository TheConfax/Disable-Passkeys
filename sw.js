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

async function applyCfg(cfg) {
  // Unregister previous (ignore if not present)
  try {
    await chrome.scripting.unregisterContentScripts({ ids: [CS_ID] });
  } catch (_) {}

  const file = pickPatchFile(cfg);
  if (!file) return; // OFF

  const patterns = getMatchPatterns(cfg.domains);
  let matches = ["<all_urls>"];
  let excludeMatches = [];

  if (cfg.mode === 'block') {
    // Block Only: Only run on these domains
    if (patterns.length === 0) return; // Block nothing
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

async function updateBadgeState(cfg) {
  // 1. Check if we are currently flashing an intervention (Green "!")
  // If so, do NOT overwrite it. The timeout will handle the restore.
  if (globalThis.isFlashing) return;

  const domains = Array.isArray(cfg.domains) ? cfg.domains : [];
  
  // 2. Check for OFF state (Both toggles disabled)
  if (!cfg.blockGet && !cfg.blockCreate) {
    await chrome.action.setBadgeText({ text: "X" });
    await chrome.action.setBadgeBackgroundColor({ color: "#555555" }); // Dark Gray
    return;
  }

  // 3. Check for Warning State (Block Only + Empty List)
  const isWarningState = (cfg.mode === 'block' && domains.length === 0);

  if (isWarningState) {
    await chrome.action.setBadgeText({ text: "!" });
    await chrome.action.setBadgeBackgroundColor({ color: "#FFCC00" }); // Yellow/Orange
  } else {
    await chrome.action.setBadgeText({ text: "" });
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const cfg = await loadCfg();
  await applyCfg(cfg);
  await updateBadgeState(cfg);
});

// Ensure badge state is restored when the service worker wakes up
// This covers re-enabling the extension or browser restart
chrome.runtime.onStartup.addListener(async () => {
  const cfg = await loadCfg();
  await applyCfg(cfg);
  await updateBadgeState(cfg);
});

// Also run immediately on top-level execution to catch service worker restarts
// that might not trigger onStartup (e.g. manual disable/enable cycle)
(async () => {
  try {
    const cfg = await loadCfg();
    await updateBadgeState(cfg);
  } catch (_) {}
})();

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === 'sync' && changes.cfg) {
    const newCfg = await loadCfg();
    await applyCfg(newCfg);
    await updateBadgeState(newCfg);
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg?.type === "intervention") {
      const { cfg } = await chrome.storage.sync.get({ cfg: DEFAULT_CFG });
      const currentStats = typeof cfg.stats === 'number' ? cfg.stats : 0;
      const newCfg = { ...cfg, stats: currentStats + 1 };
      await chrome.storage.sync.set({ cfg: newCfg });

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
