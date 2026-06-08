export async function bumpStats() {
  const { stats } = await chrome.storage.sync.get("stats");
  await chrome.storage.sync.set({ stats: (typeof stats === 'number' ? stats : 0) + 1 });
}
