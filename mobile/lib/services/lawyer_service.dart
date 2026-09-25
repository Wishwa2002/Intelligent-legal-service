import '../models/lawyer.dart';
import 'api_client.dart';

class LawyerService {
  /// Fetch list of lawyers, optionally filtered by specialization name or id.
  static Future<List<Lawyer>> getLawyers({String? specialization}) async {
    Map<String, String>? query;
    if (specialization != null && specialization.isNotEmpty && specialization != 'All') {
      query = {'specialization': specialization};
    }

    final response = await ApiClient.get('/api/lawyers', queryParams: query);
    if (response is List) {
      return response.map((item) => Lawyer.fromJson(item as Map<String, dynamic>)).toList();
    }
    return [];
  }

  /// Fetch single lawyer details.
  static Future<Lawyer> getLawyerById(String id) async {
    final response = await ApiClient.get('/api/lawyers/$id');
    return Lawyer.fromJson(response as Map<String, dynamic>);
  }

  /// Fetch law specializations.
  static Future<List<LawyerSpecialization>> getSpecializations() async {
    final response = await ApiClient.get('/api/lawyers/specializations');
    if (response is List) {
      return response.map((item) => LawyerSpecialization.fromJson(item as Map<String, dynamic>)).toList();
    }
    return [];
  }

  /// Fetch the 4 afternoon slots (3:00 - 5:00 PM) for the specified date.
  static Future<List<AvailabilitySlot>> getAvailableSlots(String lawyerId, String date) async {
    final response = await ApiClient.get(
      '/api/lawyers/$lawyerId/slots',
      queryParams: {'date': date},
    );
    if (response is List) {
      return response.map((item) => AvailabilitySlot.fromJson(item as Map<String, dynamic>)).toList();
    }
    return [];
  }
}
