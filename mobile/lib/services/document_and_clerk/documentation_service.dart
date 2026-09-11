import '../../models/documentation_service.dart';
import '../../models/documentation_request.dart';
import '../api_client.dart';

class DocumentationApiService {
  static Future<List<DocumentationService>> getServices() async {
    final data = await ApiClient.get('/api/documentation-services');
    if (data is List) {
      return data.map((e) => DocumentationService.fromJson(e as Map<String, dynamic>)).toList();
    }
    return [];
  }

  static Future<List<DocumentationRequest>> getRequests({int? customerId}) async {
    final queryParams = <String, String>{};
    if (customerId != null) {
      queryParams['customerId'] = customerId.toString();
    }
    final data = await ApiClient.get('/api/documentation-requests', queryParams: queryParams);
    if (data is List) {
      return data.map((e) => DocumentationRequest.fromJson(e as Map<String, dynamic>)).toList();
    }
    return [];
  }

  static Future<DocumentationRequest> getRequestById(int id) async {
    final data = await ApiClient.get('/api/documentation-requests/$id');
    return DocumentationRequest.fromJson(data as Map<String, dynamic>);
  }

  static Future<DocumentationRequest> createRequest({
    required int customerId,
    required int serviceId,
    required String documentType,
  }) async {
    final data = await ApiClient.post(
      '/api/documentation-requests',
      {
        'serviceId': serviceId,
        'documentType': documentType,
      },
      queryParams: {'customerId': customerId.toString()},
    );
    return DocumentationRequest.fromJson(data as Map<String, dynamic>);
  }
}
