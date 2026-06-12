function S() { return window.STRINGS || {}; }

// Initialize locale based on browser language
(function pickLocale() {
  try {
    const lang = (navigator.language || "en").split("-")[0];
    window.STRINGS = window.LOCALES[lang] || window.LOCALES.en;
  } catch (_) {
    window.STRINGS = window.LOCALES.en;
  }
})();

const tileGet = document.getElementById("tileGet");
const tileCreate = document.getElementById("tileCreate");
const apply = document.getElementById("apply");
const btnInfo = document.getElementById("info");
const imgGet = document.getElementById("img_get");
const imgCreate = document.getElementById("img_create");

// Navigation elements
const viewMain = document.getElementById("view-main");
const viewSettings = document.getElementById("view-settings");
const btnSettings = document.getElementById("settings");
const btnBack = document.getElementById("back");

// Settings elements
const modeSwitch = document.getElementById("modeSwitch");
const optAllow = document.getElementById("t_mode_allow");
const optBlock = document.getElementById("t_mode_block");
const domainInput = document.getElementById("domainInput");
const addDomainBtn = document.getElementById("addDomain");
const domainListEl = document.getElementById("domainList");

// State
let currentCfg = {
  blockGet: true,
  blockCreate: true,
  mode: 'allow',
  domains: [],
  stats: 0
};

let initialCfg = null;
let activeTabHost = null;

// Dark-mode assets
const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');

// Another theme change send when you open the popup for blocked pages
if (prefersDark) {
  // Mirror of sendTheme in content/theme_watcher.js — keep the THEME_CHANGE message in sync.
  function sendTheme() {
    chrome.runtime.sendMessage({
      type: 'THEME_CHANGE',
      mode: prefersDark.matches ? 'dark' : 'light'
    }).catch(() => {});
  }
  sendTheme();
  prefersDark.addEventListener('change', sendTheme);
}

function setIcon(imgEl, basePath) {
  const isDark = !!prefersDark?.matches;
  const darkPath = basePath.replace(/\.png$/i, '_dark.png');
  if (!isDark) {
    imgEl.onerror = null;
    imgEl.src = basePath;
    return;
  }

  imgEl.onerror = () => {
    imgEl.onerror = null;
    imgEl.src = basePath;
  };
  imgEl.src = darkPath;
}

function syncImages() {
  const getBase = tileGet.classList.contains("active") ? "../img/get_off.png" : "../img/get_on.png";
  const createBase = tileCreate.classList.contains("active") ? "../img/create_off.png" : "../img/create_on.png";
  setIcon(imgGet, getBase);
  setIcon(imgCreate, createBase);
}

function updateTilesAria() {
  if (tileGet) {
    tileGet.setAttribute('aria-pressed', tileGet.classList.contains('active') ? 'true' : 'false');
  }
  if (tileCreate) {
    tileCreate.setAttribute('aria-pressed', tileCreate.classList.contains('active') ? 'true' : 'false');
  }
}

// When the system theme changes, CSS updates automatically; images need an explicit refresh.
if (prefersDark) {
  const onThemeChange = () => syncImages();
  if (typeof prefersDark.addEventListener === 'function') {
    prefersDark.addEventListener('change', onThemeChange);
  } else if (typeof prefersDark.addListener === 'function') {
    // Legacy Chromium
    prefersDark.addListener(onThemeChange);
  }
}

const setText = (id, text) => {
  const el = document.getElementById(id);
  if (!el || text === undefined) return;
  const label = el.querySelector && el.querySelector('.btn-label');
  if (label) {
    label.textContent = text;
  } else {
    el.textContent = text;
  }
  try { el.setAttribute('aria-label', text); } catch (_) {}
};

// Apply strings
function syncText() {
  const getOn = tileGet.classList.contains("active");
  const createOn = tileCreate.classList.contains("active");

  setText("t_title", window.GLOBAL.title);

  setText("t_get_label", getOn ? S().get_label_off : S().get_label_on);
  setText("t_get_desc",  getOn ? S().get_desc_off  : S().get_desc_on);

  setText("t_create_label", createOn ? S().create_label_off : S().create_label_on);
  setText("t_create_desc",  createOn ? S().create_desc_off  : S().create_desc_on);
  
  setText("apply", S().apply);
  setText("settings", S().settings);
  if (btnInfo && S().about) {
    try { btnInfo.setAttribute('aria-label', S().about); } catch (_) {}
    btnInfo.title = S().about;
  }
  if (addDomainBtn) {
    try { addDomainBtn.setAttribute('aria-label', S().add_domain); } catch (_) {}
  }

  // Status Badge Logic
  const statusEl = document.getElementById("t_status");
  
  // Reset warning on settings button
  if (btnSettings) btnSettings.classList.remove('warning-border');

  if (statusEl) {
    statusEl.className = 'status-badge'; // Reset classes
    
    // If both are NOT blocking (i.e. both are Green/Enabled), then it's OFF.
    if (!getOn && !createOn) {
      statusEl.textContent = S().status_off;
    } else {
      // At least one is Red (Armed)
      const count = currentCfg.domains.length;
      
      if (currentCfg.mode === 'allow') {
        // Allow Only: Block everywhere EXCEPT n
        // If count is 0, it blocks everywhere (Standard behavior) -> Show nothing
        statusEl.textContent = count === 0 ? "" : S().status_except.replace('%n%', count);
      } else {
        // Block Only: Block ONLY n
        // If count is 0, it blocks nothing -> Effectively OFF but WARNING because user might think it's on
        if (count === 0) {
          statusEl.textContent = "";
          const warn = document.createElement('span');
          warn.className = 'emoji';
          warn.textContent = "⚠️";
          statusEl.appendChild(warn);
          statusEl.appendChild(document.createTextNode(" " + S().status_off));
          statusEl.classList.add('warning');
          if (btnSettings) btnSettings.classList.add('warning-border');
        } else {
          statusEl.textContent = S().status_only.replace('%n%', count);
        }
      }
    }
  }
  
  // Settings strings
  setText("t_settings_title", window.GLOBAL.title);
  setText("back", S().back);
  setText("t_mode_allow", S().mode_allow);
  setText("t_mode_block", S().mode_block);
  setText("t_mode_group_label", S().mode_label || 'Mode');
  // Accessibility labels
  setText("t_domain_label", S().domain_label || "Domain");
  setText("t_domain_list_label", S().domain_list_label || "Domain list");
  
  if (domainInput) {
    domainInput.placeholder = window.GLOBAL.domain_placeholder;
    try { domainInput.setAttribute('aria-label', S().domain_label || 'Domain'); } catch (_) {}
  }
  if (addDomainBtn) {
    addDomainBtn.title = S().add_domain;
  }
}

// Navigation Logic
function showView(viewId) {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
  syncText(); // Update text (especially status badge) when switching views
  // Move focus to a sensible target for keyboard/AT users
  try {
    if (viewId === 'view-settings') {
      // Pre-fill the active tab's domain, only if it normalizes to a valid domain.
      if (domainInput && !domainInput.value && activeTabHost) {
        const d = preferBareDomain(activeTabHost);
        if (isValidDomain(d)) domainInput.value = d;
      }
      const mode = modeSwitch?.getAttribute('data-mode');
      if (mode === 'block') { optBlock?.focus(); } else { optAllow?.focus(); }
    } else if (viewId === 'view-main') {
      btnSettings?.focus();
    }
  } catch (_) {}
}

if (btnSettings) {
  btnSettings.addEventListener('click', () => showView('view-settings'));
}
if (btnBack) {
  btnBack.addEventListener('click', () => showView('view-main'));
}

// Mode selector as radiogroup with two radios
function updateModeRadioAria() {
  if (!modeSwitch) return;
  const mode = modeSwitch.getAttribute('data-mode');
  const isAllow = mode === 'allow';
  try { modeSwitch.setAttribute('aria-labelledby', 't_mode_group_label'); } catch (_) {}
  try { modeSwitch.setAttribute('aria-activedescendant', isAllow ? 't_mode_allow' : 't_mode_block'); } catch (_) {}
  if (optAllow) {
    optAllow.setAttribute('role', 'radio');
    optAllow.setAttribute('aria-checked', isAllow ? 'true' : 'false');
    optAllow.tabIndex = isAllow ? 0 : -1;
  }
  if (optBlock) {
    optBlock.setAttribute('role', 'radio');
    optBlock.setAttribute('aria-checked', !isAllow ? 'true' : 'false');
    optBlock.tabIndex = !isAllow ? 0 : -1;
  }
}

function setMode(next) {
  if (!modeSwitch) return;
  const current = modeSwitch.getAttribute('data-mode');
  if (current === next) return;
  modeSwitch.setAttribute('data-mode', next);
  currentCfg.mode = next;
  renderDomains();
  saveCfg();
  updateModeRadioAria();
  if (next === 'allow') { optAllow?.focus(); } else { optBlock?.focus(); }
}

function handleRadioKey(e) {
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    setMode('allow');
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    setMode('block');
  }
}

// Attach listeners
if (modeSwitch) {
  optAllow?.addEventListener('click', () => setMode('allow'));
  optBlock?.addEventListener('click', () => setMode('block'));
  optAllow?.addEventListener('keydown', (e) => handleRadioKey(e));
  optBlock?.addEventListener('keydown', (e) => handleRadioKey(e));
  // No container click toggle; interaction happens on the two options only
  updateModeRadioAria();
}
// Paint initial UI immediately (then loadInitial() will update state)
syncText();
syncImages();

// DEBUG FUNCTIONS
if (window.ENV && window.ENV.ENABLE_DEBUG) {
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'l') {
      const langs = Object.keys(window.LOCALES);
      const currentLang = Object.keys(window.LOCALES).find(k => window.LOCALES[k] === window.STRINGS) || 'en';
      const nextIndex = (langs.indexOf(currentLang) + 1) % langs.length;
      const nextLang = langs[nextIndex];
      
      window.STRINGS = window.LOCALES[nextLang];
      syncText();
      renderDomains();
      console.log(`Debug: Switched to ${nextLang}`);
    }
    
    if (e.key === '+' || e.key === 'Add') {
      currentCfg.stats = (currentCfg.stats || 0) + 1;
      chrome.storage.sync.set({ stats: currentCfg.stats });
      syncText();
      console.log(`Debug: stats ${currentCfg.stats}`);
    }

    if (e.key === '-' || e.key === 'Subtract') {
      currentCfg.stats = Math.max(0, (currentCfg.stats || 0) - 1);
      chrome.storage.sync.set({ stats: currentCfg.stats });
      syncText();
      console.log(`Debug: stats ${currentCfg.stats}`);
    }

    if (e.key.toLowerCase() === 'z') {
      const zoom = (parseInt(document.body.style.zoom, 10) || 1) === 1 ? 2 : 1;
      document.body.style.zoom = zoom;
      console.log(`Debug: zoom ${zoom}x`);
    }
  });
}

function setActive(el, on) { el.classList.toggle("active", !!on); }
function toggle(el) {
  // Ensure press feedback is visible immediately on pointer, or added here for keyboard
  if (!el.classList.contains("pressed")) {
    el.classList.add("pressed");
  }

  // Short delay to show press, then toggle state
  setTimeout(() => {
    el.classList.toggle("active");
    syncText();
    syncImages();
    updateTilesAria();
    saveCfg(); // Save immediately on toggle

    // Briefly keep the pressed state so user sees press+release animation
    setTimeout(() => el.classList.remove("pressed"), 80);
  }, 80);
} 
function isActive(el) { return el.classList.contains("active"); }

function bindTile(el) {
  // Immediate press feedback on pointer down
  el.addEventListener("pointerdown", () => {
    el.classList.add("pressed");
  });
  // Cancel press state if pointer leaves/cancels before click
  el.addEventListener("pointerleave", () => {
    el.classList.remove("pressed");
  });
  el.addEventListener("pointercancel", () => {
    el.classList.remove("pressed");
  });

  // Toggle on click (fires on release)
  el.addEventListener("click", () => toggle(el));

  // Keyboard support
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(el); }
  });
}

bindTile(tileGet);
bindTile(tileCreate);

// Domain List Logic
function renderDomains() {
  if (!domainListEl) return;
  domainListEl.innerHTML = '';
  
  if (currentCfg.domains.length === 0) {
    domainListEl.classList.add('is-empty');
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    
    if (currentCfg.mode === 'block') {
      // Block Only + Empty List = Allowed Everywhere (Warning)
      empty.classList.add('warning');
      
      const icon = document.createElement('span');
      icon.textContent = "⚠️ ";
      icon.style.fontStyle = "normal";
      icon.style.marginRight = "4px";
      
      const text = document.createTextNode(S().empty_block);
      
      empty.appendChild(icon);
      empty.appendChild(text);
    } else {
      // Allow Only + Empty List = Blocked Everywhere (Standard)
      empty.textContent = S().empty_allow;
    }
    
    domainListEl.appendChild(empty);
    return;
  }

  domainListEl.classList.remove('is-empty');

  currentCfg.domains.forEach(domain => {
    const item = document.createElement('div');
    item.className = 'domain-item';
    item.setAttribute('role', 'listitem');
    
    const span = document.createElement('span');
    span.textContent = domain;
    
    const removeBtn = document.createElement('div');
    removeBtn.className = 'domain-remove';
    const removeIcon = document.createElement('span');
    removeIcon.className = 'x-ico';
    removeBtn.appendChild(removeIcon);
    removeBtn.title = S().remove_domain;
    // Keyboard navigation
    removeBtn.setAttribute('tabindex', '0');
    removeBtn.setAttribute('role', 'button');
    try { removeBtn.setAttribute('aria-label', `${S().remove_domain}: ${domain}`); } catch (_) {}
    removeBtn.addEventListener('click', () => removeDomain(domain));
    removeBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        removeDomain(domain);
      }
    });
    
    item.appendChild(span);
    item.appendChild(removeBtn);
    domainListEl.appendChild(item);
  });
}

// A filter target: localhost, a bracketed IPv6, or a dotted domain/IPv4.
// DOMAIN_RE pieces:
//   (?=.{1,253}$)                                        -> total length 1-253
//   (?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+ -> repeated "label." (label: alnum, inner hyphens ok, ≤63)
//   [a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?        -> final label (no leading/trailing hyphen)
const DOMAIN_RE = /^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
function isValidDomain(host) {
  if (!host) return false;
  if (host === 'localhost') return true;
  if (host.startsWith('[') && host.endsWith(']') && host.includes(':')) return true; // IPv6
  return DOMAIN_RE.test(host);
}

// Free-form input (scheme/port/path, IDN->punycode, percent-decoding) reduced to its bare hostname
// (trailing FQDN dot dropped), or '' if unparseable. new URL() also canonicalizes IPv4/IPv6.
function toHostname(input) {
  const v = input.trim().toLowerCase();
  if (!v) return '';
  try { return new URL(v.includes('://') ? v : `http://${v}`).hostname.replace(/\.$/, ''); }
  catch (_) { return ''; }
}

// Drop a leading www. only if what remains is still a valid domain.
function preferBareDomain(host) {
  return host.startsWith('www.') && isValidDomain(host.slice(4)) ? host.slice(4) : host;
}

function addDomain() {
  if (!domainInput.value.trim()) return;
  const val = toHostname(domainInput.value);
  if (!isValidDomain(val)) { showError(); return; }
  if (currentCfg.domains.includes(val)) { domainInput.value = ''; return; }

  currentCfg.domains.push(val);
  domainInput.value = '';
  renderDomains();
  if (domainListEl) domainListEl.scrollTop = domainListEl.scrollHeight;
  saveCfg();
}

function showError() {
  domainInput.classList.remove('input-error');
  void domainInput.offsetWidth;
  domainInput.classList.add('input-error');
  try { domainInput.setAttribute('aria-invalid', 'true'); } catch (_) {}
  if (domainInput._errTimer) clearTimeout(domainInput._errTimer);
  domainInput._errTimer = setTimeout(() => {
    domainInput.classList.remove('input-error');
    try { domainInput.removeAttribute('aria-invalid'); } catch (_) {}
    domainInput._errTimer = null;
  }, 1000);
}

function removeDomain(domain) {
  currentCfg.domains = currentCfg.domains.filter(d => d !== domain);
  renderDomains();
  saveCfg();
}

if (addDomainBtn) {
  addDomainBtn.addEventListener('click', addDomain);
}
if (domainInput) {
  domainInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addDomain();
  });
}

// Block-only with no domains: the yellow warning owns the attention, so no Apply glow.
function isWarningState() {
  return currentCfg.mode === 'block'
    && (currentCfg.domains || []).length === 0
    && (currentCfg.blockGet || currentCfg.blockCreate);
}

// Replicate declarativeNetRequest's domain match (domain + subdomains) for the UI's blocked guess.
function hostMatchesDomain(host, d) {
  if (!host || !d) return false;
  if (d === 'localhost') return host === 'localhost';
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(d) || (d[0] === '[' && d.endsWith(']'))) return host === d;
  return host === d || host.endsWith('.' + d);
}

// Mirror of isEffectivelyOff in background/config.js — keep in sync.
function isEffectivelyOff(cfg) {
  if (!cfg.blockGet && !cfg.blockCreate) return true;
  if (cfg.mode === 'block') return !Array.isArray(cfg.domains) || cfg.domains.length === 0;
  return false;
}

// Is the active tab blocked under this cfg? (allow = everywhere except list; block = only list)
function activeTabBlocked(cfg) {
  if (!activeTabHost || isEffectivelyOff(cfg)) return false;
  const inList = (cfg.domains || []).some(d => hostMatchesDomain(activeTabHost, d));
  return cfg.mode === 'block' ? inList : !inList;
}

// Flash Apply (vs the state at open, so it persists) when reloading the active tab would
// change it: any home toggle, or its blocked/unblocked state flipping. Never during warning.
function updatePendingGlow() {
  if (!apply || !initialCfg) return;
  if (isWarningState()) { apply.classList.remove('pending'); return; }
  const homeChanged = currentCfg.blockGet !== initialCfg.blockGet
    || currentCfg.blockCreate !== initialCfg.blockCreate;
  const activeBlockChanged = activeTabBlocked(currentCfg) !== activeTabBlocked(initialCfg);
  apply.classList.toggle('pending', homeChanged || activeBlockChanged);
}

// Config Management
async function saveCfg() {
  // Update main toggles in currentCfg before saving
  currentCfg.blockGet = isActive(tileGet);
  currentCfg.blockCreate = isActive(tileCreate);

  // Save directly to storage (SW listens to onChanged)
  // Exclude stats from the saved object to prevent overwriting settings with stale stats
  const { stats, ...cfgToSave } = currentCfg;
  await chrome.storage.sync.set({ cfg: cfgToSave });
  updatePendingGlow();
}

// Load initial cfg
async function loadInitial() {
  try {
    const data = await chrome.storage.sync.get(["cfg", "stats"]);
    const cfg = data.cfg || { blockGet: true, blockCreate: true, mode: 'allow', domains: [] };
    const stats = typeof data.stats === 'number' ? data.stats : 0;
    
    // Merge with defaults to be safe
    currentCfg = {
      blockGet: cfg.blockGet !== false, // default true
      blockCreate: cfg.blockCreate !== false, // default true
      mode: cfg.mode || 'allow',
      domains: Array.isArray(cfg.domains) ? cfg.domains : [],
      stats: stats
    };
    initialCfg = {
      blockGet: currentCfg.blockGet,
      blockCreate: currentCfg.blockCreate,
      mode: currentCfg.mode,
      domains: currentCfg.domains.slice()
    };

    setActive(tileGet, !!currentCfg.blockGet);
    setActive(tileCreate, !!currentCfg.blockCreate);
    updateTilesAria();
    
    if (modeSwitch) {
      modeSwitch.setAttribute('data-mode', currentCfg.mode);
      if (typeof updateModeRadioAria === 'function') updateModeRadioAria();
    }

    renderDomains();
    syncText();
    syncImages();
  } catch (e) {
    console.error("Failed to load config", e);
  }
} 

// Initialize
(async () => {
  await loadInitial();
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const u = tab && tab.url ? new URL(tab.url) : null;
    activeTabHost = u && (u.protocol === 'http:' || u.protocol === 'https:') ? u.hostname : null;
  } catch (_) { activeTabHost = null; }
})();

// Open the info page
if (btnInfo) {
  btnInfo.addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("pages/about/about.html") });
    window.close();
  });
}

apply.addEventListener("click", async () => {
  // Config is already saved by toggle() and other actions
  // Just reload the tab and close
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) chrome.tabs.reload(tab.id);

  window.close();
});
