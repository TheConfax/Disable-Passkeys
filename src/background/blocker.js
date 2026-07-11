import { isEffectivelyOff } from "./config.js";
import { syncVisuals } from "./visuals.js";

const RULE_ID = 1;
const CS_ID = "disable-passkeys";

// "()" is an empty allowlist — it disables the directive for every origin (browser-enforced).
function buildPolicyValue({ blockGet, blockCreate }) {
  const directives = [];
  if (blockGet) directives.push("publickey-credentials-get=()");
  if (blockCreate) directives.push("publickey-credentials-create=()");
  return directives.join(", ");
}

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
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [RULE_ID] });
  } catch (_) {}
  try {
    await chrome.scripting.unregisterContentScripts({ ids: [CS_ID] });
  } catch (_) {}

  if (isEffectivelyOff(cfg)) {
    await syncVisuals(cfg);
    return;
  }

  const value = buildPolicyValue(cfg);
  const file = pickPatchFile(cfg);
  if (!value || !file) {
    await syncVisuals(cfg);
    return;
  }

  const domains = Array.isArray(cfg.domains) ? cfg.domains.filter(Boolean) : [];

  // DNR block, leaves password-manager passkeys working
  // requestDomains/excludedRequestDomains match the domain and its subdomains.
  const condition = { resourceTypes: ["main_frame", "sub_frame"] };
  if (cfg.mode === 'block') {
    condition.requestDomains = domains;
  } else if (domains.length > 0) {
    condition.excludedRequestDomains = domains;
  }

  // If DNR fails the engine must still register: without a healthy header it hard-blocks on its own.
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [{
        id: RULE_ID,
        priority: 1,
        action: {
          type: "modifyHeaders",
          responseHeaders: [
            { header: "Permissions-Policy", operation: "set", value }
          ]
        },
        condition
      }]
    });
  } catch (_) {}

  // Engine: API-level block if DNR is overwritten by another extension, else just counts the denial
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
