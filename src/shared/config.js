export const SCHEME = 1;
export const DEFAULT_CFG = { blockModal: true, blockConditional: true, blockCreate: true, mode: 'allow', domains: [], scheme: SCHEME };

function schemeOf(cfg) {
  return typeof cfg?.scheme === 'number' ? cfg.scheme : 0;
}

function normalize(cfg) {
  return {
    blockModal: cfg?.blockModal !== false,
    blockConditional: cfg?.blockConditional !== false,
    blockCreate: cfg?.blockCreate !== false,
    mode: cfg?.mode === 'block' ? 'block' : 'allow',
    domains: Array.isArray(cfg?.domains) ? [...cfg.domains] : []
  };
}

export async function loadCfg() {
  const { cfg } = await chrome.storage.sync.get({ cfg: DEFAULT_CFG });
  // A newer build owns the synced cfg: our own edits live in local until we catch up.
  if (schemeOf(cfg) > SCHEME) {
    const { cfg: local } = await chrome.storage.local.get('cfg');
    if (local) return normalize(local);
  }
  return normalize(cfg);
}

export async function saveCfg(cfg) {
  const next = { ...normalize(cfg), scheme: SCHEME };
  const { cfg: cur } = await chrome.storage.sync.get('cfg');
  if (schemeOf(cur) > SCHEME) await chrome.storage.local.set({ cfg: next });
  else await chrome.storage.sync.set({ cfg: next });
}

export async function migrateCfg() {
  const { cfg, stats } = await chrome.storage.sync.get(['cfg', 'stats']);
  if (schemeOf(cfg) >= SCHEME) {
    const { cfg: local } = await chrome.storage.local.get('cfg');
    if (local) await chrome.storage.local.remove('cfg');
    return;
  }

  const get = cfg?.blockGet !== false;
  const patch = {
    cfg: {
      blockModal: get,
      blockConditional: get,
      blockCreate: cfg?.blockCreate !== false,
      mode: cfg?.mode === 'block' ? 'block' : 'allow',
      domains: Array.isArray(cfg?.domains) ? [...cfg.domains] : [],
      scheme: SCHEME
    }
  };

  const legacy = typeof cfg?.stats === 'number' ? cfg.stats : 0;
  if (legacy > (typeof stats === 'number' ? stats : 0)) patch.stats = legacy;

  await chrome.storage.sync.set(patch);
}

export function isEffectivelyOff(cfg) {
  if (!cfg.blockModal && !cfg.blockConditional && !cfg.blockCreate) return true;
  if (cfg.mode === 'block') return !Array.isArray(cfg.domains) || cfg.domains.length === 0;
  return false;
}
