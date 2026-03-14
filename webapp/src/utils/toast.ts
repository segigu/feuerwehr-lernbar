import { h } from './dom';

export function showToast(message: string): void {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = h('div', { className: 'toast' }, message);
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}
