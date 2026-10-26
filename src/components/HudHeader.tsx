import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, Radio, Settings, Square, Mic, AlertTriangle } from 'lucide-react';
import { TelemetryState } from '../types/jarvis';
import { playTechClick } from '../utils/audioEffects';

interface HudHeaderProps {
  telemetry: TelemetryState;
  isSpeaking: boolean;
  onStopSpeaking: () => void;
  onToggleMute: () => void;
  onToggleAutoSpeak: () => void;
  onOpenProtocols: () => void;
  onOpenMicHelp: () => void;
  micPermissionState: 'granted' | 'denied' | 'prompt' | 'unknown';
}

export const HudHeader: React.FC<HudHeaderProps> = ({
  telemetry,
  isSpeaking,
  onStopSpeaking,
  onToggleMute,
  onToggleAutoSpeak,
  onOpenProtocols,
  onOpenMicHelp,
  micPermissionState,
}) => {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('pt-BR', { hour12: false }));
      setDateStr(
        now.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase()
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isCombat = telemetry.activeProtocol === 'COMBAT';

  return (
    <header className="w-full bg-[#0a0b12]/90 backdrop-blur-md border-b border-cyan-500/20 px-3 sm:px-6 py-2 z-20 sticky top-0 transition-colors">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Original Cyberpunk Brand & Pulse Indicator */}
        <div className="flex items-center gap-2.5">
          <div
            className={`w-2.5 h-2.5 rounded-full transition-all shrink-0 ${
              isCombat
                ? 'bg-red-500 shadow-[0_0_12px_#ef4444] animate-pulse'
                : 'bg-cyan-400 shadow-[0_0_12px_#00f0ff] animate-pulse'
            }`}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-hud text-base sm:text-lg font-black tracking-wider text-white">
                J.A.R.V.I.S.
              </span>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border border-violet-500/40 bg-violet-950/40 text-violet-300">
                CYBER CORE
              </span>
            </div>
            <div className="text-[10px] text-cyan-400/80 font-mono tracking-wider hidden xs:block">
              NEURAL PROTOCOL • PT-BR
            </div>
          </div>
        </div>

        {/* Center: Protocol & Cyber Clock */}
        <div className="hidden md:flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900/90 border border-cyan-500/30">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="text-cyan-200">
              {telemetry.activeProtocol === 'NORMAL' && 'PROTOCOLO NOMINAL'}
              {telemetry.activeProtocol === 'COMBAT' && 'ALERTA DE COMBATE'}
              {telemetry.activeProtocol === 'STEALTH' && 'MODO FURTIVO'}
              {telemetry.activeProtocol === 'DIAGNOSTIC' && 'DIAGNÓSTICO NEURAL'}
            </span>
          </div>

          <div className="text-slate-400 font-mono tracking-wider">
            <span>{dateStr}</span> · <span className="text-cyan-300 font-bold">{timeStr}</span>
          </div>
        </div>

        {/* Right: Quick Controls & Audio Tools with Mobile Touch Targets */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Stop Speaking button if active */}
          {isSpeaking && (
            <button
              onClick={() => {
                playTechClick(telemetry.audioMuted);
                onStopSpeaking();
              }}
              className="min-h-[44px] min-w-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-500/60 bg-red-950/70 text-red-300 hover:bg-red-900 transition-colors animate-pulse cursor-pointer"
              title="Interromper fala do Jarvis"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">Silenciar</span>
            </button>
          )}

          {/* Mic permission status */}
          <button
            onClick={() => {
              playTechClick(telemetry.audioMuted);
              onOpenMicHelp();
            }}
            className={`min-h-[44px] min-w-[44px] p-2.5 rounded-lg border text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer ${
              micPermissionState === 'denied'
                ? 'border-red-500/70 bg-red-950/50 text-red-300 hover:bg-red-900/60'
                : 'border-cyan-500/30 bg-slate-900/70 text-cyan-400 hover:border-cyan-400'
            }`}
            title={
              micPermissionState === 'denied'
                ? 'Permissão de microfone bloqueada! Clique para resolver.'
                : 'Configurações de microfone e voz'
            }
          >
            {micPermissionState === 'denied' ? (
              <AlertTriangle className="w-4 h-4 text-red-400" />
            ) : (
              <Mic className="w-4 h-4 text-cyan-400" />
            )}
          </button>

          {/* Mute/Unmute SFX Toggle */}
          <button
            onClick={() => {
              playTechClick(telemetry.audioMuted);
              onToggleMute();
            }}
            className={`min-h-[44px] min-w-[44px] p-2.5 rounded-lg border transition-colors flex items-center justify-center cursor-pointer ${
              telemetry.audioMuted
                ? 'border-red-500/40 bg-slate-900 text-red-400'
                : 'border-cyan-500/30 bg-slate-900/70 text-cyan-300 hover:border-cyan-400'
            }`}
            title={telemetry.audioMuted ? 'Efeitos sonoros desativados' : 'Efeitos sonoros ativos'}
          >
            {telemetry.audioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Auto-speak voice response toggle */}
          <button
            onClick={() => {
              playTechClick(telemetry.audioMuted);
              onToggleAutoSpeak();
            }}
            className={`min-h-[44px] px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors flex items-center justify-center gap-1 cursor-pointer ${
              telemetry.voiceAutoSpeak
                ? 'border-violet-500/60 bg-violet-950/40 text-violet-200'
                : 'border-slate-800 bg-slate-900 text-slate-400'
            }`}
            title={
              telemetry.voiceAutoSpeak
                ? 'Leitura automática por voz ativada (J.A.R.V.I.S. responderá falando)'
                : 'Leitura automática por voz desativada'
            }
          >
            <span className="text-[10px] text-slate-400">VOZ:</span>
            <span className="font-bold">{telemetry.voiceAutoSpeak ? 'ON' : 'OFF'}</span>
          </button>

          {/* Protocols & Settings Modal trigger */}
          <button
            onClick={() => {
              playTechClick(telemetry.audioMuted);
              onOpenProtocols();
            }}
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-lg border border-cyan-500/40 bg-slate-900/80 text-cyan-300 hover:bg-slate-800 hover:border-cyan-400 transition-colors flex items-center justify-center cursor-pointer"
            title="Abrir Protocolos, Configurações e Automações Android"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
