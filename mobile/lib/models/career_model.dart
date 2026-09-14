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
    final title = json['jobTitle']?.toString() ?? '';
    final lower = title.toLowerCase();

    String defaultDept = 'Legal Services';
    String defaultType = 'Full-Time';
    String defaultLocation = 'Colombo HQ';

    if (lower.contains('corporate')) {
      defaultDept = 'Corporate & M&A';
      defaultLocation = 'Colombo / Hybrid';
    } else if (lower.contains('clerk') || lower.contains('documentation') || lower.contains('operation')) {
      defaultDept = 'Legal Operations';
      defaultLocation = 'Legal Registry';
    } else if (lower.contains('litigation') || lower.contains('dispute')) {
      defaultDept = 'Dispute Resolution';
      defaultLocation = 'Supreme Court Chambers';
    } else if (lower.contains('ai') || lower.contains('engineer') || lower.contains('tech')) {
      defaultDept = 'LegalTech & AI Labs';
      defaultType = 'Full-Time / Remote';
      defaultLocation = 'Remote Hub';
    }

    return CareerModel(
      careerId: json['careerId']?.toString() ?? '',
      jobTitle: title,
      department: json['department']?.toString() ?? defaultDept,
      location: json['location']?.toString() ?? defaultLocation,
      jobType: json['jobType']?.toString() ?? defaultType,
      description: json['description']?.toString() ?? '',
      requirements: json['requirements']?.toString(),
      isActive: json['isActive'] ?? true,
      postedDate: json['postedDate'] != null
          ? DateTime.tryParse(json['postedDate'].toString())
          : (json['createdAt'] != null ? DateTime.tryParse(json['createdAt'].toString()) : null),
    );
  }
}
