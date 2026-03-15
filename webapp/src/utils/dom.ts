export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string> | null,
  ...children: (string | Node)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'className') {
        el.className = value;
      } else {
        el.setAttribute(key, value);
      }
    }
  }
  for (const child of children) {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else {
      el.appendChild(child);
    }
  }
  return el;
}

export function createImg(attrs: Record<string, string>): HTMLElement {
  const { src, className = '', ...rest } = attrs;

  // Already in browser cache — return ready image, no skeleton
  const probe = new Image();
  probe.src = src;
  if (probe.complete && probe.naturalWidth > 0) {
    return h('img', attrs);
  }

  // Skeleton placeholder (div, not img — no broken-image border)
  const placeholder = h('div', { className: `${className} img-loading`.trim() });

  // Load + fully decode off-DOM, then swap in with fade
  const img = h('img', { ...rest, src, className: `${className} img-reveal`.trim() });

  img.decode().then(() => {
    if (!placeholder.parentNode) return;
    placeholder.replaceWith(img);
    void img.offsetHeight;
    img.classList.add('img-visible');
  }).catch(() => {
    if (!placeholder.parentNode) return;
    img.className = className;
    placeholder.replaceWith(img);
  });

  return placeholder;
}

export function clear(el: HTMLElement): void {
  el.innerHTML = '';
}
