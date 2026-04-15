(function () {
    'use strict';

    // ---------------------------
    // Defaults & load settings
    // ---------------------------
    const defaultSettings = {
        style: "plus",
        size: 40,
        stroke: 4,
        color: "#00ffea",
        opacity: 1,
        dotEnabled: false,
        glowEnabled: true,
        outlineEnabled: true,
        glowStrength: 15,
        animBreathing: false,
        animGlowPulse: false,
        animRecoil: true,
        recoilTriggerMode: "left",
        visible: true,
        menuX: null,
        menuY: null,
        statsVisible: true,
        // Game Visuals
        visualVibrance: 1.25,
        visualBrightness: 1.08,
        visualContrast: 1.12,
        visualHue: 0,
        visualVignette: true,
        // add these lines inside defaultSettings object
        visualSepia: 0,
        visualInvert: 0,
        visualBlur: 0,
    };

    const stored = JSON.parse(localStorage.getItem("veck_crosshair_settings")) || {};
    const settings = Object.assign({}, defaultSettings, stored);

    let presets = JSON.parse(localStorage.getItem("veck_crosshair_presets")) || {
        "Clean Plus": { style: "plus", size: 35, stroke: 3, color: "#00ffea", opacity: 1, dotEnabled: true, glowEnabled: true, outlineEnabled: false, glowStrength: 12, animBreathing: false, animGlowPulse: false, animRecoil: true, recoilTriggerMode: "left" },
        "Neon Sniper": { style: "circle_plus_chevron", size: 55, stroke: 5, color: "#ff00ff", opacity: 0.95, dotEnabled: false, glowEnabled: true, outlineEnabled: true, glowStrength: 25, animBreathing: true, animGlowPulse: true, animRecoil: true, recoilTriggerMode: "left" },
        "Minimal Dot": { style: "circle", size: 18, stroke: 2, color: "#ffff00", opacity: 1, dotEnabled: true, glowEnabled: false, outlineEnabled: false, glowStrength: 8, animBreathing: false, animGlowPulse: false, animRecoil: false, recoilTriggerMode: "left" }
    };

    function saveSettings() {
        localStorage.setItem("veck_crosshair_settings", JSON.stringify(settings));
    }
    function savePresets() {
        localStorage.setItem("veck_crosshair_presets", JSON.stringify(presets));
    }

    const sessionStart = Date.now();
    let lastCycledPresetName = null;

    // ---------------------------
    // Canvas overlay (crosshair)
    // ---------------------------
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { alpha: true });
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "999999";
    document.body.appendChild(canvas);

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener("resize", resize);
    resize();

    // ---------------------------
    // Game Visuals (Vignette + filters on Unity canvas)
    // ---------------------------
    let gameCanvas = null;
    const vignette = document.createElement("div");
    vignette.style.position = "fixed";
    vignette.style.top = "0";
    vignette.style.left = "0";
    vignette.style.width = "100%";
    vignette.style.height = "100%";
    vignette.style.pointerEvents = "none";
    vignette.style.zIndex = "999998";           // under crosshair, over game
    vignette.style.background = "radial-gradient(circle at center, transparent 64%, rgba(0,0,0,0.68) 100%)";
    vignette.style.opacity = settings.visualVignette ? "1" : "0";
    vignette.style.transition = "opacity 0.4s ease";
    document.body.appendChild(vignette);

    function applyGameVisuals() {
        if (!gameCanvas) return;
        const filterString = `
        saturate(${settings.visualVibrance})
        brightness(${settings.visualBrightness})
        contrast(${settings.visualContrast})
        hue-rotate(${settings.visualHue}deg)
        sepia(${settings.visualSepia})
        invert(${settings.visualInvert})
        blur(${settings.visualBlur}px)
    `.trim();
        gameCanvas.style.filter = filterString;
        vignette.style.opacity = settings.visualVignette ? "1" : "0";
    }

    // Auto-detect Unity canvas (works even if it loads late)
    function waitForUnityCanvas() {
        const check = setInterval(() => {
            gameCanvas = document.getElementById("unity-canvas");
            if (gameCanvas) {
                clearInterval(check);
                console.log("%c✅ Unity canvas found — Game Visuals enabled", "color:#00ffea;font-weight:bold");
                applyGameVisuals();
            }
        }, 400);
    }
    waitForUnityCanvas();

    // ---------------------------
    // Animation & FPS state
    // ---------------------------
    let lastTime = performance.now();
    let breathingPhase = 0;
    let glowPhase = 0;
    let recoilTimer = 0;
    const recoilDuration = 140;
    const recoilSizeBoost = 0.35;

    // === REPLACE your old FPS vars with these ===
    // Line ~92: Smooth FPS variables
    let fpsSmoothed = 60;
    let lastFrameTime = performance.now();

    // ---------------------------
    // Stats HUD (FPS + Ping + Session Timer)
    // ---------------------------
    const statsHUD = document.createElement("div");
    statsHUD.style.position = "fixed";
    statsHUD.style.top = "12px";
    statsHUD.style.right = "12px";
    statsHUD.style.background = "rgba(15,15,25,0.92)";
    statsHUD.style.color = "#00ffea";
    statsHUD.style.fontFamily = "monospace";
    statsHUD.style.fontSize = "13px";
    statsHUD.style.fontWeight = "600";
    statsHUD.style.padding = "8px 14px";
    statsHUD.style.borderRadius = "9px";
    statsHUD.style.border = "1px solid rgba(0,255,234,0.3)";
    statsHUD.style.boxShadow = "0 0 15px rgba(0,255,234,0.25)";
    statsHUD.style.zIndex = "10000000";
    statsHUD.style.pointerEvents = "none";
    statsHUD.style.minWidth = "132px";
    statsHUD.style.transition = "opacity 0.3s";
    statsHUD.innerHTML = `
        <div style="display:flex;justify-content:space-between;gap:12px;">
            <span>FPS</span>
            <span id="veck_fps_val" style="color:#00ffea;width:42px;text-align:right;">60</span>
        </div>
        <div style="display:flex;justify-content:space-between;gap:12px;margin-top:2px;">
            <span>Ping</span>
            <span id="veck_ping_val" style="color:#00ffea;width:42px;text-align:right;">-- ms</span>
        </div>
        <div style="display:flex;justify-content:space-between;gap:12px;margin-top:2px;">
            <span>Time</span>
            <span id="veck_time_val" style="color:#00ffea;width:42px;text-align:right;">00:00</span>
        </div>
    `;
    document.body.appendChild(statsHUD);

    function updateStatsHUD() {
        const fpsEl = document.getElementById("veck_fps_val");
        const pingEl = document.getElementById("veck_ping_val");
        const timeEl = document.getElementById("veck_time_val");

        // No need to set FPS here anymore (it's set every frame above)
        if (pingEl) pingEl.textContent = "-- ms";

        if (timeEl) {
            const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
            const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const seconds = (elapsed % 60).toString().padStart(2, '0');
            timeEl.textContent = `${minutes}:${seconds}`;
        }
    }

    // ---------------------------
    // Drawing helpers
    // ---------------------------
    function drawCrosshairFrame(timestamp) {
        const dt = timestamp - lastTime;
        lastTime = timestamp;

        // Line ~152: Accurate smoothed FPS
        const now = performance.now();
        const delta = now - lastFrameTime;
        lastFrameTime = now;

        if (delta > 0) {
            const instantFps = 1000 / delta;
            fpsSmoothed = fpsSmoothed * 0.92 + instantFps * 0.08;
        }

        // Update FPS live
        const fpsEl = document.getElementById("veck_fps_val");
        if (fpsEl) fpsEl.textContent = Math.round(fpsSmoothed);

        // Update timer (and ping if you add it later)
        updateStatsHUD();

        if (!settings.visible) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            requestAnimationFrame(drawCrosshairFrame);
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        let sizeMul = 1;
        if (settings.animBreathing) {
            breathingPhase += dt * 0.0032;
            sizeMul *= 1 + 0.09 * Math.sin(breathingPhase);
        }
        if (settings.animRecoil && recoilTimer > 0) {
            recoilTimer -= dt;
            const t = Math.max(recoilTimer, 0) / recoilDuration;
            sizeMul *= 1 + recoilSizeBoost * (1 - t * t);
        }

        let glowMul = 1;
        if (settings.animGlowPulse) {
            glowPhase += dt * 0.0042;
            glowMul = 1 + 0.45 * Math.sin(glowPhase);
        }

        const s = settings.size * sizeMul;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.globalAlpha = settings.opacity;

        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        if (settings.glowEnabled) {
            ctx.shadowColor = settings.color;
            ctx.shadowBlur = settings.glowStrength * glowMul;
        } else {
            ctx.shadowBlur = 0;
        }

        if (settings.outlineEnabled) {
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = settings.stroke + 3.5;
            drawStyle(ctx, settings.style, s, true, settings.dotEnabled);
        }

        ctx.shadowColor = settings.glowEnabled ? settings.color : "transparent";
        ctx.strokeStyle = settings.color;
        ctx.lineWidth = settings.stroke;
        drawStyle(ctx, settings.style, s, false, settings.dotEnabled);

        ctx.restore();

        requestAnimationFrame(drawCrosshairFrame);
    }

    function drawStyle(ctx, style, s, isOutline, dotEnabled) {
        switch (style) {
            case "plus": drawPlus(ctx, s); break;
            case "circle": drawCircle(ctx, s); break;
            case "chevron": drawChevron(ctx, s); break;
            case "circle_plus": drawCircle(ctx, s); drawPlus(ctx, s); break;
            case "circle_chevron": drawCircle(ctx, s); drawChevron(ctx, s); break;
            case "circle_plus_chevron": drawCircle(ctx, s); drawPlus(ctx, s); drawChevron(ctx, s); break;
        }
        if (dotEnabled && !isOutline) drawDot(ctx, s);
    }

    function drawPlus(ctx, s) {
        ctx.beginPath();
        ctx.moveTo(-s, 0); ctx.lineTo(s, 0);
        ctx.moveTo(0, -s); ctx.lineTo(0, s);
        ctx.stroke();
    }
    function drawCircle(ctx, s) {
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.92, 0, Math.PI * 2);
        ctx.stroke();
    }
    function drawChevron(ctx, s) {
        const h = s * 0.95;
        const w = s * 0.95;
        ctx.beginPath();
        ctx.moveTo(-w, h * 0.25);
        ctx.lineTo(0, -h * 0.75);
        ctx.lineTo(w, h * 0.25);
        ctx.stroke();
    }
    function drawDot(ctx, s) {
        const r = Math.max(1.8, s * 0.085);
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
    }

    requestAnimationFrame(drawCrosshairFrame);

    // ---------------------------
    // Recoil trigger
    // ---------------------------
    function triggerRecoil() {
        if (!settings.animRecoil) return;
        recoilTimer = recoilDuration;
    }

    document.addEventListener("mousedown", e => {
        if (settings.recoilTriggerMode === "left" && e.button === 0) triggerRecoil();
        else if (settings.recoilTriggerMode === "any") triggerRecoil();
        else if (settings.recoilTriggerMode === "left+space" && e.button === 0) triggerRecoil();
    });

    document.addEventListener("keydown", e => {
        if (settings.recoilTriggerMode === "left+space" && e.code === "Space") triggerRecoil();
    });

    // ---------------------------
    // MENU UI (with new Game Visuals tab)
    // ---------------------------
    const menu = document.createElement("div");
    menu.style.position = "fixed";
    menu.style.background = "rgba(20,20,20,0.97)";
    menu.style.borderRadius = "14px";
    menu.style.color = "white";
    menu.style.fontFamily = "Inter, system-ui, sans-serif";
    menu.style.zIndex = "10000000";
    menu.style.minWidth = "360px";
    menu.style.boxShadow = "0 10px 30px rgba(0,0,0,0.7)";
    menu.style.display = "none";
    if (settings.menuX !== null && settings.menuY !== null) {
        menu.style.left = settings.menuX + "px";
        menu.style.top = settings.menuY + "px";
    } else {
        menu.style.left = "50%";
        menu.style.top = "50%";
        menu.style.transform = "translate(-50%, -50%)";
    }

    menu.innerHTML = `
<style>
    #xh_menu { font-family: "Inter", system-ui, sans-serif; color: #e8e8e8; }
    #xh_drag {
        padding: 14px 18px;
        background: linear-gradient(180deg, #3a3a3a, #282828);
        border-radius: 14px 14px 0 0;
        cursor: move;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 700;
        font-size: 15px;
        border-bottom: 1px solid #00000050;
    }
    #xh_inner {
        padding: 16px 20px 20px;
        background: #1a1a1a;
        border-radius: 0 0 14px 14px;
    }
    .xh_tab_btn {
        flex: 1;
        padding: 9px 0;
        border: none;
        border-radius: 8px;
        background: #2a2a2a;
        color: #ddd;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .xh_tab_btn.active {
        background: #00ffea;
        color: #111;
        box-shadow: 0 0 12px #00ffea88;
    }
    .xh_tab { display: none; font-size: 13.5px; margin-top: 12px; }
    .xh_tab.active { display: block; }
    label { display: block; margin: 10px 0 5px; font-size: 12.5px; opacity: 0.95; }
    input[type="range"] { width: 100%; margin-bottom: 8px; accent-color: #00ffea; }
    select, input[type="text"], input[type="color"] {
        width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid #444;
        background: #252525; color: #eee; margin-bottom: 10px; font-size: 13px;
    }
    input[type="checkbox"] { margin-right: 8px; accent-color: #00ffea; }
    .xh_btn {
        padding: 8px 14px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        transition: 0.2s;
    }
    #xh_preset_save { background: #00c853; color: white; }
    #xh_preset_load { background: #455a64; color: white; }
    #xh_preset_delete { background: #d50000; color: white; }
    #xh_close { background: #444; color: white; }
    #xh_visuals_reset { background: #455a64; color: white; }
    #xh_preset_list {
        width: 100%; height: 110px; background: #252525; border: 1px solid #444;
        border-radius: 8px; color: #eee; padding: 6px; font-size: 13px;
    }
    .xh_divider { height: 1px; background: #00000040; margin: 16px 0; }
</style>
<div id="xh_drag">
    <span>Veck.io Crosshair + HUD + Visuals</span>
    <small>O=Menu I=Crosshair U=HUD Ctrl+←/→=Cycle</small>
</div>
<div id="xh_inner">
    <!-- Tabs -->
    <div style="display:flex;gap:6px;">
        <button class="xh_tab_btn active" data-tab="crosshair">Crosshair</button>
        <button class="xh_tab_btn" data-tab="effects">Effects</button>
        <button class="xh_tab_btn" data-tab="animations">Animations</button>
        <button class="xh_tab_btn" data-tab="presets">Presets</button>
        <button class="xh_tab_btn" data-tab="visuals">Game Visuals</button>
    </div>

    <!-- Crosshair Tab -->
    <div id="xh_tab_crosshair" class="xh_tab active">
        <label>Style</label>
        <select id="xh_style">
            <option value="plus">Plus</option>
            <option value="circle">Circle</option>
            <option value="chevron">Chevron</option>
            <option value="circle_plus">Circle + Plus</option>
            <option value="circle_chevron">Circle + Chevron</option>
            <option value="circle_plus_chevron">Circle + Plus + Chevron</option>
        </select>
        <label>Size: <span id="xh_size_val">40</span></label>
        <input id="xh_size" type="range" min="5" max="220" value="40">
        <label>Stroke: <span id="xh_stroke_val">4</span></label>
        <input id="xh_stroke" type="range" min="1" max="22" value="4">
        <label>Opacity: <span id="xh_opacity_val">1.00</span></label>
        <input id="xh_opacity" type="range" min="0.1" max="1" step="0.05" value="1">
        <label>Color</label>
        <input id="xh_color" type="color" value="#00ffea">
        <label><input id="xh_dot" type="checkbox"> Center dot</label>
        <label><input id="xh_visible" type="checkbox" checked> Crosshair visible</label>
    </div>

    <!-- Effects Tab -->
    <div id="xh_tab_effects" class="xh_tab">
        <label><input id="xh_glow" type="checkbox" checked> Glow</label>
        <label><input id="xh_outline" type="checkbox" checked> Outline</label>
        <label>Glow strength: <span id="xh_glow_val">15</span></label>
        <input id="xh_glow_strength" type="range" min="0" max="45" value="15">
    </div>

    <!-- Animations Tab -->
    <div id="xh_tab_animations" class="xh_tab">
        <label><input id="xh_anim_breathing" type="checkbox"> Breathing pulse</label>
        <label><input id="xh_anim_glow" type="checkbox"> Glow pulse</label>
        <label><input id="xh_anim_recoil" type="checkbox" checked> Recoil on shot</label>
        <label>Recoil trigger</label>
        <select id="xh_recoil_mode">
            <option value="left">Left click only</option>
            <option value="any">Any mouse button</option>
            <option value="left+space" selected>Left click + Space</option>
        </select>
    </div>

    <!-- Presets Tab -->
    <div id="xh_tab_presets" class="xh_tab">
        <label>Preset name</label>
        <input id="xh_preset_name" type="text" placeholder="e.g. NeonSniper">
        <div style="display:flex;gap:8px;">
            <button id="xh_preset_save" class="xh_btn">Save Current</button>
            <button id="xh_preset_load" class="xh_btn">Load Selected</button>
            <button id="xh_preset_delete" class="xh_btn">Delete</button>
        </div>
        <label style="margin-top:12px;">Saved presets</label>
        <select id="xh_preset_list" size="5"></select>
    </div>

    <!-- NEW: Game Visuals Tab -->
    <div id="xh_tab_visuals" class="xh_tab">
        <label>Vibrance: <span id="xh_vibrance_val">1.25</span></label>
        <input id="xh_vibrance" type="range" min="0.5" max="2" step="0.05" value="1.25">
        <label>Brightness: <span id="xh_brightness_val">1.08</span></label>
        <input id="xh_brightness" type="range" min="0.5" max="1.5" step="0.05" value="1.08">
        <label>Contrast: <span id="xh_contrast_val">1.12</span></label>
        <input id="xh_contrast" type="range" min="0.5" max="1.5" step="0.05" value="1.12">
        <label>Hue Shift: <span id="xh_hue_val">0°</span></label>
        <input id="xh_hue" type="range" min="0" max="360" step="1" value="0">
        <label><input id="xh_vignette" type="checkbox" checked> Vignette (cinematic edges)</label>
        <label>Sepia: <span id="xh_sepia_val">0</span></label>
        <input id="xh_sepia" type="range" min="0" max="1" step="0.05" value="0">
        <label>Invert: <span id="xh_invert_val">0</span></label>
        <input id="xh_invert" type="range" min="0" max="1" step="0.05" value="0">
        <label>Blur: <span id="xh_blur_val">0</span> px</label>
        <input id="xh_blur" type="range" min="0" max="3" step="0.1" value="0">
        <button id="xh_visuals_reset" class="xh_btn" style="margin-top:12px;width:100%;">Reset Visuals to Default</button>
        <small style="display:block;margin-top:8px;opacity:0.6;">Changes apply instantly to the game canvas</small>
    </div>

    <div class="xh_divider"></div>
    <div style="text-align:right;">
        <button id="xh_close" class="xh_btn">Close Menu</button>
    </div>
</div>`;

    document.body.appendChild(menu);

    // ---------------------------
    // Tab system
    // ---------------------------
    const tabButtons = menu.querySelectorAll(".xh_tab_btn");
    const tabs = {
        crosshair: menu.querySelector("#xh_tab_crosshair"),
        effects: menu.querySelector("#xh_tab_effects"),
        animations: menu.querySelector("#xh_tab_animations"),
        presets: menu.querySelector("#xh_tab_presets"),
        visuals: menu.querySelector("#xh_tab_visuals")
    };

    function setActiveTab(name) {
        Object.keys(tabs).forEach(key => {
            tabs[key].classList.toggle("active", key === name);
        });
        tabButtons.forEach(btn => btn.classList.toggle("active", btn.dataset.tab === name));
    }
    tabButtons.forEach(btn => btn.addEventListener("click", () => setActiveTab(btn.dataset.tab)));
    setActiveTab("crosshair");

    // ---------------------------
    // Bind controls
    // ---------------------------
    const elStyle = menu.querySelector("#xh_style");
    const elSize = menu.querySelector("#xh_size");
    const elSizeVal = menu.querySelector("#xh_size_val");
    const elStroke = menu.querySelector("#xh_stroke");
    const elStrokeVal = menu.querySelector("#xh_stroke_val");
    const elOpacity = menu.querySelector("#xh_opacity");
    const elOpacityVal = menu.querySelector("#xh_opacity_val");
    const elColor = menu.querySelector("#xh_color");
    const elDot = menu.querySelector("#xh_dot");
    const elVisible = menu.querySelector("#xh_visible");
    const elGlow = menu.querySelector("#xh_glow");
    const elOutline = menu.querySelector("#xh_outline");
    const elGlowStrength = menu.querySelector("#xh_glow_strength");
    const elGlowVal = menu.querySelector("#xh_glow_val");
    const elAnimBreathing = menu.querySelector("#xh_anim_breathing");
    const elAnimGlow = menu.querySelector("#xh_anim_glow");
    const elAnimRecoil = menu.querySelector("#xh_anim_recoil");
    const elRecoilMode = menu.querySelector("#xh_recoil_mode");
    const elPresetName = menu.querySelector("#xh_preset_name");
    const elPresetSave = menu.querySelector("#xh_preset_save");
    const elPresetLoad = menu.querySelector("#xh_preset_load");
    const elPresetDelete = menu.querySelector("#xh_preset_delete");
    const elPresetList = menu.querySelector("#xh_preset_list");
    const elClose = menu.querySelector("#xh_close");

    // Visuals controls
    const elVibrance = menu.querySelector("#xh_vibrance");
    const elVibranceVal = menu.querySelector("#xh_vibrance_val");
    const elBrightness = menu.querySelector("#xh_brightness");
    const elBrightnessVal = menu.querySelector("#xh_brightness_val");
    const elContrast = menu.querySelector("#xh_contrast");
    const elContrastVal = menu.querySelector("#xh_contrast_val");
    const elHue = menu.querySelector("#xh_hue");
    const elHueVal = menu.querySelector("#xh_hue_val");
    const elVignette = menu.querySelector("#xh_vignette");
    const elVisualsReset = menu.querySelector("#xh_visuals_reset");
    const elSepia = menu.querySelector("#xh_sepia");
    const elSepiaVal = menu.querySelector("#xh_sepia_val");
    const elInvert = menu.querySelector("#xh_invert");
    const elInvertVal = menu.querySelector("#xh_invert_val");
    const elBlur = menu.querySelector("#xh_blur");
    const elBlurVal = menu.querySelector("#xh_blur_val");

    function refreshPresetList() {
        elPresetList.innerHTML = "";
        Object.keys(presets).sort().forEach(name => {
            const opt = document.createElement("option");
            opt.value = name;
            opt.textContent = name;
            elPresetList.appendChild(opt);
        });
    }

    function applySettingsToUI() {
        elStyle.value = settings.style;
        elSize.value = settings.size; elSizeVal.textContent = settings.size;
        elStroke.value = settings.stroke; elStrokeVal.textContent = settings.stroke;
        elOpacity.value = settings.opacity; elOpacityVal.textContent = settings.opacity.toFixed(2);
        elColor.value = settings.color;
        elDot.checked = settings.dotEnabled;
        elVisible.checked = settings.visible;
        elGlow.checked = settings.glowEnabled;
        elOutline.checked = settings.outlineEnabled;
        elGlowStrength.value = settings.glowStrength; elGlowVal.textContent = settings.glowStrength;
        elAnimBreathing.checked = settings.animBreathing;
        elAnimGlow.checked = settings.animGlowPulse;
        elAnimRecoil.checked = settings.animRecoil;
        elRecoilMode.value = settings.recoilTriggerMode;

        // Visuals UI
        elVibrance.value = settings.visualVibrance; elVibranceVal.textContent = settings.visualVibrance.toFixed(2);
        elBrightness.value = settings.visualBrightness; elBrightnessVal.textContent = settings.visualBrightness.toFixed(2);
        elContrast.value = settings.visualContrast; elContrastVal.textContent = settings.visualContrast.toFixed(2);
        elHue.value = settings.visualHue; elHueVal.textContent = settings.visualHue + "°";
        elVignette.checked = settings.visualVignette;

        refreshPresetList();
    }

    applySettingsToUI();

    function updateAndSave() {
        saveSettings();
        applyGameVisuals();
    }

    // Crosshair + Effects + Animations listeners
    elStyle.addEventListener("change", e => { settings.style = e.target.value; updateAndSave(); });
    elSize.addEventListener("input", e => { settings.size = Number(e.target.value); elSizeVal.textContent = settings.size; updateAndSave(); });
    elStroke.addEventListener("input", e => { settings.stroke = Number(e.target.value); elStrokeVal.textContent = settings.stroke; updateAndSave(); });
    elOpacity.addEventListener("input", e => { settings.opacity = Number(e.target.value); elOpacityVal.textContent = settings.opacity.toFixed(2); updateAndSave(); });
    elColor.addEventListener("input", e => { settings.color = e.target.value; updateAndSave(); });
    elDot.addEventListener("change", e => { settings.dotEnabled = e.target.checked; updateAndSave(); });
    elVisible.addEventListener("change", e => { settings.visible = e.target.checked; updateAndSave(); });
    elGlow.addEventListener("change", e => { settings.glowEnabled = e.target.checked; updateAndSave(); });
    elOutline.addEventListener("change", e => { settings.outlineEnabled = e.target.checked; updateAndSave(); });
    elGlowStrength.addEventListener("input", e => { settings.glowStrength = Number(e.target.value); elGlowVal.textContent = settings.glowStrength; updateAndSave(); });
    elAnimBreathing.addEventListener("change", e => { settings.animBreathing = e.target.checked; updateAndSave(); });
    elAnimGlow.addEventListener("change", e => { settings.animGlowPulse = e.target.checked; updateAndSave(); });
    elAnimRecoil.addEventListener("change", e => { settings.animRecoil = e.target.checked; updateAndSave(); });
    elRecoilMode.addEventListener("change", e => { settings.recoilTriggerMode = e.target.value; updateAndSave(); });

    // Presets
    elPresetSave.addEventListener("click", () => {
        const name = elPresetName.value.trim();
        if (!name) return alert("Enter a preset name");
        const snapshot = { ...settings };
        delete snapshot.menuX;
        delete snapshot.menuY;
        delete snapshot.statsVisible;
        presets[name] = snapshot;
        savePresets();
        refreshPresetList();
        elPresetName.value = "";
    });

    elPresetLoad.addEventListener("click", () => {
        const name = elPresetName.value.trim() || elPresetList.value;
        if (!name || !presets[name]) return;
        Object.assign(settings, presets[name]);
        applySettingsToUI();
        saveSettings();
        applyGameVisuals();
        lastCycledPresetName = name;
    });

    elPresetDelete.addEventListener("click", () => {
        const name = elPresetName.value.trim() || elPresetList.value;
        if (!name || !presets[name]) return;
        delete presets[name];
        savePresets();
        refreshPresetList();
    });

    elPresetList.addEventListener("change", () => elPresetName.value = elPresetList.value);

    // Game Visuals listeners
    elVibrance.addEventListener("input", e => {
        settings.visualVibrance = Number(e.target.value);
        elVibranceVal.textContent = settings.visualVibrance.toFixed(2);
        updateAndSave();
    });
    elBrightness.addEventListener("input", e => {
        settings.visualBrightness = Number(e.target.value);
        elBrightnessVal.textContent = settings.visualBrightness.toFixed(2);
        updateAndSave();
    });
    elContrast.addEventListener("input", e => {
        settings.visualContrast = Number(e.target.value);
        elContrastVal.textContent = settings.visualContrast.toFixed(2);
        updateAndSave();
    });
    elHue.addEventListener("input", e => {
        settings.visualHue = Number(e.target.value);
        elHueVal.textContent = settings.visualHue + "°";
        updateAndSave();
    });
    elVignette.addEventListener("change", e => {
        settings.visualVignette = e.target.checked;
        updateAndSave();
    });
    elSepia.addEventListener("input", e => {
    settings.visualSepia = Number(e.target.value);
    elSepiaVal.textContent = settings.visualSepia.toFixed(2);
    updateAndSave();
    });
    elInvert.addEventListener("input", e => {
        settings.visualInvert = Number(e.target.value);
        elInvertVal.textContent = settings.visualInvert.toFixed(2);
        updateAndSave();
    });
    elBlur.addEventListener("input", e => {
        settings.visualBlur = Number(e.target.value);
        elBlurVal.textContent = settings.visualBlur.toFixed(1);
        updateAndSave();
    });

    // Line ~575: Fixed reset
    elVisualsReset.addEventListener("click", () => {
        settings.visualVibrance = defaultSettings.visualVibrance;
        settings.visualBrightness = defaultSettings.visualBrightness;
        settings.visualContrast = defaultSettings.visualContrast;
        settings.visualHue = defaultSettings.visualHue;
        settings.visualVignette = defaultSettings.visualVignette;
        settings.visualSepia = defaultSettings.visualSepia;
        settings.visualInvert = defaultSettings.visualInvert;
        settings.visualBlur = defaultSettings.visualBlur;

        applySettingsToUI();   // this will update all sliders + values
        updateAndSave();
    });

    elClose.addEventListener("click", () => menu.style.display = "none");

    // Draggable menu
    const drag = menu.querySelector("#xh_drag");
    let dragging = false, offsetX = 0, offsetY = 0;

    drag.addEventListener("mousedown", e => {
        if (e.target.tagName === "SMALL") return;
        dragging = true;
        offsetX = e.clientX - menu.offsetLeft;
        offsetY = e.clientY - menu.offsetTop;
        menu.style.transform = "none";
    });

    document.addEventListener("mousemove", e => {
        if (!dragging) return;
        const x = e.clientX - offsetX;
        const y = e.clientY - offsetY;
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        settings.menuX = x;
        settings.menuY = y;
        saveSettings();
    });

    document.addEventListener("mouseup", () => dragging = false);

    // ---------------------------
    // Hotkeys
    // ---------------------------
    function cyclePreset(direction) {
        const names = Object.keys(presets).sort();
        if (names.length === 0) return;

        let idx = names.indexOf(lastCycledPresetName);
        if (idx === -1) idx = 0;

        idx = (idx + direction + names.length) % names.length;
        const nextName = names[idx];
        lastCycledPresetName = nextName;

        if (presets[nextName]) {
            Object.assign(settings, presets[nextName]);
            applySettingsToUI();
            saveSettings();
            applyGameVisuals();
            console.log(`%c✅ Loaded preset: ${nextName}`, "color:#00ffea;font-weight:bold");
        }
    }

    document.addEventListener("keydown", e => {
        if (e.key.toLowerCase() === "o") {
            menu.style.display = (menu.style.display === "none" || menu.style.display === "") ? "block" : "none";
        } else if (e.key.toLowerCase() === "i") {
            settings.visible = !settings.visible;
            elVisible.checked = settings.visible;
            saveSettings();
        } else if (e.key.toLowerCase() === "u") {
            settings.statsVisible = !settings.statsVisible;
            statsHUD.style.opacity = settings.statsVisible ? "1" : "0.15";
            updateStatsHUD();
            saveSettings();
        } else if (e.ctrlKey && e.key === "ArrowRight") {
            e.preventDefault();
            cyclePreset(1);
        } else if (e.ctrlKey && e.key === "ArrowLeft") {
            e.preventDefault();
            cyclePreset(-1);
        }
    });

    // Initial HUD state
    statsHUD.style.opacity = settings.statsVisible ? "1" : "0.15";

    console.log("%c✅ Veck.io Advanced Crosshair + HUD + Game Visuals v2.2 loaded — the game is no longer plain 🔥", "color:#00ffea;font-weight:bold");
})();
