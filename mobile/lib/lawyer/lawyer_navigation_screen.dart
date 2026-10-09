import 'package:flutter/material.dart';
import 'widgets.dart';
import 'dashboard/lawyer_dashboard_screen.dart';
import 'appointments/lawyer_appointments_screen.dart';
import 'schedule/lawyer_schedule_screen.dart';
import 'profile/lawyer_profile_screen.dart';

class LawyerNavigationScreen extends StatefulWidget {
  const LawyerNavigationScreen({super.key});
  @override
  State<LawyerNavigationScreen> createState() => _LawyerNavigationScreenState();
}

class _LawyerNavigationScreenState extends State<LawyerNavigationScreen>
    with WidgetsBindingObserver {
  int tab = 0, revision = 0;
  String filter = 'upcoming';
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) refresh();
  }

  void refresh() {
    if (mounted) setState(() => revision++);
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      LawyerDashboardScreen(
        onToday: () => setState(() {
          tab = 1;
          filter = 'today';
          revision++;
        }),
        onChanged: refresh,
      ),
      LawyerAppointmentsScreen(initialFilter: filter, onChanged: refresh),
      LawyerScheduleScreen(onChanged: refresh),
      const LawyerProfileScreen(),
    ];
    return LawyerPage(
      title: [
        'Lawyer Home',
        'My Appointments',
        'My Schedule',
        'My Profile',
      ][tab],
      actions: tab == 0 || tab == 2
          ? [
              IconButton(
                onPressed: refresh,
                tooltip: 'Refresh',
                icon: const Icon(Icons.refresh),
              ),
            ]
          : null,
      body: KeyedSubtree(key: ValueKey('$tab-$revision'), child: pages[tab]),
      bottomNavigationBar: NavigationBar(
        selectedIndex: tab,
        onDestinationSelected: (index) => setState(() {
          tab = index;
          revision++;
        }),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), label: 'Home'),
          NavigationDestination(
            icon: Icon(Icons.event_outlined),
            label: 'Appointments',
          ),
          NavigationDestination(
            icon: Icon(Icons.calendar_month_outlined),
            label: 'Schedule',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
