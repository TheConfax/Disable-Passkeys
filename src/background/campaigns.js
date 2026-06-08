// Campaigns: open a page once under simple conditions, checked at browser startup.

const ABOUT_ID = "about";
const ABOUT_MIN_DAYS = 3;
const ABOUT_MIN_STATS = 10;
const DAY_MS = 86400000;

export async function ensureInstalledAt() {
  const cur = await chrome.storage.sync.get(["installedAt", "shownCampaigns"]);
  const patch = {};
  if (typeof cur.installedAt !== "number") patch.installedAt = Date.now();
  if (!Array.isArray(cur.shownCampaigns)) patch.shownCampaigns = [];
  if (Object.keys(patch).length) await chrome.storage.sync.set(patch);
}

export async function maybeOpenAboutCampaign() {
  const { installedAt, stats, shownCampaigns } = await chrome.storage.sync.get(["installedAt", "stats", "shownCampaigns"]);
  const shown = Array.isArray(shownCampaigns) ? shownCampaigns : [];
  if (shown.includes(ABOUT_ID) || typeof installedAt !== "number") return;
  const days = (Date.now() - installedAt) / DAY_MS;
  if (days < ABOUT_MIN_DAYS || (stats || 0) < ABOUT_MIN_STATS) return;
  try {
    await chrome.tabs.create({ url: chrome.runtime.getURL("pages/about/about.html"), active: true });
    await chrome.storage.sync.set({ shownCampaigns: [...shown, ABOUT_ID] });
  } catch (_) {}
}
