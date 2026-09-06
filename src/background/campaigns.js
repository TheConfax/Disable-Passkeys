// Campaigns: open a page once under simple conditions.
// `shownCampaigns` holds the ids that must not run again, shown or deliberately skipped.

const ABOUT_ID = "about";
const ABOUT_MIN_DAYS = 3;
const ABOUT_MIN_STATS = 10;
const DAY_MS = 86400000;

// Bump the id when a release gets its own page: a new id makes the campaign run again.
const WHATSNEW_ID = "whatsnew-3.0.0";

export async function ensureInstalledAt() {
  const cur = await chrome.storage.sync.get(["installedAt", "shownCampaigns"]);
  const patch = {};
  if (typeof cur.installedAt !== "number") patch.installedAt = Date.now();
  if (!Array.isArray(cur.shownCampaigns)) patch.shownCampaigns = [];
  if (Object.keys(patch).length) await chrome.storage.sync.set(patch);
}

// Runs on update only, so a fresh install never sees it: there is nothing "new" yet.
export async function maybeOpenWhatsNewCampaign(details) {
  const { shownCampaigns } = await chrome.storage.sync.get("shownCampaigns");
  const shown = Array.isArray(shownCampaigns) ? shownCampaigns : [];
  if (shown.includes(WHATSNEW_ID)) return;

  // A fresh install already has these features: burn the campaign without opening it,
  // or the first later update would show it "news" the user never missed.
  if (details?.reason === "install") {
    await chrome.storage.sync.set({ shownCampaigns: [...shown, WHATSNEW_ID] });
    return;
  }
  if (details?.reason !== "update") return;

  try {
    await chrome.tabs.create({ url: chrome.runtime.getURL("pages/whatsnew/whatsnew.html"), active: true });
    await chrome.storage.sync.set({ shownCampaigns: [...shown, WHATSNEW_ID] });
  } catch (_) {}
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
