import { isEffectivelyOff } from "./config.js";
import { syncVisuals } from "./visuals.js";

const CS_ID = "disable-passkeys";

function pickPatchFile({ blockGet, blockCreate }) {
  if (blockGet && blockCreate) return "engine/patch_both.js";
  if (blockGet) return "engine/patch_get.js";
  if (blockCreate) return "engine/patch_create.js";
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
    return `*://*.${d}/*`;
  }).filter(Boolean);
}

let _debugPresent;
async function debugFilePresent() {
  if (_debugPresent === undefined) {
    try { _debugPresent = (await fetch(chrome.runtime.getURL("debug.js"))).ok; }
    catch { _debugPresent = false; }
  }
  return _debugPresent;
}

export async function applyCfg(cfg) {
  try {
    await chrome.scripting.unregisterContentScripts({ ids: [CS_ID] });
  } catch (_) {}

  const file = isEffectivelyOff(cfg) ? null : pickPatchFile(cfg);
  if (!file) {
    await syncVisuals(cfg);
    return;
  }

  const domains = Array.isArray(cfg.domains) ? cfg.domains.filter(Boolean) : [];
  const patterns = getMatchPatterns(domains);
  let matches = ["<all_urls>"];
  let excludeMatches = [];
  if (cfg.mode === 'block') {
    matches = patterns;
  } else if (patterns.length > 0) {
    excludeMatches = patterns;
  }

  const withDebug = await debugFilePresent();
  await chrome.scripting.registerContentScripts([{
    id: CS_ID,
    matches: matches,
    excludeMatches: excludeMatches.length > 0 ? excludeMatches : undefined,
    js: withDebug ? ["debug.js", file] : [file],
    runAt: "document_start",
    allFrames: true,
    world: "MAIN",
    matchOriginAsFallback: true
  }]);

  await syncVisuals(cfg);
}
