import { TelemetryState, TimerItem, TacticalLog } from '../types/jarvis';
import { parseAutomationVoiceCommand, executeAuthorizedAction } from './androidAutomation';

export interface CommandExecutionResult {
  isHandled: boolean;
  replyText?: string;
  commandType?: string;
  stateUpdates?: Partial<TelemetryState>;
  newTimer?: TimerItem;
  newLog?: TacticalLog;
  clearHistory?: boolean;
  openedExternalApp?: boolean;
}

export async function evaluateStarkCommand(
  rawInput: string,
  currentState: TelemetryState
): Promise<CommandExecutionResult> {
  const text = rawInput.toLowerCase().trim();

  // 1. CLEAR TERMINAL / HISTÓRICO
  if (
    text === 'limpar' ||
    text === '/clear' ||
    text.includes('limpar histórico') ||
    text.includes('limpar terminal') ||
    text.includes('limpar tela') ||
    text.includes('apagar histórico')
  ) {
    return {
      isHandled: true,
      replyText: 'Histórico de comunicações purgado com sucesso, patrão. Terminal limpo.',
      commandType: 'CLEAR',
      clearHistory: true,
    };
  }

  // 2. ANDROID INTENTS & AUTOMAÇÕES AUTORIZADAS
  const autoParsed = parseAutomationVoiceCommand(rawInput);
  if (autoParsed.isAutomation && autoParsed.actionId) {
    const execRes = await executeAuthorizedAction(autoParsed.actionId, autoParsed.param || '');
    return {
      isHandled: true,
      replyText: execRes.feedbackText,
      commandType: 'ANDROID_AUTOMATION',
      openedExternalApp: execRes.openedExternalApp,
    };
  }

  // 3. PROTOCOLO MODO COMBATE / ALERTA MÁXIMO
  if (
    text.includes('modo combate') ||
    text.includes('alerta vermelho') ||
    text.includes('ativar combate') ||
    text.includes('protocolo de combate') ||
    text === '/combat'
  ) {
    return {
      isHandled: true,
      replyText: 'Protocolo de Combate engajado, patrão! Barreiras reflexivas ativadas, frequência do núcleo elevada e sensores táticos em prontidão.',
      commandType: 'COMBAT',
      stateUpdates: {
        activeProtocol: 'COMBAT',
        defenseShield: 100,
        arcReactorPower: 115,
      },
    };
  }

  // 4. PROTOCOLO MODO NORMAL / PADRÃO
  if (
    text.includes('modo normal') ||
    text.includes('desativar combate') ||
    text.includes('modo padrão') ||
    text.includes('protocolo padrão') ||
    text.includes('cessar alerta') ||
    text === '/normal'
  ) {
    return {
      isHandled: true,
      replyText: 'Desativando modo de combate, patrão. Sistemas em fluxo nominal e protocolos padrão restaurados.',
      commandType: 'NORMAL',
      stateUpdates: {
        activeProtocol: 'NORMAL',
        arcReactorPower: 100,
      },
    };
  }

  // 5. PROTOCOLO FURTIVO / STEALTH
  if (
    text.includes('modo furtivo') ||
    text.includes('modo stealth') ||
    text.includes('protocolo fantasma') ||
    text === '/stealth'
  ) {
    return {
      isHandled: true,
      replyText: 'Protocolo Furtivo ativado, patrão. Assinatura eletromagnética atenuada e emissões sonoras em modo mínimo.',
      commandType: 'STEALTH',
      stateUpdates: {
        activeProtocol: 'STEALTH',
        arcReactorPower: 45,
      },
    };
  }

  // 6. STATUS DOS SISTEMAS / DIAGNÓSTICO
  if (
    text.includes('status dos sistemas') ||
    text.includes('status do sistema') ||
    text.includes('diagnóstico') ||
    text.includes('diagnostico') ||
    text.includes('relatório de sistemas') ||
    text.includes('relatorio de sistemas') ||
    text === 'status' ||
    text === '/status'
  ) {
    const power = currentState.arcReactorPower;
    const cpu = currentState.cpuUsage;
    const temp = currentState.coreTemp;
    const shields = currentState.defenseShield;
    const protocol = currentState.activeProtocol;

    return {
      isHandled: true,
      replyText: `Diagnóstico Geral do Sistema executado, patrão:
• Núcleo Neural: ${power}% de capacidade operacional.
• Redes Neurais & CPU: ${cpu}% de carga computacional.
• Temperatura da Matriz: ${temp}°C (estável).
• Barreira Defensiva: ${shields}%.
• Protocolo Ativo: ${protocol}.
Todos os módulos respondem com máxima precisão.`,
      commandType: 'DIAGNOSTIC',
      stateUpdates: {
        cpuUsage: Math.floor(Math.random() * 8) + 12,
      },
    };
  }

  // 7. NÚCLEO NEURAL / POTÊNCIA
  if (
    text.includes('núcleo neural') ||
    text.includes('nucleo neural') ||
    text.includes('reator') ||
    text.includes('potência máxima') ||
    text.includes('potencia maxima') ||
    text.includes('energia do núcleo')
  ) {
    if (text.includes('100%') || text.includes('estabilizar')) {
      return {
        isHandled: true,
        replyText: 'Matriz de energia estabilizada em 100%, patrão. Saída contínua e equilibrada.',
        commandType: 'CORE_POWER',
        stateUpdates: { arcReactorPower: 100, coreTemp: 37 },
      };
    }

    return {
      isHandled: true,
      replyText: 'Aumentando o fluxo da matriz neural para os subsistemas, patrão. Potência elevada para 125% com amortecedores térmicos ativos.',
      commandType: 'CORE_POWER',
      stateUpdates: {
        arcReactorPower: 125,
        coreTemp: 44,
      },
    };
  }

  // 8. TIMER / TEMPORIZADOR
  if (
    text.startsWith('timer') ||
    text.startsWith('temporizador') ||
    text.startsWith('alarme') ||
    text.includes('iniciar timer') ||
    text.includes('definir timer') ||
    text.includes('coloque um timer')
  ) {
    const matchMin = text.match(/(\d+)\s*(min|minuto|minutos)/);
    const matchSec = text.match(/(\d+)\s*(seg|segundo|segundos)/);

    let totalSeconds = 0;
    if (matchMin) {
      totalSeconds += parseInt(matchMin[1], 10) * 60;
    }
    if (matchSec) {
      totalSeconds += parseInt(matchSec[1], 10);
    }

    if (totalSeconds === 0) {
      const matchAnyNum = text.match(/(\d+)/);
      if (matchAnyNum) {
        const num = parseInt(matchAnyNum[1], 10);
        totalSeconds = num <= 60 ? num * 60 : num;
      } else {
        totalSeconds = 60;
      }
    }

    const timerId = `timer-${Date.now()}`;
    const minDisplay = Math.floor(totalSeconds / 60);
    const secDisplay = totalSeconds % 60;
    const timeFormatted =
      minDisplay > 0
        ? `${minDisplay} min ${secDisplay > 0 ? secDisplay + 's' : ''}`
        : `${secDisplay} segundos`;

    return {
      isHandled: true,
      replyText: `Temporizador iniciado para ${timeFormatted}. Notificarei o patrão assim que a contagem terminar.`,
      commandType: 'TIMER',
      newTimer: {
        id: timerId,
        label: `Temporizador de ${timeFormatted}`,
        totalSeconds,
        remainingSeconds: totalSeconds,
        isRunning: true,
      },
    };
  }

  // 9. CLIMA & SENSORES
  if (
    text.includes('clima') ||
    text.includes('previsão do tempo') ||
    text.includes('sensores meteorológicos') ||
    text.includes('como está o tempo')
  ) {
    const temps = [23, 25, 27, 22, 26];
    const pickedTemp = temps[Math.floor(Math.random() * temps.length)];
    const conditions = [
      'Céu límpido e ventos favoráveis',
      'Leve nebulosidade nas camadas superiores',
      'Condições atmosféricas estáveis',
    ];
    const cond = conditions[Math.floor(Math.random() * conditions.length)];

    return {
      isHandled: true,
      replyText: `Varredura dos sensores meteorológicos concluída, patrão:
• Temperatura estimada: ${pickedTemp}°C.
• Condições: ${cond}.
• Pressão barométrica: 1013 hPa.
• Umidade relativa: 62%.`,
      commandType: 'WEATHER',
    };
  }

  // 10. CÁLCULO / MATEMÁTICA RÁPIDA
  if (
    text.startsWith('calcule') ||
    text.startsWith('quanto é') ||
    text.startsWith('/calc') ||
    text.startsWith('calcular')
  ) {
    const expression = text
      .replace(/calcule|quanto é|\/calc|calcular/gi, '')
      .replace(/vezes|x/gi, '*')
      .replace(/dividido por|\//gi, '/')
      .replace(/mais|\+/gi, '+')
      .replace(/menos|\-/gi, '-')
      .trim();

    if (/^[0-9+\-*/().\s^%]+$/.test(expression)) {
      try {
        const sanitized = expression.replace(/\^/g, '**');
        // eslint-disable-next-line no-eval
        const result = Function(`'use strict'; return (${sanitized})`)();
        if (typeof result === 'number' && !isNaN(result)) {
          return {
            isHandled: true,
            replyText: `Cálculo concluído, patrão: ${expression} = ${Number(result.toFixed(6))}.`,
            commandType: 'CALC',
          };
        }
      } catch (e) {
        // Fallback to Gemini
      }
    }
  }

  // 11. ANOTAÇÕES / LOGS TÁTICOS
  if (
    text.startsWith('anotar') ||
    text.startsWith('anote') ||
    text.startsWith('salvar log') ||
    text.startsWith('registrar nota')
  ) {
    const noteContent = text.replace(/^(anotar|anote|salvar log|registrar nota)\s*/i, '').trim();
    if (noteContent) {
      return {
        isHandled: true,
        replyText: `Nota registrada na memória persistente, patrão: "${noteContent}". O registro está disponível na aba de logs.`,
        commandType: 'NOTES',
        newLog: {
          id: `log-${Date.now()}`,
          title: noteContent.slice(0, 30) + (noteContent.length > 30 ? '...' : ''),
          category: 'NOTE',
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          content: noteContent,
        },
      };
    }
  }

  // 12. COMANDOS / AJUDA
  if (
    text === 'comandos' ||
    text === 'ajuda' ||
    text === '/help' ||
    text.includes('o que você pode fazer') ||
    text.includes('quais são os comandos')
  ) {
    return {
      isHandled: true,
      replyText: `Estou à sua disposição, patrão. Aqui estão os módulos que posso executar:
1. "Status dos Sistemas" — Relatório de telemetria e integridade neural.
2. "Modo Combate" / "Modo Normal" — Alternância de prontidão operacional.
3. "Timer de X minutos" — Inicialização de contadores com sinal acústico.
4. "Abrir WhatsApp [mensagem]" — Automação autorizada para envio de mensagens.
5. "Ligar para [número]" — Abertura do discador Android.
6. "Navegar para [local]" — Inicia rota GPS no Maps.
7. "Adicionar na agenda [evento]" — Registro rápido no calendário.
8. "Pesquisar na web [termo]" — Busca rápida na internet.
9. "Calcular [expressão]" — Resolução matemática imediata.
10. "Anotar [texto]" — Armazenamento na memória de logs.
Além destes comandos táticos, estou conectado à inteligência artificial Gemini para responder a quaisquer perguntas que o patrão desejar.`,
      commandType: 'HELP',
    };
  }

  return { isHandled: false };
}
