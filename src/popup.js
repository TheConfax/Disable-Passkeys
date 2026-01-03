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
const imgGet = document.getElementById("img_get");
const imgCreate = document.getElementById("img_create");
const imgGithub = document.getElementById("img_github");

// Navigation elements
const viewMain = document.getElementById("view-main");
const viewSettings = document.getElementById("view-settings");
const btnSettings = document.getElementById("settings");
const btnBack = document.getElementById("back");

// Settings elements
const modeSwitch = document.getElementById("modeSwitch");
const domainInput = document.getElementById("domainInput");
const addDomainBtn = document.getElementById("addDomain");
const domainListEl = document.getElementById("domainList");
const tStats = document.getElementById("t_stats");

// State
let currentCfg = {
  blockGet: true,
  blockCreate: true,
  mode: 'allow',
  domains: [],
  stats: 0
};

// Dark-mode assets
const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');

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
  const getBase = tileGet.classList.contains("active") ? "img/get_off.png" : "img/get_on.png";
  const createBase = tileCreate.classList.contains("active") ? "img/create_off.png" : "img/create_on.png";
  setIcon(imgGet, getBase);
  setIcon(imgCreate, createBase);
  setIcon(imgGithub, "img/github_mark.png");
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
  if (el && text !== undefined) el.textContent = text;
};

// Apply strings
function syncText() {
  const getOn = tileGet.classList.contains("active");
  const createOn = tileCreate.classList.contains("active");

  setText("t_title", (window.GLOBAL && window.GLOBAL.title) ? window.GLOBAL.title : S().title);

  setText("t_get_label", getOn ? S().get_label_off : S().get_label_on);
  setText("t_get_desc",  getOn ? S().get_desc_off  : S().get_desc_on);

  setText("t_create_label", createOn ? S().create_label_off : S().create_label_on);
  setText("t_create_desc",  createOn ? S().create_desc_off  : S().create_desc_on);
  
  setText("apply", S().apply);
  setText("settings", S().settings);

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
          statusEl.textContent = "⚠️ " + S().status_off;
          statusEl.classList.add('warning');
          if (btnSettings) btnSettings.classList.add('warning-border');
        } else {
          statusEl.textContent = S().status_only.replace('%n%', count);
        }
      }
    }
  }
  
  // Settings strings
  setText("t_settings_title", (window.GLOBAL && window.GLOBAL.title) ? window.GLOBAL.title : S().title);
  setText("back", S().back);
  setText("t_mode_allow", S().mode_allow);
  setText("t_mode_block", S().mode_block);
  
  if (domainInput) {
    domainInput.placeholder = (window.GLOBAL && window.GLOBAL.domain_placeholder) ? window.GLOBAL.domain_placeholder : "example.com";
  }
  
  if (tStats) {
    const count = currentCfg.stats;
    const text = (count === 1 && S().stats_text_1) ? S().stats_text_1 : S().stats_text;
    tStats.textContent = text.replace('%n%', count);
  }

  const version = chrome.runtime.getManifest().version;
  const copyright = (window.GLOBAL && window.GLOBAL.copyright) ? window.GLOBAL.copyright : "";
  setText("t_copyright", `v${version} ${copyright}`);
}

// Navigation Logic
function showView(viewId) {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
  syncText(); // Update text (especially status badge) when switching views
}

if (btnSettings) {
  btnSettings.addEventListener('click', () => showView('view-settings'));
}
if (btnBack) {
  btnBack.addEventListener('click', () => showView('view-main'));
}

// Mode Switch Logic
if (modeSwitch) {
  modeSwitch.addEventListener('click', () => {
    const current = modeSwitch.getAttribute('data-mode');
    const next = current === 'allow' ? 'block' : 'allow';
    modeSwitch.setAttribute('data-mode', next);
    
    currentCfg.mode = next;
    renderDomains(); // Re-render to update empty state text if needed
    saveCfg();
  });
}

document.getElementById("githubLink").addEventListener("click", () => {
  chrome.tabs.create({ url: "https://github.com/TheConfax/Disable-Passkeys" });
});

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
      saveCfg();
      syncText();
    }
    
    if (e.key === '-' || e.key === 'Subtract') {
      currentCfg.stats = Math.max(0, (currentCfg.stats || 0) - 1);
      saveCfg();
      syncText();
    }
  });
}

function setActive(el, on) { el.classList.toggle("active", !!on); }
function toggle(el) {
    if (el.classList.contains("pressed")) return; // avoid re-entrance

    // show press animation first
    el.classList.add("pressed");

    setTimeout(() => {
      el.classList.toggle("active");
      syncText();
      syncImages();
      saveCfg(); // Save immediately on toggle

      // short release so the user sees the press+release animation
      setTimeout(() => el.classList.remove("pressed"), 80);
    }, 80);
} 
function isActive(el) { return el.classList.contains("active"); }

function bindTile(el) {
  el.addEventListener("click", () => toggle(el));
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
    
    const span = document.createElement('span');
    span.textContent = domain;
    
    const removeBtn = document.createElement('div');
    removeBtn.className = 'domain-remove';
    removeBtn.innerHTML = '×';
    removeBtn.title = S().remove_domain;
    removeBtn.addEventListener('click', () => removeDomain(domain));
    
    item.appendChild(span);
    item.appendChild(removeBtn);
    domainListEl.appendChild(item);
  });
}

function addDomain() {
  let val = domainInput.value.trim().toLowerCase();
  if (!val) return;

  // 1. Parse using URL API (handles Punycode, ports, paths, schemes)
  try {
    // Ensure scheme exists for parsing
    const urlStr = val.includes("://") ? val : `http://${val}`;
    val = new URL(urlStr).hostname;
  } catch (_) {
    // If URL parsing fails, the input is likely garbage or not a domain.
    // We reject it by returning null/empty, triggering the error animation below.
    val = "";
  }
  
  // 2. Validation: must look like a valid domain
  // Special case: localhost
  if (val === "localhost") {
    // valid, proceed
  } 
  // Special case: IPv6 (contains colon and brackets)
  else if (val.includes(":") && val.startsWith("[") && val.endsWith("]")) {
    // Validated by URL() parser above.
  }
  // Standard Domain / IPv4 Validation
  else {
    // Regex Breakdown:
    // ^(?=.{1,253}$)                                       -> Total length 1-253
    // (?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+ -> Label + Dot (repeated)
    // [a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?        -> Final Label
    const domainRegex = /^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
    
    if (!domainRegex.test(val)) {
      showError(); return;
    }
  }

  if (!val) return;
  
  // Basic validation (could be improved)
  if (currentCfg.domains.includes(val)) {
    domainInput.value = '';
    return;
  }
  
  currentCfg.domains.push(val);
  domainInput.value = '';
  renderDomains();
  
  // Scroll to bottom
  if (domainListEl) {
    domainListEl.scrollTop = domainListEl.scrollHeight;
  }
  
  saveCfg();
}

function showError() {
  domainInput.classList.remove('input-error');
  void domainInput.offsetWidth;
  domainInput.classList.add('input-error');
  if (domainInput._errTimer) clearTimeout(domainInput._errTimer);
  domainInput._errTimer = setTimeout(() => {
    domainInput.classList.remove('input-error');
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

// Config Management
async function saveCfg() {
  // Update main toggles in currentCfg before saving
  currentCfg.blockGet = isActive(tileGet);
  currentCfg.blockCreate = isActive(tileCreate);
  
  // Save directly to storage (SW listens to onChanged)
  await chrome.storage.sync.set({ cfg: currentCfg });
}

// Load initial cfg
async function loadInitial() {
  try {
    const { cfg } = await chrome.storage.sync.get({ cfg: { blockGet: true, blockCreate: true, mode: 'allow', domains: [] } });
    
    // Merge with defaults to be safe
    currentCfg = {
      blockGet: cfg.blockGet !== false, // default true
      blockCreate: cfg.blockCreate !== false, // default true
      mode: cfg.mode || 'allow',
      domains: Array.isArray(cfg.domains) ? cfg.domains : [],
      stats: cfg.stats || 0
    };

    setActive(tileGet, !!currentCfg.blockGet);
    setActive(tileCreate, !!currentCfg.blockCreate);
    
    if (modeSwitch) {
      modeSwitch.setAttribute('data-mode', currentCfg.mode);
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
  // Enable UI interactions here if needed, but for now just load.
})();

apply.addEventListener("click", async () => {
  // Config is already saved by toggle() and other actions
  // Just reload the tab and close
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) chrome.tabs.reload(tab.id);

  window.close();
});
