import 'document_file.dart';

class DocumentationRequest {
  final int requestId;
  final int customerId;
  final String? customerName;
  final String? customerEmail;
  final int serviceId;
  final String? serviceName;
  final String documentType;
  final String status;
  final int? assignedClerkId;
  final String? assignedClerkName;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final List<String> requiredDocuments;
  final List<String> missingDocuments;
  final List<DocumentFile> documentFiles;

  DocumentationRequest({
    required this.requestId,
    required this.customerId,
    this.customerName,
    this.customerEmail,
    required this.serviceId,
    this.serviceName,
    required this.documentType,
    required this.status,
    this.assignedClerkId,
    this.assignedClerkName,
    this.createdAt,
    this.updatedAt,
    this.requiredDocuments = const [],
    this.missingDocuments = const [],
    this.documentFiles = const [],
  });

  factory DocumentationRequest.fromJson(Map<String, dynamic> json) {
    var filesList = <DocumentFile>[];
    if (json['documentFiles'] != null && json['documentFiles'] is List) {
      filesList = (json['documentFiles'] as List)
          .map((f) => DocumentFile.fromJson(f as Map<String, dynamic>))
          .toList();
    }

    return DocumentationRequest(
      requestId: json['requestId'] is int ? json['requestId'] : int.tryParse(json['requestId'].toString()) ?? 0,
      customerId: json['customerId'] is int ? json['customerId'] : int.tryParse(json['customerId']?.toString() ?? '0') ?? 0,
      customerName: json['customerName']?.toString(),
      customerEmail: json['customerEmail']?.toString(),
      serviceId: json['serviceId'] is int ? json['serviceId'] : int.tryParse(json['serviceId']?.toString() ?? '0') ?? 0,
      serviceName: json['serviceName']?.toString(),
      documentType: json['documentType']?.toString() ?? '',
      status: json['status']?.toString() ?? 'PENDING',
      assignedClerkId: json['assignedClerkId'] != null ? int.tryParse(json['assignedClerkId'].toString()) : null,
      assignedClerkName: json['assignedClerkName']?.toString(),
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'].toString()) : null,
      updatedAt: json['updatedAt'] != null ? DateTime.tryParse(json['updatedAt'].toString()) : null,
      requiredDocuments: (json['requiredDocuments'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      missingDocuments: (json['missingDocuments'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      documentFiles: filesList,
    );
  }
}
