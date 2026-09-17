import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';

class ApiClient {
  static const String _tokenKey = 'auth_token';
  static const Duration requestTimeout = Duration(seconds: 60);

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  static Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
  }

  static Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
  }

  static Future<Map<String, String>> _getHeaders({bool isJson = true}) async {
    final headers = <String, String>{};
    if (isJson) {
      headers['Content-Type'] = 'application/json';
    }
    final token = await getToken();
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  static Future<dynamic> get(
    String endpoint, {
    Map<String, String>? queryParams,
    String? customBaseUrl,
    Duration? timeout,
  }) async {
    final baseUrl = customBaseUrl ?? ApiConfig.backendUrl.value;
    var uri = Uri.parse('$baseUrl$endpoint');
    if (queryParams != null && queryParams.isNotEmpty) {
      uri = uri.replace(queryParameters: queryParams);
    }

    try {
      final headers = await _getHeaders();
      final response = await http.get(uri, headers: headers).timeout(timeout ?? requestTimeout);
      return _handleResponse(response);
    } on TimeoutException {
      if (customBaseUrl == null) {
        final failover = _getFailoverUrl(baseUrl);
        if (failover != null) {
          try {
            final res = await get(endpoint, queryParams: queryParams, customBaseUrl: failover, timeout: const Duration(seconds: 5));
            _applyFailoverSuccess(failover);
            return res;
          } catch (_) {}
        }
      }
      throw ApiException(
        'Connection timed out reaching $baseUrl. Please verify the server is running.',
        408,
      );
    } on SocketException catch (e) {
      if (customBaseUrl == null) {
        final failover = _getFailoverUrl(baseUrl);
        if (failover != null) {
          try {
            final res = await get(endpoint, queryParams: queryParams, customBaseUrl: failover, timeout: const Duration(seconds: 5));
            _applyFailoverSuccess(failover);
            return res;
          } catch (_) {}
        }
      }
      throw ApiException(
        'Cannot connect to server at $baseUrl (${e.message}). Check server status and USB/Wi-Fi.',
        503,
      );
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Network error: $e', 500);
    }
  }

  static Future<dynamic> post(
    String endpoint,
    dynamic body, {
    Map<String, String>? queryParams,
    String? customBaseUrl,
    Duration? timeout,
  }) async {
    final baseUrl = customBaseUrl ?? ApiConfig.backendUrl.value;
    var uri = Uri.parse('$baseUrl$endpoint');
    if (queryParams != null && queryParams.isNotEmpty) {
      uri = uri.replace(queryParameters: queryParams);
    }

    try {
      final headers = await _getHeaders();
      final response = await http
          .post(
            uri,
            headers: headers,
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(timeout ?? requestTimeout);
      return _handleResponse(response);
    } on TimeoutException {
      if (customBaseUrl == null) {
        final failover = _getFailoverUrl(baseUrl);
        if (failover != null) {
          try {
            final res = await post(endpoint, body, queryParams: queryParams, customBaseUrl: failover, timeout: const Duration(seconds: 5));
            _applyFailoverSuccess(failover);
            return res;
          } catch (_) {}
        }
      }
      throw ApiException(
        'Connection timed out reaching $baseUrl. Please verify the server is running.',
        408,
      );
    } on SocketException catch (e) {
      if (customBaseUrl == null) {
        final failover = _getFailoverUrl(baseUrl);
        if (failover != null) {
          try {
            final res = await post(endpoint, body, queryParams: queryParams, customBaseUrl: failover, timeout: const Duration(seconds: 5));
            _applyFailoverSuccess(failover);
            return res;
          } catch (_) {}
        }
      }
      throw ApiException(
        'Cannot connect to server at $baseUrl (${e.message}). Check server status and USB/Wi-Fi.',
        503,
      );
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Network error: $e', 500);
    }
  }

  static String? _getFailoverUrl(String currentUrl) {
    if (currentUrl.contains('localhost')) {
      return currentUrl.replaceAll('localhost', '10.78.57.23');
    }
    if (currentUrl.contains('10.78.57.23')) {
      return currentUrl.replaceAll('10.78.57.23', 'localhost');
    }
    return null;
  }

  static void _applyFailoverSuccess(String failoverUrl) {
    if (failoverUrl.contains('10.78.57.23')) {
      ApiConfig.setBackendUrl(ApiConfig.lanBackendUrl);
      ApiConfig.setAiServiceUrl(ApiConfig.lanAiUrl);
    } else if (failoverUrl.contains('localhost')) {
      ApiConfig.setBackendUrl(ApiConfig.defaultBackendUrl);
      ApiConfig.setAiServiceUrl(ApiConfig.defaultAiUrl);
    }
  }

  static Future<dynamic> uploadFile(
    String endpoint, {
    required String fileFieldName,
    required String fileName,
    List<int>? fileBytes,
    String? filePath,
    Map<String, String>? fields,
    String? customBaseUrl,
  }) async {
    final baseUrl = customBaseUrl ?? ApiConfig.backendUrl.value;
    final uri = Uri.parse('$baseUrl$endpoint');

    try {
      final request = http.MultipartRequest('POST', uri);
      final token = await getToken();
      if (token != null && token.isNotEmpty) {
        request.headers['Authorization'] = 'Bearer $token';
      }

      if (fields != null) {
        request.fields.addAll(fields);
      }

      MediaType? mediaType;
      final ext = fileName.split('.').last.toLowerCase();
      if (ext == 'pdf') {
        mediaType = MediaType('application', 'pdf');
      } else if (ext == 'png') {
        mediaType = MediaType('image', 'png');
      } else if (ext == 'jpg' || ext == 'jpeg') {
        mediaType = MediaType('image', 'jpeg');
      }

      if (fileBytes != null) {
        request.files.add(http.MultipartFile.fromBytes(
          fileFieldName,
          fileBytes,
          filename: fileName,
          contentType: mediaType,
        ));
      } else if (filePath != null) {
        request.files.add(await http.MultipartFile.fromPath(
          fileFieldName,
          filePath,
          filename: fileName,
          contentType: mediaType,
        ));
      }

      final streamedResponse = await request.send().timeout(const Duration(seconds: 25));
      final response = await http.Response.fromStream(streamedResponse);
      return _handleResponse(response);
    } on TimeoutException {
      throw ApiException('File upload timed out. Please check connection.', 408);
    } on SocketException catch (e) {
      throw ApiException('Cannot reach server for upload: ${e.message}', 503);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Upload error: $e', 500);
    }
  }

  static dynamic _handleResponse(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return null;
      try {
        return jsonDecode(response.body);
      } catch (_) {
        return response.body;
      }
    } else {
      String message = 'Server error (${response.statusCode})';
      try {
        final decoded = jsonDecode(response.body);
        if (decoded is Map && decoded['message'] != null) {
          message = decoded['message'].toString();
        } else {
          message = response.body;
        }
      } catch (_) {
        if (response.body.isNotEmpty) message = response.body;
      }
      throw ApiException(message, response.statusCode);
    }
  }
}

class ApiException implements Exception {
  final String message;
  final int statusCode;
  ApiException(this.message, this.statusCode);

  @override
  String toString() => message;
}
