interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  life: number;
  decay: number;
  hue: number;
}

const MAX_EMBERS = 600;
const BUOYANCY = -0.06;
const DRAG = 0.995;

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

  const embers: Ember[] = [];
  let frame = 0;
  let animId = 0;
  let stopped = false;

  function emit(count: number): void {
    for (let i = 0; i < count && embers.length < MAX_EMBERS; i++) {
      const xSpread = w * 0.8;
      const xBase = w * 0.1;
      embers.push({
        x: xBase + Math.random() * xSpread,
        y: h + 5 + Math.random() * 20,
        vx: (Math.random() - 0.5) * 3,
        vy: -(2 + Math.random() * 5),
        radius: 3 + Math.random() * 8,
        alpha: 0.5 + Math.random() * 0.5,
        life: 1,
        decay: 0.005 + Math.random() * 0.008,
        hue: 10 + Math.random() * 35, // red-orange-yellow
      });
    }
  }

  function update(): void {
    for (let i = embers.length - 1; i >= 0; i--) {
      const e = embers[i];
      e.vy += BUOYANCY;
      e.vx += (Math.random() - 0.5) * 0.4; // flicker sideways
      e.vx *= DRAG;
      e.x += e.vx;
      e.y += e.vy;
      e.life -= e.decay;
      e.radius *= 0.998;

      // shift hue toward yellow as it rises
      if (e.hue < 50) e.hue += 0.3;

      if (e.life <= 0 || e.y < -20) {
        embers.splice(i, 1);
      }
    }
  }

  function draw(): void {
    ctx!.clearRect(0, 0, w, h);

    for (const e of embers) {
      const a = e.life * e.alpha;
      if (a < 0.01) continue;

      // Outer glow
      const glowR = e.radius * 3;
      const glow = ctx!.createRadialGradient(e.x, e.y, 0, e.x, e.y, glowR);
      glow.addColorStop(0, `hsla(${e.hue}, 100%, 60%, ${a * 0.25})`);
      glow.addColorStop(1, `hsla(${e.hue}, 100%, 50%, 0)`);
      ctx!.beginPath();
      ctx!.arc(e.x, e.y, glowR, 0, Math.PI * 2);
      ctx!.fillStyle = glow;
      ctx!.fill();

      // Core ember
      const grad = ctx!.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.radius);
      grad.addColorStop(0, `hsla(${Math.min(e.hue + 15, 55)}, 100%, 80%, ${a})`);
      grad.addColorStop(0.4, `hsla(${e.hue}, 100%, 55%, ${a * 0.8})`);
      grad.addColorStop(1, `hsla(${Math.max(e.hue - 10, 0)}, 100%, 30%, 0)`);
      ctx!.beginPath();
      ctx!.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx!.fillStyle = grad;
      ctx!.fill();
    }
  }

  function loop(): void {
    if (stopped) return;
    frame++;

    // Phase 1: Ignite (0-30) — build up
    if (frame <= 30) {
      const rate = Math.floor(3 + (frame / 30) * 15);
      emit(rate);
    }
    // Phase 2: Blaze (30-80) — full intensity
    else if (frame <= 80) {
      emit(18 + Math.floor(Math.random() * 8));
    }
    // Phase 3: Die down (80-140) — taper off
    else if (frame <= 140) {
      const rate = Math.max(0, 18 - Math.floor((frame - 80) / 4));
      emit(rate);
    }
    // Phase 4: Embers settle — no new particles

    update();
    draw();

    if (embers.length === 0 && frame > 140) {
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
