import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_client.dart';
import 'user_model.dart';

class AuthService {
  static const String _userKey = 'current_user_data';
  static final ValueNotifier<UserModel?> currentUser =
      ValueNotifier<UserModel?>(null);

  static bool get isAuthenticated => currentUser.value != null;

  static Future<void> init() async {
    ApiClient.onSessionExpired = logout;
    try {
      final prefs = await SharedPreferences.getInstance();
      final userJson = prefs.getString(_userKey);
      if (userJson != null && userJson.isNotEmpty) {
        final data = jsonDecode(userJson) as Map<String, dynamic>;
        currentUser.value = UserModel.fromJson(data);
      }
    } catch (e) {
      debugPrint('AuthService.init warning: $e');
    }
  }

  static bool supportsRole(String role) =>
      ['customer', 'lawyer'].contains(role.toLowerCase());

  static Future<void> passwordChanged() async {
    final user = currentUser.value;
    if (user == null) return;
    final updated = UserModel.fromJson({
      ...user.toJson(),
      'mustChangePassword': false,
    });
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userKey, jsonEncode(updated.toJson()));
    currentUser.value = updated;
  }

  static Future<void> requirePasswordChange() async {
    final user = currentUser.value;
    if (user == null) return;
    final updated = UserModel.fromJson({
      ...user.toJson(),
      'mustChangePassword': true,
    });
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userKey, jsonEncode(updated.toJson()));
    currentUser.value = updated;
  }

  static Future<void> initialize() => init();

  static Future<UserModel> login({
    required String email,
    required String password,
  }) async {
    final response = await ApiClient.post('/api/auth/login', {
      'email': email.trim(),
      'password': password,
    });

    final data = response is Map<String, dynamic>
        ? response
        : <String, dynamic>{};
    final user = UserModel.fromJson(data);

    if (!supportsRole(user.role)) {
      throw Exception(
        "This mobile application supports Customer and Lawyer accounts. Use the web portal for other roles.",
      );
    }
    if (user.token != null && user.token!.isNotEmpty) {
      await ApiClient.saveToken(user.token!);
    }

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userKey, jsonEncode(user.toJson()));

    currentUser.value = user;
    return user;
  }

  static Future<UserModel> register({
    required String fullName,
    required String email,
    required String password,
  }) async {
    final response = await ApiClient.post('/api/auth/signup', {
      'fullName': fullName.trim(),
      'email': email.trim(),
      'password': password,
      'role': 'Customer',
    });

    final data = response is Map<String, dynamic>
        ? response
        : <String, dynamic>{};
    return UserModel(
      userId: (data['userId'] ?? data['id'] ?? '').toString(),
      fullName: fullName,
      email: email,
      role: (data['role'] ?? 'Customer').toString(),
      token: data['token']?.toString(),
    );
  }

  static Future<void> logout() async {
    await ApiClient.clearToken();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_userKey);
    currentUser.value = null;
    debugPrint("LOGOUT DONE - currentUser: ${currentUser.value}");
  }
}
