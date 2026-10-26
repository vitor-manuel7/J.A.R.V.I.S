/**
 * Android Intent & Web Intent Automation Architecture for J.A.R.V.I.S.
 * 
 * Provides authorized OS integration for Android devices:
 * - App deep links (WhatsApp, Phone/Dialer, Maps/Navigation, Calendar, Email)
 * - Android Web Share API
 * - Device capability diagnostics (Android OS check, Standalone PWA detection)
 * - Safe URL/Intent dispatch with transparent feedback (zero fake simulation)
 */

import {
  launchAndroidApp,
  executeNativeNavigation,
  executeAccessibilityClick,
  readLatestNotifications,
} from './androidBridge';

export interface AndroidAutomationAction {
  id: string;
  name: string;
  description: string;
  category: 'communication' | 'navigation' | 'productivity' | 'system';
  icon: string;
  intentScheme: string;
  requiresInput?: boolean;
  inputPlaceholder?: string;
}

export interface AutomationExecutionResult {
  handled: boolean;
  actionLabel: string;
  feedbackText: string;
  targetUri?: string;
  executedVia: 'android_intent' | 'web_share' | 'web_fallback' | 'internal_action';
  openedExternalApp: boolean;
  error?: string;
}

export interface DeviceCapabilityReport {
  isAndroid: boolean;
  isStandalonePWA: boolean;
  hasWebShare: boolean;
  userAgent: string;
  platformSummary: string;
}

/**
 * Inspects device environment and capabilities truthfully
 */
export function getDeviceCapabilities(): DeviceCapabilityReport {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isAndroid: false,
      isStandalonePWA: false,
      hasWebShare: false,
      userAgent: 'Server-Side Environment',
      platformSummary: 'Ambiente de Servidor',
    };
  }

  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  const isStandalonePWA =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
  const hasWebShare = typeof navigator.share === 'function';

  let platformSummary = 'Navegador Web Desktop';
  if (isAndroid) {
    platformSummary = isStandalonePWA
      ? 'Android Standalone (PWA Instalado)'
      : 'Dispositivo Android (Navegador Móvel)';
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    platformSummary = isStandalonePWA
      ? 'iOS Standalone (PWA Instalado)'
      : 'Dispositivo Apple iOS (Navegador Móvel)';
  }

  return {
    isAndroid,
    isStandalonePWA,
    hasWebShare,
    userAgent: ua,
    platformSummary,
  };
}

/**
 * Standard authorized Android & Web intent actions
 */
export const AUTHORIZED_AUTOMATION_ACTIONS: AndroidAutomationAction[] = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    description: 'Abre conversa ou envia mensagem rápida pelo WhatsApp.',
    category: 'communication',
    icon: 'MessageSquare',
    intentScheme: 'whatsapp://send?text=',
    requiresInput: true,
    inputPlaceholder: 'Mensagem ou número de telefone',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    description: 'Abre o aplicativo ou portal oficial do YouTube.',
    category: 'system',
    icon: 'Play',
    intentScheme: 'vnd.youtube:',
    requiresInput: false,
  },
  {
    id: 'settings',
    name: 'Definições / Configurações',
    description: 'Abre o painel de configurações do sistema Android.',
    category: 'system',
    icon: 'Sliders',
    intentScheme: 'android.settings:',
    requiresInput: false,
  },
  {
    id: 'home',
    name: 'Tela Inicial (Home)',
    description: 'Retorna à tela inicial do Android.',
    category: 'system',
    icon: 'Smartphone',
    intentScheme: 'internal:home',
    requiresInput: false,
  },
  {
    id: 'back',
    name: 'Voltar (Back)',
    description: 'Executa a ação de voltar do sistema Android.',
    category: 'system',
    icon: 'ExternalLink',
    intentScheme: 'internal:back',
    requiresInput: false,
  },
  {
    id: 'notifications',
    name: 'Ler Notificações',
    description: 'Lê o resumo das notificações recebidas no Android.',
    category: 'system',
    icon: 'MessageSquare',
    intentScheme: 'internal:notifications',
    requiresInput: false,
  },
  {
    id: 'phone',
    name: 'Telefone / Discador',
    description: 'Abre o teclado de chamadas do Android com o número especificado.',
    category: 'communication',
    icon: 'Phone',
    intentScheme: 'tel:',
    requiresInput: true,
    inputPlaceholder: 'Ex: (11) 99999-9999',
  },
  {
    id: 'maps',
    name: 'GPS & Navegação',
    description: 'Inicia rota no Google Maps ou Waze para o destino solicitado.',
    category: 'navigation',
    icon: 'Navigation',
    intentScheme: 'geo:0,0?q=',
    requiresInput: true,
    inputPlaceholder: 'Ex: Avenida Paulista, São Paulo',
  },
  {
    id: 'calendar',
    name: 'Agenda / Calendário',
    description: 'Abre o aplicativo de agenda para registrar compromissos.',
    category: 'productivity',
    icon: 'Calendar',
    intentScheme: 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=',
    requiresInput: true,
    inputPlaceholder: 'Título do compromisso',
  },
  {
    id: 'email',
    name: 'E-mail',
    description: 'Abre o aplicativo padrão de e-mail (Gmail/Outlook).',
    category: 'communication',
    icon: 'Mail',
    intentScheme: 'mailto:',
    requiresInput: true,
    inputPlaceholder: 'destinatario@email.com',
  },
  {
    id: 'search',
    name: 'Busca Rápida na Web',
    description: 'Executa pesquisa instantânea no Google Search.',
    category: 'system',
    icon: 'Search',
    intentScheme: 'https://www.google.com/search?q=',
    requiresInput: true,
    inputPlaceholder: 'Termo de pesquisa',
  },
  {
    id: 'share',
    name: 'Compartilhar Sistema',
    description: 'Aciona o painel nativo de compartilhamento do Android.',
    category: 'system',
    icon: 'Share2',
    intentScheme: 'share:',
    requiresInput: false,
  },
];

/**
 * Dispatches an authorized action safely via standard URI intent or Web Share API
 */
export async function executeAuthorizedAction(
  actionId: string,
  param = ''
): Promise<AutomationExecutionResult> {
  const caps = getDeviceCapabilities();
  const cleanParam = param.trim();

  try {
    switch (actionId) {
      case 'whatsapp': {
        const textParam = cleanParam ? encodeURIComponent(cleanParam) : '';
        const targetUri = `whatsapp://send?text=${textParam}`;
        const fallbackUrl = `https://api.whatsapp.com/send?text=${textParam}`;

        // Attempt direct intent open
        window.location.href = targetUri;

        // Fallback after short delay if intent fails to catch
        setTimeout(() => {
          if (document.hidden) return; // App opened successfully
          window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
        }, 1200);

        return {
          handled: true,
          actionLabel: 'WhatsApp',
          targetUri,
          executedVia: caps.isAndroid ? 'android_intent' : 'web_fallback',
          openedExternalApp: true,
          feedbackText: cleanParam
            ? `Abrindo o WhatsApp com a mensagem autorizada, patrão.`
            : `Abrindo o WhatsApp no seu dispositivo, patrão.`,
        };
      }

      case 'phone': {
        // Sanitize phone number to digits and standard + symbols
        const digits = cleanParam.replace(/[^\d+]/g, '');
        const targetUri = digits ? `tel:${digits}` : 'tel:';
        window.location.href = targetUri;

        return {
          handled: true,
          actionLabel: 'Telefone',
          targetUri,
          executedVia: 'android_intent',
          openedExternalApp: true,
          feedbackText: digits
            ? `Abrindo o discador telefônico para o número ${cleanParam}, patrão.`
            : `Abrindo o teclado telefônico do dispositivo, patrão.`,
        };
      }

      case 'maps': {
        const query = encodeURIComponent(cleanParam || 'locais próximos');
        // Standard Android geo: intent with fallback to Google Maps Web
        const geoUri = `geo:0,0?q=${query}`;
        const webMapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;

        if (caps.isAndroid) {
          window.location.href = geoUri;
          setTimeout(() => {
            if (!document.hidden) {
              window.open(webMapsUrl, '_blank', 'noopener,noreferrer');
            }
          }, 1200);
        } else {
          window.open(webMapsUrl, '_blank', 'noopener,noreferrer');
        }

        return {
          handled: true,
          actionLabel: 'Navegação GPS',
          targetUri: caps.isAndroid ? geoUri : webMapsUrl,
          executedVia: caps.isAndroid ? 'android_intent' : 'web_fallback',
          openedExternalApp: true,
          feedbackText: cleanParam
            ? `Iniciando coordenadas de rota para "${cleanParam}", patrão.`
            : `Abrindo os serviços de mapa e navegação, patrão.`,
        };
      }

      case 'calendar': {
        const eventTitle = encodeURIComponent(cleanParam || 'Novo Compromisso');
        const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}`;
        window.open(calendarUrl, '_blank', 'noopener,noreferrer');

        return {
          handled: true,
          actionLabel: 'Agenda & Calendário',
          targetUri: calendarUrl,
          executedVia: 'web_fallback',
          openedExternalApp: true,
          feedbackText: cleanParam
            ? `Abrindo a agenda para registrar o evento "${cleanParam}", patrão.`
            : `Acessando o serviço de agenda do dispositivo, patrão.`,
        };
      }

      case 'email': {
        const targetUri = cleanParam ? `mailto:${cleanParam}` : 'mailto:';
        window.location.href = targetUri;

        return {
          handled: true,
          actionLabel: 'E-mail',
          targetUri,
          executedVia: 'android_intent',
          openedExternalApp: true,
          feedbackText: cleanParam
            ? `Iniciando novo e-mail para ${cleanParam}, patrão.`
            : `Abrindo aplicativo de correio eletrônico, patrão.`,
        };
      }

      case 'search': {
        const query = encodeURIComponent(cleanParam);
        const searchUrl = `https://www.google.com/search?q=${query}`;
        window.open(searchUrl, '_blank', 'noopener,noreferrer');

        return {
          handled: true,
          actionLabel: 'Pesquisa Web',
          targetUri: searchUrl,
          executedVia: 'web_fallback',
          openedExternalApp: true,
          feedbackText: `Executando pesquisa na web sobre "${cleanParam}", patrão.`,
        };
      }

      case 'share': {
        if (caps.hasWebShare) {
          await navigator.share({
            title: 'J.A.R.V.I.S. AI - Cybernetic Protocol',
            text: cleanParam || 'Comunicação tática enviada pelo assistente neural J.A.R.V.I.S.',
            url: window.location.href,
          });

          return {
            handled: true,
            actionLabel: 'Compartilhar',
            executedVia: 'web_share',
            openedExternalApp: true,
            feedbackText: 'Painel de compartilhamento do Android acionado com sucesso, patrão.',
          };
        } else {
          // Clipboard fallback
          if (navigator.clipboard) {
            await navigator.clipboard.writeText(cleanParam || window.location.href);
          }
          return {
            handled: true,
            actionLabel: 'Compartilhar',
            executedVia: 'internal_action',
            openedExternalApp: false,
            feedbackText: 'Link copiado para a área de transferência do seu dispositivo, patrão.',
          };
        }
      }

      case 'youtube': {
        const nativeRes = await launchAndroidApp('youtube');
        return {
          handled: true,
          actionLabel: 'YouTube',
          executedVia: nativeRes.isNative ? 'android_intent' : 'web_fallback',
          openedExternalApp: true,
          feedbackText: nativeRes.message,
        };
      }

      case 'settings': {
        const nativeRes = await launchAndroidApp('settings');
        return {
          handled: true,
          actionLabel: 'Definições do Android',
          executedVia: nativeRes.isNative ? 'android_intent' : 'internal_action',
          openedExternalApp: nativeRes.success,
          feedbackText: nativeRes.message,
        };
      }

      case 'home': {
        const navRes = executeNativeNavigation('home');
        return {
          handled: true,
          actionLabel: 'Tela Inicial',
          executedVia: navRes.isNative ? 'android_intent' : 'internal_action',
          openedExternalApp: false,
          feedbackText: navRes.message,
        };
      }

      case 'back': {
        const navRes = executeNativeNavigation('back');
        return {
          handled: true,
          actionLabel: 'Voltar',
          executedVia: navRes.isNative ? 'android_intent' : 'internal_action',
          openedExternalApp: false,
          feedbackText: navRes.message,
        };
      }

      case 'notifications': {
        const notifRes = readLatestNotifications();
        return {
          handled: true,
          actionLabel: 'Notificações',
          executedVia: notifRes.isNative ? 'android_intent' : 'internal_action',
          openedExternalApp: false,
          feedbackText: notifRes.message,
        };
      }

      case 'click_text': {
        const clickRes = executeAccessibilityClick(cleanParam);
        return {
          handled: true,
          actionLabel: 'Acessibilidade / Clique',
          executedVia: clickRes.isNative ? 'android_intent' : 'internal_action',
          openedExternalApp: false,
          feedbackText: clickRes.message,
        };
      }

      default:
        return {
          handled: false,
          actionLabel: 'Desconhecida',
          executedVia: 'internal_action',
          openedExternalApp: false,
          feedbackText: 'Comando de automação não reconhecido, patrão.',
        };
    }
  } catch (err: any) {
    console.error('Falha ao despachar automação autorizada:', err);
    return {
      handled: false,
      actionLabel: actionId,
      executedVia: 'internal_action',
      openedExternalApp: false,
      error: err?.message || 'Erro de execução',
      feedbackText: `Perdão, patrão. Não foi possível despachar a ação de automação solicitada.`,
    };
  }
}

/**
 * Natural language parser for voice & text automation commands
 */
export function parseAutomationVoiceCommand(rawText: string): {
  isAutomation: boolean;
  actionId?: string;
  param?: string;
} {
  const text = rawText.toLowerCase().trim();

  // 1. WhatsApp
  const waMatch = text.match(/^(?:abrir\s+whatsapp|mande\s+um\s+whatsapp|enviar\s+whatsapp|mensagem\s+no\s+whatsapp)(?:\s+(?:para|com|dizendo|sobre)?\s*(.*))?$/i);
  if (waMatch || text === 'abrir whatsapp' || text === 'whatsapp') {
    return {
      isAutomation: true,
      actionId: 'whatsapp',
      param: waMatch?.[1]?.trim() || '',
    };
  }

  // 2. Telefone / Ligar
  const phoneMatch = text.match(/^(?:ligar\s+para|ligar\s+pro|telefonar\s+para|fazer\s+chamada\s+para|chamar)\s+(.*)$/i);
  if (phoneMatch) {
    return {
      isAutomation: true,
      actionId: 'phone',
      param: phoneMatch[1].trim(),
    };
  }
  if (text === 'abrir telefone' || text === 'abrir discador' || text === 'fazer ligação') {
    return {
      isAutomation: true,
      actionId: 'phone',
      param: '',
    };
  }

  // 3. GPS / Navegação / Mapas
  const navMatch = text.match(/^(?:navegar\s+para|como\s+chegar\s+em|rota\s+para|abrir\s+mapa\s+de|ir\s+para|abrir\s+gps)\s*(.*)$/i);
  if (navMatch) {
    return {
      isAutomation: true,
      actionId: 'maps',
      param: navMatch[1].trim(),
    };
  }
  if (text === 'abrir mapas' || text === 'abrir google maps' || text === 'abrir gps') {
    return {
      isAutomation: true,
      actionId: 'maps',
      param: '',
    };
  }

  // 4. Agenda / Lembrete
  const calMatch = text.match(/^(?:adicionar\s+na\s+agenda|marcar\s+na\s+agenda|criar\s+evento\s+na\s+agenda|agendar)\s*(.*)$/i);
  if (calMatch) {
    return {
      isAutomation: true,
      actionId: 'calendar',
      param: calMatch[1].trim(),
    };
  }
  if (text === 'abrir agenda' || text === 'abrir calendário' || text === 'abrir calendario') {
    return {
      isAutomation: true,
      actionId: 'calendar',
      param: '',
    };
  }

  // 5. E-mail
  const emailMatch = text.match(/^(?:enviar\s+email\s+para|enviar\s+e-mail\s+para|mandar\s+email\s+para)\s*(.*)$/i);
  if (emailMatch) {
    return {
      isAutomation: true,
      actionId: 'email',
      param: emailMatch[1].trim(),
    };
  }
  if (text === 'abrir email' || text === 'abrir e-mail' || text === 'abrir gmail') {
    return {
      isAutomation: true,
      actionId: 'email',
      param: '',
    };
  }

  // 6. Busca rápida na Web
  const searchMatch = text.match(/^(?:pesquisar\s+na\s+web|buscar\s+na\s+web|procurar\s+no\s+google|pesquise\s+sobre|pesquisar\s+sobre)\s+(.*)$/i);
  if (searchMatch && searchMatch[1].trim()) {
    return {
      isAutomation: true,
      actionId: 'search',
      param: searchMatch[1].trim(),
    };
  }

  // 7. YouTube
  if (
    text.includes('abrir youtube') ||
    text.includes('abre o youtube') ||
    text.includes('iniciar youtube') ||
    text === 'youtube'
  ) {
    return {
      isAutomation: true,
      actionId: 'youtube',
      param: '',
    };
  }

  // 8. Definições / Configurações do Android
  if (
    text.includes('abrir definições') ||
    text.includes('abre as definições') ||
    text.includes('abrir configurações') ||
    text.includes('abre as configurações') ||
    text.includes('abrir ajustes') ||
    text === 'definições' ||
    text === 'configurações'
  ) {
    return {
      isAutomation: true,
      actionId: 'settings',
      param: '',
    };
  }

  // 9. Navegação: Tela Inicial / Ecrã Inicial
  if (
    text.includes('ecrã inicial') ||
    text.includes('tela inicial') ||
    text.includes('ir para o início') ||
    text.includes('ir para o inicio') ||
    text.includes('vai para o ecrã inicial') ||
    text.includes('vai para a tela inicial') ||
    text === 'início' ||
    text === 'inicio' ||
    text === 'home'
  ) {
    return {
      isAutomation: true,
      actionId: 'home',
      param: '',
    };
  }

  // 10. Navegação: Voltar
  if (
    text === 'volta' ||
    text === 'voltar' ||
    text === 'retroceder' ||
    text.includes('voltar tela') ||
    text.includes('tela anterior')
  ) {
    return {
      isAutomation: true,
      actionId: 'back',
      param: '',
    };
  }

  // 11. Ler Notificações
  if (
    text.includes('leia minhas notificações') ||
    text.includes('ler notificações') ||
    text.includes('ler notificacoes') ||
    text.includes('minhas notificações') ||
    text.includes('quais são as notificações') ||
    text === 'notificações' ||
    text === 'notificacoes'
  ) {
    return {
      isAutomation: true,
      actionId: 'notifications',
      param: '',
    };
  }

  // 12. Acessibilidade: Clique por Voz
  const clickMatch = text.match(/^(?:clica\s+em|clicar\s+em|pressione|tocar\s+em|selecionar)\s+(.*)$/i);
  if (clickMatch && clickMatch[1].trim()) {
    return {
      isAutomation: true,
      actionId: 'click_text',
      param: clickMatch[1].trim(),
    };
  }

  // 13. Compartilhar
  if (text === 'compartilhar' || text === 'compartilhar link' || text === 'compartilhar tela') {
    return {
      isAutomation: true,
      actionId: 'share',
      param: '',
    };
  }

  return { isAutomation: false };
}
