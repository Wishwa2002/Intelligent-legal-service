import '../api_client.dart';

class AgentChatService {
  static Future<Map<String, dynamic>> createSession(String customerId, {String? clientName}) async {
    final result = await ApiClient.post('/api/agent/chat/session', {
      'customerId': customerId,
      if (clientName != null && clientName.isNotEmpty) 'clientName': clientName,
    }, timeout: const Duration(seconds: 90));
    if (result is Map<String, dynamic>) return result;
    throw ApiException('Invalid chat session response.', 502);
  }

  static Future<Map<String, dynamic>> sendMessage({
    required String sessionId,
    required String message,
    String? uploadedFileId,
    String? uploadedFileExpectedType,
  }) async {
    final result = await ApiClient.post('/api/agent/chat/$sessionId/message', {
      'message': message,
      'uploadedFileId': uploadedFileId,
      'uploadedFileExpectedType': uploadedFileExpectedType,
    }, timeout: const Duration(seconds: 90));
    if (result is Map<String, dynamic>) return result;
    throw ApiException('Invalid chat message response.', 502);
  }

  static Future<Map<String, dynamic>?> getStatus(String sessionId) async {
    final result = await ApiClient.get('/api/agent/chat/$sessionId/status');
    return result is Map<String, dynamic> ? result : null;
  }
}
