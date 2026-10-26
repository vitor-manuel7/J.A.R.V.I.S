// Speech Recognition & Microphone Management for J.A.R.V.I.S.
// Guaranteed single-instance, exactly-once voice command recognition in Brazilian Portuguese (pt-BR)

export type RecognitionState = 'idle' | 'listening' | 'stopping' | 'error';

export interface RecognitionCallbacks {
  onStart?: () => void;
  onInterimResult?: (transcript: string) => void;
  onFinalResult?: (transcript: string) => void;
  onError?: (errorText: string, errorCode?: string) => void;
  onEnd?: () => void;
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

export async function checkMicrophonePermission(): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
  if (typeof navigator === 'undefined' || !navigator.permissions) {
    return 'unknown';
  }
  try {
    const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return status.state;
  } catch (e) {
    return 'unknown';
  }
}

// Request permission and immediately release the hardware stream
export async function requestMicrophoneAccess(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch (err: any) {
    console.warn('Permissão de microfone negada:', err);
    return false;
  }
}

export class JarvisSpeechController {
  private recognition: any = null;
  private status: RecognitionState = 'idle';
  private callbacks: RecognitionCallbacks = {};
  private silenceTimer: any = null;
  private currentTranscript = '';
  private hasDispatched = false;

  constructor(callbacks: RecognitionCallbacks = {}) {
    this.callbacks = callbacks;
  }

  public setCallbacks(callbacks: RecognitionCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // Ensure any previous recognition instance is completely destroyed and unbound
  private cleanupRecognition() {
    this.clearSilenceTimer();

    if (this.recognition) {
      try {
        this.recognition.onstart = null;
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.abort();
      } catch (e) {
        // Ignore abort errors on already-dead instances
      }
      this.recognition = null;
    }
  }

  public async startListening(): Promise<boolean> {
    // If already active or shutting down, do not spawn a duplicate instance
    if (this.status !== 'idle') {
      console.warn('[J.A.R.V.I.S.] Reconhecimento já ativo ou em transição. Nova instância evitada.');
      return true;
    }

    if (!isSpeechRecognitionSupported()) {
      this.callbacks.onError?.(
        'Reconhecimento de voz não suportado neste navegador. Use Google Chrome, Edge ou Safari.',
        'unsupported'
      );
      return false;
    }

    // Completely tear down any lingering background recognition instance
    this.cleanupRecognition();

    // Reset session flags
    this.hasDispatched = false;
    this.currentTranscript = '';
    this.status = 'listening';

    // Verify microphone permission
    const perm = await checkMicrophonePermission();
    if (perm === 'denied') {
      this.status = 'idle';
      this.callbacks.onError?.(
        'Acesso ao microfone bloqueado no navegador. Desbloqueie no ícone de cadeado na barra de endereços.',
        'not-allowed'
      );
      return false;
    }

    if (perm === 'prompt') {
      const granted = await requestMicrophoneAccess();
      if (!granted) {
        this.status = 'idle';
        this.callbacks.onError?.(
          'Permissão de microfone não concedida pelo usuário.',
          'not-allowed'
        );
        return false;
      }
    }

    try {
      const SpeechRecognitionConstructor =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      const rec = new SpeechRecognitionConstructor();
      rec.lang = 'pt-BR';
      // Single-shot command mode: ideal for AI assistants to prevent phrase duplication
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        this.status = 'listening';
        this.callbacks.onStart?.();
      };

      rec.onresult = (event: any) => {
        if (this.hasDispatched) return;

        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const text = res[0]?.transcript || '';
          if (res.isFinal) {
            final += text;
          } else {
            interim += text;
          }
        }

        if (final.trim()) {
          // Final phrase confirmed by Web Speech API
          this.currentTranscript = final.trim();
          this.commitTranscript(final.trim());
          return;
        }

        if (interim.trim()) {
          this.currentTranscript = interim.trim();
          this.callbacks.onInterimResult?.(interim.trim());

          // Start fallback silence timer for interim speech
          this.resetSilenceTimer();
        }
      };

      rec.onerror = (event: any) => {
        const err = event.error;
        console.warn('[J.A.R.V.I.S. Audio]', err);

        if (err === 'no-speech' || err === 'aborted') {
          return;
        }

        let userMsg = 'Erro na captura vocal.';
        if (err === 'not-allowed' || err === 'service-not-allowed') {
          userMsg = 'Acesso ao microfone negado pelo navegador.';
        } else if (err === 'audio-capture') {
          userMsg = 'Nenhum microfone detectado ou dispositivo ocupado.';
        } else if (err === 'network') {
          userMsg = 'Instabilidade na rede de reconhecimento vocal do navegador.';
        }

        this.callbacks.onError?.(userMsg, err);
      };

      rec.onend = () => {
        this.clearSilenceTimer();

        // If recognized speech wasn't dispatched yet, commit it now
        if (!this.hasDispatched && this.currentTranscript.trim()) {
          this.commitTranscript(this.currentTranscript.trim());
        } else {
          this.cleanupRecognition();
          this.status = 'idle';
          this.callbacks.onEnd?.();
        }
      };

      this.recognition = rec;
      rec.start();
      return true;
    } catch (err: any) {
      console.error('[J.A.R.V.I.S.] Falha ao inicializar SpeechRecognition:', err);
      this.cancelListening();
      this.callbacks.onError?.(
        err?.message || 'Falha ao inicializar o microfone para reconhecimento de voz.',
        'init-error'
      );
      return false;
    }
  }

  private resetSilenceTimer() {
    this.clearSilenceTimer();
    // After 1.4s of silence with active interim text, commit command
    this.silenceTimer = setTimeout(() => {
      if (this.status === 'listening' && !this.hasDispatched && this.currentTranscript.trim()) {
        this.commitTranscript(this.currentTranscript.trim());
      }
    }, 1400);
  }

  private clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  // Atomically commit the recognized speech to ensure exactly-once delivery
  public commitTranscript(overrideText?: string) {
    this.clearSilenceTimer();

    if (this.hasDispatched) {
      return;
    }

    const textToSubmit = (overrideText || this.currentTranscript).trim();
    this.hasDispatched = true;
    this.currentTranscript = '';
    this.status = 'idle';

    this.cleanupRecognition();

    if (textToSubmit) {
      this.callbacks.onFinalResult?.(textToSubmit);
    }
    this.callbacks.onEnd?.();
  }

  public stopListening(sendAccumulated = true) {
    if (sendAccumulated && this.currentTranscript.trim()) {
      this.commitTranscript(this.currentTranscript.trim());
    } else {
      this.cancelListening();
    }
  }

  public cancelListening() {
    this.clearSilenceTimer();
    this.hasDispatched = true;
    this.currentTranscript = '';
    this.status = 'idle';
    this.cleanupRecognition();
    this.callbacks.onEnd?.();
  }

  public getIsListening(): boolean {
    return this.status === 'listening';
  }

  public getCurrentTranscript(): string {
    return this.currentTranscript;
  }
}
