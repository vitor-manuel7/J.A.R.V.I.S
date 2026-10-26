package com.jarvis.cyberprotocol.services

import android.app.Notification
import android.content.pm.PackageManager
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

data class NotificationSummary(
    val appName: String,
    val title: String,
    val text: String,
    val timestamp: Long
)

/**
 * J.A.R.V.I.S. Notification Listener Service
 * 
 * Secure, user-authorized notification reader:
 * - Reads only current active notifications on explicit voice command
 * - Filters out ongoing system sticky bars
 * - Never exfiltrates or logs notification content automatically
 */
class JarvisNotificationListenerService : NotificationListenerService() {

    companion object {
        private const val TAG = "JarvisNotification"
        var instance: JarvisNotificationListenerService? = null
            private set

        fun isConnected(): Boolean = instance != null
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        instance = this
        Log.i(TAG, "J.A.R.V.I.S. Acesso a Notificações Conectado com Sucesso.")
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        instance = null
        Log.w(TAG, "J.A.R.V.I.S. Acesso a Notificações Desconectado.")
    }

    override fun onDestroy() {
        super.onDestroy()
        if (instance == this) {
            instance = null
        }
    }

    /**
     * Retrieves a clean, safe summary of the most recent notifications for voice readout.
     */
    fun getRecentSummaries(limit: Int = 4): List<NotificationSummary> {
        val results = mutableListOf<NotificationSummary>()
        val pm: PackageManager = applicationContext.packageManager

        try {
            val notifications = activeNotifications ?: return emptyList()

            // Sort from newest to oldest
            val sorted = notifications.sortedByDescending { it.postTime }

            for (sbn in sorted) {
                if (results.size >= limit) break

                // Ignore ongoing/persistent system notifications (like music playback or battery monitors)
                if ((sbn.notification.flags and Notification.FLAG_ONGOING_EVENT) != 0) {
                    continue
                }

                // Ignore J.A.R.V.I.S. own notifications
                if (sbn.packageName == packageName) {
                    continue
                }

                val extras = sbn.notification.extras ?: continue
                val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim() ?: ""
                val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim() ?: ""

                if (title.isEmpty() && text.isEmpty()) continue

                val appName = try {
                    val appInfo = pm.getApplicationInfo(sbn.packageName, 0)
                    pm.getApplicationLabel(appInfo).toString()
                } catch (e: Exception) {
                    sbn.packageName.substringAfterLast('.')
                }

                results.add(
                    NotificationSummary(
                        appName = appName,
                        title = title,
                        text = text,
                        timestamp = sbn.postTime
                    )
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "Erro ao consultar notificações ativas: ${e.message}")
        }

        return results
    }
}
