import 'package:flutter/material.dart';
import 'auth_service.dart';
import 'login_screen.dart';
import '../screens/main_navigation_screen.dart';
import '../lawyer/lawyer_navigation_screen.dart';
import '../lawyer/profile/change_password_screen.dart';

// A single role gate handles fresh login and restored sessions.
class SessionRouter extends StatefulWidget {
  const SessionRouter({super.key});
  @override
  State<SessionRouter> createState() => _SessionRouterState();
}

class _SessionRouterState extends State<SessionRouter> {
  @override
  void initState() {
    super.initState();
    AuthService.currentUser.addListener(_changed);
  }

  void _changed() {
    final user = AuthService.currentUser.value;
    if (user == null || user.mustChangePassword) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) Navigator.of(context).popUntil((r) => r.isFirst);
      });
    }
  }

  @override
  void dispose() {
    AuthService.currentUser.removeListener(_changed);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ValueListenableBuilder(
    valueListenable: AuthService.currentUser,
    builder: (context, user, _) {
      if (user == null) return const LoginScreen();
      if (user.role.toLowerCase() == 'customer') {
        return const MainNavigationScreen();
      }
      if (user.role.toLowerCase() == 'lawyer') {
        if (user.mustChangePassword) {
          return const ChangePasswordScreen(requiredChange: true);
        }
        return const LawyerNavigationScreen();
      }
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Use the web portal for this account.'),
              TextButton(
                onPressed: AuthService.logout,
                child: const Text('Sign out'),
              ),
            ],
          ),
        ),
      );
    },
  );
}
