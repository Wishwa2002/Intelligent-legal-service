class UserModel {
  final String userId;
  final String? lawyerId;
  final String fullName;
  final String email;
  final String role;
  final String? token;

  const UserModel({
    required this.userId,
    this.lawyerId,
    required this.fullName,
    required this.email,
    required this.role,
    this.token,
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
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      if (lawyerId != null) 'lawyerId': lawyerId,
      'fullName': fullName,
      'email': email,
      'role': role,
      if (token != null) 'token': token,
    };
  }
}
