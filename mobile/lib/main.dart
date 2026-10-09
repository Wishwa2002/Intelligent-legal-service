import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'config/api_config.dart';
import 'package:flutter/material.dart';
import 'auth/auth.dart';
import 'config/app_theme.dart';
import 'auth/session_router.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Load environment variables
  try {
    await dotenv.load(fileName: "assets/.env");
  } catch (_) {
    try {
      await dotenv.load(fileName: ".env");
    } catch (_) {}
  }

  // Initialize API configuration
  await ApiConfig.initialize();

  // Initialize authentication
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
      routes: {
        '/home': (context) => const SessionRouter(),
        '/login': (context) => const LoginScreen(),
      },
      home: const SessionRouter(),
    );
  }
}
