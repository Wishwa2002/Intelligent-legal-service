import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:legal_service_app/auth/auth_service.dart';
import 'package:legal_service_app/config/app_theme.dart';
import 'package:legal_service_app/lawyer/design.dart';
import 'package:legal_service_app/lawyer/widgets.dart';
import 'package:legal_service_app/lawyer/models.dart';
import 'package:legal_service_app/lawyer/lawyer_navigation_screen.dart';
import 'package:legal_service_app/lawyer/dashboard/lawyer_dashboard_screen.dart';
import 'package:legal_service_app/lawyer/appointments/appointment_card.dart';
import 'package:legal_service_app/lawyer/appointments/lawyer_appointments_screen.dart';
import 'package:legal_service_app/lawyer/appointments/lawyer_appointment_detail_screen.dart';
import 'package:legal_service_app/lawyer/schedule/lawyer_schedule_screen.dart';
import 'package:legal_service_app/lawyer/schedule/schedule_editor.dart';
import 'package:legal_service_app/lawyer/schedule/unavailability_editor.dart';
import 'package:legal_service_app/lawyer/profile/lawyer_profile_screen.dart';
import 'package:legal_service_app/lawyer/profile/change_password_screen.dart';
import 'package:legal_service_app/services/api_client.dart';

final identity = <String, dynamic>{
  'name': 'Nimal Perera',
  'email': 'lawyer@example.test',
  'phoneNumber': '0771234567',
  'qualification': 'LL.B, Attorney-at-Law',
  'practiceArea': 'Corporate & Commercial Law',
  'licenseNumber': 'ILS/LAW/0001',
  'profileDescription': 'Legal practitioner advising on commercial matters.',
  'status': 'Active',
  'experience': 3,
};
Map<String, dynamic> appointment({
  String status = 'Confirmed',
  bool confirm = false,
  bool complete = true,
  String id = 'appointment-1',
}) => {
  'appointmentId': id,
  'customerName': 'Jeyam Perera',
  'date': '2030-10-05',
  'startTime': '09:00:00',
  'endTime': '09:30:00',
  'status': status,
  'practiceArea': 'Corporate & Commercial Law',
  'legalService': 'Contract Review',
  'description': 'Please review the terms of my commercial contract.',
  'consultationType': 'In Person',
  'canConfirm': confirm,
  'canComplete': complete,
};
final weeklySchedule = <String, dynamic>{
  'appointmentDurationMinutes': 30,
  'timeZone': 'Asia/Colombo',
  'hasConfiguredSchedule': true,
  'days': List.generate(
    7,
    (d) => {
      'dayOfWeek': d,
      'isWorkingDay': d > 0 && d < 6,
      'startTime': '09:00:00',
      'endTime': '17:00:00',
    },
  ),
};
final annualLeave = <String, dynamic>{
  'id': 'leave-1',
  'reason': '[Scheduling demo 0 2030-10-07] Annual Leave',
  'startDateTime': '2030-10-07T00:00:00',
  'endDateTime': '2030-10-10T00:00:00',
  'isFullDay': true,
};
final courtLeave = <String, dynamic>{
  'id': 'leave-2',
  'reason': 'Court Appearance',
  'startDateTime': '2030-10-18T09:00:00',
  'endDateTime': '2030-10-18T13:00:00',
  'isFullDay': false,
};

class Fixture {
  bool hasNext = true;
  int todayCount = 1;
  Map<String, dynamic> detail = appointment();
  List<Map<String, dynamic>> leaves = [annualLeave, courtLeave];
  final requests = <http.Request>[];
  final filters = <String>[];
  Future<http.Response> call(http.Request r) async {
    requests.add(r);
    Object body = {};
    if (r.url.path.endsWith('/dashboard')) {
      body = {
        'lawyer': identity,
        'counts': {
          'today': todayCount,
          'upcoming': 3,
          'pending': 1,
          'completed': 18,
        },
        'nextAppointment': hasNext ? appointment(id: 'next-1') : null,
        'timeZone': 'Asia/Colombo',
      };
    }
    if (r.url.path.endsWith('/profile')) body = identity;
    if (r.url.path.endsWith('/schedule')) body = weeklySchedule;
    if (r.url.path.endsWith('/unavailability')) body = leaves;
    if (r.url.path.endsWith('/appointments')) {
      final filter = r.url.queryParameters['filter']!;
      filters.add(filter);
      body = filter == 'today'
          ? todayCount == 0
                ? []
                : [appointment(status: 'Completed', complete: false)]
          : filter == 'cancelled'
          ? [appointment(status: 'Cancelled', complete: false)]
          : [detail];
    }
    if (r.url.path.endsWith('/appointment-1')) body = detail;
    return http.Response(
      jsonEncode(body),
      200,
      request: r,
      headers: {'content-type': 'application/json'},
    );
  }
}

Widget homeScreen() => LawyerDashboardScreen(onToday: () {}, onChanged: () {});
Future<void> show(
  WidgetTester tester,
  Widget screen, {
  Size size = const Size(390, 844),
  double scale = 1,
}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  await tester.pumpWidget(
    MaterialApp(
      theme: AppTheme.lightTheme,
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(
          context,
        ).copyWith(textScaler: TextScaler.linear(scale)),
        child: child!,
      ),
      home: screen,
    ),
  );
  await tester.pumpAndSettle();
}

Widget page(Widget body) => LawyerPage(title: 'Lawyer Home', body: body);
Future<void> reveal(WidgetTester tester, Finder target, double distance) =>
    tester.scrollUntilVisible(
      target,
      distance,
      scrollable: find.byType(Scrollable).first,
    );
void main() {
  late Fixture data;
  late http.Client original;
  setUp(() async {
    dotenv.loadFromString(envString: 'BACKEND_URL=http://localhost:5000');
    SharedPreferences.setMockInitialValues({});
    original = ApiClient.client;
    data = Fixture();
    ApiClient.client = MockClient(data.call);
    AuthService.currentUser.value = null;
  });
  tearDown(() {
    ApiClient.client.close();
    ApiClient.client = original;
  });

  testWidgets('Home leads with Today and includes completed consultations', (
    tester,
  ) async {
    await show(tester, page(homeScreen()));
    expect(find.text('TODAY'), findsOneWidget);
    expect(find.text('1 appointment today'), findsOneWidget);
    expect(
      find.byWidgetPredicate((w) => w is StatusChip && w.status == 'Completed'),
      findsOneWidget,
    );
    expect(find.byType(AppointmentCard), findsNWidgets(2));
    expect(data.filters, ['today']);
  });
  testWidgets('Home counts are compact and use server summary values', (
    tester,
  ) async {
    await show(tester, page(homeScreen()));
    await reveal(tester, find.text('Upcoming  3'), 250);
    for (final text in ['Upcoming  3', 'Pending  1', 'Completed  18']) {
      expect(find.text(text), findsOneWidget);
    }
  });
  testWidgets(
    'Up Next uses the backend appointment rather than choosing from Today',
    (tester) async {
      await show(tester, page(homeScreen()));
      expect(
        find.byWidgetPredicate(
          (w) =>
              w is AppointmentCard && w.upNext && w.appointment.id == 'next-1',
        ),
        findsOneWidget,
      );
    },
  );
  testWidgets('Home has honest empty Today and no-next states', (tester) async {
    data.hasNext = false;
    data.todayCount = 0;
    await show(tester, page(homeScreen()));
    expect(find.text('No appointments today'), findsOneWidget);
    await reveal(tester, find.text('No upcoming appointment'), 200);
    expect(
      find.text('Your next scheduled consultation will appear here.'),
      findsOneWidget,
    );
  });
  testWidgets('horizontal filters request the selected server filter', (
    tester,
  ) async {
    await show(tester, page(LawyerAppointmentsScreen(onChanged: () {})));
    await tester.tap(find.text('Today'));
    await tester.pumpAndSettle();
    expect(data.filters, ['upcoming', 'today']);
    await tester.drag(
      find.byType(SingleChildScrollView).first,
      const Offset(-400, 0),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Cancelled'));
    await tester.pumpAndSettle();
    expect(data.filters.last, 'cancelled');
    expect(
      find.byWidgetPredicate(
        (w) =>
            w is ChoiceChip &&
            w.selected &&
            (w.label as Text).data == 'Cancelled',
      ),
      findsOneWidget,
    );
    expect(find.text('Cancelled'), findsNWidgets(2));
  });
  testWidgets('appointment card groups time status client service and date', (
    tester,
  ) async {
    await show(
      tester,
      page(
        AppointmentCard(
          appointment: LawyerAppointment.fromJson(appointment()),
          onTap: () {},
        ),
      ),
    );
    for (final text in [
      '09:00 – 09:30',
      'Confirmed',
      'Jeyam Perera',
      'Contract Review',
      '5 Oct 2030',
    ]) {
      expect(find.text(text), findsOneWidget);
    }
    expect(find.byType(StatusChip), findsOneWidget);
  });
  testWidgets(
    'appointment detail presents permitted requirement and server actions',
    (tester) async {
      await show(
        tester,
        const LawyerAppointmentDetailScreen(id: 'appointment-1'),
      );
      expect(find.text('Jeyam Perera'), findsOneWidget);
      expect(find.text('Date & Time'), findsOneWidget);
      await reveal(tester, find.text('Client Requirement'), 250);
      expect(
        find.text('Please review the terms of my commercial contract.'),
        findsOneWidget,
      );
      await reveal(tester, find.text('Mark Completed'), 200);
      expect(find.text('Confirm Appointment'), findsNothing);
    },
  );
  for (final state in [
    ('Requested', true, false),
    ('Rescheduled', true, false),
    ('Confirmed', false, true),
    ('Completed', false, false),
    ('Cancelled', false, false),
    ('Rejected', false, false),
  ]) {
    testWidgets(
      'appointment actions respect backend permissions for ${state.$1}',
      (tester) async {
        data.detail = appointment(
          status: state.$1,
          confirm: state.$2,
          complete: state.$3,
        );
        await show(
          tester,
          const LawyerAppointmentDetailScreen(id: 'appointment-1'),
        );
        await tester.drag(find.byType(ListView), const Offset(0, -700));
        await tester.pumpAndSettle();
        expect(
          find.text('Confirm Appointment'),
          state.$2 ? findsOneWidget : findsNothing,
        );
        expect(
          find.text('Mark Completed'),
          state.$3 ? findsOneWidget : findsNothing,
        );
        expect(find.text('Request Reschedule'), findsNothing);
      },
    );
  }
  testWidgets('weekly schedule exposes Working Off and appointment duration', (
    tester,
  ) async {
    await show(tester, page(LawyerScheduleScreen(onChanged: () {})));
    expect(find.byType(ScheduleDayRow), findsNWidgets(7));
    expect(find.text('Working'), findsNWidgets(5));
    await reveal(tester, find.text('Appointment duration · 30 min'), 250);
    expect(find.text('Off'), findsNWidgets(2));
    expect(find.text('Appointment duration · 30 min'), findsOneWidget);
  });
  testWidgets('leave cards show clean reasons multi-day and partial periods', (
    tester,
  ) async {
    await show(
      tester,
      page(
        ListView(
          children: [
            LeaveCard(
              leave: LawyerUnavailability.fromJson(annualLeave),
              onEdit: () {},
              onDelete: () {},
            ),
            LeaveCard(
              leave: LawyerUnavailability.fromJson(courtLeave),
              onEdit: () {},
              onDelete: () {},
            ),
          ],
        ),
      ),
    );
    expect(find.text('Annual Leave'), findsOneWidget);
    expect(find.text('3 DAYS'), findsOneWidget);
    expect(find.text('7 Oct 2030 – 9 Oct 2030'), findsOneWidget);
    expect(find.text('09:00 – 13:00'), findsOneWidget);
    expect(find.textContaining('Scheduling demo'), findsNothing);
  });
  test(
    'seed cleanup is narrowly scoped and does not erase real bracketed reasons',
    () {
      expect(
        cleanLawyerText('[Scheduling demo 0 2026-10-07] Annual Leave'),
        'Annual Leave',
      );
      expect(
        cleanLawyerText(
          '[Scheduling demo 2 2026-10-07] Development scheduling demonstration',
        ),
        '',
      );
      expect(
        cleanLawyerText('[Client requested] Court Appearance'),
        '[Client requested] Court Appearance',
      );
    },
  );
  testWidgets('full-day form uses End date and hides time fields', (
    tester,
  ) async {
    await show(
      tester,
      UnavailabilityEditor(leave: LawyerUnavailability.fromJson(annualLeave)),
    );
    expect(find.text('Start date'), findsOneWidget);
    expect(find.text('End date'), findsOneWidget);
    expect(find.text('Start time'), findsNothing);
    expect(find.text('End time'), findsNothing);
    expect(find.textContaining('inclusive'), findsNothing);
    expect(find.textContaining('Scheduling demo'), findsNothing);
    expect(
      tester.widget<TextField>(find.byType(TextField)).controller!.text,
      'Annual Leave',
    );
    expect(
      tester.widget<TextField>(find.byType(TextField)).maxLength,
      300 - schedulingMarkerLength(annualLeave['reason'] as String),
    );
  });
  testWidgets('partial leave form shows separate date and time fields', (
    tester,
  ) async {
    await show(
      tester,
      UnavailabilityEditor(leave: LawyerUnavailability.fromJson(courtLeave)),
    );
    for (final label in ['Start date', 'Start time', 'End date', 'End time']) {
      expect(find.text(label), findsOneWidget);
    }
    await tester.tap(find.byType(Switch));
    await tester.pumpAndSettle();
    expect(find.text('Start time'), findsNothing);
    expect(find.text('End time'), findsNothing);
    expect(find.textContaining('Full day · 18 Oct 2030'), findsOneWidget);
  });
  testWidgets(
    'full-day save keeps the exclusive backend end and internal legacy marker',
    (tester) async {
      await show(
        tester,
        UnavailabilityEditor(leave: LawyerUnavailability.fromJson(annualLeave)),
      );
      await reveal(tester, find.text('Save Unavailability'), 200);
      await tester.tap(find.text('Save Unavailability'));
      await tester.pumpAndSettle();
      final request = data.requests.singleWhere((r) => r.method == 'PUT');
      final body = jsonDecode(request.body);
      expect(body['startDateTime'], '2030-10-07T00:00:00.000');
      expect(body['endDateTime'], '2030-10-10T00:00:00.000');
      expect(body['reason'], annualLeave['reason']);
      expect(body['isFullDay'], true);
    },
  );
  testWidgets(
    'profile shows identity initials status and professional information',
    (tester) async {
      await show(tester, page(const LawyerProfileScreen()));
      for (final text in [
        'NP',
        'Nimal Perera',
        'Corporate & Commercial Law',
        'Active',
        'LL.B, Attorney-at-Law',
        '3 years experience',
        'ILS/LAW/0001',
      ]) {
        expect(find.text(text), findsOneWidget);
      }
      expect(find.byType(StatusChip), findsOneWidget);
      await reveal(tester, find.text('ACCOUNT'), 250);
      expect(find.text('Edit Profile'), findsOneWidget);
      expect(find.text('Change Password'), findsOneWidget);
    },
  );
  testWidgets(
    'profile editor exposes only phone and description and preserves payload',
    (tester) async {
      await show(
        tester,
        EditLawyerProfile(profile: LawyerProfile.fromJson(identity)),
      );
      expect(find.byType(TextField), findsNWidgets(2));
      expect(find.text('Full Name'), findsNothing);
      expect(find.text('Practice Area'), findsNothing);
      await tester.enterText(find.byType(TextField).first, '0779999999');
      await tester.enterText(
        find.byType(TextField).last,
        'Reviewed professional description.',
      );
      await reveal(tester, find.text('Save Changes'), 200);
      await tester.tap(find.text('Save Changes'));
      await tester.pumpAndSettle();
      final body = jsonDecode(
        data.requests.singleWhere((r) => r.method == 'PUT').body,
      );
      expect(body, {
        'phoneNumber': '0779999999',
        'profileDescription': 'Reviewed professional description.',
      });
    },
  );
  testWidgets(
    'empty completed list and leave use meaningful shared empty states',
    (tester) async {
      data.todayCount = 0;
      data.leaves = [];
      ApiClient.client = MockClient(
        (r) async => r.url.path.endsWith('/appointments')
            ? http.Response('[]', 200)
            : data.call(r),
      );
      await show(
        tester,
        page(
          LawyerAppointmentsScreen(
            initialFilter: 'completed',
            onChanged: () {},
          ),
        ),
      );
      expect(find.text('No completed appointments yet'), findsOneWidget);
      await show(tester, page(LawyerScheduleScreen(onChanged: () {})));
      await reveal(tester, find.text('No upcoming leave'), 300);
      expect(
        find.text('Add leave when you will be unavailable for appointments.'),
        findsOneWidget,
      );
    },
  );
  testWidgets('native loading remains visible until real request completion', (
    tester,
  ) async {
    final pending = Completer<String>();
    await tester.pumpWidget(
      MaterialApp(
        home: page(
          ServerPanel<String>(
            load: () => pending.future,
            content: (value, _) => ListView(children: [Text(value)]),
          ),
        ),
      ),
    );
    await tester.pump();
    expect(find.text('Loading…'), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    pending.complete('Loaded');
    await tester.pumpAndSettle();
    expect(find.text('Loaded'), findsOneWidget);
    expect(find.text('Loading…'), findsNothing);
  });
  testWidgets(
    'schedule editing hides nonworking times and supports existing duration',
    (tester) async {
      await show(
        tester,
        ScheduleEditor(schedule: LawyerSchedule.fromJson(weeklySchedule)),
      );
      await tester.tap(find.byType(Switch).first);
      await tester.pumpAndSettle();
      expect(find.text('Start Time · 09:00'), findsNWidgets(4));
      await reveal(tester, find.byType(DropdownMenu<int>), 350);
      expect(
        tester
            .widget<DropdownMenu<int>>(find.byType(DropdownMenu<int>))
            .controller!
            .text,
        '30',
      );
    },
  );
  testWidgets(
    'four-tab navigation remains consistent and no extra tabs are introduced',
    (tester) async {
      await show(tester, const LawyerNavigationScreen());
      expect(find.byType(NavigationDestination), findsNWidgets(4));
      await tester.tap(find.text('Appointments').last);
      await tester.pumpAndSettle();
      expect(find.byType(LawyerAppointmentsScreen), findsOneWidget);
      await tester.tap(find.text('Schedule').last);
      await tester.pumpAndSettle();
      expect(find.byType(LawyerScheduleScreen), findsOneWidget);
      await tester.tap(find.text('Profile').last);
      await tester.pumpAndSettle();
      expect(find.byType(LawyerProfileScreen), findsOneWidget);
      expect(find.byIcon(Icons.refresh), findsNothing);
    },
  );
  testWidgets(
    'all screens avoid overflow at narrow large-text phone and tablet widths',
    (tester) async {
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final screens = <Widget>[
        const LawyerNavigationScreen(),
        page(LawyerAppointmentsScreen(onChanged: () {})),
        const LawyerAppointmentDetailScreen(id: 'appointment-1'),
        page(LawyerScheduleScreen(onChanged: () {})),
        ScheduleEditor(schedule: LawyerSchedule.fromJson(weeklySchedule)),
        const UnavailabilityEditor(),
        UnavailabilityEditor(leave: LawyerUnavailability.fromJson(courtLeave)),
        page(const LawyerProfileScreen()),
        EditLawyerProfile(profile: LawyerProfile.fromJson(identity)),
        const ChangePasswordScreen(),
      ];
      for (final width in [320.0, 360.0, 390.0, 430.0, 800.0]) {
        for (final scale in [1.0, 1.6]) {
          for (final screen in screens) {
            await show(tester, screen, size: Size(width, 900), scale: scale);
            expect(
              tester.takeException(),
              isNull,
              reason: '${screen.runtimeType}: width $width / text $scale',
            );
            final scrolls = find.byType(ListView);
            if (scrolls.evaluate().isNotEmpty) {
              await tester.drag(scrolls.first, const Offset(0, -900));
              await tester.pumpAndSettle();
              expect(
                tester.takeException(),
                isNull,
                reason: '${screen.runtimeType} scrolled: $width / $scale',
              );
            }
            await tester.pumpWidget(const SizedBox());
            await tester.pumpAndSettle();
          }
        }
      }
    },
  );
}
