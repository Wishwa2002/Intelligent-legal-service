import 'dart:convert';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:legal_service_app/auth/auth_service.dart';
import 'package:legal_service_app/auth/session_router.dart';
import 'package:legal_service_app/auth/user_model.dart';
import 'package:legal_service_app/lawyer/lawyer_navigation_screen.dart';
import 'package:legal_service_app/lawyer/models.dart';
import 'package:legal_service_app/lawyer/lawyer_api.dart';
import 'package:legal_service_app/lawyer/profile/change_password_screen.dart';
import 'package:legal_service_app/services/api_client.dart';
import 'package:legal_service_app/screens/main_navigation_screen.dart';

final profile = {
  'name': 'Lawyer A',
  'email': 'a@example.test',
  'phoneNumber': '',
  'qualification': 'LL.B',
  'practiceArea': 'Property',
  'licenseNumber': 'BAR-1',
  'profileDescription': '',
  'status': 'Active',
  'experience': 5,
};
final dashboard = {
  'lawyer': profile,
  'counts': {'today': 0, 'upcoming': 0, 'pending': 0, 'completed': 0},
  'nextAppointment': null,
  'timeZone': 'Asia/Colombo',
};
UserModel user(String role, {bool change = false}) => UserModel(
  userId: '1',
  fullName: 'Lawyer A',
  email: 'a@example.test',
  role: role,
  token: 'test-token',
  mustChangePassword: change,
);
http.Response jsonResponse(
  Object body,
  http.Request request, [
  int code = 200,
]) => http.Response(
  jsonEncode(body),
  code,
  request: request,
  headers: {'content-type': 'application/json'},
);
void main() {
  late http.Client original;
  setUp(() async {
    dotenv.loadFromString(envString: "BACKEND_URL=http://localhost:5000");
    SharedPreferences.setMockInitialValues({});
    original = ApiClient.client;
    AuthService.currentUser.value = null;
    await AuthService.init();
    ApiClient.client = MockClient((r) async {
      if (r.url.path.endsWith('/dashboard')) return jsonResponse(dashboard, r);
      if (r.url.path.endsWith('/profile')) return jsonResponse(profile, r);
      if (r.url.path.endsWith('/appointments')) return jsonResponse([], r);
      return jsonResponse({}, r);
    });
  });
  tearDown(() {
    ApiClient.client.close();
    ApiClient.client = original;
    AuthService.currentUser.value = null;
  });
  test('Customer and Lawyer supported; staff roles rejected', () {
    expect(AuthService.supportsRole('Customer'), true);
    expect(AuthService.supportsRole('Lawyer'), true);
    for (final role in ['Admin', 'Clerk', 'Unknown']) {
      expect(AuthService.supportsRole(role), false);
    }
  });
  test('Lawyer login retains role and password setup flag', () async {
    ApiClient.client = MockClient(
      (r) async => jsonResponse({
        ...user('Lawyer', change: true).toJson(),
        'name': 'Lawyer A',
      }, r),
    );
    final account = await AuthService.login(
      email: 'a@example.test',
      password: 'initial',
    );
    expect(account.role, 'Lawyer');
    expect(account.mustChangePassword, true);
    expect(await ApiClient.getToken(), 'test-token');
    final stored = (await SharedPreferences.getInstance()).getString(
      'current_user_data',
    )!;
    expect(stored.contains('initial'), false);
  });
  test('Unsupported role cannot establish mobile session', () async {
    ApiClient.client = MockClient(
      (r) async => jsonResponse(user('Admin').toJson(), r),
    );
    await expectLater(
      AuthService.login(email: 'admin@example.test', password: 'secret'),
      throwsException,
    );
    expect(AuthService.currentUser.value, null);
    expect(await ApiClient.getToken(), null);
  });
  test('Schedule model serializes all weekdays and duration', () {
    final schedule = LawyerSchedule.fromJson({
      'appointmentDurationMinutes': 30,
      'days': List.generate(
        7,
        (d) => {
          'dayOfWeek': d,
          'isWorkingDay': d > 0 && d < 6,
          'startTime': '09:00:00',
          'endTime': '17:00:00',
        },
      ),
      'timeZone': 'Asia/Colombo',
      'hasConfiguredSchedule': true,
    });
    expect(schedule.toJson()['days'], hasLength(7));
    expect(schedule.days[0].working, false);
    expect(schedule.duration, 30);
  });
  testWidgets('Lawyer routes into four-tab dashboard with empty server state', (
    tester,
  ) async {
    AuthService.currentUser.value = user('Lawyer');
    await tester.pumpWidget(const MaterialApp(home: SessionRouter()));
    await tester.pumpAndSettle();
    expect(find.byType(LawyerNavigationScreen), findsOneWidget);
    expect(find.byType(MainNavigationScreen), findsNothing);
    for (final tab in ['Home', 'Appointments', 'Schedule', 'Profile']) {
      expect(find.text(tab), findsOneWidget);
    }
    expect(
      find.textContaining(RegExp(r'Good (morning|afternoon|evening), Lawyer')),
      findsOneWidget,
    );
    await tester.scrollUntilVisible(find.text('No upcoming appointment'), 150);
    expect(find.text('No upcoming appointment'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('View Today'), 150);
    await tester.tap(find.text('View Today'));
    await tester.pumpAndSettle();
    expect(find.text('No appointments today'), findsOneWidget);
    expect(tester.takeException(), null);
  });
  testWidgets('Initial password gate prevents dashboard access', (
    tester,
  ) async {
    AuthService.currentUser.value = user('Lawyer', change: true);
    await tester.pumpWidget(const MaterialApp(home: SessionRouter()));
    await tester.pumpAndSettle();
    expect(find.byType(ChangePasswordScreen), findsOneWidget);
    expect(find.byType(LawyerNavigationScreen), findsNothing);
    await AuthService.passwordChanged();
    await tester.pumpAndSettle();
    expect(find.byType(LawyerNavigationScreen), findsOneWidget);
  });
  testWidgets('Customer retains existing customer navigation', (tester) async {
    AuthService.currentUser.value = user('Customer');
    await tester.pumpWidget(const MaterialApp(home: SessionRouter()));
    await tester.pump();
    expect(find.byType(MainNavigationScreen), findsOneWidget);
    expect(find.byType(LawyerNavigationScreen), findsNothing);
    await tester.pumpWidget(const SizedBox());
    await tester.pumpAndSettle();
  });
  testWidgets('Dashboard failure offers retry and no blank screen', (
    tester,
  ) async {
    ApiClient.client = MockClient(
      (r) async => jsonResponse({'title': 'Dashboard unavailable.'}, r, 500),
    );
    AuthService.currentUser.value = user('Lawyer');
    await tester.pumpWidget(const MaterialApp(home: SessionRouter()));
    await tester.pumpAndSettle();
    expect(find.text('Dashboard unavailable.'), findsOneWidget);
    expect(find.text('Retry'), findsOneWidget);
  });
  test('Expired token clears stored mobile session', () async {
    AuthService.currentUser.value = user('Lawyer');
    await ApiClient.saveToken('expired');
    ApiClient.client = MockClient(
      (r) async => jsonResponse({'message': 'Session expired.'}, r, 401),
    );
    await expectLater(LawyerApi.dashboard(), throwsA(isA<ApiException>()));
    // Logout is intentionally dispatched without blocking the response handler.
    await Future<void>.delayed(Duration.zero);
    expect(AuthService.currentUser.value, null);
    expect(await ApiClient.getToken(), null);
  });
  test(
    'Conflict response retains appointment information for the UI',
    () async {
      ApiClient.client = MockClient(
        (r) async => jsonResponse(
          {
            'title': 'Leave conflicts with an appointment.',
            'conflicts': [
              {
                'date': '2030-01-07',
                'startTime': '10:00:00',
                'endTime': '10:30:00',
              },
            ],
          },
          r,
          409,
        ),
      );
      try {
        await LawyerApi.saveLeave(null, {});
        fail('Expected a conflict');
      } on ApiException catch (e) {
        expect(e.statusCode, 409);
        expect(e.conflicts, hasLength(1));
        expect(e.message, contains('Leave conflicts'));
      }
    },
  );
  testWidgets('Phone layout and larger text render without overflow', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 700);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    AuthService.currentUser.value = user('Lawyer');
    await tester.pumpWidget(
      MaterialApp(
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: const TextScaler.linear(1.4)),
          child: child!,
        ),
        home: const SessionRouter(),
      ),
    );
    await tester.pumpAndSettle();
    expect(tester.takeException(), null);
  });
}
