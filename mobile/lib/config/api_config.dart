import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiConfig {
  static const String _backendPrefKey = 'config_backend_url';
  static const String _aiPrefKey = 'config_ai_url';

  // Localhost works seamlessly on Android via adb reverse (USB) and on desktop
  static const String defaultBackendUrl = 'http://localhost:5000';
  static const String defaultAiUrl = 'http://localhost:8001';
  static const String lanBackendUrl = 'http://10.78.57.23:5000';
  static const String lanAiUrl = 'http://10.78.57.23:8001';

  static final ValueNotifier<String> backendUrl = ValueNotifier<String>(defaultBackendUrl);
  static final ValueNotifier<String> aiServiceUrl = ValueNotifier<String>(defaultAiUrl);

  static Future<void> initialize() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedBackend = prefs.getString(_backendPrefKey);
      final savedAi = prefs.getString(_aiPrefKey);

      // If an old unreachable LAN IP was saved, clear it and use localhost
      if (savedBackend != null && savedBackend.isNotEmpty && !savedBackend.contains('10.164.')) {
        backendUrl.value = savedBackend;
      } else {
        backendUrl.value = defaultBackendUrl;
        await prefs.setString(_backendPrefKey, defaultBackendUrl);
      }

      if (savedAi != null && savedAi.isNotEmpty && !savedAi.contains('10.164.')) {
        aiServiceUrl.value = savedAi;
      } else {
        aiServiceUrl.value = defaultAiUrl;
        await prefs.setString(_aiPrefKey, defaultAiUrl);
      }
    } catch (_) {}
  }

  static Future<void> setBackendUrl(String url) async {
    final clean = url.trim();
    backendUrl.value = clean;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_backendPrefKey, clean);
    } catch (_) {}
  }

  static Future<void> setAiServiceUrl(String url) async {
    final clean = url.trim();
    aiServiceUrl.value = clean;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_aiPrefKey, clean);
    } catch (_) {}
  }
}
