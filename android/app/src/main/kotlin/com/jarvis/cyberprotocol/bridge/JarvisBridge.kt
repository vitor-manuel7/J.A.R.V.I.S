package com.jarvis.cyberprotocol.bridge

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.provider.Settings
import android.util.Log
import android.webkit.JavascriptInterface
import com.jarvis.cyberprotocol.services.JarvisAccessibilityService
import com.jarvis.cyberprotocol.services.JarvisNotificationListenerService
import com.jarvis.cyberprotocol.services.WakeWordForegroundService
import org.json.JSONArray
import org.json.JSONObject

/**
 * Native JavaScript Bridge between J.A.R.V.I.S. WebView interface and Android OS.
 * Exposes safe, authorized OS capabilities to the Cyberpunk user interface.
 */
class JarvisBridge(private val activity: Activity) {

    companion object {
        private const val TAG = "JarvisBridge"
    }

    @JavascriptInterface
    fun isNativeApp(): Boolean = true

    @JavascriptInterface
    fun isAccessibilityActive(): Boolean = JarvisAccessibilityService.isRunning()

    @JavascriptInterface
    fun isNotificationAccessActive(): Boolean = JarvisNotificationListenerService.isConnected()

    /**
     * Checks if target app is installed. If installed, launches it. If not, returns clear message.
     */
    @JavascriptInterface
    fun openApp(packageName: String): String {
        val result = JSONObject()
        val pm: PackageManager = activity.packageManager

        try {
            val launchIntent = pm.getLaunchIntentForPackage(packageName)
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                activity.startActivity(launchIntent)
                result.put("success", true)
                result.put("message", "Aplicativo iniciado com sucesso pelo sistema.")
            } else {
                result.put("success", false)
                result.put("message", "Patrão, o aplicativo ($packageName) não foi localizado entre os pacotes instalados neste dispositivo.")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Falha ao abrir pacote $packageName: ${e.message}")
            result.put("success", false)
            result.put("message", "Falha de execução ao abrir aplicativo: ${e.message}")
        }

        return result.toString()
    }

    /**
     * Opens system settings (General, Accessibility, or Notification Access)
     */
    @JavascriptInterface
    fun openSettings(settingType: String): Boolean {
        return try {
            val intent = when (settingType.lowercase()) {
                "accessibility" -> Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
                "notifications" -> Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
                else -> Intent(Settings.ACTION_SETTINGS)
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            activity.startActivity(intent)
            true
        } catch (e: Exception) {
            Log.e(TAG, "Erro ao abrir configurações: ${e.message}")
            false
        }
    }

    /**
     * Navigates to Android Home screen
     */
    @JavascriptInterface
    fun goHome(): Boolean {
        val accessibility = JarvisAccessibilityService.instance
        if (accessibility != null && accessibility.performHome()) {
            return true
        }

        return try {
            val homeIntent = Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_HOME)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            activity.startActivity(homeIntent)
            true
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Global Back navigation action
     */
    @JavascriptInterface
    fun goBack(): Boolean {
        val accessibility = JarvisAccessibilityService.instance
        if (accessibility != null) {
            return accessibility.performBack()
        }
        activity.runOnUiThread {
            activity.onBackPressed()
        }
        return true
    }

    /**
     * Accessibility click on any on-screen button or element matching target text
     */
    @JavascriptInterface
    fun performClickByText(text: String): Boolean {
        val accessibility = JarvisAccessibilityService.instance ?: return false
        return accessibility.clickByText(text)
    }

    /**
     * Scroll screen via accessibility
     */
    @JavascriptInterface
    fun scrollScreen(direction: String): Boolean {
        val accessibility = JarvisAccessibilityService.instance ?: return false
        val forward = direction.lowercase() != "up" && direction.lowercase() != "cima"
        return accessibility.scroll(forward)
    }

    /**
     * Returns recent notification summaries in JSON format
     */
    @JavascriptInterface
    fun getLatestNotifications(): String {
        val result = JSONObject()
        val notifService = JarvisNotificationListenerService.instance

        if (notifService == null) {
            result.put("active", false)
            result.put("message", "Acesso às notificações inativo nas configurações do Android.")
            return result.toString()
        }

        val summaries = notifService.getRecentSummaries(4)
        val array = JSONArray()
        for (item in summaries) {
            val obj = JSONObject()
            obj.put("appName", item.appName)
            obj.put("title", item.title)
            obj.put("text", item.text)
            obj.put("timestamp", item.timestamp)
            array.put(obj)
        }

        result.put("active", true)
        result.put("notifications", array)
        return result.toString()
    }

    /**
     * Controls foreground Wake Word service
     */
    @JavascriptInterface
    fun startWakeWordService(): Boolean {
        return try {
            WakeWordForegroundService.start(activity)
            true
        } catch (e: Exception) {
            Log.e(TAG, "Erro ao iniciar WakeWordForegroundService: ${e.message}")
            false
        }
    }

    @JavascriptInterface
    fun stopWakeWordService(): Boolean {
        return try {
            WakeWordForegroundService.stop(activity)
            true
        } catch (e: Exception) {
            Log.e(TAG, "Erro ao parar WakeWordForegroundService: ${e.message}")
            false
        }
    }
}
