import 'package:flutter/foundation.dart';
import '../config/api_config.dart';
import 'api_client.dart';

class SchedulingAgentService {
  /// Create a new session with the Lawyer Scheduling Agent.
  static Future<Map<String, dynamic>> createSession(
    String customerId, {
    String? clientName,
    String? userRole = 'Client',
  }) async {
    final payload = <String, dynamic>{
      'customerId': customerId.isNotEmpty ? customerId : 'guest',
      'clientName': ?clientName,
      'userRole': userRole,
    };

    // 1. Primary route via ASP.NET Core Backend
    try {
      final res = await ApiClient.post(
        '/api/agent/scheduling/session',
        payload,
        timeout: const Duration(seconds: 10),
      );
      if (res is Map<String, dynamic>) return res;
      return {'sessionId': res.toString()};
    } catch (e) {
      debugPrint('Backend scheduling session failed, trying direct AI service fallback: $e');

      // 2. Direct AI Service fallback
      try {
        final aiPayload = <String, dynamic>{
          'customer_id': customerId.isNotEmpty ? customerId : 'guest',
          'client_name': ?clientName,
          'user_role': userRole,
        };
        final res = await ApiClient.post(
          '/api/agent/scheduling/session',
          aiPayload,
          customBaseUrl: ApiConfig.aiServiceUrl.value,
          timeout: const Duration(seconds: 8),
        );
        if (res is Map<String, dynamic>) return res;
        return {'sessionId': res.toString()};
      } catch (err) {
        debugPrint('Direct AI scheduling service failed: $err');
        return {
          'sessionId': 'sched-local-${DateTime.now().millisecondsSinceEpoch}',
          'message': 'Welcome to the Lawyer Scheduling Assistant! How can I assist you with your legal consultation?',
          'action_options': [
            'Corporate & Commercial Law',
            'Criminal Law',
            'Real Estate & Property Law',
            'Labour & Employment Law',
            'Tax Law',
          ],
        };
      }
    }
  }

  /// Send message or slot selection to active scheduling session.
  static Future<Map<String, dynamic>> sendMessage({
    required String sessionId,
    required String message,
    String? selectedLawyerId,
    String? selectedSlotId,
    String? selectedSlotTime,
    String? consultationType,
  }) async {
    final payload = <String, dynamic>{
      'message': message,
      'selectedLawyerId': ?selectedLawyerId,
      'selectedSlotId': ?selectedSlotId,
      'selectedSlotTime': ?selectedSlotTime,
      'consultationType': ?consultationType,
    };

    // 1. Primary route via ASP.NET Core Backend
    try {
      final res = await ApiClient.post(
        '/api/agent/scheduling/$sessionId/message',
        payload,
        timeout: const Duration(seconds: 35),
      );
      if (res is Map<String, dynamic>) return res;
      return {'message': res.toString(), 'action_options': []};
    } catch (_) {
      // 2. Direct AI Service fallback
      final aiPayload = <String, dynamic>{
        'message': message,
        'selected_lawyer_id': ?selectedLawyerId,
        'selected_slot_id': ?selectedSlotId,
        'selected_slot_time': ?selectedSlotTime,
        'consultation_type': ?consultationType,
      };
      final res = await ApiClient.post(
        '/api/agent/scheduling/$sessionId/message',
        aiPayload,
        customBaseUrl: ApiConfig.aiServiceUrl.value,
        timeout: const Duration(seconds: 35),
      );
      if (res is Map<String, dynamic>) return res;
      return {'message': res.toString(), 'action_options': []};
    }
  }

  /// Get status of scheduling workflow.
  static Future<Map<String, dynamic>?> getStatus(String sessionId) async {
    try {
      final res = await ApiClient.get('/api/agent/scheduling/$sessionId/status');
      if (res is Map<String, dynamic>) return res;
    } catch (_) {
      try {
        final res = await ApiClient.get(
          '/api/agent/scheduling/$sessionId/status',
          customBaseUrl: ApiConfig.aiServiceUrl.value,
        );
        if (res is Map<String, dynamic>) return res;
      } catch (_) {}
    }
    return null;
  }
}
