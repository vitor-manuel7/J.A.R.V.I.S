// Speech Synthesis (Text-to-Speech) for J.A.R.V.I.S. in Brazilian Portuguese (pt-BR)
// Chunked sentence queue to prevent browser freezes, pauses and sentence cutoffs

export interface VoiceOption {
  name: string;
  lang: string;
  voiceURI: string;
  isPtBr: boolean;
  isDefault: boolean;
  isMale?: boolean;
}

let activeUtterance: SpeechSynthesisUtterance | null = null;
let activeQueue: string[] = [];
let isSessionActive = false;

// Helper to identify male voice names across browser speech synthesis engines
function isVoiceMale(name: string): boolean {
  const n = name.toLowerCase();
  const maleKeywords = /\b(daniel|antonio|antônio|felipe|rodrigo|ricardo|tiago|jorge|fabio|fábio|duarte|helder|male|homem|masculin)\b/i;
  const femaleKeywords = /\b(maria|francisca|raquel|vitória|vitoria|leticia|letícia|luciana|female|mulher|feminina)\b/i;
  return maleKeywords.test(n) && !femaleKeywords.test(n);
}

// Clean text for speech output so markdown / symbols sound completely natural
export function sanitizeTextForSpeech(text: string): string {
  return text
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, 'código omitido.')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove markdown links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    // Remove bullet points and headers
    .replace(/^[#*\-•>]+\s+/gm, '')
    // Remove asterisks / underscores (bold, italics)
    .replace(/[*_~]{1,3}/g, '')
    // Remove markdown tables
    .replace(/\|.*?\|/g, '')
    // Remove multiple symbols and divider lines
    .replace(/[-=_]{2,}/g, ' ')
    // Replace abbreviations with natural Portuguese words
    .replace(/\bSr\.\b/gi, 'Senhor')
    .replace(/\bSra\.\b/gi, 'Senhora')
    .replace(/\bDr\.\b/gi, 'Doutor')
    .replace(/\bex\.\b/gi, 'por exemplo')
    // Natural pronunciation of system titles
    .replace(/J\.A\.R\.V\.I\.S\./gi, 'Járvis')
    .replace(/JARVIS/gi, 'Járvis')
    .replace(/\bLXXXV\b/gi, 'oitenta e cinco')
    .replace(/\bMK\b/gi, 'Mark')
    // Remove emojis that may cause phonetic glitches
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
    // Clean excessive spaces
    .replace(/\s+/g, ' ')
    .trim();
}

// Split long text into natural, bite-sized sentence chunks (prevents Chrome 15s cutoff bug)
export function splitTextIntoSpeechChunks(text: string): string[] {
  const clean = sanitizeTextForSpeech(text);
  if (!clean) return [];

  // Match sentences ending in ., !, ?, or line breaks
  const rawSentences = clean
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];

  for (const sentence of rawSentences) {
    // If a sentence is very long (> 160 characters), split at commas or semicolons
    if (sentence.length > 160) {
      const subParts = sentence.split(/(?<=[,;:])\s+/);
      let currentSub = '';

      for (const part of subParts) {
        if ((currentSub + ' ' + part).trim().length > 160) {
          if (currentSub.trim()) chunks.push(currentSub.trim());
          currentSub = part;
        } else {
          currentSub = currentSub ? `${currentSub} ${part}` : part;
        }
      }
      if (currentSub.trim()) chunks.push(currentSub.trim());
    } else {
      chunks.push(sentence);
    }
  }

  return chunks.length > 0 ? chunks : [clean];
}

// Get list of voices from browser, prioritizing pt-BR male voices
export function getPortugueseVoices(): Promise<VoiceOption[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve([]);
      return;
    }

    const load = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) {
        return [];
      }

      const options: VoiceOption[] = voices.map((v) => {
        const langLower = v.lang.toLowerCase();
        const nameLower = v.name.toLowerCase();
        const isPtBr =
          langLower.includes('pt-br') ||
          langLower.includes('pt_br') ||
          (langLower.startsWith('pt') && (nameLower.includes('brazil') || nameLower.includes('brasil')));
        const isMale = isVoiceMale(v.name);

        return {
          name: v.name,
          lang: v.lang,
          voiceURI: v.voiceURI,
          isPtBr,
          isDefault: v.default,
          isMale,
        };
      });

      // Sort: pt-BR male voices first, then pt-BR generic/Google, then other Portuguese male, then rest
      options.sort((a, b) => {
        const score = (item: VoiceOption) => {
          if (item.isPtBr && item.isMale) return 40;
          if (item.isPtBr) return 30;
          if (item.lang.toLowerCase().startsWith('pt') && item.isMale) return 20;
          if (item.lang.toLowerCase().startsWith('pt')) return 10;
          return 0;
        };

        const scoreDiff = score(b) - score(a);
        if (scoreDiff !== 0) return scoreDiff;
        return a.name.localeCompare(b.name);
      });

      return options;
    };

    const initial = load();
    if (initial.length > 0) {
      resolve(initial);
      return;
    }

    window.speechSynthesis.onvoiceschanged = () => {
      resolve(load());
    };

    setTimeout(() => {
      resolve(load());
    }, 500);
  });
}

export function stopSpeaking(): void {
  isSessionActive = false;
  activeQueue = [];

  if (activeUtterance) {
    activeUtterance.onstart = null;
    activeUtterance.onend = null;
    activeUtterance.onerror = null;
    activeUtterance = null;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }
}

export function isCurrentlySpeaking(): boolean {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    return isSessionActive || window.speechSynthesis.speaking;
  }
  return false;
}

// Prime speech synthesis on user interaction (tap / click)
export function unlockAudioSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.resume();
    } catch (e) {}
  }
}

export function speakInPortuguese(
  rawText: string,
  options: {
    voiceURI?: string;
    rate?: number;
    pitch?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  } = {}
): void {
  // Cancel previous speech session cleanly
  stopSpeaking();

  const chunks = splitTextIntoSpeechChunks(rawText);
  if (chunks.length === 0) {
    options.onEnd?.();
    return;
  }

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    options.onError?.(new Error('Sintetizador de voz não suportado neste navegador.'));
    return;
  }

  try {
    window.speechSynthesis.resume();
  } catch (e) {}

  isSessionActive = true;
  activeQueue = [...chunks];

  const { voiceURI, rate = 1.20, pitch = 0.92, onStart, onEnd, onError } = options;
  let hasStarted = false;

  const speakNext = () => {
    if (!isSessionActive) {
      return;
    }

    if (activeQueue.length === 0) {
      activeUtterance = null;
      isSessionActive = false;
      onEnd?.();
      return;
    }

    const nextChunk = activeQueue.shift()!;
    const utterance = new SpeechSynthesisUtterance(nextChunk);
    // Keep reference in module scope to prevent garbage collection mid-speech
    activeUtterance = utterance;

    utterance.lang = 'pt-BR';
    // Rate ~1.20x provides a firm, agile, articulate tempo (~20% faster than standard 1.0)
    utterance.rate = Math.max(0.75, Math.min(rate, 1.5));
    // Pitch ~0.92 provides a masculine, grave, authoritative J.A.R.V.I.S. timbre
    utterance.pitch = Math.max(0.70, Math.min(pitch, 1.25));

    const allVoices = window.speechSynthesis.getVoices();
    if (allVoices.length > 0) {
      let chosenVoice: SpeechSynthesisVoice | undefined;

      if (voiceURI) {
        chosenVoice = allVoices.find((v) => v.voiceURI === voiceURI);
      }

      if (!chosenVoice) {
        // 1. Try to find a male Brazilian Portuguese voice first
        chosenVoice = allVoices.find((v) => {
          const l = v.lang.toLowerCase();
          const n = v.name.toLowerCase();
          const isPtBr =
            l === 'pt-br' ||
            l === 'pt_br' ||
            (l.startsWith('pt') && (n.includes('brazil') || n.includes('brasil')));
          return isPtBr && isVoiceMale(v.name);
        });

        // 2. Fall back to any Brazilian Portuguese voice (e.g. Google português do Brasil)
        if (!chosenVoice) {
          chosenVoice = allVoices.find((v) => {
            const l = v.lang.toLowerCase();
            const n = v.name.toLowerCase();
            return (
              l === 'pt-br' ||
              l === 'pt_br' ||
              (l.startsWith('pt') && (n.includes('brazil') || n.includes('brasil')))
            );
          });
        }

        // 3. Fall back to any Portuguese voice that is male
        if (!chosenVoice) {
          chosenVoice = allVoices.find(
            (v) => v.lang.toLowerCase().startsWith('pt') && isVoiceMale(v.name)
          );
        }

        // 4. Fall back to any Portuguese voice
        if (!chosenVoice) {
          chosenVoice = allVoices.find((v) => v.lang.toLowerCase().startsWith('pt'));
        }
      }

      if (chosenVoice) {
        utterance.voice = chosenVoice;
      }
    }

    utterance.onstart = () => {
      if (!hasStarted) {
        hasStarted = true;
        onStart?.();
      }
    };

    utterance.onend = () => {
      // Natural brief breathing pause (50ms) between sentences
      setTimeout(() => {
        if (isSessionActive) {
          speakNext();
        }
      }, 50);
    };

    utterance.onerror = (evt) => {
      if (evt.error === 'canceled' || evt.error === 'interrupted') {
        return;
      }
      console.warn('[J.A.R.V.I.S. Voz] Aviso no sintetizador vocal:', evt);
      // Advance to next chunk so one unpronounceable symbol does not kill the entire response
      setTimeout(() => {
        if (isSessionActive) {
          speakNext();
        }
      }, 40);
    };

    try {
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Erro ao invocar speak:', err);
      onError?.(err);
      isSessionActive = false;
      onEnd?.();
    }
  };

  speakNext();
}
