// Vecksthetics v1 – Gun color customizer
// - Press M to open/close menu
// - Changes gun tint via overlay
// - Safe: no game internals, no hacks

(function() {
  const LOG_PREFIX = "[Vecksthetics]";
  const STORAGE_KEY = "vecksthetics_gun_color";

  let overlayCtx = null;
  let menuEl = null;
  let isMenuOpen = false;
  let currentColor = localStorage.getItem(STORAGE_KEY) || "#00ffc8";

  function log(...args) {
    console.log(LOG_PREFIX, ...args);
  }

  function waitForCanvas(callback) {
    let tries = 0;
    const max = 60;

    const interval = setInterval(() => {
      const canvas = document.querySelector("canvas");
      if (canvas) {
        clearInterval(interval);
        callback(canvas);
      } else if (++tries >= max) {
        clearInterval(interval);
        console.warn(LOG_PREFIX, "Canvas not found");
      }
    }, 250);
  }

  function createOverlay(canvas) {
    const overlay = document.createElement("canvas");
    overlay.width = canvas.width;
    overlay.height = canvas.height;

    // Match canvas position
    const rect = canvas.getBoundingClientRect();
    overlay.style.position = "absolute";
    overlay.style.left = rect.left + "px";
    overlay.style.top = rect.top + "px";
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = 9999;

    document.body.appendChild(overlay);

    // Keep in sync on resize
    const resizeObserver = new ResizeObserver(() => {
      const r = canvas.getBoundingClientRect();
      overlay.width = canvas.width;
      overlay.height = canvas.height;
      overlay.style.left = r.left + "px";
      overlay.style.top = r.top + "px";
      applyGunTint(overlay.getContext("2d"), currentColor);
    });
    resizeObserver.observe(canvas);

    return overlay.getContext("2d");
  }

  function hexToRgba(hex, alpha) {
    const h = hex.replace("#", "");
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function applyGunTint(ctx, hexColor) {
    if (!ctx) return;
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Gun is usually bottom-right; this is a first-pass region
    const regionX = w * 0.55;
    const regionY = h * 0.55;
    const regionW = w * 0.45;
    const regionH = h * 0.45;

    // Glassy feel: low alpha
    ctx.fillStyle = hexToRgba(hexColor, 0.28);
    ctx.beginPath();
    ctx.rect(regionX, regionY, regionW, regionH);
    ctx.fill();

    // Fake “shine” strip
    ctx.fillStyle = hexToRgba("#ffffff", 0.12);
    ctx.beginPath();
    ctx.moveTo(regionX + regionW * 0.1, regionY + regionH * 0.2);
    ctx.lineTo(regionX + regionW * 0.9, regionY + regionH * 0.05);
    ctx.lineTo(regionX + regionW * 0.9, regionY + regionH * 0.15);
    ctx.lineTo(regionX + regionW * 0.1, regionY + regionH * 0.3);
    ctx.closePath();
    ctx.fill();
  }

  function createMenu() {
    const container = document.createElement("div");
    container.id = "vecksthetics-menu";
    container.style.position = "fixed";
    container.style.right = "20px";
    container.style.top = "20px";
    container.style.padding = "12px 14px";
    container.style.background = "rgba(10,10,20,0.92)";
    container.style.border = "1px solid rgba(0,255,200,0.4)";
    container.style.borderRadius = "8px";
    container.style.fontFamily = "system-ui, sans-serif";
    container.style.fontSize = "13px";
    container.style.color = "#e9fdfb";
    container.style.zIndex = 10000;
    container.style.boxShadow = "0 0 18px rgba(0,0,0,0.6)";
    container.style.backdropFilter = "blur(6px)";
    container.style.display = "none";

    const title = document.createElement("div");
    title.textContent = "Vecksthetics – Gun Color";
    title.style.fontWeight = "600";
    title.style.marginBottom = "8px";
    title.style.letterSpacing = "0.03em";

    const hint = document.createElement("div");
    hint.textContent = "Press M to toggle this menu";
    hint.style.fontSize = "11px";
    hint.style.opacity = "0.7";
    hint.style.marginBottom = "8px";

    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "8px";
    row.style.marginBottom = "8px";

    const label = document.createElement("span");
    label.textContent = "Gun color:";
    label.style.fontSize = "12px";

    const input = document.createElement("input");
    input.type = "color";
    input.value = currentColor;
    input.style.width = "40px";
    input.style.height = "24px";
    input.style.padding = "0";
    input.style.border = "none";
    input.style.background = "transparent";
    input.style.cursor = "pointer";

    input.addEventListener("input", () => {
      currentColor = input.value;
      localStorage.setItem(STORAGE_KEY, currentColor);
      applyGunTint(overlayCtx, currentColor);
    });

    row.appendChild(label);
    row.appendChild(input);

    const footer = document.createElement("div");
    footer.textContent = "Visual only. No gameplay changes.";
    footer.style.fontSize = "10px";
    footer.style.opacity = "0.6";

    container.appendChild(title);
    container.appendChild(hint);
    container.appendChild(row);
    container.appendChild(footer);

    document.body.appendChild(container);
    return container;
  }

  function toggleMenu() {
    if (!menuEl) return;
    isMenuOpen = !isMenuOpen;
    menuEl.style.display = isMenuOpen ? "block" : "none";
  }

  function setupKeybind() {
    window.addEventListener("keydown", (e) => {
      if (e.key === "m" || e.key === "M") {
        toggleMenu();
      }
    });
  }

  function init() {
    waitForCanvas((canvas) => {
      overlayCtx = createOverlay(canvas);
      applyGunTint(overlayCtx, currentColor);

      menuEl = createMenu();
      setupKeybind();

      log("Initialized. Press M to open menu.");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
