const DEFAULT_CFG = { blockGet: true, blockCreate: true, mode: 'allow', domains: [] };

export async function loadCfg() {
  const { cfg } = await chrome.storage.sync.get({ cfg: DEFAULT_CFG });
  return {
    blockGet: !!cfg?.blockGet,
    blockCreate: !!cfg?.blockCreate,
    mode: cfg?.mode || 'allow',
    domains: Array.isArray(cfg?.domains) ? cfg.domains : []
  };
}

export function isEffectivelyOff(cfg) {
  if (!cfg.blockGet && !cfg.blockCreate) return true;
  if (cfg.mode === 'block') return !Array.isArray(cfg.domains) || cfg.domains.length === 0;
  return false;
}
