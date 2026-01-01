const CS_ID = "disable-passkeys";
const DEFAULT_CFG = { blockGet: true, blockCreate: true };

function pickPatchFile({ blockGet, blockCreate }) {
  if (blockGet && blockCreate) return "patch_both.js";
  if (blockGet)               return "patch_get.js";
  if (blockCreate)            return "patch_create.js";
  return null; // OFF
}

async function applyCfg(cfg) {
  // Unregister previous (ignore if not present)
  try {
    await chrome.scripting.unregisterContentScripts({ ids: [CS_ID] });
  } catch (_) {}

  const file = pickPatchFile(cfg);
  if (!file) return; // OFF

  await chrome.scripting.registerContentScripts([{
    id: CS_ID,
    matches: ["<all_urls>"],
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
    blockCreate: !!cfg?.blockCreate
  };
}

chrome.runtime.onInstalled.addListener(async () => {
  await applyCfg(await loadCfg());
});

chrome.runtime.onStartup.addListener(async () => {
  await applyCfg(await loadCfg());
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg?.type !== "set_cfg") return;

    const cfg = {
      blockGet: !!msg.cfg?.blockGet,
      blockCreate: !!msg.cfg?.blockCreate
    };

    await chrome.storage.sync.set({ cfg });
    await applyCfg(cfg);

    sendResponse({ ok: true });
  })();

  return true;
});
