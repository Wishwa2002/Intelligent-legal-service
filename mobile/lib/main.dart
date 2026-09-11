import 'package:flutter/material.dart';
import 'auth/auth.dart';
import 'config/api_config.dart';
import 'config/app_theme.dart';
import 'screens/main_navigation_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ApiConfig.initialize();
  await AuthService.initialize();
  runApp(const LegalServiceApp());
}

class LegalServiceApp extends StatelessWidget {
  const LegalServiceApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'LegalEase Mobile',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: ValueListenableBuilder(
        valueListenable: AuthService.currentUser,
        builder: (ctx, user, _) {
          if (user != null) {
            return const MainNavigationScreen();
          }
          return const LoginScreen();
        },
      ),
    );
  }
}
