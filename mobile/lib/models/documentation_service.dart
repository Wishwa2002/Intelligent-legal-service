class DocumentationService {
  final int serviceId;
  final String name;
  final String description;
  final bool isActive;
  final List<String> requiredDocuments;

  DocumentationService({
    required this.serviceId,
    required this.name,
    required this.description,
    required this.isActive,
    required this.requiredDocuments,
  });

  factory DocumentationService.fromJson(Map<String, dynamic> json) {
    return DocumentationService(
      serviceId: json['serviceId'] is int ? json['serviceId'] : int.tryParse(json['serviceId'].toString()) ?? 0,
      name: json['name']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      isActive: json['isActive'] ?? true,
      requiredDocuments: (json['requiredDocuments'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'serviceId': serviceId,
      'name': name,
      'description': description,
      'isActive': isActive,
      'requiredDocuments': requiredDocuments,
    };
  }
}
