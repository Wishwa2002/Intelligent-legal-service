import 'package:flutter/material.dart';

class AppTheme {
  static const Color primaryNavy = Color(0xFF0F172A);
  static const Color secondaryAmber = Color(0xFFF59E0B);
  static const Color slateDark = Color(0xFF1E293B);
  static const Color slateLight = Color(0xFFF8FAFC);
  static const Color borderSubtle = Color(0xFFE2E8F0);
  static const Color textMuted = Color(0xFF64748B);

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
      scaffoldBackgroundColor: slateLight,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primaryNavy,
        primary: primaryNavy,
        secondary: secondaryAmber,
        surface: Colors.white,
      ),
      fontFamily: 'Roboto',
      appBarTheme: const AppBarTheme(
        backgroundColor: primaryNavy,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: borderSubtle),
        ),
        color: Colors.white,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryNavy,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          textStyle: const TextStyle(fontWeight: FontWeight.bold),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: borderSubtle),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: borderSubtle),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: secondaryAmber, width: 1.5),
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
