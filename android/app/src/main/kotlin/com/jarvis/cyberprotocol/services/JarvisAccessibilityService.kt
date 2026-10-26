package com.jarvis.cyberprotocol.services

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * J.A.R.V.I.S. Legitimate Assistive Accessibility Service
 * 
 * Provides voice-assisted UI navigation for authorized user commands:
 * - Finding and clicking on accessibility nodes by text
 * - Navigating Back (GLOBAL_ACTION_BACK) and Home (GLOBAL_ACTION_HOME)
 * - Scrolling lists
 * 
 * Security Guarantee:
 * - Operates strictly upon user explicit command
 * - Never bypasses lock screens, PIN, passwords, or biometrics
 * - Does not collect, record, or exfiltrate private text or credentials
 */
class JarvisAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "JarvisAccessibility"
        var instance: JarvisAccessibilityService? = null
            private set

        fun isRunning(): Boolean = instance != null
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        Log.i(TAG, "J.A.R.V.I.S. Serviço de Acessibilidade Conectado com Sucesso.")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Passive observation only when needed for state confirmation
    }

    override fun onInterrupt() {
        Log.w(TAG, "J.A.R.V.I.S. Serviço de Acessibilidade Interrompido.")
    }

    override fun onDestroy() {
        super.onDestroy()
        if (instance == this) {
            instance = null
        }
    }

    /**
     * Finds an interactive node containing the target text and executes an authorized click action.
     */
    fun clickByText(targetText: String): Boolean {
        val root = rootInActiveWindow ?: return false
        try {
            val nodes = root.findAccessibilityNodeInfosByText(targetText)
            if (nodes.isNullOrEmpty()) {
                return false
            }

            for (node in nodes) {
                if (node == null) continue

                // Check if the node itself is clickable
                if (node.isClickable) {
                    val clicked = node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    if (clicked) return true
                }

                // If not, inspect parent hierarchy for a clickable container (e.g. Card, Button wrapper)
                var parent = node.parent
                while (parent != null) {
                    if (parent.isClickable) {
                        val clicked = parent.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                        if (clicked) return true
                    }
                    parent = parent.parent
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Erro ao executar clique assistivo: ${e.message}")
        }
        return false
    }

    /**
     * Executes global navigation actions (Back, Home, Recents)
     */
    fun performBack(): Boolean = performGlobalAction(GLOBAL_ACTION_BACK)

    fun performHome(): Boolean = performGlobalAction(GLOBAL_ACTION_HOME)

    fun performRecents(): Boolean = performGlobalAction(GLOBAL_ACTION_RECENTS)

    /**
     * Scrolls the currently active window
     */
    fun scroll(forward: Boolean): Boolean {
        val root = rootInActiveWindow ?: return false
        val action = if (forward) AccessibilityNodeInfo.ACTION_SCROLL_FORWARD else AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD
        return root.performAction(action)
    }
}
