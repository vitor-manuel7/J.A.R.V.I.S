import React from 'react';
import { ProtocolMode } from '../types/jarvis';

interface CyberCoreProps {
  isListening: boolean;
  isSpeaking: boolean;
  audioLevel: number; // 0 - 100
  protocol: ProtocolMode;
  reactorPower: number;
  onClick: () => void;
}

/**
 * CyberCore - Original Cybernetic Neural Matrix Core
 * 
 * Distinctive cyberpunk visual centerpiece:
 * - Deep obsidian/graphite foundation
 * - Electric cyan (#00f0ff) and neon violet (#a855f7) harmonic energy fields
 * - Dynamic gyro rings and quantum lattice nodes responding to voice audio level
 * - Preserves complete interface contract and touch ergonomics
 */
export const ArcReactor: React.FC<CyberCoreProps> = ({
  isListening,
  isSpeaking,
  audioLevel,
  protocol,
  reactorPower,
  onClick,
}) => {
  const isCombat = protocol === 'COMBAT';
  const isStealth = protocol === 'STEALTH';

  // Dynamic scale and audio pulse reactive behavior
  const activeBonus = isListening || isSpeaking ? 0.08 + (audioLevel / 100) * 0.16 : 0;
  const baseScale = 1 + activeBonus;

  // Energy field colors
  const primaryCyan = isCombat ? '#ef4444' : isStealth ? '#38bdf8' : '#00f0ff';
  const secondaryViolet = isCombat ? '#b91c1c' : isStealth ? '#6366f1' : '#a855f7';
  const coreGlow = isCombat
    ? `0 0 ${25 + audioLevel * 0.4}px rgba(239, 68, 68, 0.7), 0 0 50px rgba(185, 28, 28, 0.4)`
    : `0 0 ${25 + audioLevel * 0.4}px rgba(0, 240, 255, 0.65), 0 0 55px rgba(168, 85, 247, 0.45)`;

  return (
    <div className="flex flex-col items-center justify-center select-none py-1 sm:py-2">
      {/* Interactive Core Touch Container */}
      <div
        onClick={onClick}
        role="button"
        tabIndex={0}
        aria-label="Núcleo Neural Cyberpunk - Toque para ativar o reconhecimento vocal"
        className="relative w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center cursor-pointer group transition-transform duration-200 outline-none"
        style={{
          transform: `scale(${baseScale})`,
        }}
      >
        {/* Layer 0: Ambient Energy Field (Cyan + Violet Dual Gradient) */}
        <div
          className="absolute inset-0 rounded-full transition-all duration-300 pointer-events-none"
          style={{
            background: isCombat
              ? 'radial-gradient(circle, rgba(239,68,68,0.22) 0%, rgba(15,23,42,0) 70%)'
              : 'radial-gradient(circle, rgba(168,85,247,0.2) 0%, rgba(0,240,255,0.18) 45%, rgba(10,10,15,0) 75%)',
            boxShadow: coreGlow,
          }}
        />

        {/* Layer 1: Outermost Hexagonal Cyber Lattice Ring */}
        <div className="absolute inset-1 rounded-full border border-violet-500/25 animate-spin-slow">
          <svg className="w-full h-full" viewBox="0 0 200 200">
            {/* Hexagonal tick marks */}
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30 * Math.PI) / 180;
              const x1 = 100 + 92 * Math.cos(angle);
              const y1 = 100 + 92 * Math.sin(angle);
              const x2 = 100 + 84 * Math.cos(angle);
              const y2 = 100 + 84 * Math.sin(angle);
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={i % 2 === 0 ? primaryCyan : secondaryViolet}
                  strokeWidth={i % 3 === 0 ? '2' : '1.2'}
                  opacity={isListening || isSpeaking ? '0.9' : '0.5'}
                />
              );
            })}
            {/* Fine outer ring */}
            <circle
              cx="100"
              cy="100"
              r="88"
              fill="none"
              stroke={primaryCyan}
              strokeWidth="0.75"
              strokeDasharray="6 12 18 12"
              opacity="0.6"
            />
          </svg>
        </div>

        {/* Layer 2: Counter-Rotating Electric Ring with Orbital Data Nodes */}
        <div className="absolute inset-3 rounded-full border border-cyan-400/20 animate-spin-reverse-slow">
          <div
            className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full shadow-[0_0_8px_#00f0ff]"
            style={{ backgroundColor: primaryCyan }}
          />
          <div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full shadow-[0_0_8px_#a855f7]"
            style={{ backgroundColor: secondaryViolet }}
          />
          <div
            className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: primaryCyan }}
          />
          <div
            className="absolute -right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: secondaryViolet }}
          />
        </div>

        {/* Layer 3: Cyber Harmonic Gyro Ring (Segmented Octagonal Track) */}
        <div className="absolute inset-6 rounded-full border border-violet-500/30 flex items-center justify-center">
          <svg className="w-full h-full" viewBox="0 0 160 160">
            {/* Segmented dashed cyan/violet arc tracks */}
            <circle
              cx="80"
              cy="80"
              r="72"
              fill="none"
              stroke={primaryCyan}
              strokeWidth="2"
              strokeDasharray="24 16"
              opacity={isListening ? '0.9' : '0.45'}
            />
            <circle
              cx="80"
              cy="80"
              r="64"
              fill="none"
              stroke={secondaryViolet}
              strokeWidth="1.5"
              strokeDasharray="14 10"
              opacity={isSpeaking ? '0.9' : '0.4'}
            />
          </svg>
        </div>

        {/* Layer 4: Neural Synapse Rays (Rotated Ray Points) */}
        <div className="absolute inset-8 rounded-full flex items-center justify-center pointer-events-none">
          <div className="relative w-full h-full">
            {Array.from({ length: 8 }).map((_, i) => {
              const deg = i * 45;
              const isAccent = i % 2 === 0;
              return (
                <div
                  key={i}
                  className="absolute top-1/2 left-1/2 w-1 h-3 -mt-1.5 -ml-0.5 rounded-full transition-all duration-300"
                  style={{
                    transform: `rotate(${deg}deg) translateY(-40px)`,
                    backgroundColor: isAccent ? primaryCyan : secondaryViolet,
                    boxShadow:
                      isListening || isSpeaking
                        ? `0 0 10px ${isAccent ? primaryCyan : secondaryViolet}`
                        : 'none',
                    opacity: isListening || isSpeaking ? 1 : 0.6,
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Layer 5: Dark Graphite Singular Core Shield */}
        <div
          className={`absolute inset-10 sm:inset-12 rounded-full border-2 transition-all duration-300 flex items-center justify-center shadow-inner ${
            isCombat
              ? 'border-red-500/70 bg-slate-950/90'
              : 'border-cyan-400/60 bg-slate-950/95'
          }`}
          style={{
            boxShadow: `inset 0 0 20px ${primaryCyan}40, 0 0 15px ${secondaryViolet}30`,
          }}
        >
          {/* Layer 6: Neural Quantum Singularity Center */}
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
            {/* Ambient inner glow */}
            <div
              className="absolute inset-0 rounded-full transition-transform duration-100"
              style={{
                background: `radial-gradient(circle, ${primaryCyan} 0%, ${secondaryViolet} 60%, transparent 100%)`,
                opacity: isListening ? 0.95 : isSpeaking ? 0.85 : 0.45,
                transform: `scale(${1 + (audioLevel / 100) * 0.35})`,
                filter: 'blur(2px)',
              }}
            />

            {/* Sharp Cybernetic Core Node */}
            <div
              className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all duration-150 rotate-45 border"
              style={{
                backgroundColor: '#0a0a12',
                borderColor: primaryCyan,
                boxShadow: `0 0 ${12 + audioLevel * 0.3}px ${primaryCyan}`,
                transform: `rotate(45deg) scale(${1 + (audioLevel / 100) * 0.2})`,
              }}
            >
              {/* Central Diamond Spark */}
              <div
                className="w-2.5 h-2.5 rounded-sm transition-colors"
                style={{
                  backgroundColor: isCombat ? '#ef4444' : isListening ? '#00f0ff' : '#c084fc',
                  boxShadow: `0 0 8px ${primaryCyan}`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Live Audio Acoustic Wave Ping (When listening or speaking) */}
        {(isListening || isSpeaking) && (
          <div
            className="absolute -inset-4 rounded-full border border-cyan-400/40 animate-ping pointer-events-none"
            style={{
              animationDuration: isListening ? '1.4s' : '1.8s',
              borderColor: isListening ? '#00f0ff' : '#a855f7',
            }}
          />
        )}
      </div>

      {/* Sub-label Telemetry Status & Tactile Cue */}
      <div className="mt-2 flex flex-col items-center text-center">
        <span
          className="text-xs font-mono font-bold tracking-widest uppercase transition-colors"
          style={{
            color: isCombat ? '#ef4444' : isListening ? '#00f0ff' : isSpeaking ? '#c084fc' : '#38bdf8',
            textShadow: isListening ? '0 0 10px rgba(0, 240, 255, 0.7)' : 'none',
          }}
        >
          {isListening
            ? '● CAPTURANDO VOZ...'
            : isSpeaking
            ? '● J.A.R.V.I.S. FALANDO...'
            : `NÚCLEO NEURAL ATIVO • ${reactorPower}%`}
        </span>
        <span className="text-[11px] text-slate-400 tracking-wide mt-0.5 font-medium">
          {isListening ? 'Fale seu comando em português' : 'Toque no núcleo para falar'}
        </span>
      </div>
    </div>
  );
};

// Also export as CyberCore for descriptive semantic imports
export const CyberCore = ArcReactor;
