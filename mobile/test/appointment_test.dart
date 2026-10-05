import 'package:flutter_test/flutter_test.dart';
import 'package:legal_service_app/models/lawyer.dart';
import 'package:legal_service_app/models/appointment.dart';
import 'package:legal_service_app/services/appointment_service.dart';

void main() {
  group('Member 2: Appointment & Lawyer Model Tests', () {
    test('Lawyer parses correctly with specializations', () {
      final json = {
        'lawyerId': 'b1111111-1111-1111-1111-111111111111',
        'name': 'Advocate Samantha Perera',
        'email': 'lawyer@legalease.com',
        'phoneNumber': '+94 77 123 4567',
        'qualification': 'LL.M (Criminal Litigation), Attorney-at-Law',
        'experience': 12,
        'licenseNumber': 'SC/AT/2012/8492',
        'profileDescription': 'Senior defense counsel.',
        'status': 'Active',
        'specializations': [
          {
            'specializationId': 1,
            'name': 'Criminal Law',
            'description': 'Defense in litigation.',
          }
        ],
      };

      final lawyer = Lawyer.fromJson(json);
      expect(lawyer.lawyerId, 'b1111111-1111-1111-1111-111111111111');
      expect(lawyer.name, 'Advocate Samantha Perera');
      expect(lawyer.experience, 12);
      expect(lawyer.primarySpecialization, 'Criminal Law');
      expect(lawyer.specializations.length, 1);
    });

    test('AvailabilitySlot formats afternoon times correctly', () {
      final slot1 = AvailabilitySlot.fromJson({
        'slotId': 'slot-1',
        'availabilityId': 'avail-1',
        'date': '2026-09-24',
        'startTime': '15:00:00',
        'endTime': '15:30:00',
        'isBooked': false,
      });

      expect(slot1.formattedTime, '3:00 PM – 3:30 PM');
      expect(slot1.isBooked, false);

      final slot4 = AvailabilitySlot.fromJson({
        'slotId': 'slot-4',
        'availabilityId': 'avail-1',
        'date': '2026-09-24',
        'startTime': '16:30:00',
        'endTime': '17:00:00',
        'isBooked': true,
      });

      expect(slot4.formattedTime, '4:30 PM – 5:00 PM');
      expect(slot4.isBooked, true);
    });

    test('Appointment parses status and attributes', () {
      final json = {
        'appointmentId': 'appt-99',
        'customerId': '00000000-0000-0000-0000-000000000001',
        'customerName': 'Test Client',
        'lawyerId': 'b1111111-1111-1111-1111-111111111111',
        'lawyerName': 'Advocate Samantha Perera',
        'slotId': 'slot-1',
        'date': '2026-09-24',
        'startTime': '15:00:00',
        'endTime': '15:30:00',
        'status': 'Requested',
        'description': 'Urgent criminal trial defense required.',
        'consultationType': 'Online',
        'legalServiceCategory': 'Criminal Law',
        'createdAt': '2026-09-23T04:00:00Z',
        'canConfirm': true,
        'canCancel': true,
        'history': [
          {
            'historyId': 'hist-1',
            'appointmentId': 'appt-99',
            'previousStatus': 'None',
            'newStatus': 'Requested',
            'changedDate': '2026-09-23T04:00:00Z',
          }
        ]
      };

      final appt = Appointment.fromJson(json);
      expect(appt.appointmentId, 'appt-99');
      expect(appt.isRequested, true);
      expect(appt.isConfirmed, false);
      expect(appt.consultationType, 'Online');
      expect(appt.legalServiceCategory, 'Criminal Law');
      expect(appt.formattedTimeSlot, '3:00 PM – 3:30 PM');
      expect(appt.history.length, 1);
      expect(appt.history.first.newStatus, 'Requested');
    });

    test('AppointmentService formats integer customerId to UUID', () {
      expect(AppointmentService.formatCustomerId('1'), '00000000-0000-0000-0000-000000000001');
      expect(AppointmentService.formatCustomerId('42'), '00000000-0000-0000-0000-00000000002a');
      expect(
        AppointmentService.formatCustomerId('b1111111-1111-1111-1111-111111111111'),
        'b1111111-1111-1111-1111-111111111111',
      );
    });
  });
}
