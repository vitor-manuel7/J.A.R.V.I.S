import React, { useState } from 'react';
import { Mic, CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react';

interface PermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  permissionState: 'granted' | 'denied' | 'prompt' | 'unknown';
  onRequestPermission: () => Promise<void>;
}

export const PermissionModal: React.FC<PermissionModalProps> = ({
  isOpen,
  onClose,
  permissionState,
  onRequestPermission,
}) => {
  const [testingMic, setTestingMic] = useState(false);
  const [testAudioLevel, setTestAudioLevel] = useState(0);
  const [testSuccess, setTestSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'chrome' | 'safari' | 'edge'>('chrome');

  if (!isOpen) return null;

  const handleTestMic = async () => {
    setTestingMic(true);
    setTestSuccess(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let count = 0;

      const interval = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        const level = Math.min(100, Math.round((avg / 255) * 100));
        setTestAudioLevel(level);

        count++;
        if (count > 40) {
          clearInterval(interval);
          stream.getTracks().forEach((t) => t.stop());
          ctx.close().catch(() => {});
          setTestingMic(false);
          setTestSuccess(true);
        }
      }, 100);
    } catch (e) {
      setTestingMic(false);
      setTestSuccess(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-950 border border-cyan-500/40 p-5 sm:p-6 text-slate-100 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-hud text-base font-bold text-white tracking-wide">
                DIRETIVA DE ACESSO AO MICROFONE
              </h3>
              <p className="text-xs text-cyan-400/80 font-mono">
                Sistemas de Comunicação Vocal J.A.R.V.I.S.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Badge */}
        <div className="mt-4 p-3 rounded-xl bg-slate-900 border border-cyan-500/20 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">STATUS ATUAL DA PERMISSÃO:</span>
          {permissionState === 'granted' ? (
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" /> CONCEDIDO
            </span>
          ) : permissionState === 'denied' ? (
            <span className="flex items-center gap-1.5 text-red-400 font-bold bg-red-950/50 px-2 py-0.5 rounded border border-red-500/30">
              <XCircle className="w-3.5 h-3.5" /> BLOQUEADO
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-400 font-bold bg-amber-950/50 px-2 py-0.5 rounded border border-amber-500/30">
              <AlertTriangle className="w-3.5 h-3.5" /> AGUARDANDO AUTORIZAÇÃO
            </span>
          )}
        </div>

        {/* Live Mic Test Meter */}
        <div className="mt-4 p-3 rounded-xl bg-slate-900/60 border border-cyan-500/20 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-cyan-300 font-mono font-semibold">TESTE DE ENTRADA DE ÁUDIO</span>
            <button
              onClick={handleTestMic}
              disabled={testingMic}
              className="text-xs px-2.5 py-1 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-200 font-mono transition-colors"
            >
              {testingMic ? 'Captando sinal...' : 'Testar Sensibilidade'}
            </button>
          </div>

          <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-cyan-500/30 flex">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-amber-400 transition-all duration-75"
              style={{ width: `${testingMic ? testAudioLevel : testSuccess ? 100 : 0}%` }}
            />
          </div>

          {testSuccess && (
            <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Sinal de áudio detectado com clareza. O microfone está pronto!
            </div>
          )}
        </div>

        {/* Instructions Tabs */}
        <div className="mt-4">
          <div className="text-xs font-mono text-slate-400 mb-2">
            COMO DESBLOQUEAR SE O ACESSO FOI NEGADO:
          </div>

          <div className="flex gap-2 mb-3 border-b border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab('chrome')}
              className={`text-xs font-mono px-2.5 py-1 rounded transition-colors ${
                activeTab === 'chrome'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Chrome / Brave
            </button>
            <button
              onClick={() => setActiveTab('safari')}
              className={`text-xs font-mono px-2.5 py-1 rounded transition-colors ${
                activeTab === 'safari'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Safari (iOS / Mac)
            </button>
            <button
              onClick={() => setActiveTab('edge')}
              className={`text-xs font-mono px-2.5 py-1 rounded transition-colors ${
                activeTab === 'edge'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Edge / Firefox
            </button>
          </div>

          <div className="text-xs text-slate-300 font-sans space-y-2 bg-slate-900/40 p-3 rounded-lg border border-slate-800">
            {activeTab === 'chrome' && (
              <ol className="list-decimal list-inside space-y-1 text-slate-300">
                <li>Clique no ícone de <strong>Ajustes / Cadeado</strong> ao lado esquerdo da URL.</li>
                <li>Localize a opção <strong>Microfone</strong> e mude para <strong>Permitir</strong>.</li>
                <li>Atualize a página ou clique no botão de autorizar abaixo.</li>
              </ol>
            )}
            {activeTab === 'safari' && (
              <ol className="list-decimal list-inside space-y-1 text-slate-300">
                <li>No iOS/iPhone: vá em <em>Ajustes &gt; Safari &gt; Microfone</em> e marque Permitir.</li>
                <li>No Mac: vá no menu <em>Safari &gt; Ajustes para Este Site &gt; Microfone: Permitir</em>.</li>
              </ol>
            )}
            {activeTab === 'edge' && (
              <ol className="list-decimal list-inside space-y-1 text-slate-300">
                <li>Clique no ícone de <strong>Permissões de Site</strong> na barra de endereços.</li>
                <li>Alterne o interruptor do <strong>Microfone</strong> para <em>Ativado / Permitir</em>.</li>
              </ol>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-5 flex items-center justify-end gap-3 pt-3 border-t border-cyan-500/20">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-mono text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
          >
            Fechar
          </button>
          <button
            onClick={async () => {
              await onRequestPermission();
              onClose();
            }}
            className="px-5 py-2 rounded-xl text-xs font-mono font-bold bg-cyan-400 hover:bg-cyan-300 text-black transition-colors shadow-[0_0_15px_#22d3ee]"
          >
            Solicitar Acesso Agora
          </button>
        </div>
      </div>
    </div>
  );
};
