class ServiceRequestChatResponse {
  final String sessionId;
  final String reply;
  final bool isReadyToSubmit;
  final String? detectedCategory;
  final String? requestType;
  final String? priority;
  final List<String> missingInformation;
  final ServiceRequestDraft draft;

  ServiceRequestChatResponse({
    required this.sessionId,
    required this.reply,
    required this.isReadyToSubmit,
    this.detectedCategory,
    this.requestType,
    this.priority,
    required this.missingInformation,
    required this.draft,
  });

  factory ServiceRequestChatResponse.fromJson(
    Map<String, dynamic> json,
  ) {
    return ServiceRequestChatResponse(
      sessionId: json['sessionId']?.toString() ?? '',
      reply: json['reply']?.toString() ?? '',
      isReadyToSubmit: json['isReadyToSubmit'] == true,
      detectedCategory:
          json['detectedCategory']?.toString(),
      requestType: json['requestType']?.toString(),
      priority: json['priority']?.toString(),
      missingInformation:
          (json['missingInformation'] as List<dynamic>? ?? [])
              .map((e) => e.toString())
              .toList(),
      draft: ServiceRequestDraft.fromJson(
        json['draft'] is Map<String, dynamic>
            ? json['draft'] as Map<String, dynamic>
            : <String, dynamic>{},
      ),
    );
  }
}

class ServiceRequestDraft {
  final String? title;
  final String? description;
  final String? requestType;
  final String? priority;
  final String? legalCategory;

  ServiceRequestDraft({
    this.title,
    this.description,
    this.requestType,
    this.priority,
    this.legalCategory,
  });

  factory ServiceRequestDraft.fromJson(
    Map<String, dynamic> json,
  ) {
    return ServiceRequestDraft(
      title: json['title']?.toString(),
      description: json['description']?.toString(),
      requestType: json['requestType']?.toString(),
      priority: json['priority']?.toString(),
      legalCategory: json['legalCategory']?.toString(),
    );
  }
}