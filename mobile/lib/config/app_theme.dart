import 'package:flutter/material.dart';

class AppTheme {
  // Brand colors matching website design system
  static const Color primaryNavy = Color(0xFF0F172A); // navy-900
  static const Color navy950 = Color(0xFF090D18);
  static const Color navy900 = Color(0xFF0F172A);
  static const Color navy800 = Color(0xFF1E293B);
  static const Color navy700 = Color(0xFF16213A);
  static const Color navy400 = Color(0xFF3D4E6B);
  static const Color navy100 = Color(0xFFE3E9F1);
  static const Color navy50 = Color(0xFFF1F4F9);

  // Legal Gold palette
  static const Color gold = Color(0xFFD4AF37);
  static const Color goldLight = Color(0xFFE8C766);
  static const Color goldDark = Color(0xFFA9862A);
  static const Color secondaryAmber = Color(0xFFD4AF37); // Aliased to gold for compatibility

  // Paper neutral canvas
  static const Color paperBackground = Color(0xFFF8F7F4);
  static const Color slateLight = Color(0xFFF8F7F4); // Aliased to paper
  static const Color slateDark = Color(0xFF1E293B);
  static const Color borderSubtle = Color(0xFFE2E8F0);
  static const Color textMuted = Color(0xFF475569);

  // Status colors
  static const Color statusPending = Color(0xFFD97706);
  static const Color statusUnderReview = Color(0xFF2563EB);
  static const Color statusAssigned = Color(0xFF4F46E5);
  static const Color statusInProgress = Color(0xFF7C3AED);
  static const Color statusRequiresDocs = Color(0xFFDC2626);
  static const Color statusCompleted = Color(0xFF059669);
  static const Color statusRejected = Color(0xFF64748B);

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: paperBackground,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primaryNavy,
        primary: primaryNavy,
        secondary: gold,
        surface: Colors.white,
      ),
      fontFamily: 'Roboto',
      appBarTheme: const AppBarTheme(
        backgroundColor: primaryNavy,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.bold,
          color: Colors.white,
          letterSpacing: -0.2,
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0xFFE3E9F1)),
        ),
        color: Colors.white,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: gold,
          foregroundColor: primaryNavy,
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
          textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: Colors.white,
        indicatorColor: gold.withValues(alpha: 0.22),
        surfaceTintColor: Colors.transparent,
        elevation: 4,
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: primaryNavy);
          }
          return const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: textMuted);
        }),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: borderSubtle),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: borderSubtle),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: gold, width: 1.5),
        ),
      ),
    );
  }

  static Color getStatusColor(String status) {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return statusCompleted;
      case 'IN_PROGRESS':
        return statusInProgress;
      case 'ASSIGNED':
        return statusAssigned;
      case 'UNDER_REVIEW':
        return statusUnderReview;
      case 'REQUIRES_DOCUMENTS':
        return statusRequiresDocs;
      case 'REJECTED':
      case 'CANCELLED':
        return statusRejected;
      case 'PENDING':
      default:
        return statusPending;
    }
  }
}
