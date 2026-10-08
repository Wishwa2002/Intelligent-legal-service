import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiConfig {
  static const String _backendPrefKey = 'config_backend_url';
  static const String _aiPrefKey = 'config_ai_url';

  // Values come from .env
  static String get defaultBackendUrl =>
      dotenv.env['BACKEND_URL'] ?? 'http://localhost:5000';

  static String get defaultAiUrl =>
      dotenv.env['AI_SERVICE_URL'] ?? 'http://localhost:8001';

  static String get lanBackendUrl =>
    dotenv.env['BACKEND_URL'] ?? 'http://10.166.6.67:5000';

  static String get lanAiUrl =>
    dotenv.env['AI_SERVICE_URL'] ?? 'http://10.166.6.67:8001';


  static final ValueNotifier<String> backendUrl =
      ValueNotifier<String>(defaultBackendUrl);

  static final ValueNotifier<String> aiServiceUrl =
      ValueNotifier<String>(defaultAiUrl);


  static Future<void> initialize() async {
    try {
      final prefs = await SharedPreferences.getInstance();

      final savedBackend = prefs.getString(_backendPrefKey);
      final savedAi = prefs.getString(_aiPrefKey);


      // Use saved custom value if available,
      // otherwise use .env value

      if (savedBackend != null && savedBackend.isNotEmpty) {
        backendUrl.value = savedBackend;
      } else {
        backendUrl.value = defaultBackendUrl;
        await prefs.setString(
          _backendPrefKey,
          defaultBackendUrl,
        );
      }


      if (savedAi != null && savedAi.isNotEmpty) {
        aiServiceUrl.value = savedAi;
      } else {
        aiServiceUrl.value = defaultAiUrl;
        await prefs.setString(
          _aiPrefKey,
          defaultAiUrl,
        );
      }

    } catch (_) {
      backendUrl.value = defaultBackendUrl;
      aiServiceUrl.value = defaultAiUrl;
    }
  }


  static Future<void> setBackendUrl(String url) async {
    final clean = url.trim();

    backendUrl.value = clean;

    final prefs = await SharedPreferences.getInstance();

    await prefs.setString(
      _backendPrefKey,
      clean,
    );
  }


  static Future<void> setAiServiceUrl(String url) async {
    final clean = url.trim();

    aiServiceUrl.value = clean;

    final prefs = await SharedPreferences.getInstance();

    await prefs.setString(
      _aiPrefKey,
      clean,
    );
  }
}