# J.A.R.V.I.S. Android Proguard Rules

# Keep JavascriptInterface methods so Proguard doesn't strip bridge functions
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

-keep class com.jarvis.cyberprotocol.bridge.JarvisBridge { *; }
-keep class com.jarvis.cyberprotocol.services.** { *; }
