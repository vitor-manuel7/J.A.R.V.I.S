export type ProtocolMode = 'NORMAL' | 'COMBAT' | 'STEALTH' | 'DIAGNOSTIC';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'jarvis' | 'system';
  text: string;
  timestamp: string;
  isVoiceInput?: boolean;
  commandType?: string;
  audioPlaying?: boolean;
  status?: 'sending' | 'delivered' | 'error';
  errorMessage?: string;
}

export interface TelemetryState {
  arcReactorPower: number; // e.g. 100%
  cpuUsage: number; // e.g. 14%
  coreTemp: number; // e.g. 38°C
  defenseShield: number; // e.g. 100%
  activeProtocol: ProtocolMode;
  audioMuted: boolean;
  voiceAutoSpeak: boolean;
  speechRate: number;
  speechPitch: number;
  selectedVoiceUri: string;
  isOnline: boolean;
}

export interface TacticalLog {
  id: string;
  title: string;
  category: 'MARK_ARMOR' | 'SECURITY' | 'TELEMETRY' | 'NOTE';
  timestamp: string;
  content: string;
}

export interface TimerItem {
  id: string;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
}

export interface CommandDefinition {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  actionType: 'protocol' | 'diagnostic' | 'timer' | 'weather' | 'calc' | 'clear' | 'notes';
}
