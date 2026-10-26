/**
 * Android Native Bridge & Web Integration Layer for J.A.R.V.I.S.
 * 
 * Communicates with the native Kotlin layer when running inside the Android APK WebView
 * via window.JarvisNative, or falls back gracefully to standard Web Intents and deep links.
 */

export interface JarvisNativeInterface {
  isNativeApp?: () => boolean;
  isAccessibilityActive?: () => boolean;
  isNotificationAccessActive?: () => boolean;
  openApp?: (packageName: string) => string;
  openSettings?: (settingType: string) => boolean;
  goHome?: () => boolean;
  goBack?: () => boolean;
  performClickByText?: (text: string) => boolean;
  scrollScreen?: (direction: string) => boolean;
  getLatestNotifications?: () => string;
  startWakeWordService?: () => boolean;
  stopWakeWordService?: () => boolean;
  openAccessibilitySettings?: () => boolean;
  openNotificationSettings?: () => boolean;
}

declare global {
  interface Window {
    JarvisNative?: JarvisNativeInterface;
  }
}

export function isRunningInNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.JarvisNative && typeof window.JarvisNative.isNativeApp === 'function' && window.JarvisNative.isNativeApp());
}

export function checkNativeAccessibilityStatus(): boolean {
  if (!isRunningInNativeApp() || !window.JarvisNative?.isAccessibilityActive) return false;
  try {
    return window.JarvisNative.isAccessibilityActive();
  } catch (e) {
    return false;
  }
}

export function checkNativeNotificationStatus(): boolean {
  if (!isRunningInNativeApp() || !window.JarvisNative?.isNotificationAccessActive) return false;
  try {
    return window.JarvisNative.isNotificationAccessActive();
  } catch (e) {
    return false;
  }
}

export interface NativeActionResult {
  success: boolean;
  message: string;
  isNative: boolean;
}

/**
 * Open an Android app by package name or common identifier.
 */
export async function launchAndroidApp(appTarget: 'whatsapp' | 'youtube' | 'settings' | 'phone' | 'maps' | 'camera' | string): Promise<NativeActionResult> {
  const packageMap: Record<string, string> = {
    whatsapp: 'com.whatsapp',
    youtube: 'com.google.android.youtube',
    settings: 'com.android.settings',
    phone: 'com.google.android.dialer',
    maps: 'com.google.android.apps.maps',
    camera: 'com.google.android.GoogleCamera',
  };

  const targetPackage = packageMap[appTarget.toLowerCase()] || appTarget;

  // 1. If running inside the Android APK with native bridge:
  if (isRunningInNativeApp() && window.JarvisNative?.openApp) {
    try {
      const res = window.JarvisNative.openApp(targetPackage);
      const parsed = JSON.parse(res);
      return {
        success: parsed.success,
        message: parsed.message || (parsed.success ? `Aplicativo ${appTarget} aberto pelo sistema nativo, patrão.` : `Aplicativo não encontrado no dispositivo.`),
        isNative: true,
      };
    } catch (err: any) {
      console.warn('Falha na chamada da bridge nativa:', err);
    }
  }

  // 2. Fallback to Web Intents / Deep Links in standard browser
  if (appTarget === 'whatsapp') {
    window.location.href = 'https://api.whatsapp.com/';
    return { success: true, message: 'Direcionando ao WhatsApp via link oficial, patrão.', isNative: false };
  }
  if (appTarget === 'youtube') {
    window.location.href = 'https://www.youtube.com/';
    return { success: true, message: 'Direcionando ao YouTube, patrão.', isNative: false };
  }
  if (appTarget === 'settings') {
    return {
      success: false,
      message: 'Patrão, a abertura direta das Configurações do sistema requer a execução através do APK nativo do J.A.R.V.I.S.',
      isNative: false,
    };
  }

  return {
    success: false,
    message: `Patrão, o comando nativo para ${appTarget} está disponível na versão APK instalada.`,
    isNative: false,
  };
}

/**
 * Execute navigation actions (Back, Home)
 */
export function executeNativeNavigation(action: 'back' | 'home' | 'recents'): NativeActionResult {
  if (isRunningInNativeApp() && window.JarvisNative) {
    try {
      if (action === 'home' && window.JarvisNative.goHome) {
        const ok = window.JarvisNative.goHome();
        return { success: ok, message: ok ? 'Retornando à tela inicial, patrão.' : 'Falha ao acionar tela inicial.', isNative: true };
      }
      if (action === 'back' && window.JarvisNative.goBack) {
        const ok = window.JarvisNative.goBack();
        return { success: ok, message: ok ? 'Comando voltar executado, patrão.' : 'Ação de voltar indisponível.', isNative: true };
      }
    } catch (e) {
      console.warn('Erro ao invocar navegação nativa:', e);
    }
  }

  if (action === 'back' && typeof window !== 'undefined' && window.history) {
    window.history.back();
    return { success: true, message: 'Voltando à tela anterior no navegador, patrão.', isNative: false };
  }

  return {
    success: false,
    message: 'Patrão, ações de navegação do sistema Android (Início/Voltar global) necessitam do Serviço de Acessibilidade ativo no APK.',
    isNative: false,
  };
}

/**
 * Accessibility Click By Text
 */
export function executeAccessibilityClick(text: string): NativeActionResult {
  if (isRunningInNativeApp() && window.JarvisNative?.performClickByText) {
    try {
      const ok = window.JarvisNative.performClickByText(text);
      return {
        success: ok,
        message: ok ? `Elemento "${text}" acionado com sucesso, patrão.` : `Elemento "${text}" não foi localizado ou não permite clique assistivo.`,
        isNative: true,
      };
    } catch (e) {
      return { success: false, message: 'Falha ao interagir com o serviço de acessibilidade.', isNative: true };
    }
  }

  return {
    success: false,
    message: 'Patrão, o controle assistivo de cliques requer o Serviço de Acessibilidade do J.A.R.V.I.S. ativado nas Configurações do Android.',
    isNative: false,
  };
}

/**
 * Read notifications summary
 */
export function readLatestNotifications(): NativeActionResult {
  if (isRunningInNativeApp() && window.JarvisNative?.getLatestNotifications) {
    try {
      const jsonStr = window.JarvisNative.getLatestNotifications();
      const data = JSON.parse(jsonStr);
      if (data.active && data.notifications && data.notifications.length > 0) {
        const listText = data.notifications
          .slice(0, 3)
          .map((n: any) => `${n.appName}: ${n.title} - ${n.text}`)
          .join('. ');
        return {
          success: true,
          message: `Patrão, aqui estão suas notificações recentes: ${listText}`,
          isNative: true,
        };
      }
      return {
        success: true,
        message: data.active ? 'Patrão, não há novas notificações no momento.' : 'Patrão, o acesso às notificações precisa ser autorizado nas Configurações do Android.',
        isNative: true,
      };
    } catch (e) {
      return { success: false, message: 'Falha ao ler notificações nativas.', isNative: true };
    }
  }

  return {
    success: false,
    message: 'Patrão, a leitura de notificações requer a versão APK com acesso a notificações autorizado nas Configurações do Android.',
    isNative: false,
  };
}
