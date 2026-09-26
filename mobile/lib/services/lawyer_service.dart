import '../models/lawyer.dart';
import 'api_client.dart';

class LawyerService {
  static const List<String> categories = [
    'Corporate & Commercial Law',
    'Criminal Law',
    'Real Estate & Property Law',
    'Labour & Employment Law',
    'Tax Law',
  ];

  /// Fetch list of lawyers, optionally filtered by specialization name, id, or search text.
  static Future<List<Lawyer>> getLawyers({String? specialization, String? search}) async {
    final query = <String, String>{};
    if (specialization != null && specialization.isNotEmpty && specialization != 'All') {
      query['specialization'] = specialization;
    }
    if (search != null && search.trim().isNotEmpty) {
      query['search'] = search.trim();
    }

    final response = await ApiClient.get('/api/lawyers', queryParams: query.isNotEmpty ? query : null);
    if (response is List) {
      return response.map((item) => Lawyer.fromJson(item as Map<String, dynamic>)).toList();
    }
    return [];
  }

  /// Fetch single lawyer details by ID.
  static Future<Lawyer> getLawyerById(String id) async {
    final response = await ApiClient.get('/api/lawyers/$id');
    return Lawyer.fromJson(response as Map<String, dynamic>);
  }

  /// Fetch single lawyer details by email.
  static Future<Lawyer> getLawyerByEmail(String email) async {
    final response = await ApiClient.get('/api/lawyers/by-email/$email');
    return Lawyer.fromJson(response as Map<String, dynamic>);
  }

  /// Add a new lawyer with one designated category.
  static Future<Lawyer> createLawyer({
    required String name,
    required String email,
    String? phoneNumber,
    String? qualification,
    required int experience,
    required String licenseNumber,
    String? profileDescription,
    required String category,
    String? password,
  }) async {
    final payload = {
      'name': name.trim(),
      'email': email.trim(),
      'phoneNumber': phoneNumber?.trim(),
      'qualification': qualification?.trim(),
      'experience': experience,
      'licenseNumber': licenseNumber.trim(),
      'profileDescription': profileDescription?.trim(),
      'category': category.trim(),
      'password': password?.trim(),
    };

    final response = await ApiClient.post('/api/lawyers', payload);
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

  /// Fetch the 30-minute afternoon slots (3:00 - 5:00 PM) for the specified date.
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
