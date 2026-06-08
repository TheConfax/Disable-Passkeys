import { isEffectivelyOff, loadCfg } from "./config.js";

let isOff = false;
let themeSuffix = "";
let isFlashing = false;
let flashTimeout = null;

async function refreshActionIcon() {
  // path relative to background/ (the SW folder), so ../img to reach the root
  const iconPath = isOff ? `../img/icon32_off${themeSuffix}.png` : `../img/icon32${themeSuffix}.png`;
  try {
    await chrome.action.setIcon({ path: iconPath });
  } catch (e) {}
}

async function updateBadgeState(cfg) {
  if (isFlashing) return; // don't overwrite the green "!" flash
  const domains = Array.isArray(cfg.domains) ? cfg.domains : [];
  const isWarningState = (cfg.mode === 'block' && domains.length === 0 && (cfg.blockGet || cfg.blockCreate));
  if (isWarningState) {
    await chrome.action.setBadgeText({ text: "!" });
    await chrome.action.setBadgeBackgroundColor({ color: "#FFCC00" });
  } else {
    await chrome.action.setBadgeText({ text: "" });
  }
}

export async function syncVisuals(cfg) {
  try {
    isOff = isEffectivelyOff(cfg);
    await refreshActionIcon();
    await updateBadgeState(cfg);
  } catch (_) {}
}

export async function setTheme(mode) {
  themeSuffix = mode === 'dark' ? '_dark' : '';
  await refreshActionIcon();
}

export async function flashIntervention() {
  isFlashing = true;
  if (flashTimeout) clearTimeout(flashTimeout);
  await chrome.action.setBadgeText({ text: "!" });
  await chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
  flashTimeout = setTimeout(async () => {
    isFlashing = false;
    flashTimeout = null;
    await updateBadgeState(await loadCfg());
  }, 750);
}
