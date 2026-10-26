import React, { useRef, useEffect } from 'react';
import { ChatMessage, ProtocolMode } from '../types/jarvis';
import { Volume2, Copy, Check, Sparkles, Mic, AlertCircle } from 'lucide-react';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isJarvisSpeaking: boolean;
  activeSpeakingMessageId: string | null;
  protocol: ProtocolMode;
  onSpeakMessage: (text: string, messageId: string) => void;
  onSelectQuickPrompt: (text: string) => void;
  onRetryMessage?: (message: ChatMessage) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  isJarvisSpeaking,
  activeSpeakingMessageId,
  protocol,
  onSpeakMessage,
  onSelectQuickPrompt,
  onRetryMessage,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isCombat = protocol === 'COMBAT';

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 space-y-3.5 max-w-4xl mx-auto w-full transition-colors"
    >
      {/* Empty State / Welcome Screen */}
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[280px] text-center px-4 py-6 rounded-2xl border border-cyan-500/20 bg-[#0d0e1a]/80 backdrop-blur-sm">
          <div className="w-12 h-12 rounded-full border border-cyan-400/50 bg-cyan-950/60 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(0,240,255,0.3)]">
            <Sparkles className="w-6 h-6 text-cyan-300" />
          </div>
          <h2 className="font-hud text-lg sm:text-xl font-bold text-white mb-1.5">
            J.A.R.V.I.S. EM LINHA
          </h2>
          <p className="text-cyan-300/80 text-sm max-w-md mb-5 font-mono">
            Sistemas neurais e automações conectados. Pressione o microfone ou digite seu comando em Português do Brasil.
          </p>

          <div className="w-full max-w-lg">
            <div className="text-xs font-mono uppercase tracking-wider text-cyan-500 mb-2">
              Comandos e Automações Sugeridos
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
              {[
                { label: '⚡ Status dos Sistemas', desc: 'Diagnóstico de telemetria e integridade' },
                { label: '📱 Abrir WhatsApp', desc: 'Automação autorizada no dispositivo' },
                { label: '⚔️ Ativar Modo Combate', desc: 'Eleva barreiras de prontidão operacional' },
                { label: '⏱️ Iniciar Timer de 2 minutos', desc: 'Temporizador com alarme acústico' },
                { label: '🌦️ Como está o clima hoje?', desc: 'Varredura de sensores meteorológicos' },
                { label: '🧠 Explique computação quântica', desc: 'Consulta técnica à IA Gemini' },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectQuickPrompt(item.label.replace(/^[^\s]+\s*/, ''))}
                  className="p-2.5 rounded-xl border border-cyan-500/20 bg-[#0a0b14] hover:bg-cyan-950/40 hover:border-cyan-400 text-xs transition-all text-cyan-300 flex flex-col group cursor-pointer"
                >
                  <span className="font-semibold text-white group-hover:text-cyan-200">
                    {item.label}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Message Stream */}
      {messages.map((msg) => {
        const isJarvis = msg.sender === 'jarvis';
        const isUser = msg.sender === 'user';
        const isSpeakingThis = isJarvisSpeaking && activeSpeakingMessageId === msg.id;

        return (
          <div
            key={msg.id}
            className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} transition-all`}
          >
            {/* Sender Label & Timestamp */}
            <div className="flex items-center gap-2 mb-1 px-1 text-[11px] font-mono">
              <span
                className={`font-semibold tracking-wider ${
                  isUser
                    ? 'text-cyan-400'
                    : isCombat
                    ? 'text-red-400'
                    : 'text-violet-300 font-hud'
                }`}
              >
                {isUser ? 'PATRÃO (VOCÊ)' : 'J.A.R.V.I.S.'}
              </span>
              {msg.isVoiceInput && (
                <span className="flex items-center gap-1 text-[10px] text-cyan-400 bg-cyan-950/70 px-1.5 py-0.2 rounded border border-cyan-500/30">
                  <Mic className="w-2.5 h-2.5" /> VOZ
                </span>
              )}
              {msg.commandType && (
                <span className="text-[10px] text-violet-300 bg-violet-950/70 px-1.5 py-0.2 rounded border border-violet-500/30">
                  {msg.commandType}
                </span>
              )}
              <span className="text-slate-500 tabular-nums">{msg.timestamp}</span>
            </div>

            {/* Message Bubble Card */}
            <div
              className={`relative max-w-[92%] sm:max-w-[85%] rounded-2xl px-4 py-3 text-sm transition-all ${
                isUser
                  ? 'bg-cyan-950/50 border border-cyan-500/40 text-cyan-100 rounded-tr-none shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                  : isCombat
                  ? 'bg-red-950/40 border border-red-500/40 text-red-100 rounded-tl-none glow-red'
                  : 'bg-[#0f111e]/90 border border-violet-500/25 text-slate-100 rounded-tl-none shadow-[0_0_20px_rgba(168,85,247,0.12)]'
              } ${isSpeakingThis ? 'ring-2 ring-violet-400' : ''}`}
            >
              {/* Corner Tech Accents */}
              <div
                className={`absolute top-0 right-0 w-2 h-2 border-t border-r ${
                  isCombat ? 'border-red-400' : 'border-cyan-400'
                }`}
              />
              <div
                className={`absolute bottom-0 left-0 w-2 h-2 border-b border-l ${
                  isCombat ? 'border-red-400' : 'border-violet-400'
                }`}
              />

              {/* Status sending indicator */}
              {msg.status === 'sending' && (
                <div className="flex items-center gap-2 text-xs text-cyan-400 font-mono mb-1">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>Processando telemetria neural...</span>
                </div>
              )}

              {/* Error banner */}
              {msg.status === 'error' && (
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-red-950/70 border border-red-500/60 text-red-300 text-xs mb-2">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{msg.errorMessage || 'Falha na resposta do servidor.'}</span>
                  </div>
                  {onRetryMessage && (
                    <button
                      onClick={() => onRetryMessage(msg)}
                      className="px-2 py-0.5 rounded bg-red-900/80 hover:bg-red-800 text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Repetir
                    </button>
                  )}
                </div>
              )}

              {/* Message text with whitespace preservation */}
              <div className="leading-relaxed whitespace-pre-wrap font-sans select-text">
                {msg.text}
              </div>

              {/* Audio Speaking Equalizer Animation */}
              {isSpeakingThis && (
                <div className="mt-2 pt-2 border-t border-cyan-500/20 flex items-center gap-2 text-xs text-cyan-300 font-mono">
                  <div className="flex items-end gap-0.5 h-3">
                    <div className="w-1 bg-cyan-400 h-full animate-pulse" />
                    <div className="w-1 bg-violet-400 h-2/3 animate-pulse delay-75" />
                    <div className="w-1 bg-cyan-400 h-full animate-pulse delay-150" />
                    <div className="w-1 bg-violet-400 h-1/2 animate-pulse" />
                  </div>
                  <span>Reproduzindo voz em Português (patrão)...</span>
                </div>
              )}

              {/* Bottom Actions for Jarvis messages */}
              {isJarvis && msg.status !== 'sending' && (
                <div className="mt-2 pt-1.5 border-t border-cyan-500/10 flex items-center justify-end gap-2 text-xs text-slate-400">
                  <button
                    onClick={() => onSpeakMessage(msg.text, msg.id)}
                    className="p-1 rounded hover:text-cyan-200 hover:bg-cyan-950/60 transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
                    title="Falar novamente em Português"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">Falar</span>
                  </button>
                  <button
                    onClick={() => handleCopy(msg.id, msg.text)}
                    className="p-1 rounded hover:text-cyan-200 hover:bg-cyan-950/60 transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
                    title="Copiar texto"
                  >
                    {copiedId === msg.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="hidden xs:inline">Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
