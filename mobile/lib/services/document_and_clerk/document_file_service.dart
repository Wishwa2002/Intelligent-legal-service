import 'package:file_picker/file_picker.dart';
import '../../models/document_file.dart';
import '../api_client.dart';

class DocumentFileService {
  static Future<PlatformFile?> pickDocument() async {
    return await FilePicker.pickFile(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'jpg', 'jpeg', 'png', 'docx'],
    );
  }

  static Future<DocumentFile> uploadDocument({
    required int requestId,
    required PlatformFile file,
  }) async {
    final bytes = await file.readAsBytes();
    final res = await ApiClient.uploadFile(
      '/api/documentation-requests/$requestId/files',
      fileFieldName: 'file',
      fileName: file.name,
      fileBytes: bytes,
      filePath: file.path,
    );

    return DocumentFile.fromJson(res as Map<String, dynamic>);
  }
}
