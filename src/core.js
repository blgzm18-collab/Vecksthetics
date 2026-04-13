// Vecksthetics core
// Loaded by Tampermonkey from GitHub

(function() {
  console.log('[Vecksthetics] core.js loaded');

  function findGameCanvas() {
    // Most Unity WebGL builds use a single <canvas>
    const canvases = document.getElementsByTagName('canvas');
    if (!canvases.length) return null;

    // If there are multiple, pick the biggest one
    let best = canvases[0];
    let bestArea = best.width * best.height;

    for (let i = 1; i < canvases.length; i++) {
      const c = canvases[i];
      const area = c.width * c.height;
      if (area > bestArea) {
        best = c;
        bestArea = area;
      }
    }

    return best;
  }

  function applyCanvasAesthetic(canvas) {
    if (!canvas) {
      console.warn('[Vecksthetics] No canvas found to style');
      return;
    }

    // Example: subtle neon-ish vibe
    canvas.style.transition = 'filter 0.3s ease';
    canvas.style.filter = 'saturate(1.3) contrast(1.05) hue-rotate(10deg)';
    console.log('[Vecksthetics] Applied canvas aesthetic');
  }

  function init() {
    const canvas = findGameCanvas();
    if (canvas) {
      applyCanvasAesthetic(canvas);
    } else {
      // Retry a few times in case Unity loads slowly
      let attempts = 0;
      const maxAttempts = 30;
      const interval = setInterval(() => {
        const c = findGameCanvas();
        attempts++;
        if (c) {
          clearInterval(interval);
          applyCanvasAesthetic(c);
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          console.warn('[Vecksthetics] Gave up finding canvas');
        }
      }, 500);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
