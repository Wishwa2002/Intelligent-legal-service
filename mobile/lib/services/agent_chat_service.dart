import '../config/api_config.dart';
import 'api_client.dart';

class AgentChatService {
  static Future<Map<String, dynamic>> createSession(String customerId) async {
    try {
      final res = await ApiClient.post('/api/agent/chat/session', {
        'customerId': customerId,
      });
      if (res is Map<String, dynamic>) return res;
      return {'sessionId': res.toString()};
    } catch (_) {
      // Direct AI service fallback
      final res = await ApiClient.post(
        '/api/agent/chat/session',
        {'customer_id': customerId},
        customBaseUrl: ApiConfig.aiServiceUrl.value,
      );
      if (res is Map<String, dynamic>) return res;
      return {'sessionId': res.toString()};
    }
  }

  static Future<Map<String, dynamic>> sendMessage({
    required String sessionId,
    required String message,
    String? uploadedFileId,
    String? uploadedFileExpectedType,
  }) async {
    try {
      final res = await ApiClient.post(
        '/api/agent/chat/$sessionId/message',
        {
          'message': message,
          'uploadedFileId': uploadedFileId,
          'uploadedFileExpectedType': uploadedFileExpectedType,
        },
        timeout: const Duration(seconds: 90),
      );
      if (res is Map<String, dynamic>) return res;
      return {'reply': res.toString()};
    } catch (_) {
      // Direct AI service fallback
      final res = await ApiClient.post(
        '/api/agent/chat/$sessionId/message',
        {
          'message': message,
          'uploaded_file_id': uploadedFileId,
          'uploaded_file_expected_type': uploadedFileExpectedType,
        },
        customBaseUrl: ApiConfig.aiServiceUrl.value,
        timeout: const Duration(seconds: 90),
      );
      if (res is Map<String, dynamic>) return res;
      return {'reply': res.toString()};
    }
  }

  static Future<Map<String, dynamic>?> getStatus(String sessionId) async {
    final res = await ApiClient.get('/api/agent/chat/$sessionId/status');
    if (res is Map<String, dynamic>) return res;
    return null;
  }
}
