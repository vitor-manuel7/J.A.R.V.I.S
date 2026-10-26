import React from 'react';
import { Mic, Send, X, Radio } from 'lucide-react';
import { ProtocolMode } from '../types/jarvis';

interface VoiceTranscriptOverlayProps {
  isListening: boolean;
  transcript: string;
  protocol: ProtocolMode;
  onCommit: () => void;
  onCancel: () => void;
}

export const VoiceTranscriptOverlay: React.FC<VoiceTranscriptOverlayProps> = ({
  isListening,
  transcript,
  protocol,
  onCommit,
  onCancel,
}) => {
  if (!isListening && !transcript) return null;

  const isCombat = protocol === 'COMBAT';

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 mb-2 animate-fadeIn">
      <div
        className={`relative overflow-hidden rounded-xl border p-3 sm:p-4 backdrop-blur-md shadow-lg transition-all ${
          isCombat
            ? 'border-red-500/50 bg-red-950/80 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
            : 'border-cyan-400/60 bg-slate-950/90 shadow-[0_0_25px_rgba(6,182,212,0.3)]'
        }`}
      >
        {/* Top telemetry status line */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2 mb-2 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
            </span>
            <span className="font-bold tracking-wider text-cyan-300 uppercase">
              {isListening ? 'MICROFONE CONECTADO • RECONHECIMENTO VOCAL PT-BR' : 'COMANDO CAPTURADO'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onCancel}
              className="p-1 rounded text-slate-400 hover:text-red-400 transition-colors"
              title="Cancelar escuta"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Real-time Recognized Speech Display */}
        <div className="min-h-[44px] flex items-center py-1">
          {transcript ? (
            <p className="text-sm sm:text-base text-white font-mono leading-relaxed select-none">
              <span className="text-cyan-400 font-bold mr-1.5">"</span>
              <span className="text-cyan-100 font-semibold">{transcript}</span>
              <span className="inline-block w-2 h-4 bg-cyan-400 ml-1.5 animate-pulse" />
              <span className="text-cyan-400 font-bold ml-0.5">"</span>
            </p>
          ) : (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-cyan-400/70 font-mono italic">
              <Radio className="w-4 h-4 animate-pulse text-cyan-400" />
              <span>Fale seu comando em voz alta (ex: "Jarvis, status dos sistemas" ou "ativar modo combate")...</span>
            </div>
          )}
        </div>

        {/* Action triggers */}
        <div className="flex items-center justify-between pt-2 mt-1 border-t border-cyan-500/15 text-xs font-mono">
          <span className="text-[11px] text-cyan-500 hidden sm:inline">
            A fala é enviada automaticamente após 1.8s de silêncio ou pelo botão ao lado.
          </span>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onCancel}
              className="px-2.5 py-1 rounded border border-slate-700 bg-slate-900 text-slate-300 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onCommit}
              disabled={!transcript.trim()}
              className={`px-3 py-1 rounded font-bold flex items-center gap-1.5 transition-all ${
                transcript.trim()
                  ? isCombat
                    ? 'bg-red-500 hover:bg-red-400 text-white shadow-[0_0_12px_#ef4444]'
                    : 'bg-cyan-400 hover:bg-cyan-300 text-black shadow-[0_0_12px_#22d3ee]'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Executar Comando</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
