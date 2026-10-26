/**
 * Wake Word Detection Engine for J.A.R.V.I.S.
 * 
 * Continuously listens for the wake word "Jarvis" / "Járvis" in Brazilian Portuguese (pt-BR).
 * Implements self-speech protection (ignores input while J.A.R.V.I.S. speaks to prevent feedback loops).
 */

import { isSpeechRecognitionSupported } from './speechRecognition';

export interface WakeWordCallbacks {
  onWakeWordDetected: (immediateCommand?: string) => void;
  onListeningStateChange?: (isListening: boolean) => void;
  onError?: (message: string) => void;
}

export class JarvisWakeWordEngine {
  private recognition: any = null;
  private isEnabled = false;
  private isSpeaking = false;
  private callbacks: WakeWordCallbacks;
  private restartTimeout: any = null;
  private isRunning = false;

  constructor(callbacks: WakeWordCallbacks) {
    this.callbacks = callbacks;
  }

  public setSpeaking(speaking: boolean) {
    this.isSpeaking = speaking;
  }

  public isEngineActive(): boolean {
    return this.isRunning;
  }

  public start() {
    this.isEnabled = true;
    if (this.isRunning) return;
    this.initRecognition();
  }

  public stop() {
    this.isEnabled = false;
    this.cleanup();
  }

  private cleanup() {
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    if (this.recognition) {
      try {
        this.recognition.onstart = null;
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.abort();
      } catch (e) {}
      this.recognition = null;
    }
    this.isRunning = false;
    this.callbacks.onListeningStateChange?.(false);
  }

  private initRecognition() {
    if (!this.isEnabled) return;
    if (!isSpeechRecognitionSupported()) {
      this.callbacks.onError?.('Reconhecimento de palavra de ativação não suportado neste navegador.');
      return;
    }

    this.cleanup();

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const rec = new SpeechRecognition();

      rec.lang = 'pt-BR';
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        this.isRunning = true;
        this.callbacks.onListeningStateChange?.(true);
      };

      rec.onresult = (event: any) => {
        // Discard any incoming audio while Jarvis is speaking to prevent self-triggering loops
        if (this.isSpeaking) {
          return;
        }

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const transcript = (res[0]?.transcript || '').trim();

          // Wake word pattern for "Jarvis" or "Járvis" (with optional prefixes like "ei", "olá", "ok")
          const wakeWordRegex = /\b(jarvis|járvis)\b/i;

          if (wakeWordRegex.test(transcript)) {
            // Wake word detected!
            console.log('[WakeWord] Palavra de ativação "Jarvis" detectada:', transcript);

            // Extract any subsequent command after the wake word
            // E.g. "Jarvis que horas são" -> "que horas são"
            const matchIndex = transcript.toLowerCase().search(wakeWordRegex);
            const afterWakeWord = transcript.slice(matchIndex).replace(/^(jarvis|járvis)[,:\s]*/i, '').trim();

            // Temporarily stop wake word loop so command processor takes exclusive audio control
            this.cleanup();

            this.callbacks.onWakeWordDetected(afterWakeWord || undefined);
            return;
          }
        }
      };

      rec.onerror = (event: any) => {
        const err = event.error;
        if (err === 'no-speech' || err === 'aborted') {
          return;
        }
        if (err === 'not-allowed' || err === 'service-not-allowed') {
          this.isEnabled = false;
          this.callbacks.onError?.('Microfone não autorizado para palavra de ativação.');
          this.cleanup();
          return;
        }
      };

      rec.onend = () => {
        this.isRunning = false;
        this.callbacks.onListeningStateChange?.(false);

        // Auto-restart continuous listening if still enabled and not actively speaking
        if (this.isEnabled) {
          this.restartTimeout = setTimeout(() => {
            if (this.isEnabled && !this.isRunning) {
              this.initRecognition();
            }
          }, 400);
        }
      };

      this.recognition = rec;
      rec.start();
    } catch (err: any) {
      console.warn('[WakeWord] Falha ao iniciar reconhecimento de palavra de ativação:', err);
      this.isRunning = false;
    }
  }
}
