class ChatMessage {
  final String id;
  final String content;
  final bool isUser;
  final DateTime timestamp;
  final List<String>? actionOptions;
  final String? suggestedAction;
  final bool isError;

  ChatMessage({
    required this.id,
    required this.content,
    required this.isUser,
    required this.timestamp,
    this.actionOptions,
    this.suggestedAction,
    this.isError = false,
  });

  factory ChatMessage.user(String text) {
    return ChatMessage(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      content: text,
      isUser: true,
      timestamp: DateTime.now(),
    );
  }

  factory ChatMessage.agent(String text, {List<String>? options, String? suggestedAction, bool isError = false}) {
    return ChatMessage(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      content: text,
      isUser: false,
      timestamp: DateTime.now(),
      actionOptions: options,
      suggestedAction: suggestedAction,
      isError: isError,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'content': content,
    'isUser': isUser,
    'timestamp': timestamp.toIso8601String(),
    'actionOptions': actionOptions,
    'suggestedAction': suggestedAction,
    'isError': isError,
  };

  factory ChatMessage.fromJson(Map<String, dynamic> json) => ChatMessage(
    id: json['id']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
    content: json['content']?.toString() ?? '',
    isUser: json['isUser'] == true,
    timestamp: json['timestamp'] != null
        ? DateTime.tryParse(json['timestamp'].toString()) ?? DateTime.now()
        : DateTime.now(),
    actionOptions: (json['actionOptions'] as List?)?.map((e) => e.toString()).toList(),
    suggestedAction: json['suggestedAction']?.toString(),
    isError: json['isError'] == true,
  );
}
