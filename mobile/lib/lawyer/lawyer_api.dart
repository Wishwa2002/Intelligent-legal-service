import '../services/api_client.dart';
import '../auth/auth_service.dart';
import 'models.dart';

class LawyerApi {
  static const root = '/api/lawyer/me';
  static Future<T> _call<T>(Future<T> Function() action) async {
    try {
      return await action();
    } on ApiException catch (e) {
      if (e.statusCode == 403) {
        if (e.message.contains('initial password')) {
          await AuthService.requirePasswordChange();
        } else {
          await AuthService.logout();
        }
      }
      rethrow;
    }
  }

  static Future<LawyerProfile> profile() => _call(
    () async => LawyerProfile.fromJson(await ApiClient.get('$root/profile')),
  );
  static Future<LawyerDashboardSummary> dashboard() => _call(
    () async =>
        LawyerDashboardSummary.fromJson(await ApiClient.get('$root/dashboard')),
  );
  static Future<List<LawyerAppointment>> appointments(String filter) => _call(
    () async =>
        (await ApiClient.get(
                  '$root/appointments',
                  queryParams: {'filter': filter},
                )
                as List)
            .map((j) => LawyerAppointment.fromJson(j))
            .toList(),
  );
  static Future<LawyerAppointment> appointment(String id) => _call(
    () async => LawyerAppointment.fromJson(
      await ApiClient.get('$root/appointments/$id'),
    ),
  );
  static Future<void> action(String id, String action) => _call(() async {
    await ApiClient.post(
      '$root/appointments/$id/$action',
      null,
      retryOnConnectionFailure: false,
    );
  });
  static Future<LawyerSchedule> schedule() => _call(
    () async => LawyerSchedule.fromJson(await ApiClient.get('$root/schedule')),
  );
  static Future<void> saveSchedule(LawyerSchedule schedule) => _call(() async {
    await ApiClient.put('$root/schedule', schedule.toJson());
  });
  static Future<List<LawyerUnavailability>> leave() => _call(
    () async => (await ApiClient.get('$root/unavailability') as List)
        .map((j) => LawyerUnavailability.fromJson(j))
        .toList(),
  );
  static Future<void> saveLeave(String? id, Map<String, dynamic> body) =>
      _call(() async {
        if (id == null) {
          await ApiClient.post(
            '$root/unavailability',
            body,
            retryOnConnectionFailure: false,
          );
        } else {
          await ApiClient.put('$root/unavailability/$id', body);
        }
      });
  static Future<void> deleteLeave(String id) => _call(() async {
    await ApiClient.delete('$root/unavailability/$id');
  });
  static Future<void> saveProfile(String phone, String description) =>
      _call(() async {
        await ApiClient.put('$root/profile', {
          'phoneNumber': phone,
          'profileDescription': description,
        });
      });
  static Future<void> changePassword(
    String current,
    String next,
    String confirm,
  ) async {
    await ApiClient.post('/api/auth/change-password', {
      'currentPassword': current,
      'newPassword': next,
      'confirmPassword': confirm,
    }, retryOnConnectionFailure: false);
    await AuthService.passwordChanged();
  }
}
