import { navigate } from '../app';
import { h } from '../utils/dom';
import { showBackButton } from '../utils/telegram';
import { getLessonById } from '../data/lessons';
import { renderBlock } from './learn';
import { getLanguage } from '../state/app-state';

const QA_WORKER_URL = import.meta.env.VITE_QA_WORKER_URL as string | undefined;
const WORD_DELAY = 60;

const REFUSAL_MARKERS = [
  'kann nur Fragen zum MTA',
  'steht leider nicht im Lehrmaterial',
  'nicht mit der Feuerwehrausbildung',
];

interface Source {
  lesson: string;
  section: string;
  lessonId: string;
  sectionId: string;
}

interface Message {
  role: 'user' | 'assistant';
  text: string;
  sources?: Source[];
}

export function renderAssistant(container: HTMLElement): () => void {
  const messages: Message[] = [];
  let isLoading = false;
  let flushTimer: ReturnType<typeof setTimeout> | undefined;
  let mediaRecorder: MediaRecorder | null = null;
  let audioChunks: Blob[] = [];

  // Header — title left, close button right
  const header = h('div', { className: 'assistant-header' });
  const headerLeft = h('div', { className: 'assistant-header-left' });
  const title = h('h1', { className: 'assistant-title' }, 'Lernassistent');
  const subtitle = h('p', { className: 'assistant-subtitle' }, 'Fragen zum MTA-Lehrmaterial');
  headerLeft.append(title, subtitle);

  const closeBtn = h('button', { className: 'assistant-close-btn' });
  closeBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  closeBtn.addEventListener('click', () => navigate('home'));

  header.append(headerLeft, closeBtn);
  container.appendChild(header);

  // Messages area
  const messagesArea = h('div', { className: 'assistant-messages' });
  container.appendChild(messagesArea);

  // Scroll fade mask
  messagesArea.addEventListener('scroll', () => {
    messagesArea.classList.toggle('scrolled', messagesArea.scrollTop > 0);
  });

  // Welcome message — typed word-by-word
  typeLocalMessage('Hallo! Ich bin dein Lernassistent für die MTA-Prüfungsvorbereitung. Stelle mir eine Frage zum Lehrmaterial — z.B. "Was sind die Pflichtaufgaben der Feuerwehr?" oder "Welche Brandklassen gibt es?"');

  // Input area
  const inputArea = h('div', { className: 'assistant-input-area' });

  const micBtn = h('button', { className: 'assistant-mic-btn' });
  micBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';

  const inputWrap = h('div', { className: 'assistant-input-wrap' });
  const input = h('textarea', {
    className: 'assistant-input',
    placeholder: 'Deine Frage...',
    rows: '1',
  }) as HTMLTextAreaElement;

  const sendBtn = h('button', { className: 'assistant-send-btn' });
  sendBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';

  inputWrap.append(input, sendBtn);
  inputArea.append(micBtn, inputWrap);
  container.appendChild(inputArea);

  // Auto-resize textarea
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 160) + 'px';
  });

  // Send on Enter (without Shift)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  sendBtn.addEventListener('click', handleSend);
  micBtn.addEventListener('click', handleMic);

  function scrollToBottom() {
    messagesArea.scrollTop = messagesArea.scrollHeight;
  }

  function createTypingDots(): HTMLElement {
    const dots = h('div', { className: 'assistant-typing-dots' });
    for (let i = 0; i < 3; i++) {
      const dot = h('span', { className: 'assistant-typing-dot' });
      dot.style.animationDelay = `${i * 0.2}s`;
      dots.appendChild(dot);
    }
    return dots;
  }

  function setLoadingState(loading: boolean) {
    isLoading = loading;
    sendBtn.classList.toggle('loading', loading);
    micBtn.classList.toggle('loading', loading);
  }

  function isRefusal(text: string): boolean {
    return REFUSAL_MARKERS.some(m => text.includes(m));
  }

  function dedupSources(sources: Source[]): Source[] {
    const seen = new Set<string>();
    return sources.filter(s => {
      const key = `${s.lessonId}::${s.sectionId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function openLessonOverlay(lessonId: string, sectionId: string) {
    const lesson = getLessonById(lessonId);
    if (!lesson) return;

    const section = lesson.sections.find(s => s.id === sectionId);
    if (!section) return;

    const lang = getLanguage();

    const overlay = h('div', { className: 'assistant-lesson-overlay' });

    const backBtn = h('button', { className: 'back-link' }, '\u2190 Zurück zum Chat');
    backBtn.addEventListener('click', () => overlay.remove());
    overlay.appendChild(backBtn);

    const sectionTitle = h('h2', { className: 'learn-section-title' }, section.title);
    overlay.appendChild(sectionTitle);

    if (lang === 'de+ru' && section.titleRu) {
      overlay.appendChild(h('p', { className: 'learn-section-title-ru' }, section.titleRu));
    }

    for (const block of section.blocks) {
      overlay.appendChild(renderBlock(block, lang));
    }

    document.body.appendChild(overlay);
  }

  function appendSources(bubble: HTMLElement, sources: Source[]) {
    // Filter out sources with empty IDs
    const valid = sources.filter(s => s.lessonId && s.sectionId);
    if (valid.length === 0) return;

    const srcEl = h('div', { className: 'assistant-sources' });
    valid.forEach((s, i) => {
      const btn = h('button', { className: 'assistant-source-tag' });
      btn.textContent = `${s.lesson} — ${s.section}`;
      btn.style.animationDelay = `${i * 0.1}s`;
      btn.addEventListener('click', () => openLessonOverlay(s.lessonId, s.sectionId));
      srcEl.appendChild(btn);
    });
    bubble.appendChild(srcEl);
  }

  // Type a local message word-by-word (no API)
  function typeLocalMessage(text: string) {
    const bubble = h('div', { className: 'assistant-bubble assistant-bubble-assistant' });
    const textEl = h('div', { className: 'assistant-bubble-text' });
    bubble.appendChild(textEl);
    messagesArea.appendChild(bubble);

    const words = text.split(/(\s+)/);
    let revealed = '';
    let idx = 0;

    function revealNext() {
      if (idx >= words.length) {
        messages.push({ role: 'assistant', text });
        return;
      }
      revealed += words[idx];
      idx++;
      textEl.innerHTML = renderMarkdown(revealed);
      scrollToBottom();
      flushTimer = setTimeout(revealNext, WORD_DELAY);
    }
    flushTimer = setTimeout(revealNext, 300); // small initial delay
  }

  async function streamAnswer(question: string): Promise<void> {
    const typingDots = createTypingDots();
    messagesArea.appendChild(typingDots);
    scrollToBottom();

    const bubble = h('div', { className: 'assistant-bubble assistant-bubble-assistant' });
    const textEl = h('div', { className: 'assistant-bubble-text' });
    bubble.appendChild(textEl);

    let receivedContent = '';
    let revealedContent = '';
    let bubbleInserted = false;
    let streamSources: Source[] = [];
    let streamDone = false;

    function startRevealLoop() {
      function revealNext() {
        if (revealedContent.length >= receivedContent.length) {
          if (streamDone) return;
          flushTimer = setTimeout(revealNext, WORD_DELAY);
          return;
        }

        if (!bubbleInserted) {
          typingDots.remove();
          messagesArea.appendChild(bubble);
          bubbleInserted = true;
        }

        const remaining = receivedContent.slice(revealedContent.length);
        const wordMatch = remaining.match(/^\s*\S+/);
        if (wordMatch) {
          revealedContent += wordMatch[0];
        } else {
          revealedContent = receivedContent;
        }

        textEl.innerHTML = renderMarkdown(revealedContent);
        scrollToBottom();

        if (revealedContent.length < receivedContent.length || !streamDone) {
          flushTimer = setTimeout(revealNext, WORD_DELAY);
        } else {
          finishReveal();
        }
      }
      flushTimer = setTimeout(revealNext, WORD_DELAY);
    }

    function finishReveal() {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = undefined;
      }

      if (!bubbleInserted) {
        typingDots.remove();
        messagesArea.appendChild(bubble);
        bubbleInserted = true;
      }

      textEl.innerHTML = renderMarkdown(receivedContent);

      // Only show sources if not a refusal and sources exist
      const finalSources = isRefusal(receivedContent) ? [] : dedupSources(streamSources);
      if (finalSources.length > 0) {
        appendSources(bubble, finalSources);
      }

      messages.push({ role: 'assistant', text: receivedContent, sources: finalSources });
      scrollToBottom();
    }

    try {
      const res = await fetch(`${QA_WORKER_URL}/api/ask-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      if (!res.ok || !res.body) {
        typingDots.remove();
        addMessage({ role: 'assistant', text: 'Entschuldigung, der Lernassistent ist gerade nicht erreichbar. Versuche es später nochmal.' });
        return;
      }

      startRevealLoop();

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const parts = sseBuffer.split('\n\n');
        sseBuffer = parts.pop()!;

        for (const part of parts) {
          const trimmed = part.trim();
          if (!trimmed.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(trimmed.slice(6)) as {
              type: string;
              content?: string;
              sources?: Source[];
            };

            if (event.type === 'token' && event.content) {
              receivedContent += event.content;
            } else if (event.type === 'done') {
              receivedContent = event.content || receivedContent;
              streamSources = event.sources || [];
            } else if (event.type === 'error') {
              streamDone = true;
              if (flushTimer) { clearTimeout(flushTimer); flushTimer = undefined; }
              typingDots.remove();
              if (bubbleInserted) bubble.remove();
              addMessage({ role: 'assistant', text: event.content || 'Ein Fehler ist aufgetreten.' });
              return;
            }
          } catch { /* skip malformed SSE */ }
        }
      }

      streamDone = true;

      await new Promise<void>(resolve => {
        function checkDone() {
          if (revealedContent.length >= receivedContent.length) {
            finishReveal();
            resolve();
          } else {
            setTimeout(checkDone, WORD_DELAY);
          }
        }
        if (revealedContent.length >= receivedContent.length) {
          finishReveal();
          resolve();
        } else {
          checkDone();
        }
      });
    } catch {
      streamDone = true;
      if (flushTimer) { clearTimeout(flushTimer); flushTimer = undefined; }
      typingDots.remove();
      if (bubbleInserted) bubble.remove();
      addMessage({ role: 'assistant', text: 'Entschuldigung, es ist ein Fehler aufgetreten. Versuche es später nochmal.' });
    }
  }

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

    setLoadingState(true);
    try {
      await streamAnswer(question);
    } finally {
      setLoadingState(false);
    }
  }

  async function handleMic() {
    if (isLoading) return;

    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      mediaRecorder = new MediaRecorder(stream, { mimeType });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        micBtn.classList.remove('recording');

        const blob = new Blob(audioChunks, { type: mimeType });
        audioChunks = [];

        if (blob.size === 0) return;
        await handleVoice(blob);
      };

      mediaRecorder.start();
      micBtn.classList.add('recording');
    } catch {
      addMessage({
        role: 'assistant',
        text: 'Mikrofon-Zugriff nicht möglich. Bitte erlaube den Zugriff in den Browser-Einstellungen.',
      });
    }
  }

  async function handleVoice(blob: Blob) {
    if (!QA_WORKER_URL) return;

    setLoadingState(true);

    const typingDots = createTypingDots();
    messagesArea.appendChild(typingDots);
    scrollToBottom();

    try {
      const transcribeRes = await fetch(`${QA_WORKER_URL}/api/transcribe`, {
        method: 'POST',
        body: blob,
      });

      typingDots.remove();

      if (!transcribeRes.ok) {
        addMessage({ role: 'assistant', text: 'Transkription fehlgeschlagen. Versuche es nochmal.' });
        return;
      }

      const { translatedText } = (await transcribeRes.json()) as { text: string; translatedText: string };

      input.value = translatedText;
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 160) + 'px';
      input.focus();
    } catch {
      typingDots.remove();
      addMessage({ role: 'assistant', text: 'Entschuldigung, es ist ein Fehler aufgetreten.' });
    } finally {
      setLoadingState(false);
    }
  }

  function addMessage(msg: Message) {
    messages.push(msg);

    const bubble = h('div', {
      className: `assistant-bubble assistant-bubble-${msg.role}`,
    });

    const textEl = h('div', { className: 'assistant-bubble-text' });
    if (msg.role === 'assistant') {
      textEl.innerHTML = renderMarkdown(msg.text);
    } else {
      textEl.innerHTML = escapeHtml(msg.text).replace(/\n/g, '<br>');
    }
    bubble.appendChild(textEl);

    if (msg.sources && msg.sources.length > 0) {
      appendSources(bubble, msg.sources);
    }

    messagesArea.appendChild(bubble);
    scrollToBottom();
  }

  const cleanupBack = showBackButton(() => navigate('home'));

  return () => {
    if (flushTimer) clearTimeout(flushTimer);
    cleanupBack();
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderMarkdown(text: string): string {
  let html = escapeHtml(text);

  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic: *text*
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

  // Split into paragraphs on double newlines
  const paragraphs = html.split(/\n\n+/);

  html = paragraphs.map(p => {
    const trimmed = p.trim();
    if (!trimmed) return '';

    const lines = trimmed.split('\n');
    const isUnordered = lines.every(l => /^[\-\*]\s/.test(l.trim()));
    const isOrdered = lines.every(l => /^\d+\.\s/.test(l.trim()));

    if (isUnordered) {
      const items = lines.map(l => `<li>${l.trim().replace(/^[\-\*]\s/, '')}</li>`).join('');
      return `<ul>${items}</ul>`;
    }

    if (isOrdered) {
      const items = lines.map(l => `<li>${l.trim().replace(/^\d+\.\s/, '')}</li>`).join('');
      return `<ol>${items}</ol>`;
    }

    return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
  }).join('');

  return html;
}
