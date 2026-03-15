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
  const cls = attrs.className ? `${attrs.className} img-loading` : 'img-loading';
  const img = h('img', { ...attrs, className: cls });

  const onReady = () => img.classList.remove('img-loading');

  if (img.complete && img.naturalWidth > 0) {
    onReady();
  } else {
    img.addEventListener('load', onReady, { once: true });
    img.addEventListener('error', onReady, { once: true });
  }

  return img;
}

export function clear(el: HTMLElement): void {
  el.innerHTML = '';
}
