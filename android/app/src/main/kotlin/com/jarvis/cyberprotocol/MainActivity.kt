package com.jarvis.cyberprotocol

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.View
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.jarvis.cyberprotocol.bridge.JarvisBridge

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private val PERMISSION_REQUEST_CODE = 200

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Dark status & navigation bar for immersive Cyberpunk aesthetic
        window.statusBarColor = Color.parseColor("#07080E")
        window.navigationBarColor = Color.parseColor("#07080E")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(true)
        }

        webView = WebView(this).apply {
            setBackgroundColor(Color.parseColor("#07080E"))
            overScrollMode = View.OVER_SCROLL_NEVER
        }
        setContentView(webView)

        setupWebSettings()
        setupWebViewClients()
        requestEssentialPermissions()

        // Handle hardware back press cleanly
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })

        // In production/local development, load the configured application host URL
        val appUrl = getString(R.string.app_name)
        // By default, loads the deployed web app URL or local fallback
        webView.loadUrl("https://ais-dev-2qkpdn5ewfqj3drf2qfb2j-732863318440.us-west2.run.app")
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebSettings() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            cacheMode = WebSettings.LOAD_DEFAULT
            allowFileAccess = true
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            userAgentString = "${webView.settings.userAgentString} JARVIS-NativeAndroid/1.0"
        }

        // Inject Native Android Bridge
        webView.addJavascriptInterface(JarvisBridge(this), "JarvisNative")
    }

    private fun setupWebViewClients() {
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                // Optional injection confirmation hook
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            // Automatically grant audio/microphone permissions to the J.A.R.V.I.S. interface
            override fun onPermissionRequest(request: PermissionRequest?) {
                request?.let {
                    val resources = it.resources
                    val audioPerms = resources.filter { res ->
                        res == PermissionRequest.RESOURCE_AUDIO_CAPTURE
                    }
                    if (audioPerms.isNotEmpty()) {
                        it.grant(audioPerms.toTypedArray())
                    } else {
                        it.grant(resources)
                    }
                }
            }
        }
    }

    private fun requestEssentialPermissions() {
        val permissionsNeeded = mutableListOf<String>()

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.RECORD_AUDIO)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.POST_NOTIFICATIONS)
            }
        }

        if (permissionsNeeded.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, permissionsNeeded.toTypedArray(), PERMISSION_REQUEST_CODE)
        }
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
