// Doom Fire Spread algorithm (PSX Doom / Fabien Sanglard)
// Pixel-based fire simulation with heat propagation and horizontal drift

const PALETTE: [number, number, number][] = [
  [7,7,7],       [31,7,7],      [47,15,7],     [71,15,7],
  [87,23,7],     [103,31,7],    [119,31,7],     [143,39,7],
  [159,47,7],    [175,63,7],    [191,71,7],     [199,71,7],
  [223,79,7],    [223,87,7],    [223,87,7],     [215,95,7],
  [215,95,7],    [215,103,15],  [207,111,15],   [207,119,15],
  [207,127,15],  [207,135,23],  [199,135,23],   [199,143,23],
  [199,151,31],  [191,159,31],  [191,159,31],   [191,167,39],
  [191,167,39],  [191,175,47],  [183,175,47],   [183,183,47],
  [183,183,55],  [207,207,111], [223,223,159],  [239,239,199],
  [255,255,255],
];

const MAX_HEAT = PALETTE.length - 1;

export function playFireEffect(): () => void {
  const dpr = window.devicePixelRatio || 1;
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;

  // Low-res simulation grid (scaled down for performance + organic look)
  const SCALE = 3;
  const fireW = Math.ceil(screenW / SCALE);
  const fireH = Math.ceil(screenH / SCALE);

  // Two canvases: small for simulation, big for display
  const simCanvas = document.createElement('canvas');
  simCanvas.width = fireW;
  simCanvas.height = fireH;
  const simCtx = simCanvas.getContext('2d')!;

  const canvas = document.createElement('canvas');
  canvas.style.cssText =
    'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9999';
  canvas.width = Math.ceil(screenW * dpr);
  canvas.height = Math.ceil(screenH * dpr);
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return () => {};
  }

  const firePixels = new Uint8Array(fireW * fireH);
  const imageData = simCtx.createImageData(fireW, fireH);

  let frame = 0;
  let animId = 0;
  let stopped = false;

  // Phases control the heat source intensity
  const IGNITE_FRAMES = 35;
  const BLAZE_FRAMES = 70;
  const FADE_FRAMES = 80;
  const TOTAL = IGNITE_FRAMES + BLAZE_FRAMES + FADE_FRAMES;

  function setHeatSource(intensity: number): void {
    // Set bottom row heat based on intensity (0..1)
    const y = fireH - 1;
    for (let x = 0; x < fireW; x++) {
      const heat = Math.floor(MAX_HEAT * intensity);
      // Add slight randomness so it's not a perfect line
      const jitter = Math.floor(Math.random() * 4);
      firePixels[y * fireW + x] = Math.max(0, Math.min(MAX_HEAT, heat - jitter));
    }
  }

  function spreadFire(): void {
    for (let x = 0; x < fireW; x++) {
      for (let y = 1; y < fireH; y++) {
        const src = y * fireW + x;
        const rand = Math.round(Math.random() * 3) & 3;
        const dstX = Math.max(0, Math.min(fireW - 1, x - rand + 1));
        const dst = (y - 1) * fireW + dstX;
        firePixels[dst] = Math.max(0, firePixels[src] - (rand & 1));
      }
    }
  }

  function render(): void {
    const data = imageData.data;
    for (let i = 0; i < fireW * fireH; i++) {
      const color = PALETTE[firePixels[i]];
      const px = i * 4;
      data[px] = color[0];
      data[px + 1] = color[1];
      data[px + 2] = color[2];
      // Transparent for lowest heat values so content shows through
      data[px + 3] = firePixels[i] < 2 ? 0 : Math.min(255, firePixels[i] * 12);
    }
    simCtx.putImageData(imageData, 0, 0);

    // Scale up to display canvas
    ctx!.clearRect(0, 0, canvas.width, canvas.height);
    ctx!.imageSmoothingEnabled = true;
    ctx!.drawImage(simCanvas, 0, 0, canvas.width, canvas.height);
  }

  function loop(): void {
    if (stopped) return;
    frame++;

    // Control heat source by phase
    let intensity: number;
    if (frame <= IGNITE_FRAMES) {
      // Build up
      intensity = frame / IGNITE_FRAMES;
    } else if (frame <= IGNITE_FRAMES + BLAZE_FRAMES) {
      // Full blaze
      intensity = 1;
    } else if (frame <= TOTAL) {
      // Fade out — reduce heat source
      const fadeProgress = (frame - IGNITE_FRAMES - BLAZE_FRAMES) / FADE_FRAMES;
      intensity = 1 - fadeProgress;
    } else {
      intensity = 0;
    }

    if (intensity > 0) {
      setHeatSource(intensity);
    } else {
      // Kill heat source — let remaining fire burn out
      const y = fireH - 1;
      for (let x = 0; x < fireW; x++) {
        firePixels[y * fireW + x] = 0;
      }
    }

    spreadFire();
    render();

    // Check if fire is completely out
    if (frame > TOTAL) {
      let hasHeat = false;
      for (let i = 0; i < firePixels.length; i++) {
        if (firePixels[i] > 1) { hasHeat = true; break; }
      }
      if (!hasHeat) {
        cleanup();
        return;
      }
    }

    animId = requestAnimationFrame(loop);
  }

  function cleanup(): void {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(animId);
    canvas.remove();
  }

  animId = requestAnimationFrame(loop);

  return cleanup;
}
