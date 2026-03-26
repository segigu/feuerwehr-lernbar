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
  seed: number;  // unique per flame for shape variation
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
        vx: (Math.random() - 0.5) * 1.2,
        vy: -(3.5 + Math.random() * 4.5),
        width: 5 + Math.random() * 10,
        height: 30 + Math.random() * 55,
        alpha: 0.5 + Math.random() * 0.5,
        life: 1,
        decay: 0.005 + Math.random() * 0.007,
        hue: 5 + Math.random() * 30,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.06 + Math.random() * 0.12,
        seed: Math.random() * 1000,
      });
    }
  }

  function update(): void {
    for (let i = flames.length - 1; i >= 0; i--) {
      const f = flames[i];
      f.vy *= 0.992;
      f.vx += Math.sin(f.wobble) * 0.25;
      f.vx *= 0.95;
      f.x += f.vx;
      f.y += f.vy;
      f.life -= f.decay;
      f.wobble += f.wobbleSpeed;

      // flames narrow as they rise, height shrinks slower
      f.width *= 0.996;
      f.height *= 0.997;

      // shift hue toward yellow at top
      if (f.hue < 50) f.hue += 0.5;

      if (f.life <= 0 || f.y < h * 0.1) {
        flames.splice(i, 1);
      }
    }
  }

  function drawFlame(f: Flame): void {
    const a = f.life * f.alpha;
    if (a < 0.01) return;

    const cx = f.x;
    const bot = f.y;
    const flameH = f.height;
    const halfW = f.width / 2;

    // Dynamic wobble offsets for organic shape
    const t = f.wobble;
    const tipX = cx + Math.sin(t * 2.3) * halfW * 0.6;
    const tipY = bot - flameH;

    // Asymmetric bulge points for left and right edges
    const leftBulge = halfW * (0.8 + 0.3 * Math.sin(t * 1.7 + f.seed));
    const rightBulge = halfW * (0.8 + 0.3 * Math.sin(t * 2.1 + f.seed + 2));
    const leftNarrow = halfW * (0.3 + 0.15 * Math.sin(t * 3.1 + f.seed));
    const rightNarrow = halfW * (0.3 + 0.15 * Math.sin(t * 2.7 + f.seed + 1));

    const c = ctx!;
    c.save();

    // Flame tongue: bottom → left bulge → narrow waist → tip → narrow waist → right bulge → bottom
    c.beginPath();
    c.moveTo(cx, bot);

    // Left side: bottom to tip
    c.bezierCurveTo(
      cx - leftBulge * 1.3, bot - flameH * 0.2,   // wide at base
      cx - leftNarrow * 1.5, bot - flameH * 0.55,  // narrow waist
      tipX, tipY                                     // pointed tip
    );

    // Right side: tip back to bottom
    c.bezierCurveTo(
      cx + rightNarrow * 1.5, bot - flameH * 0.55, // narrow waist
      cx + rightBulge * 1.3, bot - flameH * 0.2,   // wide at base
      cx, bot                                        // back to bottom
    );

    c.closePath();

    // Gradient: bright yellow-white at base → orange → red → transparent at tip
    const grad = c.createLinearGradient(cx, bot, cx, tipY);
    const coreHue = Math.min(f.hue + 20, 55);
    grad.addColorStop(0, `hsla(${coreHue}, 100%, 75%, ${a * 0.95})`);
    grad.addColorStop(0.15, `hsla(${f.hue + 15}, 100%, 62%, ${a * 0.85})`);
    grad.addColorStop(0.4, `hsla(${f.hue + 5}, 100%, 50%, ${a * 0.55})`);
    grad.addColorStop(0.7, `hsla(${Math.max(f.hue - 5, 0)}, 100%, 35%, ${a * 0.25})`);
    grad.addColorStop(1, `hsla(${Math.max(f.hue - 10, 0)}, 100%, 20%, 0)`);
    c.fillStyle = grad;
    c.fill();

    // Inner bright core — thinner, brighter, slightly offset
    const innerH = flameH * 0.55;
    const innerHW = halfW * 0.3;
    const innerTipX = cx + Math.sin(t * 3) * innerHW * 0.5;
    const innerTipY = bot - innerH;

    c.beginPath();
    c.moveTo(cx, bot);
    c.bezierCurveTo(
      cx - innerHW * 0.8, bot - innerH * 0.25,
      cx - innerHW * 0.5, bot - innerH * 0.6,
      innerTipX, innerTipY
    );
    c.bezierCurveTo(
      cx + innerHW * 0.5, bot - innerH * 0.6,
      cx + innerHW * 0.8, bot - innerH * 0.25,
      cx, bot
    );
    c.closePath();

    const innerGrad = c.createLinearGradient(cx, bot, cx, innerTipY);
    innerGrad.addColorStop(0, `hsla(50, 100%, 95%, ${a * 0.8})`);
    innerGrad.addColorStop(0.4, `hsla(48, 100%, 80%, ${a * 0.5})`);
    innerGrad.addColorStop(1, `hsla(45, 100%, 65%, 0)`);
    c.fillStyle = innerGrad;
    c.fill();

    c.restore();
  }

  function draw(): void {
    ctx!.clearRect(0, 0, w, h);

    // Bottom glow
    const intensity = Math.min(flames.length / 80, 1);
    if (intensity > 0.05) {
      const glowGrad = ctx!.createLinearGradient(0, h, 0, h - 250);
      glowGrad.addColorStop(0, `hsla(20, 100%, 50%, ${intensity * 0.35})`);
      glowGrad.addColorStop(0.4, `hsla(15, 100%, 40%, ${intensity * 0.12})`);
      glowGrad.addColorStop(1, `hsla(10, 100%, 30%, 0)`);
      ctx!.fillStyle = glowGrad;
      ctx!.fillRect(0, h - 250, w, 250);
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
