import { isEffectivelyOff } from "./config.js";
import { syncVisuals } from "./visuals.js";

const RULE_ID = 1;

// "()" is an empty allowlist — it disables the directive for every origin (browser-enforced).
function buildPolicyValue({ blockGet, blockCreate }) {
  const directives = [];
  if (blockGet) directives.push("publickey-credentials-get=()");
  if (blockCreate) directives.push("publickey-credentials-create=()");
  return directives.join(", ");
}

export async function applyCfg(cfg) {
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [RULE_ID] });
  } catch (_) {}

  if (isEffectivelyOff(cfg)) {
    await syncVisuals(cfg);
    return;
  }

  const value = buildPolicyValue(cfg);
  if (!value) {
    await syncVisuals(cfg);
    return;
  }

  // requestDomains/excludedRequestDomains match the domain and its subdomains.
  const condition = { resourceTypes: ["main_frame", "sub_frame"] };
  const domains = Array.isArray(cfg.domains) ? cfg.domains.filter(Boolean) : [];
  if (cfg.mode === 'block') {
    condition.requestDomains = domains;
  } else if (domains.length > 0) {
    condition.excludedRequestDomains = domains;
  }

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

  await syncVisuals(cfg);
}
