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
}

// Paint initial UI immediately (then loadInitial() will update state)
syncText();
syncImages();

function setActive(el, on) { el.classList.toggle("active", !!on); }
function toggle(el) {
    if (el.classList.contains("pressed")) return; // avoid re-entrance

    // show press animation first
    el.classList.add("pressed");

    setTimeout(() => {
      el.classList.toggle("active");
      syncText();
      syncImages();

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

// Load initial cfg
async function loadInitial() {
  const { cfg = { blockGet: true, blockCreate: true } } = await chrome.storage.sync.get({ cfg: { blockGet: true, blockCreate: true } });

  setActive(tileGet, !!cfg.blockGet);
  setActive(tileCreate, !!cfg.blockCreate);

  syncText();
  syncImages();
} 

loadInitial();


apply.addEventListener("click", async () => {
  const cfg = { blockGet: isActive(tileGet), blockCreate: isActive(tileCreate) };
  await chrome.runtime.sendMessage({ type: "set_cfg", cfg });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) chrome.tabs.reload(tab.id);

  window.close();
});
