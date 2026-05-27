const I18N_EN = {
  themeDarkAction: "Light",
  themeLightAction: "Dark",
  statusReady: "Ready - waiting for stream URL",
  statusLoading: "Loading...",
  statusPlaying: "Stream loaded - playing",
  statusNative: "Stream loaded - native HLS",
  statusErrorPrefix: "Error: ",
  statusLoadError: "Could not load stream",
  statusNoHls: "HLS not supported in this browser",
  historyEmpty: "No history yet. Played links appear here.",
  corsStrong: "Stream could not load - possible CORS restriction.",
  corsBody:
    "The source server may block browser-based playback. This tool never proxies your streams. All playback is direct client-side."
};

function setThemeButtonText(themeBtn, currentTheme) {
  if (!themeBtn) return;
  themeBtn.textContent =
    currentTheme === "dark" ? I18N_EN.themeDarkAction : I18N_EN.themeLightAction;
}

const themeBtn = document.getElementById("themeToggle");
const savedTheme = localStorage.getItem("theme") || "dark";
document.documentElement.setAttribute("data-theme", savedTheme);
setThemeButtonText(themeBtn, savedTheme);

if (themeBtn) {
  themeBtn.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("theme", nextTheme);
    setThemeButtonText(themeBtn, nextTheme);
  });
}

const hamburgerBtn = document.getElementById("menuToggle");
const navLinksEl = document.querySelector(".nav-links");
if (hamburgerBtn && navLinksEl) {
  hamburgerBtn.addEventListener("click", () => {
    hamburgerBtn.classList.toggle("open");
    navLinksEl.classList.toggle("open");
  });
  document.addEventListener("click", (e) => {
    if (!hamburgerBtn.contains(e.target) && !navLinksEl.contains(e.target)) {
      hamburgerBtn.classList.remove("open");
      navLinksEl.classList.remove("open");
    }
  });
}

const cookieBanner = document.getElementById("cookie-banner");
if (cookieBanner && localStorage.getItem("cookie_ok")) {
  cookieBanner.classList.add("hidden");
}

const cookieAcceptBtn = document.getElementById("cookieAccept");
const cookieDeclineBtn = document.getElementById("cookieDecline");
if (cookieAcceptBtn && cookieBanner) {
  cookieAcceptBtn.addEventListener("click", () => {
    localStorage.setItem("cookie_ok", "1");
    cookieBanner.classList.add("hidden");
    // Notify adsense-loader that consent was just granted so ads load
    // immediately without requiring a page reload.
    window.dispatchEvent(new Event("adsense:consent-granted"));
  });
}
if (cookieDeclineBtn && cookieBanner) {
  cookieDeclineBtn.addEventListener("click", () => {
    localStorage.setItem("cookie_ok", "0");
    cookieBanner.classList.add("hidden");
  });
}

const video = document.getElementById("video");
const urlInput = document.getElementById("streamUrl");
const playBtn = document.getElementById("playBtn");
const resetBtn = document.getElementById("resetBtn");
const pipBtn = document.getElementById("pipBtn");
const placeholder = document.getElementById("placeholder");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const corsWarn = document.getElementById("corsWarn");
let hls = null;

function setStatus(state, message) {
  if (!statusDot || !statusText) return;
  statusDot.className = "status-dot" + (state ? " " + state : "");
  statusText.textContent = message;
}

function destroyHls() {
  if (hls) {
    hls.destroy();
    hls = null;
  }

  if (video) {
    video.pause();
    video.removeAttribute("src");
    video.load();
  }
}

function loadStream(url) {
  if (!url || !video) return;
  if (corsWarn) corsWarn.classList.remove("visible");

  if (playBtn) {
    playBtn.disabled = true;
    playBtn.textContent = "Loading...";
  }

  destroyHls();
  if (placeholder) placeholder.classList.add("hidden");
  setStatus("", I18N_EN.statusLoading);

  if (window.Hls && Hls.isSupported()) {
    hls = new Hls({
      xhrSetup: (xhr) => {
        xhr.withCredentials = false;
      }
    });
    hls.loadSource(url);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(() => {});
      setStatus("live", I18N_EN.statusPlaying);
      if (pipBtn) pipBtn.style.display = "inline";
      saveHistory(url);
      if (playBtn) {
        playBtn.disabled = false;
        playBtn.textContent = "Play";
      }
    });

    hls.on(Hls.Events.ERROR, (_, data) => {
      if (playBtn) {
        playBtn.disabled = false;
        playBtn.textContent = "Play";
      }
      if (data.fatal) {
        setStatus("error", I18N_EN.statusErrorPrefix + (data.type || I18N_EN.statusLoadError));
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && corsWarn) {
          corsWarn.classList.add("visible");
        }
      }
    });
  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = url;
    video.addEventListener(
      "loadedmetadata",
      () => {
        video.play().catch(() => {});
        setStatus("live", I18N_EN.statusNative);
        saveHistory(url);
        if (playBtn) {
          playBtn.disabled = false;
          playBtn.textContent = "Play";
        }
      },
      { once: true }
    );

    video.addEventListener(
      "error",
      () => {
        if (playBtn) {
          playBtn.disabled = false;
          playBtn.textContent = "Play";
        }
        setStatus("error", I18N_EN.statusLoadError);
        if (corsWarn) corsWarn.classList.add("visible");
      },
      { once: true }
    );
  } else {
    setStatus("error", I18N_EN.statusNoHls);
  }
}

if (playBtn && urlInput) {
  playBtn.addEventListener("click", () => {
    const url = urlInput.value.trim();
    if (url) {
      // URL Validation check
      const lowerUrl = url.toLowerCase();
      if (!url.startsWith('http') || (!lowerUrl.includes('.m3u8') && !lowerUrl.includes('.m3u'))) {
        alert("Please enter a valid HLS stream URL (starting with http/https and ending with .m3u8 or .m3u)");
        return;
      }
      loadStream(url);
    } else {
      urlInput.focus();
      return;
    }
  });

  urlInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") playBtn.click();
  });
}

if (resetBtn && urlInput && placeholder && corsWarn && pipBtn) {
  resetBtn.addEventListener("click", () => {
    destroyHls();
    urlInput.value = "";
    placeholder.classList.remove("hidden");
    corsWarn.classList.remove("visible");
    setStatus("", I18N_EN.statusReady);
    pipBtn.style.display = "none";
  });
}

if (pipBtn && video) {
  pipBtn.textContent = "PiP";
  pipBtn.addEventListener("click", async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (video.requestPictureInPicture) {
        await video.requestPictureInPicture();
      }
    } catch (_) {
      // PiP not available or user denied
    }
  });
}

document.querySelectorAll(".sample-btn").forEach((button) => {
  if (!urlInput) return;
  button.addEventListener("click", () => {
    urlInput.value = button.dataset.url;
    loadStream(button.dataset.url);
  });
});

const HISTORY_KEY = "hlsHistory";
const MAX_HISTORY = 6;

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function saveHistory(url) {
  let history = loadHistory().filter((item) => item !== url);
  history.unshift(url);
  if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const list = document.getElementById("historyList");
  if (!list) return;
  const history = loadHistory();

  if (!history.length) {
    list.innerHTML = `<span class="history-empty">${I18N_EN.historyEmpty}</span>`;
    return;
  }

  list.innerHTML = "";

  history.forEach((url) => {
    const label =
      url.replace(/^https?:\/\//, "").substring(0, 40) + (url.length > 45 ? "..." : "");
    const item = document.createElement("div");
    item.className = "history-item";
    item.dataset.url = url;
    item.title = url;
    item.textContent = label;
    item.addEventListener("click", () => {
      if (!urlInput) return;
      urlInput.value = url;
      loadStream(url);
    });
    list.appendChild(item);
  });
}

const clearHistoryBtn = document.getElementById("clearHistory");
if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener("click", () => {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
  });
}

renderHistory();

document.querySelectorAll(".faq-q").forEach((question) => {
  const toggle = () => question.parentElement.classList.toggle("open");
  question.addEventListener("click", toggle);
  question.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle();
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const yearElement = document.getElementById("currentYear");
  if (yearElement) yearElement.textContent = new Date().getFullYear();

  const statusTextEl = document.getElementById("statusText");
  if (statusTextEl) statusTextEl.textContent = I18N_EN.statusReady;

  const adSlots = document.querySelectorAll(".ad-slot");
  adSlots.forEach((slot) => {
    if (!slot.querySelector("ins.adsbygoogle")) {
      slot.textContent = "";
    }
  });

  // Footer current year update
  const yearEl = document.getElementById('currentYear');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // Active Navigation Highlighting
  const navLinks = document.querySelectorAll('.nav-links a');
  const currentPath = window.location.pathname;
  const currentHref = window.location.href;

  navLinks.forEach(link => {
    // Exact match for most pages
    if (link.href === currentHref || (currentPath === '/' && link.getAttribute('href') === '/')) {
      link.classList.add('nav-active');
    }
    // Partial match for blog hierarchy (so blog nav stays active inside posts)
    if (currentPath.includes('/blog/') && link.getAttribute('href').includes('blog/index.html')) {
      link.classList.add('nav-active');
    }
  });
});
