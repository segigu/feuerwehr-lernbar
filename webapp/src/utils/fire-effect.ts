export function playFireEffect(): () => void {
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;

  const canvas = document.createElement('canvas');
  canvas.style.cssText =
    'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9999';
  canvas.width = Math.ceil(w * dpr);
  canvas.height = Math.ceil(h * dpr);
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return () => {};
  }
  ctx.scale(dpr, dpr);

  let frame = 0;
  let animId = 0;
  let stopped = false;

  // Total duration: ~4 seconds at 60fps
  const RISE_FRAMES = 60;      // gradient rises up
  const HOLD_FRAMES = 60;      // holds at peak
  const FADE_FRAMES = 120;     // fades out
  const TOTAL = RISE_FRAMES + HOLD_FRAMES + FADE_FRAMES;

  function draw(): void {
    ctx!.clearRect(0, 0, w, h);

    let progress: number; // 0..1 how much of the screen the gradient covers
    let alpha: number;    // overall opacity

    if (frame <= RISE_FRAMES) {
      // Rise phase: gradient grows from bottom
      progress = frame / RISE_FRAMES;
      alpha = 1;
    } else if (frame <= RISE_FRAMES + HOLD_FRAMES) {
      // Hold phase: full height, full intensity
      progress = 1;
      alpha = 1;
    } else {
      // Fade phase: alpha decreases
      progress = 1;
      const fadeFrame = frame - RISE_FRAMES - HOLD_FRAMES;
      alpha = 1 - fadeFrame / FADE_FRAMES;
    }

    // Ease the progress for smoother rise
    const easedProgress = progress < 1
      ? 1 - (1 - progress) * (1 - progress)
      : 1;

    const gradientHeight = h * 0.6 * easedProgress;
    const gradTop = h - gradientHeight;

    const grad = ctx!.createLinearGradient(0, h, 0, gradTop);
    grad.addColorStop(0, `hsla(0, 100%, 50%, ${alpha * 0.7})`);       // red at bottom
    grad.addColorStop(0.3, `hsla(15, 100%, 50%, ${alpha * 0.5})`);    // orange-red
    grad.addColorStop(0.6, `hsla(30, 100%, 55%, ${alpha * 0.3})`);    // orange
    grad.addColorStop(0.85, `hsla(45, 100%, 60%, ${alpha * 0.12})`);  // yellow-orange
    grad.addColorStop(1, `hsla(55, 100%, 65%, 0)`);                   // transparent yellow

    ctx!.fillStyle = grad;
    ctx!.fillRect(0, gradTop, w, gradientHeight);
  }

  function loop(): void {
    if (stopped) return;
    frame++;

    draw();

    if (frame >= TOTAL) {
      cleanup();
      return;
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
