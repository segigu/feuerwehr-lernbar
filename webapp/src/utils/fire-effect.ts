interface Flame {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  alpha: number;
  life: number;
  decay: number;
  hue: number;
  wobble: number;
  wobbleSpeed: number;
}

const MAX_FLAMES = 500;

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

  const flames: Flame[] = [];
  let frame = 0;
  let animId = 0;
  let stopped = false;

  function emit(count: number): void {
    for (let i = 0; i < count && flames.length < MAX_FLAMES; i++) {
      const xSpread = w * 0.9;
      const xBase = w * 0.05;
      flames.push({
        x: xBase + Math.random() * xSpread,
        y: h + Math.random() * 10,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -(3 + Math.random() * 4),
        width: 6 + Math.random() * 14,
        height: 20 + Math.random() * 40,
        alpha: 0.6 + Math.random() * 0.4,
        life: 1,
        decay: 0.006 + Math.random() * 0.008,
        hue: 5 + Math.random() * 30,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.05 + Math.random() * 0.1,
      });
    }
  }

  function update(): void {
    for (let i = flames.length - 1; i >= 0; i--) {
      const f = flames[i];
      f.vy *= 0.99;
      f.vx += Math.sin(f.wobble) * 0.3;
      f.vx *= 0.96;
      f.x += f.vx;
      f.y += f.vy;
      f.life -= f.decay;
      f.wobble += f.wobbleSpeed;

      // flames narrow and shorten as they rise
      f.width *= 0.997;
      f.height *= 0.995;

      // shift hue toward yellow at top
      if (f.hue < 50) f.hue += 0.4;

      if (f.life <= 0 || f.y < h * 0.15) {
        flames.splice(i, 1);
      }
    }
  }

  function drawFlame(f: Flame): void {
    const a = f.life * f.alpha;
    if (a < 0.01) return;

    const cx = f.x;
    const bot = f.y;
    const top = f.y - f.height;
    const halfW = f.width / 2;

    // wobble the tip
    const tipOffsetX = Math.sin(f.wobble * 2) * halfW * 0.4;

    const c = ctx!;
    c.save();

    // Tongue of flame shape using bezier curves
    c.beginPath();
    c.moveTo(cx - halfW * 0.3, bot); // bottom left
    c.quadraticCurveTo(cx - halfW * 1.1, bot - f.height * 0.3, cx + tipOffsetX, top); // left curve to tip
    c.quadraticCurveTo(cx + halfW * 1.1, bot - f.height * 0.3, cx + halfW * 0.3, bot); // tip to right curve
    c.closePath();

    // Gradient from bottom (bright) to top (transparent)
    const grad = c.createLinearGradient(cx, bot, cx, top);
    const coreHue = Math.min(f.hue + 20, 55);
    grad.addColorStop(0, `hsla(${coreHue}, 100%, 70%, ${a * 0.9})`);
    grad.addColorStop(0.2, `hsla(${f.hue + 10}, 100%, 60%, ${a * 0.8})`);
    grad.addColorStop(0.5, `hsla(${f.hue}, 100%, 50%, ${a * 0.5})`);
    grad.addColorStop(0.8, `hsla(${Math.max(f.hue - 5, 0)}, 100%, 35%, ${a * 0.2})`);
    grad.addColorStop(1, `hsla(${Math.max(f.hue - 10, 0)}, 100%, 20%, 0)`);
    c.fillStyle = grad;
    c.fill();

    // Inner bright core (narrower, brighter)
    c.beginPath();
    const innerW = halfW * 0.4;
    const innerTop = bot - f.height * 0.6;
    c.moveTo(cx - innerW * 0.2, bot);
    c.quadraticCurveTo(cx - innerW * 0.8, bot - f.height * 0.2, cx + tipOffsetX * 0.5, innerTop);
    c.quadraticCurveTo(cx + innerW * 0.8, bot - f.height * 0.2, cx + innerW * 0.2, bot);
    c.closePath();

    const innerGrad = c.createLinearGradient(cx, bot, cx, innerTop);
    innerGrad.addColorStop(0, `hsla(50, 100%, 90%, ${a * 0.7})`);
    innerGrad.addColorStop(0.5, `hsla(45, 100%, 75%, ${a * 0.4})`);
    innerGrad.addColorStop(1, `hsla(40, 100%, 60%, 0)`);
    c.fillStyle = innerGrad;
    c.fill();

    c.restore();
  }

  function draw(): void {
    ctx!.clearRect(0, 0, w, h);

    // Bottom glow
    const intensity = Math.min(flames.length / 80, 1);
    if (intensity > 0.05) {
      const glowGrad = ctx!.createLinearGradient(0, h, 0, h - 200);
      glowGrad.addColorStop(0, `hsla(20, 100%, 50%, ${intensity * 0.3})`);
      glowGrad.addColorStop(0.5, `hsla(15, 100%, 40%, ${intensity * 0.1})`);
      glowGrad.addColorStop(1, `hsla(10, 100%, 30%, 0)`);
      ctx!.fillStyle = glowGrad;
      ctx!.fillRect(0, h - 200, w, 200);
    }

    // Sort by size so smaller flames render on top (depth)
    const sorted = flames.slice().sort((a, b) => b.height - a.height);
    for (const f of sorted) {
      drawFlame(f);
    }
  }

  function loop(): void {
    if (stopped) return;
    frame++;

    // Phase 1: Ignite (0-30) — build up
    if (frame <= 30) {
      const rate = Math.floor(2 + (frame / 30) * 10);
      emit(rate);
    }
    // Phase 2: Blaze (30-90) — full intensity
    else if (frame <= 90) {
      emit(10 + Math.floor(Math.random() * 5));
    }
    // Phase 3: Die down (90-150) — taper off
    else if (frame <= 150) {
      const rate = Math.max(0, 12 - Math.floor((frame - 90) / 5));
      emit(rate);
    }
    // Phase 4: Settle — no new flames

    update();
    draw();

    if (flames.length === 0 && frame > 150) {
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
