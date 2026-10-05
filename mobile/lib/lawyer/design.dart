import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

/// Small, lawyer-only presentation palette. Customer styling remains unchanged.
abstract final class LawyerDesign {
  static const navy = Color(0xFF0F192D);
  static const cream = Color(0xFFF6EDD2);
  static const orange = Color(0xFFBF7300);
  static const text = Color(0xFF182236);
  static const muted = Color(0xFF596577);
  static const surface = Colors.white;
  static const background = Color(0xFFF8F7F3);
  static const border = Color(0xFFDDDDE0);
  static const success = Color(0xFF286149);
  static const warning = Color(0xFF815A13);
  static const error = Color(0xFF9D3535);
  static const radius = 12.0;
  static const pagePadding = EdgeInsets.all(16);
  static const sectionGap = 24.0;

  static ThemeData theme(ThemeData base) => base.copyWith(
    scaffoldBackgroundColor: background,
    colorScheme: base.colorScheme.copyWith(
      primary: navy,
      onPrimary: Colors.white,
      secondary: cream,
      onSecondary: text,
      surface: surface,
      onSurface: text,
      error: error,
    ),
    textTheme: base.textTheme
        .apply(bodyColor: text, displayColor: text)
        .copyWith(
          headlineSmall: base.textTheme.headlineSmall?.copyWith(
            fontSize: 24,
            fontWeight: FontWeight.w700,
            color: text,
          ),
          titleLarge: base.textTheme.titleLarge?.copyWith(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: text,
          ),
          titleMedium: base.textTheme.titleMedium?.copyWith(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: text,
          ),
          bodyMedium: base.textTheme.bodyMedium?.copyWith(
            fontSize: 14,
            color: text,
            height: 1.4,
          ),
          bodySmall: base.textTheme.bodySmall?.copyWith(
            fontSize: 12,
            color: muted,
            height: 1.4,
          ),
        ),
    appBarTheme: const AppBarTheme(
      backgroundColor: navy,
      foregroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      toolbarHeight: 64,
      titleTextStyle: TextStyle(
        fontSize: 22,
        fontWeight: FontWeight.w700,
        color: Colors.white,
      ),
    ),
    cardTheme: CardThemeData(
      color: surface,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(radius),
        side: const BorderSide(color: border),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: navy,
        foregroundColor: Colors.white,
        minimumSize: const Size(48, 48),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: navy,
        minimumSize: const Size(48, 48),
        side: const BorderSide(color: border),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: navy,
        minimumSize: const Size(48, 48),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      ),
    ),
    chipTheme: base.chipTheme.copyWith(
      backgroundColor: surface,
      selectedColor: cream,
      checkmarkColor: navy,
      side: const BorderSide(color: border),
      labelStyle: const TextStyle(fontSize: 14, color: text),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: surface,
      elevation: 0,
      surfaceTintColor: Colors.transparent,
      indicatorColor: cream,
      iconTheme: const WidgetStatePropertyAll(
        IconThemeData(size: 24, color: navy),
      ),
      labelTextStyle: WidgetStateProperty.resolveWith(
        (states) => TextStyle(
          fontSize: 12,
          color: states.contains(WidgetState.selected) ? navy : muted,
          fontWeight: states.contains(WidgetState.selected)
              ? FontWeight.w700
              : FontWeight.w500,
        ),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: border),
      ),
    ),
  );
}

// Only strip the known development seed marker, never arbitrary bracketed text.
final _schedulingMarker = RegExp(
  r'^\[Scheduling demo \d+ \d{4}-\d{2}-\d{2}\]\s*',
);
String cleanLawyerText(String value) {
  final cleaned = value.replaceFirst(_schedulingMarker, '').trim();
  return _schedulingMarker.hasMatch(value) &&
          cleaned == 'Development scheduling demonstration'
      ? ''
      : cleaned;
}

int schedulingMarkerLength(String original) =>
    _schedulingMarker.firstMatch(original)?.group(0)?.length ?? 0;
String preserveSchedulingMarker(String original, String edited) =>
    '${_schedulingMarker.firstMatch(original)?.group(0) ?? ''}${edited.trim()}';
const weekdayNames = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
String shortTime(String time) => time.length >= 5 ? time.substring(0, 5) : time;
String appointmentDate(String date) =>
    DateFormat('d MMM yyyy').format(DateTime.parse(date));
DateTime officeNow() =>
    DateTime.now().toUtc().add(const Duration(hours: 5, minutes: 30));
String relativeAppointmentDate(String date) {
  final value = DateTime.parse(date), now = officeNow();
  final days = DateTime(
    value.year,
    value.month,
    value.day,
  ).difference(DateTime(now.year, now.month, now.day)).inDays;
  return days == 0
      ? 'Today'
      : days == 1
      ? 'Tomorrow'
      : appointmentDate(date);
}
