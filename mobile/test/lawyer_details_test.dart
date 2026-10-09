import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:legal_service_app/models/lawyer.dart';
import 'package:legal_service_app/screens/appointments/specialization_details_screen.dart';

void main() {
  test('lawyer details preserve backend services and specialization descriptions', () {
    final lawyer = Lawyer.fromJson({
      'lawyerId': 'recorded-id', 'name': 'Recorded Name', 'experience': 12,
      'specializations': [
        {'specializationId': 7, 'name': 'Property', 'description': 'Recorded description'}
      ],
      'legalServices': [
        {'legalServiceId': 9, 'serviceName': 'Consultation', 'description': 'Service description', 'category': 'Property'}
      ],
    });
    expect(lawyer.specializations.single.specializationId, 7);
    expect(lawyer.specializations.single.description, 'Recorded description');
    expect(lawyer.legalServices.single.legalServiceId, 9);
    expect(lawyer.legalServices.single.serviceName, 'Consultation');
    expect(Lawyer.fromJson({'lawyerId': 'legacy'}).legalServices, isEmpty);
  });

  testWidgets('specialization screen displays recorded descriptions', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: SpecializationDetailsScreen(
      specialization: LawyerSpecialization(specializationId: 7, name: 'Property', description: 'Recorded description'))));
    expect(find.text('Property'), findsOneWidget);
    expect(find.text('Recorded description'), findsOneWidget);
  });

  testWidgets('missing description is stated without invented content', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: SpecializationDetailsScreen(
      specialization: LawyerSpecialization(specializationId: 7, name: 'Property', description: ''))));
    expect(find.text('No description has been recorded for this Practice Area.'), findsOneWidget);
  });
}
