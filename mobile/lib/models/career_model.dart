class CareerModel {
  final String careerId;
  final String jobTitle;
  final String department;
  final String location;
  final String jobType;
  final String description;
  final String? requirements;
  final bool isActive;
  final DateTime? postedDate;

  CareerModel({
    required this.careerId,
    required this.jobTitle,
    required this.department,
    required this.location,
    required this.jobType,
    required this.description,
    this.requirements,
    required this.isActive,
    this.postedDate,
  });

  factory CareerModel.fromJson(Map<String, dynamic> json) {
    return CareerModel(
      careerId: json['careerId']?.toString() ?? '',
      jobTitle: json['jobTitle']?.toString() ?? '',
      department: json['department']?.toString() ?? 'Legal Operations',
      location: json['location']?.toString() ?? 'Colombo / Remote',
      jobType: json['jobType']?.toString() ?? 'Full-time',
      description: json['description']?.toString() ?? '',
      requirements: json['requirements']?.toString(),
      isActive: json['isActive'] ?? true,
      postedDate: json['postedDate'] != null ? DateTime.tryParse(json['postedDate'].toString()) : null,
    );
  }
}
