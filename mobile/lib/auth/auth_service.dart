import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_client.dart';
import 'user_model.dart';

class AuthService {
  static const String _userKey = 'current_user_data';
  static final ValueNotifier<UserModel?> currentUser = ValueNotifier<UserModel?>(null);

  static bool get isAuthenticated => currentUser.value != null;

  static Future<void> init() async {
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

  static Future<void> initialize() => init();

  static Future<UserModel> login({
    required String email,
    required String password,
  }) async {
    final response = await ApiClient.post(
      '/api/auth/login',
      {
        'email': email.trim(),
        'password': password,
      },
    );

    final data = response is Map<String, dynamic> ? response : <String, dynamic>{};
    final user = UserModel.fromJson(data);

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
    String role = 'User',
  }) async {
    final response = await ApiClient.post(
      '/api/auth/register',
      {
        'fullName': fullName.trim(),
        'email': email.trim(),
        'password': password,
        'role': role,
      },
    );

    final data = response is Map<String, dynamic> ? response : <String, dynamic>{};
    return UserModel(
      userId: (data['userId'] ?? data['id'] ?? '').toString(),
      fullName: fullName,
      email: email,
      role: (data['role'] ?? role).toString(),
      token: data['token']?.toString(),
    );
  }

  static Future<void> logout() async {
    await ApiClient.clearToken();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_userKey);
    currentUser.value = null;
  }
}
