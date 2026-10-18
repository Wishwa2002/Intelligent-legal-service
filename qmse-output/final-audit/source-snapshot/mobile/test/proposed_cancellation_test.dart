// AI-assisted UI regression. Explicit HTTP fixtures, not provider/database proof.
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:legal_service_app/auth/auth_service.dart';
import 'package:legal_service_app/auth/user_model.dart';
import 'package:legal_service_app/services/api_client.dart';
import 'package:legal_service_app/screens/appointments/my_appointments_screen.dart';
void main() {
 for(final allowed in [true,false]) {
  testWidgets('API canCancel=$allowed controls actual cancellation button',(tester) async {
   dotenv.loadFromString(envString:'BACKEND_URL=http://127.0.0.1:55543');SharedPreferences.setMockInitialValues({});
   AuthService.currentUser.value=UserModel.fromJson({'userId':'42','name':'Synthetic','email':'customer@example.test','role':'Customer'});
   ApiClient.client=MockClient((request) async=>http.Response(jsonEncode([{'appointmentId':'test','customerId':'42','lawyerName':'Synthetic Counsel','date':'2030-01-14','startTime':'10:00:00','endTime':'10:30:00','status':'Confirmed','canCancel':allowed,'createdAt':'2026-10-08T00:00:00Z'}]),200));
   await tester.pumpWidget(const MaterialApp(home:MyAppointmentsScreen()));await tester.pumpAndSettle();
   expect(find.widgetWithText(OutlinedButton,'Cancel'),allowed?findsOneWidget:findsNothing);
   await tester.pumpWidget(const SizedBox.shrink());AuthService.currentUser.value=null;
  });
 }
}
