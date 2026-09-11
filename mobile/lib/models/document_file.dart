class DocumentFile {
  final int fileId;
  final int requestId;
  final String fileName;
  final String contentType;
  final int fileSize;
  final String documentStatus;
  final double? verificationScore;
  final String? rejectionReason;
  final DateTime? uploadDate;

  DocumentFile({
    required this.fileId,
    required this.requestId,
    required this.fileName,
    required this.contentType,
    required this.fileSize,
    required this.documentStatus,
    this.verificationScore,
    this.rejectionReason,
    this.uploadDate,
  });

  factory DocumentFile.fromJson(Map<String, dynamic> json) {
    return DocumentFile(
      fileId: json['fileId'] is int ? json['fileId'] : int.tryParse(json['fileId'].toString()) ?? 0,
      requestId: json['requestId'] is int ? json['requestId'] : int.tryParse(json['requestId'].toString()) ?? 0,
      fileName: json['fileName']?.toString() ?? 'Document',
      contentType: json['contentType']?.toString() ?? 'application/octet-stream',
      fileSize: json['fileSize'] is int ? json['fileSize'] : int.tryParse(json['fileSize']?.toString() ?? '0') ?? 0,
      documentStatus: json['documentStatus']?.toString() ?? 'PENDING',
      verificationScore: json['verificationScore'] != null ? double.tryParse(json['verificationScore'].toString()) : null,
      rejectionReason: json['rejectionReason']?.toString(),
      uploadDate: json['uploadDate'] != null ? DateTime.tryParse(json['uploadDate'].toString()) : null,
    );
  }

  String get formattedFileSize {
    if (fileSize < 1024) return '$fileSize B';
    if (fileSize < 1024 * 1024) return '${(fileSize / 1024).toStringAsFixed(1)} KB';
    return '${(fileSize / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}
