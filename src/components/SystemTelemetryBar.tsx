import React from 'react';
import { TelemetryState } from '../types/jarvis';
import { Cpu, Zap, Thermometer, ShieldCheck } from 'lucide-react';

interface SystemTelemetryBarProps {
  telemetry: TelemetryState;
  onExecuteCommand: (command: string) => void;
}

export const SystemTelemetryBar: React.FC<SystemTelemetryBarProps> = ({
  telemetry,
  onExecuteCommand,
}) => {
  const isCombat = telemetry.activeProtocol === 'COMBAT';

  return (
    <div className="w-full bg-[#0d0e17]/80 border-b border-cyan-500/15 py-1.5 px-3 sm:px-6">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        {/* Telemetry Metrics */}
        <div className="grid grid-cols-2 xs:grid-cols-4 gap-3 sm:gap-6 w-full md:w-auto">
          {/* Cyber Core Output */}
          <div className="flex items-center gap-1.5">
            <Zap className={`w-3.5 h-3.5 ${isCombat ? 'text-red-400' : 'text-cyan-400'}`} />
            <span className="text-slate-400">NÚCLEO:</span>
            <span
              className={`font-bold tabular-nums ${
                telemetry.arcReactorPower > 100
                  ? 'text-amber-400'
                  : isCombat
                  ? 'text-red-300'
                  : 'text-cyan-300'
              }`}
            >
              {telemetry.arcReactorPower}%
            </span>
          </div>

          {/* CPU / Neural Net */}
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-slate-400">NEURAL:</span>
            <span className="font-bold text-violet-300 tabular-nums">{telemetry.cpuUsage}%</span>
          </div>

          {/* Core Temperature */}
          <div className="flex items-center gap-1.5">
            <Thermometer
              className={`w-3.5 h-3.5 ${
                telemetry.coreTemp > 45 ? 'text-amber-400' : 'text-cyan-400'
              }`}
            />
            <span className="text-slate-400">TÉRMICA:</span>
            <span
              className={`font-bold tabular-nums ${
                telemetry.coreTemp > 45 ? 'text-amber-400' : 'text-cyan-300'
              }`}
            >
              {telemetry.coreTemp}°C
            </span>
          </div>

          {/* Deflector Shields */}
          <div className="flex items-center gap-1.5">
            <ShieldCheck
              className={`w-3.5 h-3.5 ${isCombat ? 'text-red-400' : 'text-violet-400'}`}
            />
            <span className="text-slate-400">BARREIRA:</span>
            <span className="font-bold text-cyan-300 tabular-nums">{telemetry.defenseShield}%</span>
          </div>
        </div>

        {/* Quick Protocol Triggers */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => onExecuteCommand('status dos sistemas')}
            className="text-[11px] px-2.5 py-1 rounded-md border border-cyan-500/30 bg-slate-900/60 text-cyan-300 hover:border-cyan-400 hover:text-white transition-colors cursor-pointer"
          >
            Diagnóstico
          </button>
          <button
            onClick={() => onExecuteCommand(isCombat ? 'modo normal' : 'modo combate')}
            className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
              isCombat
                ? 'border-cyan-500/40 bg-cyan-950/40 text-cyan-200'
                : 'border-red-500/40 bg-red-950/30 text-red-300 hover:bg-red-900/50'
            }`}
          >
            {isCombat ? 'Modo Normal' : 'Alerta Combate'}
          </button>
          <button
            onClick={() => onExecuteCommand('clima')}
            className="text-[11px] px-2.5 py-1 rounded-md border border-violet-500/30 bg-slate-900/60 text-violet-300 hover:border-violet-400 hover:text-white transition-colors cursor-pointer"
          >
            Sensores Clima
          </button>
        </div>
      </div>
    </div>
  );
};
