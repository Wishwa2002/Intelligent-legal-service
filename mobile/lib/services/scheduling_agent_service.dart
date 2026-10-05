import 'api_client.dart';

class SchedulingAgentService {
  static Future<Map<String, dynamic>> createSession(String customerId, {String? clientName, String? userRole = 'Client'}) async {
    final result = await ApiClient.post('/api/agent/scheduling/session', {
      'customerId': customerId,
      'clientName': clientName,
      'userRole': userRole,
    }, timeout: const Duration(seconds: 90));
    if (result is Map<String, dynamic>) return result;
    throw ApiException('Invalid scheduling session response.', 502);
  }

  static Future<Map<String, dynamic>> sendMessage({
    required String sessionId,
    required String message,
    String? selectedLawyerId,
    String? selectedSlotId,
    String? selectedSlotTime,
    String? consultationType,
  }) async {
    final result = await ApiClient.post('/api/agent/scheduling/$sessionId/message', {
      'message': message,
      'selectedLawyerId': selectedLawyerId,
      'selectedSlotId': selectedSlotId,
      'selectedSlotTime': selectedSlotTime,
      'consultationType': consultationType,
    }, timeout: const Duration(seconds: 90));
    if (result is Map<String, dynamic>) return result;
    throw ApiException('Invalid scheduling response.', 502);
  }

  static Future<Map<String, dynamic>?> getStatus(String sessionId) async {
    final result = await ApiClient.get('/api/agent/scheduling/$sessionId/status');
    return result is Map<String, dynamic> ? result : null;
  }
}
