import { navigate } from '../app';
import { h } from '../utils/dom';
import { showBackButton } from '../utils/telegram';

const QA_WORKER_URL = import.meta.env.VITE_QA_WORKER_URL as string | undefined;

interface Message {
  role: 'user' | 'assistant';
  text: string;
  sources?: { lesson: string; section: string }[];
}

export function renderAssistant(container: HTMLElement): () => void {
  const messages: Message[] = [];
  let isLoading = false;

  // Header
  const header = h('div', { className: 'assistant-header' });
  const title = h('h1', { className: 'assistant-title' }, 'Lernassistent');
  const subtitle = h('p', { className: 'assistant-subtitle' }, 'Stelle Fragen zum MTA-Lehrmaterial');
  header.append(title, subtitle);
  container.appendChild(header);

  // Messages area
  const messagesArea = h('div', { className: 'assistant-messages' });
  container.appendChild(messagesArea);

  // Welcome message
  addMessage({
    role: 'assistant',
    text: 'Hallo! Ich bin dein Lernassistent für die MTA-Prüfungsvorbereitung. Stelle mir eine Frage zum Lehrmaterial — z.B. "Was sind die Pflichtaufgaben der Feuerwehr?" oder "Welche Brandklassen gibt es?"',
  });

  // Input area
  const inputArea = h('div', { className: 'assistant-input-area' });
  const input = h('textarea', {
    className: 'assistant-input',
    placeholder: 'Deine Frage...',
    rows: '1',
  }) as HTMLTextAreaElement;
  const sendBtn = h('button', { className: 'assistant-send-btn' }, '➤');

  inputArea.append(input, sendBtn);
  container.appendChild(inputArea);

  // Auto-resize textarea
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

  // Send on Enter (without Shift)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  sendBtn.addEventListener('click', handleSend);

  async function handleSend() {
    const question = input.value.trim();
    if (!question || isLoading) return;

    input.value = '';
    input.style.height = 'auto';

    addMessage({ role: 'user', text: question });

    if (!QA_WORKER_URL) {
      addMessage({
        role: 'assistant',
        text: 'Der Lernassistent ist noch nicht konfiguriert. Bitte setze VITE_QA_WORKER_URL in der Umgebung.',
      });
      return;
    }

    isLoading = true;
    sendBtn.classList.add('loading');

    // Show typing indicator
    const typingEl = h('div', { className: 'assistant-typing' }, 'Denke nach...');
    messagesArea.appendChild(typingEl);
    messagesArea.scrollTop = messagesArea.scrollHeight;

    try {
      const res = await fetch(`${QA_WORKER_URL}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      typingEl.remove();

      if (!res.ok) {
        addMessage({
          role: 'assistant',
          text: 'Entschuldigung, der Lernassistent ist gerade nicht erreichbar. Versuche es später nochmal.',
        });
        return;
      }

      const data = (await res.json()) as {
        answer: string;
        sources: { lesson: string; section: string }[];
      };

      addMessage({
        role: 'assistant',
        text: data.answer,
        sources: data.sources,
      });
    } catch {
      typingEl.remove();
      addMessage({
        role: 'assistant',
        text: 'Entschuldigung, es ist ein Fehler aufgetreten. Versuche es später nochmal.',
      });
    } finally {
      isLoading = false;
      sendBtn.classList.remove('loading');
    }
  }

  function addMessage(msg: Message) {
    messages.push(msg);

    const bubble = h('div', {
      className: `assistant-bubble assistant-bubble-${msg.role}`,
    });

    const textEl = h('div', { className: 'assistant-bubble-text' });
    textEl.innerHTML = escapeHtml(msg.text).replace(/\n/g, '<br>');
    bubble.appendChild(textEl);

    if (msg.sources && msg.sources.length > 0) {
      const srcEl = h('div', { className: 'assistant-sources' });
      srcEl.innerHTML = msg.sources
        .map(s => `<span class="assistant-source-tag">${escapeHtml(s.lesson)} — ${escapeHtml(s.section)}</span>`)
        .join('');
      bubble.appendChild(srcEl);
    }

    messagesArea.appendChild(bubble);
    messagesArea.scrollTop = messagesArea.scrollHeight;
  }

  const cleanupBack = showBackButton(() => navigate('home'));

  return () => { cleanupBack(); };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
