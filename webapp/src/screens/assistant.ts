import { navigate } from '../app';
import { h } from '../utils/dom';
import { showBackButton } from '../utils/telegram';

const QA_WORKER_URL = import.meta.env.VITE_QA_WORKER_URL as string | undefined;
const FLUSH_INTERVAL = 80;

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

  // Header
  const header = h('div', { className: 'assistant-header' });
  const title = h('h1', { className: 'assistant-title' }, 'Lernassistent');
  const subtitle = h('p', { className: 'assistant-subtitle' }, 'Stelle Fragen zum MTA-Lehrmaterial');
  header.append(title, subtitle);
  container.appendChild(header);

  // Messages area
  const messagesArea = h('div', { className: 'assistant-messages' });
  container.appendChild(messagesArea);

  // Scroll fade mask
  messagesArea.addEventListener('scroll', () => {
    messagesArea.classList.toggle('scrolled', messagesArea.scrollTop > 0);
  });

  // Welcome message
  addMessage({
    role: 'assistant',
    text: 'Hallo! Ich bin dein Lernassistent für die MTA-Prüfungsvorbereitung. Stelle mir eine Frage zum Lehrmaterial — z.B. "Was sind die Pflichtaufgaben der Feuerwehr?" oder "Welche Brandklassen gibt es?"',
  });

  // Input area
  const inputArea = h('div', { className: 'assistant-input-area' });

  const micBtn = h('button', { className: 'assistant-mic-btn' }, '🎤');

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

  async function streamAnswer(question: string): Promise<void> {
    const typingDots = createTypingDots();
    messagesArea.appendChild(typingDots);
    scrollToBottom();

    // Create empty assistant bubble for streaming
    const bubble = h('div', { className: 'assistant-bubble assistant-bubble-assistant' });
    const textEl = h('div', { className: 'assistant-bubble-text' });
    bubble.appendChild(textEl);

    let fullContent = '';
    let pendingContent = '';
    let bubbleInserted = false;
    let streamSources: Source[] = [];

    function flushTokens() {
      if (!pendingContent) return;
      fullContent += pendingContent;
      pendingContent = '';

      if (!bubbleInserted) {
        typingDots.remove();
        messagesArea.appendChild(bubble);
        bubbleInserted = true;
      }

      textEl.innerHTML = renderMarkdown(fullContent);
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
              pendingContent += event.content;
              if (!flushTimer) {
                flushTimer = setTimeout(() => {
                  flushTimer = undefined;
                  flushTokens();
                }, FLUSH_INTERVAL);
              }
            } else if (event.type === 'done') {
              if (flushTimer) {
                clearTimeout(flushTimer);
                flushTimer = undefined;
              }
              fullContent = event.content || fullContent;
              streamSources = event.sources || [];
              pendingContent = '';
            } else if (event.type === 'error') {
              if (flushTimer) {
                clearTimeout(flushTimer);
                flushTimer = undefined;
              }
              typingDots.remove();
              if (bubbleInserted) bubble.remove();
              addMessage({ role: 'assistant', text: event.content || 'Ein Fehler ist aufgetreten.' });
              return;
            }
          } catch { /* skip malformed SSE */ }
        }
      }

      // Final flush
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = undefined;
      }

      if (!bubbleInserted) {
        typingDots.remove();
        messagesArea.appendChild(bubble);
      }

      textEl.innerHTML = renderMarkdown(fullContent);

      // Add sources
      if (streamSources.length > 0) {
        const srcEl = h('div', { className: 'assistant-sources' });
        for (const s of streamSources) {
          const btn = h('button', { className: 'assistant-source-tag' });
          btn.textContent = `${s.lesson} — ${s.section}`;
          btn.addEventListener('click', () => {
            navigate('learn', { lessonId: s.lessonId, sectionId: s.sectionId });
          });
          srcEl.appendChild(btn);
        }
        bubble.appendChild(srcEl);
      }

      messages.push({ role: 'assistant', text: fullContent, sources: streamSources });
      scrollToBottom();
    } catch {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = undefined;
      }
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

      if (!transcribeRes.ok) {
        typingDots.remove();
        addMessage({ role: 'assistant', text: 'Transkription fehlgeschlagen. Versuche es nochmal.' });
        return;
      }

      const { text, translatedText } = (await transcribeRes.json()) as { text: string; translatedText: string };

      typingDots.remove();

      addMessage({ role: 'user', text });
      if (translatedText !== text) {
        addMessage({ role: 'user', text: `🇩🇪 ${translatedText}` });
      }

      await streamAnswer(translatedText);
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
      const srcEl = h('div', { className: 'assistant-sources' });
      for (const s of msg.sources) {
        const btn = h('button', { className: 'assistant-source-tag' });
        btn.textContent = `${s.lesson} — ${s.section}`;
        btn.addEventListener('click', () => {
          navigate('learn', { lessonId: s.lessonId, sectionId: s.sectionId });
        });
        srcEl.appendChild(btn);
      }
      bubble.appendChild(srcEl);
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

    // Check if paragraph is a list
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

    // Regular paragraph — convert single newlines to <br>
    return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
  }).join('');

  return html;
}
