import 'package:flutter/material.dart';
import '../config/app_theme.dart';
import '../services/auth_service.dart';
import '../widgets/server_settings_dialog.dart';
import 'auth/login_screen.dart';
import 'services/services_catalog_screen.dart';
import 'chat/common_ai_screen.dart';
import 'requests/my_requests_screen.dart';
import 'appointments/my_appointments_screen.dart';
import 'appointments/lawyers_screen.dart';
import 'appointments/lawyer_schedule_screen.dart';

import 'home/project_hub_screen.dart';

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _selectedIndex = 0;

  late final List<Widget> _screens = [
    ProjectHubScreen(onSwitchTab: (idx) => setState(() => _selectedIndex = idx)),
    const CommonAiScreen(),
    const ServicesCatalogScreen(),
    const LawyersScreen(),
    const MyRequestsScreen(),
  ];

  void _showUserAccountModal() {
    final user = AuthService.currentUser.value;
    if (user == null) {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => const LoginScreen()),
      );
      return;
    }

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: AppTheme.primaryNavy,
                  radius: 26,
                  child: Text(
                    user.fullName.isNotEmpty ? user.fullName[0].toUpperCase() : 'U',
                    style: const TextStyle(color: AppTheme.gold, fontWeight: FontWeight.bold, fontSize: 20),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(user.fullName, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.primaryNavy)),
                      Text(user.email, style: const TextStyle(fontSize: 13, color: AppTheme.textMuted)),
                      const SizedBox(height: 2),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppTheme.gold.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          user.userType.toUpperCase(),
                          style: const TextStyle(fontSize: 10, color: AppTheme.goldDark, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.calendar_month, color: AppTheme.primaryNavy),
              title: const Text('My Consultations & Appointments', style: TextStyle(fontWeight: FontWeight.w600)),
              onTap: () {
                Navigator.pop(ctx);
                Navigator.push(context, MaterialPageRoute(builder: (_) => const MyAppointmentsScreen()));
              },
            ),
            ListTile(
              leading: const Icon(Icons.people_outline, color: AppTheme.primaryNavy),
              title: const Text('Browse Lawyers & Book Slot'),
              onTap: () {
                Navigator.pop(ctx);
                Navigator.push(context, MaterialPageRoute(builder: (_) => const LawyersScreen()));
              },
            ),
            if (user.userType.toLowerCase() == 'lawyer' ||
                user.userType.toLowerCase() == 'admin' ||
                user.userType.toLowerCase() == 'clerk')
              ListTile(
                leading: const Icon(Icons.gavel, color: Color(0xFFD97706)),
                title: const Text('Counsel Consultations Schedule', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF92400E))),
                onTap: () {
                  Navigator.pop(ctx);
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const LawyerScheduleScreen()));
                },
              ),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.settings_input_antenna, color: AppTheme.primaryNavy),
              title: const Text('Backend & AI Endpoints'),
              onTap: () {
                Navigator.pop(ctx);
                showServerSettingsDialog(context);
              },
            ),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.logout, color: Color(0xFFDC2626)),
              title: const Text('Sign Out', style: TextStyle(color: Color(0xFFDC2626), fontWeight: FontWeight.bold)),
              onTap: () async {
                Navigator.pop(ctx);
                final scaffold = ScaffoldMessenger.of(context);
                await AuthService.logout();
                if (!mounted) return;
                setState(() {});
                scaffold.showSnackBar(
                  const SnackBar(content: Text('Signed out.')),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          _screens[_selectedIndex],
          // Floating profile pill top-right if on non-appbar or overlay
          Positioned(
            top: MediaQuery.of(context).padding.top + 8,
            right: 8,
            child: ValueListenableBuilder(
              valueListenable: AuthService.currentUser,
              builder: (ctx, user, _) {
                return user != null
                    ? GestureDetector(
                        onTap: _showUserAccountModal,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                          decoration: BoxDecoration(
                            color: AppTheme.primaryNavy,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: AppTheme.gold.withValues(alpha: 0.6)),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.15),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.account_circle, size: 16, color: AppTheme.gold),
                              const SizedBox(width: 5),
                              Text(
                                user.fullName.split(' ').first,
                                style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        ),
                      )
                    : TextButton.icon(
                        style: TextButton.styleFrom(
                          foregroundColor: AppTheme.primaryNavy,
                          backgroundColor: AppTheme.gold,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                        ),
                        icon: const Icon(Icons.login, size: 14, color: AppTheme.primaryNavy),
                        label: const Text('Sign In', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const LoginScreen()),
                          );
                        },
                      );
              },
            ),
          ),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (idx) => setState(() => _selectedIndex = idx),
        indicatorColor: AppTheme.gold.withValues(alpha: 0.22),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard_rounded, color: AppTheme.primaryNavy),
            label: 'Hub',
          ),
          NavigationDestination(
            icon: Icon(Icons.auto_awesome_outlined),
            selectedIcon: Icon(Icons.auto_awesome, color: AppTheme.secondaryAmber),
            label: 'AI Agent',
          ),
          NavigationDestination(
            icon: Icon(Icons.description_outlined),
            selectedIcon: Icon(Icons.description_rounded, color: AppTheme.goldDark),
            label: 'Documents',
          ),
          NavigationDestination(
            icon: Icon(Icons.balance_outlined),
            selectedIcon: Icon(Icons.balance_rounded, color: AppTheme.primaryNavy),
            label: 'Lawyers',
          ),
          NavigationDestination(
            icon: Icon(Icons.assignment_outlined),
            selectedIcon: Icon(Icons.assignment_rounded, color: AppTheme.primaryNavy),
            label: 'Requests',
          ),
        ],
      ),
    );
  }
}
