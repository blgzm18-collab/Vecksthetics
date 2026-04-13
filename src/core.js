// Vecksthetics v1 — rewritten stable build
// Press M to open/close menu
// Purely visual gun tint overlay

(function () {
  const STORAGE_KEY = "vecksthetics_gun_color";
  let overlayCtx = null;
  let menu = null;
  let menuOpen = false;
  let gunColor = localStorage.getItem(STORAGE_KEY) || "#00ffc8";

  function waitForCanvas(callback) {
    const check = setInterval(() => {
      const canvas = document.querySelector("canvas");
      if (canvas) {
        clearInterval(check);
        callback(canvas);
      }
    }, 200);
  }

  function createOverlay(canvas) {
    const overlay = document.createElement("canvas");
    overlay.width = canvas.width;
    overlay.height = canvas.height;

    overlay.style.position = "absolute";
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "999999";

    const rect = canvas.getBoundingClientRect();
    overlay.style.left = rect.left + "px";
    overlay.style.top = rect.top + "px";

    document.body.appendChild(overlay);

    const ro = new ResizeObserver(() => {
      const r = canvas.getBoundingClientRect();
      overlay.width = canvas.width;
      overlay.height = canvas.height;
      overlay.style.left = r.left + "px";
      overlay.style.top = r.top + "px";
      applyGunTint();
    });
    ro.observe(canvas);

    return overlay.getContext("2d");
  }

  function hexToRGBA(hex, alpha) {
    const h = hex.replace("#", "");
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function applyGunTint() {
    if (!overlayCtx) return;
    const w = overlayCtx.canvas.width;
    const h = overlayCtx.canvas.height;

    overlayCtx.clearRect(0, 0, w, h);

    const x = w * 0.55;
    const y = h * 0.55;
    const rw = w * 0.45;
    const rh = h * 0.45;

    overlayCtx.fillStyle = hexToRGBA(gunColor, 0.28);
    overlayCtx.fillRect(x, y, rw, rh);

    overlayCtx.fillStyle = hexToRGBA("#ffffff", 0.12);
    overlayCtx.beginPath();
    overlayCtx.moveTo(x + rw * 0.1, y + rh * 0.2);
    overlayCtx.lineTo(x + rw * 0.9, y + rh * 0.05);
    overlayCtx.lineTo(x + rw * 0.9, y + rh * 0.15);
    overlayCtx.lineTo(x + rw * 0.1, y + rh * 0.3);
    overlayCtx.closePath();
    overlayCtx.fill();
  }

  function createMenu() {
    const box = document.createElement("div");
    box.style.position = "fixed";
    box.style.right = "20px";
    box.style.top = "20px";
    box.style.padding = "12px 14px";
    box.style.background = "rgba(10,10,20,0.94)";
    box.style.border = "1px solid rgba(0,255,200,0.45)";
    box.style.borderRadius = "8px";
    box.style.fontFamily = "system-ui, sans-serif";
    box.style.fontSize = "13px";
    box.style.color = "#e9fdfb";
    box.style.zIndex = "9999999";
    box.style.boxShadow = "0 0 18px rgba(0,0,0,0.6)";
    box.style.backdropFilter = "blur(6px)";
    box.style.display = "none";

    const title = document.createElement("div");
    title.textContent = "Vecksthetics – Gun Color";
    title.style.fontWeight = "600";
    title.style.marginBottom = "6px";

    const hint = document.createElement("div");
    hint.textContent = "Press M to toggle";
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
    input.value = gunColor;
    input.style.width = "40px";
    input.style.height = "24px";
    input.style.cursor = "pointer";

    input.addEventListener("input", () => {
      gunColor = input.value;
      localStorage.setItem(STORAGE_KEY, gunColor);
      applyGunTint();
    });

    row.appendChild(label);
    row.appendChild(input);

    const footer = document.createElement("div");
    footer.textContent = "Visual-only overlay.";
    footer.style.fontSize = "10px";
    footer.style.opacity = "0.6";

    box.appendChild(title);
    box.appendChild(hint);
    box.appendChild(row);
    box.appendChild(footer);

    document.body.appendChild(box);
    return box;
  }

  function toggleMenu() {
    menuOpen = !menuOpen;
    menu.style.display = menuOpen ? "block" : "none";
  }

  function setupKeybind() {
    window.addEventListener(
      "keydown",
      (e) => {
        if (e.key.toLowerCase() === "m") {
          e.stopPropagation();
          toggleMenu();
        }
      },
      true
    );
  }

  function init() {
    waitForCanvas((canvas) => {
      overlayCtx = createOverlay(canvas);
      applyGunTint();
      menu = createMenu();
      setupKeybind();
    });
  }

  init();
})();
