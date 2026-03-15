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

export function createImg(attrs: Record<string, string>): HTMLImageElement {
  const { src, className, ...rest } = attrs;
  const cls = className ? `${className} img-loading` : 'img-loading';
  const img = h('img', { ...rest, className: cls });

  const preload = new Image();

  const reveal = () => {
    img.src = src;
    img.classList.remove('img-loading');
    img.classList.add('img-reveal');
  };

  preload.addEventListener('load', reveal, { once: true });
  preload.addEventListener('error', () => img.classList.remove('img-loading'), { once: true });
  preload.src = src;

  if (preload.complete && preload.naturalWidth > 0) {
    img.src = src;
    img.classList.remove('img-loading');
  }

  return img;
}

export function clear(el: HTMLElement): void {
  el.innerHTML = '';
}
