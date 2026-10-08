import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/service_request.dart';

class ServiceRequestService {
  static Future<ServiceRequest> createRequest({
    required int customerId,
    required String title,
    required String description,
    required String requestType,
    required String priority,
  }) async {
    final uri = Uri.parse(
      '${ApiConfig.backendUrl.value}/api/service-requests'
      '?customerId=$customerId',
    );

    final response = await http
        .post(
          uri,
          headers: {
            'Content-Type': 'application/json',
          },
          body: jsonEncode({
            'title': title,
            'description': description,
            'requestType': requestType,
            'priority': priority,
          }),
        )
        .timeout(
          const Duration(seconds: 15),
        );

    if (response.statusCode >= 200 &&
        response.statusCode < 300) {
      final body =
          jsonDecode(response.body) as Map<String, dynamic>;

      return ServiceRequest.fromJson(body);
    }

    throw Exception(
      'Failed to create service request: '
      '${response.statusCode} ${response.body}',
    );
  }
}