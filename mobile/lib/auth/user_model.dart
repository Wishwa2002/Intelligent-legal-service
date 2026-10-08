class UserModel {
  final String userId;
  final String? lawyerId;
  final String fullName;
  final String email;
  final String role;
  final String? token;
  final bool mustChangePassword;

  const UserModel({
    required this.userId,
    this.lawyerId,
    required this.fullName,
    required this.email,
    required this.role,
    this.token,
    this.mustChangePassword = false,
  });

  String get userType => role;

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      userId: (json['userId'] ?? json['id'] ?? '').toString(),
      lawyerId: json['lawyerId']?.toString(),
      fullName: (json['fullName'] ?? json['name'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      role: (json['role'] ?? 'User').toString(),
      token: json['token']?.toString(),
      mustChangePassword: json['mustChangePassword'] == true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      if (lawyerId != null) 'lawyerId': lawyerId,
      'fullName': fullName,
      'email': email,
      'role': role,
      'mustChangePassword': mustChangePassword,
      if (token != null) 'token': token,
    };
  }
}
