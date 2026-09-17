import 'package:flutter/material.dart';
import '../config/app_theme.dart';
import '../services/auth_service.dart';
import '../widgets/server_settings_dialog.dart';
import 'auth/login_screen.dart';
import 'services/services_catalog_screen.dart';
import 'chat/ai_chat_screen.dart';
import 'requests/my_requests_screen.dart';
import 'careers/careers_screen.dart';

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _selectedIndex = 0;

  final List<Widget> _screens = [
    const ServicesCatalogScreen(),
    const AiChatScreen(),
    const MyRequestsScreen(),
    const CareersScreen(),
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
                  radius: 24,
                  child: Text(
                    user.fullName.isNotEmpty ? user.fullName[0].toUpperCase() : 'U',
                    style: const TextStyle(color: AppTheme.secondaryAmber, fontWeight: FontWeight.bold, fontSize: 18),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(user.fullName, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      Text(user.email, style: const TextStyle(fontSize: 13, color: AppTheme.textMuted)),
                      Text('Role: ${user.userType}', style: const TextStyle(fontSize: 11, color: AppTheme.secondaryAmber, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
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
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppTheme.primaryNavy.withValues(alpha: 0.9),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: AppTheme.secondaryAmber.withValues(alpha: 0.5)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.account_circle, size: 16, color: AppTheme.secondaryAmber),
                              const SizedBox(width: 4),
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
                          foregroundColor: Colors.white,
                          backgroundColor: AppTheme.primaryNavy.withValues(alpha: 0.9),
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        ),
                        icon: const Icon(Icons.login, size: 14, color: AppTheme.secondaryAmber),
                        label: const Text('Sign In', style: TextStyle(fontSize: 11)),
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
        indicatorColor: AppTheme.secondaryAmber.withValues(alpha: 0.2),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.gavel_outlined),
            selectedIcon: Icon(Icons.gavel, color: AppTheme.primaryNavy),
            label: 'Services',
          ),
          NavigationDestination(
            icon: Icon(Icons.auto_awesome_outlined),
            selectedIcon: Icon(Icons.auto_awesome, color: AppTheme.secondaryAmber),
            label: 'AI Assistant',
          ),
          NavigationDestination(
            icon: Icon(Icons.assignment_outlined),
            selectedIcon: Icon(Icons.assignment, color: AppTheme.primaryNavy),
            label: 'My Requests',
          ),
          NavigationDestination(
            icon: Icon(Icons.work_outline),
            selectedIcon: Icon(Icons.work, color: AppTheme.primaryNavy),
            label: 'Careers',
          ),
        ],
      ),
    );
  }
}
