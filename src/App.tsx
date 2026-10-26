/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChatMessage,
  TelemetryState,
  TimerItem,
  TacticalLog,
  ProtocolMode,
} from './types/jarvis';
import { Mic, AlertTriangle } from 'lucide-react';
import {
  JarvisSpeechController,
  checkMicrophonePermission,
  requestMicrophoneAccess,
  isSpeechRecognitionSupported,
} from './utils/speechRecognition';
import {
  speakInPortuguese,
  stopSpeaking,
  isCurrentlySpeaking,
  getPortugueseVoices,
  unlockAudioSpeech,
  VoiceOption,
} from './utils/speechSynthesis';
import {
  playTechClick,
  playJarvisActivationBeep,
  playCommandSuccessChime,
  playCombatWarningTone,
} from './utils/audioEffects';
import { evaluateStarkCommand } from './utils/commandSystem';

import { HudHeader } from './components/HudHeader';
import { ArcReactor } from './components/ArcReactor';
import { SystemTelemetryBar } from './components/SystemTelemetryBar';
import { JarvisWakeWordEngine } from './utils/wakeWord';
import { ChatInterface } from './components/ChatInterface';
import { VoiceInputBar } from './components/VoiceInputBar';
import { VoiceTranscriptOverlay } from './components/VoiceTranscriptOverlay';
import { PermissionModal } from './components/PermissionModal';
import { ModularProtocolsModal } from './components/ModularProtocolsModal';

export default function App() {
  // 1. Telemetry & Protocol State
  const [telemetry, setTelemetry] = useState<TelemetryState>({
    arcReactorPower: 100,
    cpuUsage: 14,
    coreTemp: 38,
    defenseShield: 100,
    activeProtocol: 'NORMAL',
    audioMuted: false,
    voiceAutoSpeak: true,
    speechRate: 1.2, // ~20% mais rápida que 1.0 (ritmo firme, ágil e natural)
    speechPitch: 0.92, // Frequência rebaixada para voz masculina firme e grave
    selectedVoiceUri: '',
    isOnline: true,
    wakeWordEnabled: false,
    wakeWordActive: false,
  });

  // 2. Chat & Communication State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-msg',
      sender: 'jarvis',
      text: 'Sistemas neurais e protocolos cibernéticos totalmente operacionais. Estou à sua inteira disposição, patrão. Fale ou digite seu comando.',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // 3. Audio & Voice Input State
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeSpeakingMessageId, setActiveSpeakingMessageId] = useState<string | null>('init-msg');
  const [audioLevel, setAudioLevel] = useState(0);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);

  // 4. Permissions & Modals State
  const [micPermissionState, setMicPermissionState] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [isProtocolsModalOpen, setIsProtocolsModalOpen] = useState(false);

  // 5. Modular Tools: Timers & Tactical Logs
  const [timers, setTimers] = useState<TimerItem[]>([]);
  const [logs, setLogs] = useState<TacticalLog[]>([
    {
      id: 'log-1',
      title: 'Inicialização do Núcleo Neural',
      category: 'NOTE',
      timestamp: '11:30',
      content: 'Matriz de processamento e conexões de rede cibernética sincronizadas com sucesso.',
    },
  ]);

  // Available Portuguese voices
  const [voices, setVoices] = useState<VoiceOption[]>([]);

  // Speech controller reference and deduplication guards
  const speechControllerRef = useRef<JarvisSpeechController | null>(null);
  const wakeWordEngineRef = useRef<JarvisWakeWordEngine | null>(null);
  const isProcessingRef = useRef(false);
  const lastProcessedCommandRef = useRef<{ text: string; timestamp: number }>({ text: '', timestamp: 0 });
  const handleSendMessageRef = useRef<(text: string, isVoice?: boolean) => Promise<void>>(async () => {});

  // Wake Word Engine lifecycle
  useEffect(() => {
    const engine = new JarvisWakeWordEngine({
      onWakeWordDetected: (immediateCommand) => {
        playCommandSuccessChime(telemetry.audioMuted);
        if (immediateCommand && immediateCommand.trim()) {
          handleSendMessageRef.current(immediateCommand.trim(), true);
        } else {
          // User said "Jarvis", engage microphone
          if (speechControllerRef.current) {
            speechControllerRef.current.startListening();
          }
        }
      },
      onListeningStateChange: (active) => {
        setTelemetry((prev) => ({ ...prev, wakeWordActive: active }));
      },
      onError: (msg) => {
        console.warn('[WakeWord Engine]', msg);
      },
    });

    wakeWordEngineRef.current = engine;

    if (telemetry.wakeWordEnabled) {
      engine.start();
    }

    return () => {
      engine.stop();
    };
  }, [telemetry.wakeWordEnabled, telemetry.audioMuted]);

  // Synchronize TTS speech state with Wake Word engine to avoid self-triggering loops
  useEffect(() => {
    if (wakeWordEngineRef.current) {
      wakeWordEngineRef.current.setSpeaking(isSpeaking);
    }
  }, [isSpeaking]);

  // Pause wake word engine while user is actively recording a voice command
  useEffect(() => {
    if (wakeWordEngineRef.current && telemetry.wakeWordEnabled) {
      if (isListening) {
        wakeWordEngineRef.current.stop();
      } else {
        wakeWordEngineRef.current.start();
      }
    }
  }, [isListening, telemetry.wakeWordEnabled]);

  // Check microphone permissions and initialize speech controller once on mount
  useEffect(() => {
    checkMicrophonePermission().then((status) => {
      setMicPermissionState(status);
    });

    getPortugueseVoices().then((loadedVoices) => {
      setVoices(loadedVoices);
      if (loadedVoices.length > 0) {
        // Auto-select preferred male Brazilian Portuguese voice if available
        const preferred =
          loadedVoices.find((v) => v.isPtBr && v.isMale) ||
          loadedVoices.find((v) => v.isPtBr) ||
          loadedVoices[0];
        if (preferred) {
          setTelemetry((prev) => ({
            ...prev,
            selectedVoiceUri: prev.selectedVoiceUri || preferred.voiceURI,
          }));
        }
      }
    });

    // Single-instance speech controller initialized once with stable ref routing
    speechControllerRef.current = new JarvisSpeechController({
      onStart: () => {
        setIsListening(true);
        setAudioLevel(30);
      },
      onInterimResult: (transcript: string) => {
        setInterimTranscript(transcript);
        setAudioLevel(40 + Math.floor(Math.random() * 45));
      },
      onFinalResult: (transcript: string) => {
        setInterimTranscript('');
        setIsListening(false);
        setAudioLevel(0);
        const clean = transcript.trim();
        if (clean) {
          handleSendMessageRef.current(clean, true);
        }
      },
      onError: (errorText: string, errorCode?: string) => {
        setIsListening(false);
        setAudioLevel(0);
        setSpeechError(errorText);
        if (errorCode === 'not-allowed' || errorCode === 'NotAllowedError') {
          setMicPermissionState('denied');
          setIsPermissionModalOpen(true);
        }
      },
      onEnd: () => {
        setIsListening(false);
        setAudioLevel(0);
      },
    });

    return () => {
      if (speechControllerRef.current) {
        speechControllerRef.current.cancelListening();
      }
    };
  }, []);

  // Update telemetry CPU simulation periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry((prev) => ({
        ...prev,
        cpuUsage: Math.floor(Math.random() * 6) + (prev.activeProtocol === 'COMBAT' ? 24 : 12),
      }));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Active timers countdown tick
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setTimers((prevTimers) => {
        let hasCompleted = false;
        const updated = prevTimers.map((t) => {
          if (t.isRunning && t.remainingSeconds > 0) {
            const nextSec = t.remainingSeconds - 1;
            if (nextSec === 0) {
              hasCompleted = true;
            }
            return { ...t, remainingSeconds: nextSec, isRunning: nextSec > 0 };
          }
          return t;
        });

        if (hasCompleted) {
          playCombatWarningTone(telemetry.audioMuted);
          const alertMsg: ChatMessage = {
            id: `alert-${Date.now()}`,
            sender: 'jarvis',
            text: 'Atenção, patrão: A contagem regressiva do temporizador de missão expirou.',
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            commandType: 'TIMER_ALERT',
          };
          setMessages((msgs) => [...msgs, alertMsg]);
          if (telemetry.voiceAutoSpeak) {
            speakJarvis(alertMsg.text, alertMsg.id);
          }
        }

        return updated;
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [telemetry.audioMuted, telemetry.voiceAutoSpeak]);

  // Voice playback wrapper
  const speakJarvis = useCallback(
    (text: string, messageId: string) => {
      stopSpeaking();
      setIsSpeaking(true);
      setActiveSpeakingMessageId(messageId);

      speakInPortuguese(text, {
        voiceURI: telemetry.selectedVoiceUri,
        rate: telemetry.speechRate,
        pitch: telemetry.speechPitch,
        onStart: () => {
          setIsSpeaking(true);
        },
        onEnd: () => {
          setIsSpeaking(false);
          setActiveSpeakingMessageId(null);
        },
        onError: (err) => {
          console.warn('Speech synthesis notice:', err);
          setIsSpeaking(false);
          setActiveSpeakingMessageId(null);
        },
      });
    },
    [telemetry.selectedVoiceUri, telemetry.speechRate, telemetry.speechPitch]
  );

  const handleStopSpeaking = () => {
    stopSpeaking();
    setIsSpeaking(false);
    setActiveSpeakingMessageId(null);
  };

  // Main message processor (routes commands and queries Gemini)
  const handleSendMessage = async (text: string, isVoice = false) => {
    const cleanText = text.trim();
    if (!cleanText) return;

    const now = Date.now();
    // Guard against identical voice/text command executed in rapid succession (under 2.5 seconds)
    if (
      lastProcessedCommandRef.current.text.toLowerCase() === cleanText.toLowerCase() &&
      now - lastProcessedCommandRef.current.timestamp < 2500
    ) {
      console.warn('[J.A.R.V.I.S.] Transcrição duplicada ignorada:', cleanText);
      return;
    }

    // Guard against concurrent processing of voice commands
    if (isVoice && isProcessingRef.current) {
      console.warn('[J.A.R.V.I.S.] Processamento ocupado, comando vocal ignorado:', cleanText);
      return;
    }

    lastProcessedCommandRef.current = { text: cleanText, timestamp: now };
    isProcessingRef.current = true;

    // Immediately post recognized text to the conversation BEFORE processing
    const userMsgId = `user-${Date.now()}`;
    const newMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: cleanText,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      isVoiceInput: isVoice,
    };

    setMessages((prev) => [...prev, newMsg]);

    let placeholderId = '';

    try {
      // Check modular command system & Android automations
      const cmdResult = await evaluateStarkCommand(cleanText, telemetry);

      if (cmdResult.isHandled) {
        if (cmdResult.clearHistory) {
          setMessages([
            {
              id: `jarvis-${Date.now()}`,
              sender: 'jarvis',
              text: cmdResult.replyText!,
              timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              commandType: cmdResult.commandType,
            },
          ]);
          playCommandSuccessChime(telemetry.audioMuted);
          if (telemetry.voiceAutoSpeak) {
            speakJarvis(cmdResult.replyText!, `jarvis-${Date.now()}`);
          }
          return;
        }

        // Update telemetry if command mutated it
        if (cmdResult.stateUpdates) {
          setTelemetry((prev) => ({ ...prev, ...cmdResult.stateUpdates }));
          if (cmdResult.stateUpdates.activeProtocol === 'COMBAT') {
            playCombatWarningTone(telemetry.audioMuted);
          } else {
            playCommandSuccessChime(telemetry.audioMuted);
          }
        } else {
          playCommandSuccessChime(telemetry.audioMuted);
        }

        // Append new timer if command created one
        if (cmdResult.newTimer) {
          setTimers((prev) => [cmdResult.newTimer!, ...prev]);
        }

        // Append new log if command created one
        if (cmdResult.newLog) {
          setLogs((prev) => [cmdResult.newLog!, ...prev]);
        }

        const jarvisReplyId = `jarvis-${Date.now()}`;
        const jarvisReplyMsg: ChatMessage = {
          id: jarvisReplyId,
          sender: 'jarvis',
          text: cmdResult.replyText || 'Protocolo executado com perfeição, patrão.',
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          commandType: cmdResult.commandType,
        };

        setMessages((prev) => [...prev, jarvisReplyMsg]);

        if (telemetry.voiceAutoSpeak) {
          speakJarvis(jarvisReplyMsg.text, jarvisReplyId);
        }
        return;
      }

      // If not a local command, stream to Gemini server proxy
      placeholderId = `jarvis-pending-${Date.now()}`;
      const pendingMsg: ChatMessage = {
        id: placeholderId,
        sender: 'jarvis',
        text: '...',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        status: 'sending',
      };
      setMessages((prev) => [...prev, pendingMsg]);

      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.sender === 'user' ? ('user' as const) : ('model' as const),
        text: m.text,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: cleanText,
          history: historyPayload,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        let rawError = errorData.error;
        if (typeof rawError === 'object' && rawError !== null) {
          rawError = rawError.message || JSON.stringify(rawError);
        }
        const customErr = new Error(rawError || `Erro de resposta do servidor (${res.status})`);
        (customErr as any).diagnostic = errorData.diagnostic || `Diagnóstico: Código HTTP ${res.status}`;
        (customErr as any).code = errorData.code;
        (customErr as any).statusCode = res.status;
        throw customErr;
      }

      const data = await res.json();
      const reply = data.reply || 'Comando recebido, patrão.';

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === placeholderId
            ? {
                ...msg,
                text: reply,
                status: 'delivered',
              }
            : msg
        )
      );

      playCommandSuccessChime(telemetry.audioMuted);

      if (telemetry.voiceAutoSpeak) {
        speakJarvis(reply, placeholderId);
      }
    } catch (err: any) {
      console.error('Falha ao comunicar com J.A.R.V.I.S.:', err);
      let errorMsg = err?.message;
      if (typeof errorMsg === 'object' && errorMsg !== null) {
        errorMsg = (errorMsg as any).message || JSON.stringify(errorMsg);
      }
      if (!errorMsg || errorMsg === '[object Object]') {
        errorMsg = 'Falha de transmissão com a matriz neural. Por favor, tente novamente.';
      }

      const diagnosticTag = err?.diagnostic || (err?.statusCode ? `Erro ${err.statusCode}` : 'Diagnóstico Neural');

      const explanationText =
        errorMsg.toLowerCase().startsWith('patrão') || errorMsg.toLowerCase().startsWith('perdão')
          ? errorMsg
          : `Perdão, patrão. ${errorMsg}`;

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === placeholderId
            ? {
                ...msg,
                text: explanationText,
                status: 'error',
                errorMessage: diagnosticTag,
              }
            : msg
        )
      );

      if (telemetry.voiceAutoSpeak && !telemetry.audioMuted) {
        speakJarvis(explanationText, placeholderId);
      }
    } finally {
      isProcessingRef.current = false;
    }
  };

  handleSendMessageRef.current = handleSendMessage;

  const handleRequestMicPermission = async () => {
    unlockAudioSpeech();
    const granted = await requestMicrophoneAccess();
    if (granted) {
      setMicPermissionState('granted');
      playCommandSuccessChime(telemetry.audioMuted);
      handleStartListening();
    } else {
      setMicPermissionState('denied');
      setIsPermissionModalOpen(true);
    }
  };

  // Start speech recognition
  const handleStartListening = async () => {
    unlockAudioSpeech();
    setSpeechError(null);
    setInterimTranscript('');
    playJarvisActivationBeep(telemetry.audioMuted);

    if (!speechControllerRef.current) return;

    const started = await speechControllerRef.current.startListening();
    if (started) {
      setIsListening(true);
      setMicPermissionState('granted');
    }
  };

  const handleStopListening = () => {
    if (speechControllerRef.current) {
      speechControllerRef.current.stopListening(true);
    }
    setIsListening(false);
    setAudioLevel(0);
  };

  const handleCancelListening = () => {
    if (speechControllerRef.current) {
      speechControllerRef.current.cancelListening();
    }
    setInterimTranscript('');
    setIsListening(false);
    setAudioLevel(0);
  };

  const handleToggleTimer = (id: string) => {
    setTimers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isRunning: !t.isRunning } : t))
    );
  };

  const handleDeleteTimer = (id: string) => {
    setTimers((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAddTimer = (label: string, minutes: number) => {
    const totalSeconds = minutes * 60;
    const newT: TimerItem = {
      id: `timer-${Date.now()}`,
      label,
      totalSeconds,
      remainingSeconds: totalSeconds,
      isRunning: true,
    };
    setTimers((prev) => [newT, ...prev]);
    playCommandSuccessChime(telemetry.audioMuted);
  };

  const handleAddLog = (title: string, content: string) => {
    const newL: TacticalLog = {
      id: `log-${Date.now()}`,
      title,
      category: 'NOTE',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      content,
    };
    setLogs((prev) => [newL, ...prev]);
    playTechClick(telemetry.audioMuted);
  };

  const handleDeleteLog = (id: string) => {
    setLogs((prev) => prev.filter((l) => l.id !== id));
  };

  const isCombat = telemetry.activeProtocol === 'COMBAT';

  return (
    <div
      className={`min-h-screen w-full flex flex-col relative transition-colors duration-500 ${
        isCombat ? 'bg-grid-combat' : 'bg-grid-tech'
      }`}
    >
      {/* Holographic Scanline Overlay */}
      <div className="fixed inset-0 scanlines z-10 pointer-events-none" />

      {/* Top HUD Header */}
      <HudHeader
        telemetry={telemetry}
        isSpeaking={isSpeaking}
        onStopSpeaking={handleStopSpeaking}
        onToggleMute={() => setTelemetry((prev) => ({ ...prev, audioMuted: !prev.audioMuted }))}
        onToggleAutoSpeak={() =>
          setTelemetry((prev) => ({ ...prev, voiceAutoSpeak: !prev.voiceAutoSpeak }))
        }
        onToggleWakeWord={() =>
          setTelemetry((prev) => ({ ...prev, wakeWordEnabled: !prev.wakeWordEnabled }))
        }
        onOpenProtocols={() => setIsProtocolsModalOpen(true)}
        onOpenMicHelp={() => setIsPermissionModalOpen(true)}
        micPermissionState={micPermissionState}
      />

      {/* System Telemetry Metrics Bar */}
      <SystemTelemetryBar
        telemetry={telemetry}
        onExecuteCommand={(cmd) => handleSendMessage(cmd, false)}
      />

      {/* Quick Permission Prompt Banner if mic access is not yet granted */}
      {micPermissionState !== 'granted' && (
        <div className="max-w-4xl mx-auto w-full px-3 sm:px-6 pt-2 z-20">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-400/50 text-xs font-mono text-cyan-200 glow-cyan">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-cyan-400 animate-pulse shrink-0" />
              <span>Para acionar o J.A.R.V.I.S. por voz, autorize o microfone do dispositivo.</span>
            </div>
            <button
              onClick={handleRequestMicPermission}
              className="px-3.5 py-1 rounded bg-cyan-400 hover:bg-cyan-300 text-black font-bold uppercase tracking-wider shadow-[0_0_12px_#22d3ee] transition-all shrink-0 cursor-pointer"
            >
              Autorizar Microfone
            </button>
          </div>
        </div>
      )}

      {/* Main Interactive View: Arc Reactor and Chat */}
      <main className="flex-1 flex flex-col justify-between max-w-5xl mx-auto w-full z-10 relative">
        {/* Arc Reactor Centerpiece */}
        <div className="py-2 shrink-0">
          <ArcReactor
            isListening={isListening}
            isSpeaking={isSpeaking}
            audioLevel={audioLevel}
            protocol={telemetry.activeProtocol}
            reactorPower={telemetry.arcReactorPower}
            onClick={() => {
              if (isListening) {
                handleStopListening();
              } else {
                handleStartListening();
              }
            }}
          />
        </div>

        {/* Holographic Chat Interface */}
        <ChatInterface
          messages={messages}
          isJarvisSpeaking={isSpeaking}
          activeSpeakingMessageId={activeSpeakingMessageId}
          protocol={telemetry.activeProtocol}
          onSpeakMessage={(text, msgId) => speakJarvis(text, msgId)}
          onSelectQuickPrompt={(prompt) => handleSendMessage(prompt, false)}
          onRetryMessage={(msg) => handleSendMessage(msg.text, false)}
        />
      </main>

      {/* Live Voice Transcript Display on Screen */}
      <VoiceTranscriptOverlay
        isListening={isListening}
        transcript={interimTranscript}
        protocol={telemetry.activeProtocol}
        onCommit={handleStopListening}
        onCancel={handleCancelListening}
      />

      {/* Bottom Voice & Text Input Bar */}
      <VoiceInputBar
        isListening={isListening}
        interimTranscript={interimTranscript}
        audioLevel={audioLevel}
        protocol={telemetry.activeProtocol}
        onStartListening={handleStartListening}
        onStopListening={handleStopListening}
        onSendMessage={(txt, isVoice) => handleSendMessage(txt, isVoice)}
        onOpenMicHelp={() => setIsPermissionModalOpen(true)}
        micPermissionState={micPermissionState}
        speechError={speechError}
        onClearSpeechError={() => setSpeechError(null)}
      />

      {/* Microphone Permission Help & Test Modal */}
      <PermissionModal
        isOpen={isPermissionModalOpen}
        onClose={() => setIsPermissionModalOpen(false)}
        permissionState={micPermissionState}
        onRequestPermission={handleStartListening}
      />

      {/* Modular Protocols & Settings Modal */}
      <ModularProtocolsModal
        isOpen={isProtocolsModalOpen}
        onClose={() => setIsProtocolsModalOpen(false)}
        telemetry={telemetry}
        onUpdateTelemetry={(updates) => setTelemetry((prev) => ({ ...prev, ...updates }))}
        timers={timers}
        onToggleTimer={handleToggleTimer}
        onDeleteTimer={handleDeleteTimer}
        onAddTimer={handleAddTimer}
        logs={logs}
        onAddLog={handleAddLog}
        onDeleteLog={handleDeleteLog}
        voices={voices}
        onTestVoice={() =>
          speakJarvis(
            'Sistemas vocais calibrados com sucesso, patrão. Velocidade vinte por cento mais rápida, dicção natural e modulação firme estabelecidas.',
            'test-voice'
          )
        }
      />
    </div>
  );
}
