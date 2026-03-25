let wakeLock: WakeLockSentinel | null = null;

// --- Standard Wake Lock API ---

async function requestWakeLock(): Promise<void> {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch {
    // Ignore — browser denied or feature unavailable
  }
}

// --- Video-based fallback for iOS PWA ---
// iOS in standalone mode may not support the Wake Lock API.
// Playing a tiny silent video in a loop keeps the screen awake.

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

let videoEl: HTMLVideoElement | null = null;

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function createVideoWakeLock(): void {
  if (videoEl) return;
  videoEl = document.createElement('video');
  videoEl.setAttribute('playsinline', '');
  videoEl.setAttribute('loop', '');
  videoEl.muted = true;
  videoEl.src = SILENT_MP4;
  videoEl.style.cssText = 'position:fixed;top:-1px;left:-1px;width:1px;height:1px;opacity:0.01;pointer-events:none';
  document.body.appendChild(videoEl);
}

function playVideoWakeLock(): void {
  if (!videoEl) createVideoWakeLock();
  videoEl?.play().catch(() => {});
}

// --- Init ---

function useVideoFallback(): boolean {
  // Use video fallback on iOS or when Wake Lock API is unavailable
  return isIOS() || !('wakeLock' in navigator);
}

export function initWakeLock(): void {
  if (useVideoFallback()) {
    // iOS requires a user gesture to start video playback.
    // Start on first touch, then keep alive on visibility change.
    const startVideo = (): void => {
      playVideoWakeLock();
      document.removeEventListener('touchstart', startVideo);
      document.removeEventListener('click', startVideo);
    };
    document.addEventListener('touchstart', startVideo, { once: true });
    document.addEventListener('click', startVideo, { once: true });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        playVideoWakeLock();
      }
    });
  } else {
    requestWakeLock();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    });
  }
}
