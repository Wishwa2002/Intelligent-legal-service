class ServiceRequest {
  final String serviceRequestId;
  final String title;
  final String description;
  final String requestType;
  final String? priority;
  final String status;
  final DateTime? createdAt;

  ServiceRequest({
    required this.serviceRequestId,
    required this.title,
    required this.description,
    required this.requestType,
    this.priority,
    required this.status,
    this.createdAt,
  });

  factory ServiceRequest.fromJson(Map<String, dynamic> json) {
    return ServiceRequest(
      serviceRequestId:
          json['serviceRequestId']?.toString() ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      requestType: json['requestType'] ?? '',
      priority: json['priority'],
      status: json['status']?.toString() ?? 'Submitted',
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'])
          : null,
    );
  }
}