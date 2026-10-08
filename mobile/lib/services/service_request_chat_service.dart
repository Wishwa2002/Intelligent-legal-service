import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/service_request_chat_response.dart';

class ServiceRequestChatService {
  static Future<ServiceRequestChatResponse> sendMessage({
    required String message,
    String? sessionId,
  }) async {
    final uri = Uri.parse(
      '${ApiConfig.backendUrl.value}/api/service-request-chat/message',
    );

    final response = await http.post(
      uri,
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'sessionId': sessionId,
        'message': message,
      }),
    );

    if (response.statusCode >= 200 &&
        response.statusCode < 300) {
      final body =
          jsonDecode(response.body) as Map<String, dynamic>;

      return ServiceRequestChatResponse.fromJson(body);
    }

    throw Exception(
      'Chat request failed: '
      '${response.statusCode} ${response.body}',
    );
  }
}