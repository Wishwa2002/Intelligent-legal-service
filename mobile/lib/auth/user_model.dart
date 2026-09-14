class UserModel {
  final String userId;
  final String fullName;
  final String email;
  final String role;
  final String? token;

  const UserModel({
    required this.userId,
    required this.fullName,
    required this.email,
    required this.role,
    this.token,
  });

  String get userType => role;

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      userId: (json['userId'] ?? json['id'] ?? '').toString(),
      fullName: (json['fullName'] ?? json['name'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      role: (json['role'] ?? 'User').toString(),
      token: json['token']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'fullName': fullName,
      'email': email,
      'role': role,
      if (token != null) 'token': token,
    };
  }
}
