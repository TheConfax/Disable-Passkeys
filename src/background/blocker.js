import { isEffectivelyOff } from "./config.js";
import { syncVisuals } from "./visuals.js";

const CS_ID = "disable-passkeys";

function pickPatchFile({ blockGet, blockCreate }) {
  if (blockGet && blockCreate) return "engine/patch_both.js";
  if (blockGet)               return "engine/patch_get.js";
  if (blockCreate)            return "engine/patch_create.js";
  return null; // OFF
}

// Domain classification mirrors hostMatchesDomain in popup/popup.js — keep in sync.
function getMatchPatterns(domains) {
  if (!Array.isArray(domains) || domains.length === 0) return [];
  return domains.map(d => {
    if (!d) return null;
    if (d === "localhost") return "*://localhost/*";
    if (d.includes(":") && d.startsWith("[") && d.endsWith("]")) return `*://${d}/*`;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(d)) return `*://${d}/*`;
    return `*://*.${d}/*`; // standard domain + subdomains
  }).filter(Boolean);
}

export async function applyCfg(cfg) {
  try {
    await chrome.scripting.unregisterContentScripts({ ids: [CS_ID] });
  } catch (_) {}

  if (isEffectivelyOff(cfg)) {
    await syncVisuals(cfg);
    return;
  }

  const file = pickPatchFile(cfg);
  const patterns = getMatchPatterns(cfg.domains);

  let matches = ["<all_urls>"];
  let excludeMatches = [];

  if (cfg.mode === 'block') {
    matches = patterns; // Block only: run only on these domains
  } else if (patterns.length > 0) {
    excludeMatches = patterns; // Allow only: run everywhere except these
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

  await syncVisuals(cfg);
}
