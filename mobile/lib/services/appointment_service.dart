import '../models/appointment.dart';
import 'api_client.dart';

class AppointmentService {
  /// Converts string user id to valid Guid if integer.
  static String formatCustomerId(String id) {
    if (id.contains('-') && id.length == 36) return id;
    final numVal = int.tryParse(id);
    if (numVal != null) {
      return '00000000-0000-0000-0000-${numVal.toRadixString(16).padLeft(12, '0')}';
    }
    return id;
  }

  /// Book a new consultation appointment.
  static Future<Appointment> bookAppointment({
    required String lawyerId,
    required String slotId,
    required String customerId,
    String? description,
    String consultationType = 'Online',
    String? legalServiceCategory,
  }) async {
    final payload = {
      'lawyerId': lawyerId,
      'slotId': slotId,
      'customerId': formatCustomerId(customerId),
      'description': description,
      'notes': description,
      'consultationType': consultationType,
      'legalServiceCategory': legalServiceCategory,
    };

    final response = await ApiClient.post('/api/appointments', payload);
    return Appointment.fromJson(response as Map<String, dynamic>);
  }

  /// Get appointments for current user or lawyer.
  static Future<List<Appointment>> getAppointments({
    String? customerId,
    String? lawyerId,
    String? lawyerEmail,
    String? status,
    String? date,
  }) async {
    final query = <String, String>{};
    if (customerId != null && customerId.isNotEmpty) {
      query['customerId'] = formatCustomerId(customerId);
    }
    if (lawyerId != null && lawyerId.isNotEmpty) {
      query['lawyerId'] = lawyerId;
    }
    if (lawyerEmail != null && lawyerEmail.isNotEmpty) {
      query['lawyerEmail'] = lawyerEmail;
    }
    if (status != null && status.isNotEmpty && status != 'All') {
      query['status'] = status;
    }
    if (date != null && date.isNotEmpty) {
      query['date'] = date;
    }

    final response = await ApiClient.get('/api/appointments', queryParams: query);
    if (response is List) {
      return response.map((item) => Appointment.fromJson(item as Map<String, dynamic>)).toList();
    }
    return [];
  }

  /// Get single appointment details.
  static Future<Appointment> getAppointmentById(String id) async {
    final response = await ApiClient.get('/api/appointments/$id');
    return Appointment.fromJson(response as Map<String, dynamic>);
  }

  /// Confirm appointment (Lawyer / Admin action).
  static Future<Appointment> confirmAppointment(String id, {String? notes}) async {
    final response = await ApiClient.post('/api/appointments/$id/confirm', {
      'notes': notes,
    });
    return Appointment.fromJson(response as Map<String, dynamic>);
  }

  /// Reject / Decline appointment (Lawyer / Admin action).
  static Future<Appointment> rejectAppointment(String id, {String? reason}) async {
    final response = await ApiClient.post('/api/appointments/$id/reject', {
      'reason': reason,
    });
    return Appointment.fromJson(response as Map<String, dynamic>);
  }

  /// Reschedule appointment to a new slot.
  static Future<Appointment> rescheduleAppointment(String id, String newSlotId, {String? reason}) async {
    final response = await ApiClient.post('/api/appointments/$id/reschedule', {
      'newSlotId': newSlotId,
      'reason': reason,
    });
    return Appointment.fromJson(response as Map<String, dynamic>);
  }

  /// Mark appointment as Completed.
  static Future<Appointment> completeAppointment(String id, {String? notes}) async {
    final response = await ApiClient.post('/api/appointments/$id/complete', {
      'notes': notes,
    });
    return Appointment.fromJson(response as Map<String, dynamic>);
  }

  /// Cancel appointment (Customer action).
  static Future<Appointment> cancelAppointment(String id, {String? reason}) async {
    final response = await ApiClient.post('/api/appointments/$id/cancel', {
      'reason': reason,
    });
    return Appointment.fromJson(response as Map<String, dynamic>);
  }
}
