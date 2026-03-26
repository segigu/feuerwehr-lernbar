let sentinel: WakeLockSentinel | null = null;
let videoEl: HTMLVideoElement | null = null;
let videoStarted = false;

// --- Native Wake Lock API ---

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

// --- Video-based fallback ---
// Playing a tiny silent video in a loop keeps the screen awake
// on platforms where the native API is missing or broken (iOS, Telegram WebView).

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

function createVideoElement(): void {
  if (videoEl) return;
  videoEl = document.createElement('video');
  videoEl.setAttribute('playsinline', '');
  videoEl.setAttribute('loop', '');
  videoEl.muted = true;
  videoEl.src = SILENT_MP4;
  videoEl.style.cssText =
    'position:fixed;top:-1px;left:-1px;width:1px;height:1px;opacity:0.01;pointer-events:none';
  document.body.appendChild(videoEl);
}

function playVideo(): void {
  if (!videoEl) createVideoElement();
  videoEl!.play().catch(() => {});
  videoStarted = true;
}

// --- Interaction handler (persistent, NOT once) ---

function onInteraction(): void {
  if (!videoStarted) {
    playVideo();
  } else if (videoEl && videoEl.paused) {
    videoEl.play().catch(() => {});
  }
}

// --- Visibility change: re-acquire everything ---

function onVisibilityChange(): void {
  if (document.visibilityState !== 'visible') return;
  acquireNativeWakeLock();
  if (videoStarted && videoEl) {
    videoEl.play().catch(() => {});
  }
}

// --- Health check: belt and suspenders ---

function checkHealth(): void {
  if (document.visibilityState !== 'visible') return;

  if ('wakeLock' in navigator && sentinel === null) {
    acquireNativeWakeLock();
  }

  if (videoStarted && videoEl && videoEl.paused) {
    videoEl.play().catch(() => {});
  }
}

// --- Public API ---

export function initWakeLock(): void {
  // Strategy 1: native Wake Lock API (may silently fail in Telegram WebView)
  acquireNativeWakeLock();

  // Strategy 2: video fallback (needs user gesture to start, then kept alive)
  document.addEventListener('touchstart', onInteraction, { passive: true });
  document.addEventListener('click', onInteraction);

  // Re-acquire both on visibility change
  document.addEventListener('visibilitychange', onVisibilityChange);

  // Periodic health check
  setInterval(checkHealth, 30_000);
}
