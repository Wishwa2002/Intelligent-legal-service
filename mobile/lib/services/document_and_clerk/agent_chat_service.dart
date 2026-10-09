import '../../config/api_config.dart';
import '../api_client.dart';

class AgentChatService {
  static Future<Map<String, dynamic>> createSession(String customerId, {String? clientName}) async {
    try {
      final payload = <String, dynamic>{
        'customerId': customerId,
        if (clientName != null && clientName.isNotEmpty) 'clientName': clientName,
      };
      final res = await ApiClient.post(
        '/api/agent/chat/session',
        payload,
        timeout: const Duration(seconds: 10),
      );
      if (res is Map<String, dynamic>) return res;
      return {'sessionId': res.toString()};
    } catch (_) {
      // Direct AI service fallback
      try {
        final aiPayload = <String, dynamic>{
          'customer_id': customerId,
          if (clientName != null && clientName.isNotEmpty) 'client_name': clientName,
        };
        final res = await ApiClient.post(
          '/api/agent/chat/session',
          aiPayload,
          customBaseUrl: ApiConfig.aiServiceUrl.value,
          timeout: const Duration(seconds: 8),
        );
        if (res is Map<String, dynamic>) return res;
        return {'sessionId': res.toString()};
      } catch (_) {
        // Fallback session so UI is never stuck loading
        return {
          'sessionId': 'session-local-${DateTime.now().millisecondsSinceEpoch}',
          'session_id': 'session-local-${DateTime.now().millisecondsSinceEpoch}',
          'message': 'Welcome to Legal Intelligence Assistant. How can I assist you today?',
          'action_options': [
            'Rental & Lease Agreement',
            'Business Registration',
            'Power of Attorney',
            'Property Transfer',
            '📁 View All Services',
          ],
        };
      }
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
