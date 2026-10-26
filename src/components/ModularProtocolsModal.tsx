import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Zap,
  Clock,
  FileText,
  Volume2,
  Trash2,
  Play,
  Pause,
  Plus,
  Sliders,
  Smartphone,
  ExternalLink,
  MessageSquare,
  Phone,
  Navigation,
  Calendar,
  Mail,
  Search,
  Share2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { ProtocolMode, TelemetryState, TimerItem, TacticalLog } from '../types/jarvis';
import { VoiceOption } from '../utils/speechSynthesis';
import { playTechClick, playReactorPowerSurge } from '../utils/audioEffects';
import {
  getDeviceCapabilities,
  DeviceCapabilityReport,
  AUTHORIZED_AUTOMATION_ACTIONS,
  executeAuthorizedAction,
  AutomationExecutionResult,
} from '../utils/androidAutomation';

interface ModularProtocolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: TelemetryState;
  onUpdateTelemetry: (updates: Partial<TelemetryState>) => void;
  timers: TimerItem[];
  onToggleTimer: (id: string) => void;
  onDeleteTimer: (id: string) => void;
  onAddTimer: (label: string, minutes: number) => void;
  logs: TacticalLog[];
  onAddLog: (title: string, content: string) => void;
  onDeleteLog: (id: string) => void;
  voices: VoiceOption[];
  onTestVoice: () => void;
}

type TabType = 'protocols' | 'reactor' | 'timers' | 'logs' | 'voice' | 'automations';

export const ModularProtocolsModal: React.FC<ModularProtocolsModalProps> = ({
  isOpen,
  onClose,
  telemetry,
  onUpdateTelemetry,
  timers,
  onToggleTimer,
  onDeleteTimer,
  onAddTimer,
  logs,
  onAddLog,
  onDeleteLog,
  voices,
  onTestVoice,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('protocols');
  const [newTimerLabel, setNewTimerLabel] = useState('');
  const [newTimerMinutes, setNewTimerMinutes] = useState(5);

  const [newLogTitle, setNewLogTitle] = useState('');
  const [newLogContent, setNewLogContent] = useState('');

  // Android automations state
  const [deviceCaps, setDeviceCaps] = useState<DeviceCapabilityReport | null>(null);
  const [actionInputs, setActionInputs] = useState<Record<string, string>>({
    whatsapp: 'Olá patrão, comunicação transmitida via J.A.R.V.I.S.',
    phone: '',
    maps: 'Avenida Paulista, São Paulo',
    calendar: 'Reunião de Alinhamento Tático',
    email: '',
    search: 'Inteligência Artificial e Tecnologias Quânticas',
  });
  const [automationResult, setAutomationResult] = useState<AutomationExecutionResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDeviceCaps(getDeviceCapabilities());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleProtocolSelect = (mode: ProtocolMode) => {
    playTechClick(telemetry.audioMuted);
    let reactorPower = 100;
    let shields = 100;

    if (mode === 'COMBAT') {
      reactorPower = 115;
      shields = 100;
    } else if (mode === 'STEALTH') {
      reactorPower = 45;
      shields = 70;
    } else if (mode === 'DIAGNOSTIC') {
      reactorPower = 90;
    }

    onUpdateTelemetry({
      activeProtocol: mode,
      arcReactorPower: reactorPower,
      defenseShield: shields,
    });
  };

  const handleCreateTimer = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTimerMinutes <= 0) return;
    onAddTimer(
      newTimerLabel.trim() || `Missão (${newTimerMinutes} min)`,
      newTimerMinutes
    );
    setNewTimerLabel('');
  };

  const handleCreateLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogTitle.trim() || !newLogContent.trim()) return;
    onAddLog(newLogTitle.trim(), newLogContent.trim());
    setNewLogTitle('');
    setNewLogContent('');
  };

  const handleRunAutomation = async (actionId: string) => {
    playTechClick(telemetry.audioMuted);
    const param = actionInputs[actionId] || '';
    const res = await executeAuthorizedAction(actionId, param);
    setAutomationResult(res);
  };

  const renderActionIcon = (iconName: string) => {
    switch (iconName) {
      case 'MessageSquare':
        return <MessageSquare className="w-4 h-4 text-emerald-400" />;
      case 'Phone':
        return <Phone className="w-4 h-4 text-cyan-400" />;
      case 'Navigation':
        return <Navigation className="w-4 h-4 text-blue-400" />;
      case 'Calendar':
        return <Calendar className="w-4 h-4 text-violet-400" />;
      case 'Mail':
        return <Mail className="w-4 h-4 text-amber-400" />;
      case 'Search':
        return <Search className="w-4 h-4 text-purple-400" />;
      case 'Share2':
        return <Share2 className="w-4 h-4 text-pink-400" />;
      default:
        return <ExternalLink className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0a0b14] border border-cyan-500/30 text-slate-100 shadow-[0_0_40px_rgba(0,240,255,0.25)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-cyan-500/20 bg-[#0e101d]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-950/60 border border-violet-500/40 text-violet-300">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-hud text-base sm:text-lg font-bold text-white tracking-wider">
                CENTRO DE PROTOCOLOS & AUTOMAÇÕES
              </h2>
              <p className="text-xs text-cyan-400 font-mono">
                J.A.R.V.I.S. Neural Assistant · Diretivas e Dispositivos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto border-b border-cyan-500/20 bg-[#0d0e1a] px-3 pt-2 gap-1 text-xs font-mono scrollbar-none">
          {[
            { id: 'protocols', label: 'Protocolos', icon: Shield },
            { id: 'automations', label: 'Automações Android', icon: Smartphone },
            { id: 'reactor', label: 'Núcleo Neural', icon: Zap },
            { id: 'timers', label: 'Temporizadores', icon: Clock, count: timers.length },
            { id: 'logs', label: 'Registros', icon: FileText, count: logs.length },
            { id: 'voice', label: 'Voz & Idioma', icon: Volume2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  playTechClick(telemetry.audioMuted);
                  setActiveTab(tab.id as TabType);
                }}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-t-lg transition-colors whitespace-nowrap border-b-2 cursor-pointer ${
                  isActive
                    ? 'border-cyan-400 bg-cyan-950/50 text-cyan-200 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: PROTOCOLS */}
          {activeTab === 'protocols' && (
            <div className="space-y-4">
              <div className="text-xs font-mono text-cyan-400 tracking-wider">
                DIRETIVAS OPERACIONAIS
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    id: 'NORMAL',
                    title: 'PROTOCOLO NOMINAL',
                    desc: 'Operação balanceada com consumo otimizado e tempo de resposta instantâneo.',
                    color: 'border-cyan-500/40 bg-slate-900/60 text-cyan-300',
                  },
                  {
                    id: 'COMBAT',
                    title: 'MODO ALERTA MÁXIMO',
                    desc: 'Barreiras defensivas a 100%, frequência de resposta elevada e interface carmesim.',
                    color: 'border-red-500/40 bg-red-950/20 text-red-300',
                  },
                  {
                    id: 'STEALTH',
                    title: 'MODO FURTIVO',
                    desc: 'Atenuação acústica e eletromagnética, mantendo comandos essenciais silenciados.',
                    color: 'border-blue-500/40 bg-blue-950/20 text-blue-300',
                  },
                  {
                    id: 'DIAGNOSTIC',
                    title: 'DIAGNÓSTICO NEURAL',
                    desc: 'Varredura analítica de memória, latência de rede e integridade dos subsistemas.',
                    color: 'border-purple-500/40 bg-purple-950/20 text-purple-300',
                  },
                ].map((item) => {
                  const isSelected = telemetry.activeProtocol === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleProtocolSelect(item.id as ProtocolMode)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        item.color
                      } ${isSelected ? 'ring-2 ring-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.3)]' : 'opacity-75 hover:opacity-100'}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-hud text-sm font-bold">{item.title}</span>
                        {isSelected && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-400 text-black font-bold">
                            ATIVO
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300/80 leading-relaxed">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: AUTOMAÇÕES ANDROID (NEW REAL ARCHITECTURE) */}
          {activeTab === 'automations' && (
            <div className="space-y-4">
              {/* Diagnostic Box */}
              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-violet-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-violet-400" />
                    <span className="text-xs font-mono font-bold text-white">
                      DIAGNÓSTICO DO DISPOSITIVO
                    </span>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-violet-950 text-violet-300 border border-violet-500/40">
                    {deviceCaps?.platformSummary || 'Detectando...'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono pt-1 text-slate-300">
                  <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-500 block">SO Android:</span>
                    <span className={deviceCaps?.isAndroid ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                      {deviceCaps?.isAndroid ? 'Sim (Nativo/Mobile)' : 'Não (Desktop/Web)'}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-500 block">Modo Standalone:</span>
                    <span className={deviceCaps?.isStandalonePWA ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                      {deviceCaps?.isStandalonePWA ? 'PWA Instalado' : 'Aba de Navegador'}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-950/60 border border-slate-800 col-span-2 sm:col-span-1">
                    <span className="text-slate-500 block">Web Share API:</span>
                    <span className={deviceCaps?.hasWebShare ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                      {deviceCaps?.hasWebShare ? 'Disponível' : 'Fallback Ativo'}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  As automações utilizam protocolos seguros de Deep Links e Web Intents do Android (ex: <code className="text-cyan-300">whatsapp://</code>, <code className="text-cyan-300">tel:</code>, <code className="text-cyan-300">geo:</code>). Nenhuma ação oculta ou não autorizada é executada.
                </p>
              </div>

              {/* Execution Feedback Notification */}
              {automationResult && (
                <div
                  className={`p-3 rounded-xl border flex items-start gap-2 text-xs font-mono animate-fadeIn ${
                    automationResult.handled
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                      : 'bg-red-950/40 border-red-500/40 text-red-200'
                  }`}
                >
                  {automationResult.handled ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="font-bold">
                      {automationResult.actionLabel} · {automationResult.executedVia}
                    </div>
                    <div>{automationResult.feedbackText}</div>
                    {automationResult.targetUri && (
                      <div className="text-[10px] text-slate-400 mt-1 truncate">
                        URI: {automationResult.targetUri}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Cards List */}
              <div className="space-y-3">
                <div className="text-xs font-mono text-cyan-400 tracking-wider">
                  AÇÕES AUTORIZADAS DISPONÍVEIS
                </div>

                <div className="space-y-2">
                  {AUTHORIZED_AUTOMATION_ACTIONS.map((action) => (
                    <div
                      key={action.id}
                      className="p-3 rounded-xl bg-slate-900/60 border border-cyan-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 shrink-0">
                          {renderActionIcon(action.icon)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white font-mono">
                              {action.name}
                            </span>
                            <span className="text-[10px] text-cyan-400 font-mono">
                              {action.intentScheme}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{action.description}</p>

                          {action.requiresInput && (
                            <input
                              type="text"
                              value={actionInputs[action.id] || ''}
                              onChange={(e) =>
                                setActionInputs((prev) => ({
                                  ...prev,
                                  [action.id]: e.target.value,
                                }))
                              }
                              placeholder={action.inputPlaceholder || 'Parâmetro'}
                              className="mt-2 w-full px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                            />
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleRunAutomation(action.id)}
                        className="min-h-[44px] sm:min-h-0 px-3.5 py-2 rounded-lg bg-cyan-950 border border-cyan-500/40 hover:bg-cyan-900 text-cyan-200 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Disparar Ação</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CYBER CORE / OVERCLOCK */}
          {activeTab === 'reactor' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/70 border border-cyan-500/30 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono text-cyan-300">POTÊNCIA DO NÚCLEO NEURAL:</span>
                  <span className="text-lg font-mono font-bold text-cyan-400">
                    {telemetry.arcReactorPower}%
                  </span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="150"
                  step="5"
                  value={telemetry.arcReactorPower}
                  onChange={(e) => {
                    const power = Number(e.target.value);
                    if (power > 110) playReactorPowerSurge(telemetry.audioMuted);
                    onUpdateTelemetry({
                      arcReactorPower: power,
                      coreTemp: Math.floor(35 + (power / 150) * 15),
                    });
                  }}
                  className="w-full accent-cyan-400"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>30% (Econômico)</span>
                  <span>100% (Nominal)</span>
                  <span className="text-amber-400 font-bold">150% (Sobrecarga)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-900/50 border border-cyan-500/20 text-xs font-mono">
                  <span className="text-slate-400 block mb-1">TEMPERATURA DA MATRIZ:</span>
                  <span className="text-cyan-300 font-bold text-base">{telemetry.coreTemp}°C</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/50 border border-cyan-500/20 text-xs font-mono">
                  <span className="text-slate-400 block mb-1">CAMPO DEFENSIVO:</span>
                  <span className="text-cyan-300 font-bold text-base">{telemetry.defenseShield}%</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TIMERS */}
          {activeTab === 'timers' && (
            <div className="space-y-4">
              {/* Form to create timer */}
              <form onSubmit={handleCreateTimer} className="p-4 rounded-xl bg-slate-900/70 border border-cyan-500/30 space-y-3">
                <div className="text-xs font-mono text-cyan-400 font-bold">CRIAR NOVO TEMPORIZADOR</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newTimerLabel}
                    onChange={(e) => setNewTimerLabel(e.target.value)}
                    placeholder="Descrição da contagem"
                    className="sm:col-span-2 px-3 py-2 rounded-lg bg-slate-950 border border-cyan-500/30 text-xs text-white placeholder-slate-600 focus:outline-none"
                  />
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={newTimerMinutes}
                    onChange={(e) => setNewTimerMinutes(parseInt(e.target.value, 10) || 1)}
                    className="px-3 py-2 rounded-lg bg-slate-950 border border-cyan-500/30 text-xs text-white focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Iniciar Contador
                </button>
              </form>

              {/* Timers List */}
              {timers.length === 0 ? (
                <div className="text-center py-6 text-xs font-mono text-slate-500">
                  Nenhum temporizador ativo no momento.
                </div>
              ) : (
                <div className="space-y-2">
                  {timers.map((timer) => {
                    const min = Math.floor(timer.remainingSeconds / 60);
                    const sec = timer.remainingSeconds % 60;
                    return (
                      <div
                        key={timer.id}
                        className="p-3 rounded-xl bg-slate-900/60 border border-cyan-500/25 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="text-xs font-bold text-white font-mono">{timer.label}</div>
                          <div className="text-lg font-mono font-bold text-cyan-300 tabular-nums">
                            {String(min).padStart(2, '0')}:{String(sec).padStart(2, '0')}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onToggleTimer(timer.id)}
                            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-colors"
                          >
                            {timer.isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => onDeleteTimer(timer.id)}
                            className="p-2 rounded-lg bg-slate-800 hover:bg-red-950 hover:text-red-400 text-slate-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <form onSubmit={handleCreateLog} className="p-4 rounded-xl bg-slate-900/70 border border-cyan-500/30 space-y-3">
                <div className="text-xs font-mono text-cyan-400 font-bold">REGISTRAR NOTA TÁTICA</div>
                <input
                  type="text"
                  value={newLogTitle}
                  onChange={(e) => setNewLogTitle(e.target.value)}
                  placeholder="Título do registro"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-cyan-500/30 text-xs text-white placeholder-slate-600 focus:outline-none"
                />
                <textarea
                  value={newLogContent}
                  onChange={(e) => setNewLogContent(e.target.value)}
                  placeholder="Conteúdo descritivo"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-cyan-500/30 text-xs text-white placeholder-slate-600 focus:outline-none"
                />
                <button
                  type="submit"
                  className="w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Salvar Nota
                </button>
              </form>

              {logs.length === 0 ? (
                <div className="text-center py-6 text-xs font-mono text-slate-500">
                  Nenhum registro gravado.
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-slate-900/60 border border-cyan-500/25 flex items-start justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-white font-mono">{log.title}</span>
                          <span className="text-[10px] text-cyan-400 font-mono">{log.timestamp}</span>
                        </div>
                        <p className="text-xs text-slate-300 font-sans">{log.content}</p>
                      </div>
                      <button
                        onClick={() => onDeleteLog(log.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: VOICE & SPEECH CONFIG */}
          {activeTab === 'voice' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/70 border border-cyan-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-mono font-bold text-white">RESPOSTAS FALADAS AUTOMÁTICAS</div>
                    <div className="text-[11px] text-slate-400">
                      J.A.R.V.I.S. responderá falando em Português do Brasil com voz masculina firme.
                    </div>
                  </div>
                  <button
                    onClick={() => onUpdateTelemetry({ voiceAutoSpeak: !telemetry.voiceAutoSpeak })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                      telemetry.voiceAutoSpeak
                        ? 'bg-cyan-400 text-black shadow-[0_0_12px_#00f0ff]'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {telemetry.voiceAutoSpeak ? 'ATIVADO' : 'DESATIVADO'}
                  </button>
                </div>

                {/* Voice Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-cyan-300 block">VOZ SINTETIZADA (pt-BR)</label>
                  <select
                    value={telemetry.selectedVoiceUri}
                    onChange={(e) => onUpdateTelemetry({ selectedVoiceUri: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-cyan-500/30 text-xs text-white focus:outline-none"
                  >
                    <option value="">Voz Prioritária (pt-BR Masculina / J.A.R.V.I.S.)</option>
                    {voices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang}) {v.isPtBr ? '★ pt-BR' : ''} {v.isMale ? '♂ Masculina' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Speed / Rate */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-300">VELOCIDADE DA FALA:</span>
                    <span className="text-cyan-400 font-bold tabular-nums">
                      {telemetry.speechRate.toFixed(2)}x{' '}
                      {Math.abs(telemetry.speechRate - 1.2) < 0.03 ? (
                        <span className="text-emerald-400 font-normal">(+20% J.A.R.V.I.S.)</span>
                      ) : (
                        ''
                      )}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.80"
                    max="1.50"
                    step="0.05"
                    value={telemetry.speechRate}
                    onChange={(e) => onUpdateTelemetry({ speechRate: Number(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>0.8x (Lenta)</span>
                    <span className="text-cyan-400">1.2x (Ágil & Firme)</span>
                    <span>1.5x (Rápida)</span>
                  </div>
                </div>

                {/* Pitch */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-300">TOM DE VOZ (PITCH / GRAVE):</span>
                    <span className="text-cyan-400 font-bold tabular-nums">
                      {telemetry.speechPitch.toFixed(2)}{' '}
                      {Math.abs(telemetry.speechPitch - 0.92) < 0.04 ? (
                        <span className="text-emerald-400 font-normal">(Grave Masculino)</span>
                      ) : (
                        ''
                      )}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.75"
                    max="1.25"
                    step="0.02"
                    value={telemetry.speechPitch}
                    onChange={(e) => onUpdateTelemetry({ speechPitch: Number(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span className="text-cyan-400">0.92 (Grave Firme)</span>
                    <span>1.0 (Neutro)</span>
                    <span>1.25 (Agudo)</span>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      playTechClick(telemetry.audioMuted);
                      onUpdateTelemetry({ speechRate: 1.2, speechPitch: 0.92 });
                    }}
                    className="px-2.5 py-1 rounded-lg bg-cyan-950 border border-cyan-400/40 text-[11px] font-mono text-cyan-300 hover:bg-cyan-900/60 transition-colors cursor-pointer"
                  >
                    ✦ Restaurar Calibragem J.A.R.V.I.S. (1.20x / Grave)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playTechClick(telemetry.audioMuted);
                      onUpdateTelemetry({ speechRate: 1.0, speechPitch: 1.0 });
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[11px] font-mono text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Padrão Neutro (1.0x / 1.0)
                  </button>
                </div>

                {/* Test Speech Button */}
                <button
                  onClick={onTestVoice}
                  className="w-full py-2.5 rounded-xl border border-cyan-500/50 bg-cyan-950/70 hover:bg-cyan-900 text-cyan-200 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" /> Testar Voz do Jarvis em Português
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
