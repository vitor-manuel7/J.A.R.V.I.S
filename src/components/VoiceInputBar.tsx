import React, { useState, useRef } from 'react';
import { Mic, MicOff, Send, X, AlertCircle } from 'lucide-react';
import { ProtocolMode } from '../types/jarvis';

interface VoiceInputBarProps {
  isListening: boolean;
  interimTranscript: string;
  audioLevel: number;
  protocol: ProtocolMode;
  onStartListening: () => void;
  onStopListening: () => void;
  onSendMessage: (text: string, isVoice: boolean) => void;
  onOpenMicHelp: () => void;
  micPermissionState: 'granted' | 'denied' | 'prompt' | 'unknown';
  speechError: string | null;
  onClearSpeechError: () => void;
}

export const VoiceInputBar: React.FC<VoiceInputBarProps> = ({
  isListening,
  interimTranscript,
  audioLevel,
  protocol,
  onStartListening,
  onStopListening,
  onSendMessage,
  onOpenMicHelp,
  speechError,
  onClearSpeechError,
}) => {
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const isCombat = protocol === 'COMBAT';

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSendMessage(trimmed, false);
    setInputText('');
  };

  const handleMicClick = () => {
    if (isListening) {
      onStopListening();
    } else {
      onStartListening();
    }
  };

  return (
    <div className="w-full bg-[#0a0b14]/95 backdrop-blur-lg border-t border-cyan-500/20 p-2.5 sm:p-3.5 z-20 sticky bottom-0">
      <div className="max-w-4xl mx-auto space-y-2">
        {/* Error notification banner if any */}
        {speechError && (
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs font-mono animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{speechError}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenMicHelp}
                className="underline hover:text-white font-bold cursor-pointer"
              >
                Como permitir?
              </button>
              <button
                onClick={onClearSpeechError}
                className="p-1 hover:text-white cursor-pointer"
                title="Fechar alerta"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Live Speech Recognition Transcript Indicator */}
        {isListening && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-400/50 text-cyan-200 text-xs font-mono animate-pulse shadow-[0_0_15px_rgba(0,240,255,0.25)]">
            <div className="flex items-center gap-2 overflow-hidden">
              {/* Mini equalizer bars */}
              <div className="flex items-end gap-0.5 h-4 w-6 shrink-0">
                <div
                  className="w-1 bg-cyan-400 transition-all duration-75"
                  style={{ height: `${Math.max(15, audioLevel * 0.9)}%` }}
                />
                <div
                  className="w-1 bg-violet-400 transition-all duration-75"
                  style={{ height: `${Math.max(25, audioLevel * 1.2)}%` }}
                />
                <div
                  className="w-1 bg-cyan-400 transition-all duration-75"
                  style={{ height: `${Math.max(20, audioLevel * 0.7)}%` }}
                />
                <div
                  className="w-1 bg-violet-400 transition-all duration-75"
                  style={{ height: `${Math.max(10, audioLevel * 1.1)}%` }}
                />
              </div>

              <span className="text-cyan-300 font-bold shrink-0">Ouvindo patrão:</span>
              <span className="truncate text-white font-sans">
                {interimTranscript || 'Fale agora em português...'}
              </span>
            </div>

            <button
              onClick={onStopListening}
              className="min-h-[36px] text-xs font-bold text-red-300 hover:text-white px-2.5 py-1 rounded-lg border border-red-500/40 bg-red-950/70 ml-2 shrink-0 cursor-pointer"
            >
              Parar
            </button>
          </div>
        )}

        {/* Main Input Form with Touch-Friendly Hitboxes */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          {/* Prominent Cyberpunk Voice Button */}
          <button
            type="button"
            onClick={handleMicClick}
            aria-label={isListening ? 'Parar microfone' : 'Ativar entrada por voz'}
            className={`relative min-h-[48px] min-w-[48px] rounded-2xl transition-all duration-200 flex items-center justify-center shrink-0 cursor-pointer ${
              isListening
                ? 'bg-cyan-400 text-black shadow-[0_0_24px_#00f0ff] scale-105'
                : isCombat
                ? 'bg-red-950 border border-red-500/60 text-red-400 hover:bg-red-900/60 hover:text-white'
                : 'bg-slate-900 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-950/80 hover:border-cyan-400 hover:text-cyan-100 shadow-[0_0_15px_rgba(0,240,255,0.25)]'
            }`}
          >
            {/* Live ripple wave when listening */}
            {isListening && (
              <span
                className="absolute inset-0 rounded-2xl border border-cyan-400 animate-ping opacity-75"
                style={{
                  transform: `scale(${1 + (audioLevel / 100) * 0.4})`,
                }}
              />
            )}
            {isListening ? (
              <MicOff className="w-5 h-5 z-10" />
            ) : (
              <Mic className="w-5 h-5 z-10" />
            )}
          </button>

          {/* Text Input Container */}
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Digite seu comando para o J.A.R.V.I.S. ou use a voz..."
              className={`w-full min-h-[48px] py-3 pl-4 pr-10 rounded-2xl bg-slate-900/90 border text-sm text-cyan-100 placeholder:text-slate-500 focus:outline-none transition-all font-sans ${
                isCombat
                  ? 'border-red-500/40 focus:border-red-400 focus:ring-1 focus:ring-red-400'
                  : 'border-cyan-500/40 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.15)]'
              }`}
            />
            {inputText && (
              <button
                type="button"
                onClick={() => setInputText('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-300 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim()}
            className={`min-h-[48px] min-w-[48px] rounded-2xl border transition-all flex items-center justify-center shrink-0 ${
              inputText.trim()
                ? isCombat
                  ? 'bg-red-600 hover:bg-red-500 text-white border-red-400 cursor-pointer shadow-[0_0_15px_#ef4444]'
                  : 'bg-cyan-400 hover:bg-cyan-300 text-black border-cyan-300 cursor-pointer shadow-[0_0_15px_#00f0ff]'
                : 'bg-slate-900/50 border-slate-800 text-slate-600 cursor-not-allowed'
            }`}
            title="Enviar mensagem para o J.A.R.V.I.S."
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
