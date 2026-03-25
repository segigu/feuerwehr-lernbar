interface Particle {
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

const MAX_PARTICLES = 800;
const GRAVITY = 0.12;
const DRAG = 0.997;

export function playWaterFountain(): () => void {
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

  const particles: Particle[] = [];
  let frame = 0;
  let animId = 0;
  let stopped = false;

  function emit(count: number): void {
    for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
      particles.push({
        x: w / 2 + (Math.random() - 0.5) * 30,
        y: h,
        vx: (Math.random() - 0.5) * 12,
        vy: -(12 + Math.random() * 10),
        radius: 2 + Math.random() * 5,
        alpha: 0.6 + Math.random() * 0.4,
        life: 1,
        decay: 0.003 + Math.random() * 0.005,
        hue: 195 + Math.random() * 20,
      });
    }
  }

  function update(): void {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.vy += GRAVITY;
      p.vx *= DRAG;
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;

      if (p.life <= 0 || p.y > h + 20) {
        particles.splice(i, 1);
      }
    }
  }

  function draw(): void {
    ctx!.clearRect(0, 0, w, h);

    for (const p of particles) {
      const a = p.life * p.alpha;
      if (a < 0.01) continue;

      // Glow for larger droplets
      if (p.radius > 4) {
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.radius * 2.5, 0, Math.PI * 2);
        ctx!.fillStyle = `hsla(${p.hue}, 80%, 70%, ${a * 0.15})`;
        ctx!.fill();
      }

      // Droplet
      if (p.radius < 3) {
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx!.fillStyle = `hsla(${p.hue}, 75%, 60%, ${a})`;
        ctx!.fill();
      } else {
        const grad = ctx!.createRadialGradient(
          p.x, p.y, 0,
          p.x, p.y, p.radius,
        );
        grad.addColorStop(0, `hsla(${p.hue}, 80%, 70%, ${a})`);
        grad.addColorStop(0.6, `hsla(${p.hue}, 70%, 55%, ${a * 0.7})`);
        grad.addColorStop(1, `hsla(${p.hue}, 60%, 45%, 0)`);
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx!.fillStyle = grad;
        ctx!.fill();
      }
    }
  }

  function loop(): void {
    if (stopped) return;
    frame++;

    // Phase 1: Burst (0-45 frames)
    if (frame <= 45) {
      emit(25 + Math.floor(Math.random() * 10));
    }
    // Phase 2: Spray (45-120 frames), tapering off
    else if (frame <= 120) {
      const rate = Math.max(0, 12 - Math.floor((frame - 45) / 7));
      emit(rate);
    }
    // Phase 3: Settle — no new particles

    update();
    draw();

    if (particles.length === 0 && frame > 120) {
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
