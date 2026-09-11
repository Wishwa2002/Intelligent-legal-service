import '../models/career_model.dart';
import 'api_client.dart';

class CareerService {
  static Future<List<CareerModel>> getCareers() async {
    final data = await ApiClient.get('/api/careers');
    if (data is List) {
      return data.map((e) => CareerModel.fromJson(e as Map<String, dynamic>)).toList();
    }
    return [];
  }

  static Future<dynamic> applyForJob({
    required String careerId,
    required String applicantName,
  }) async {
    final res = await ApiClient.post('/api/job-applications', {
      'careerId': careerId,
      'applicantName': applicantName,
    });
    return res;
  }
}
