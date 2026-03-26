let sentinel: WakeLockSentinel | null = null;
let videoEl: HTMLVideoElement | null = null;
let videoStarted = false;
let canvasStreamEl: HTMLVideoElement | null = null;

// --- Strategy 1: Native Wake Lock API ---

async function acquireNativeWakeLock(): Promise<void> {
  if (!('wakeLock' in navigator) || sentinel !== null) return;
  try {
    sentinel = await navigator.wakeLock.request('screen');
    sentinel.addEventListener('release', () => {
      sentinel = null;
      if (document.visibilityState === 'visible') {
        acquireNativeWakeLock();
      }
    });
  } catch {
    sentinel = null;
  }
}

// --- Strategy 2: Silent video loop ---

// Minimal 1-second silent MP4 (base64, ~1KB)
const SILENT_MP4 =
  'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZn' +
  'JlZQAAAu1tZGF0AAACrQYF//+p3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE2NCBy' +
  'MzA5NSBiYWVlNDAwIC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMD' +
  'MtMjAyMyAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6' +
  'IGNhYmFjPTEgcmVmPTEgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MToweDExMSBtZT1oZX' +
  'ggc3VibWU9NyBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0xIG1lX3Jhbmdl' +
  'PTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MSA4eDhkY3Q9MSBjcW09MCBkZWFkem9uZT0yMS' +
  'wxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0tMiB0aHJlYWRzPTMgbG9va2Fo' +
  'ZWFkX3RocmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcm' +
  'xhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0w' +
  'IHdlaWdodHA9MCBrZXlpbnQ9MjUwIGtleWludF9taW49MSBzY2VuZWN1dD00MCBpbnRyYV9y' +
  'ZWZyZXNoPTAgcmNfbG9va2FoZWFkPTQwIHJjPWNyZiBtYnRyZWU9MSBjcmY9MjMuMCBxY2' +
  '9tcD0wLjYwIHFwbWluPTAgcXBtYXg9NjkgcXBzdGVwPTQgaXBfcmF0aW89MS40MCBhcT0xOj' +
  'EuMDAAgAAAAA9liIQAV/0TAAYdeBTXzg8AAALvbW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD' +
  '6AAAACoAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAhl0cmFrAAAAXHRraGQAAAADAAAAAAAAAAAA' +
  'AAABAAAAAAAAACgAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAA' +
  'AABAAAAAAAgAAAAIAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAAAZAAADAAABAAAAAAGRZW' +
  'RpYQAAACBtZGhkAAAAAAAAAAAAAAAAAAAoAAAAAgBVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUA' +
  'AAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAABPG1pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACR' +
  'kaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAP9zdGJsAAAAk3N0c2QAAAAAAAAA' +
  'AQAAAINhdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAgACABIAAAASAAAAAAAAAABAAAAAAAA' +
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGP//' +
  'AAAAMWF2Y0MBZAAf/+EAGGdkAB+s2UCYM+XhAAAAAwBAAAADAoPFi2WAAAAAGNjrEAAAAAAA' +
  'ABBwYXNwAAAAAQAAAAEAAAAYc3R0cwAAAAAAAAABAAAAAgAAAgAAAAAUc3RzcwAAAAAAAAABAA' +
  'AAARAAAAB4Y3R0cwAAAAAAAAACAAAAAgAAAwAAAAABAAAFAAAAAAFzdHNjAAAAAAAAAAEAAAAB' +
  'AAAAAgAAAAEAAAAcc3RzegAAAAAAAAAAAAAAAgAAABcAAAAEAAAAFHN0Y28AAAAAAAAABAAAAB' +
  'sAAALyAAAC+QAAA3A=';

const HIDDEN_STYLE = 'position:fixed;top:0;left:0;width:10px;height:10px;opacity:0.01;pointer-events:none;z-index:-1';

function createVideoElement(): void {
  if (videoEl) return;
  videoEl = document.createElement('video');
  videoEl.setAttribute('playsinline', '');
  videoEl.setAttribute('loop', '');
  videoEl.muted = true;
  videoEl.src = SILENT_MP4;
  videoEl.style.cssText = HIDDEN_STYLE;

  // Auto-recover if paused by OS
  videoEl.addEventListener('pause', () => {
    if (videoStarted && document.visibilityState === 'visible') {
      videoEl?.play().catch(() => {});
    }
  });
  videoEl.addEventListener('ended', () => {
    if (videoEl) {
      videoEl.currentTime = 0;
      videoEl.play().catch(() => {});
    }
  });

  document.body.appendChild(videoEl);
}

function playVideo(): void {
  if (!videoEl) createVideoElement();
  videoEl!.play().catch(() => {});
  videoStarted = true;
}

// --- Strategy 3: Canvas capture stream ---
// Creates a live video stream from a canvas. Browsers treat live streams
// as active media that must keep the screen awake.

function startCanvasStream(): void {
  if (canvasStreamEl) return;

  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 2;
  const ctx = canvas.getContext('2d');
  if (!ctx || typeof canvas.captureStream !== 'function') return;

  // Draw periodically to keep the stream alive
  setInterval(() => {
    ctx.fillStyle = ctx.fillStyle === '#000' ? '#001' : '#000';
    ctx.fillRect(0, 0, 2, 2);
  }, 1000);

  const stream = canvas.captureStream(1);
  canvasStreamEl = document.createElement('video');
  canvasStreamEl.srcObject = stream;
  canvasStreamEl.setAttribute('playsinline', '');
  canvasStreamEl.muted = true;
  canvasStreamEl.style.cssText = HIDDEN_STYLE;
  document.body.appendChild(canvasStreamEl);
  canvasStreamEl.play().catch(() => {});
}

// --- Interaction handler (persistent, NOT once) ---

function onInteraction(): void {
  // Start video on first gesture, restart if paused
  if (!videoStarted) {
    playVideo();
  } else if (videoEl && videoEl.paused) {
    videoEl.play().catch(() => {});
  }

  // Start canvas stream on first gesture too (may need gesture on some browsers)
  if (!canvasStreamEl) {
    startCanvasStream();
  } else if (canvasStreamEl.paused) {
    canvasStreamEl.play().catch(() => {});
  }
}

// --- Visibility change: re-acquire everything ---

function onVisibilityChange(): void {
  if (document.visibilityState !== 'visible') return;
  acquireNativeWakeLock();
  if (videoStarted && videoEl) {
    videoEl.play().catch(() => {});
  }
  if (canvasStreamEl) {
    canvasStreamEl.play().catch(() => {});
  }
}

// --- Health check every 15s ---

function checkHealth(): void {
  if (document.visibilityState !== 'visible') return;

  if ('wakeLock' in navigator && sentinel === null) {
    acquireNativeWakeLock();
  }

  if (videoStarted && videoEl && videoEl.paused) {
    videoEl.play().catch(() => {});
  }

  if (canvasStreamEl && canvasStreamEl.paused) {
    canvasStreamEl.play().catch(() => {});
  }
}

// --- Public API ---

export function initWakeLock(): void {
  // Strategy 1: native Wake Lock API
  acquireNativeWakeLock();

  // Strategy 2+3: video + canvas stream (need user gesture to start)
  document.addEventListener('touchstart', onInteraction, { passive: true });
  document.addEventListener('click', onInteraction);

  // Re-acquire all on visibility change
  document.addEventListener('visibilitychange', onVisibilityChange);

  // Aggressive health check
  setInterval(checkHealth, 15_000);
}
