import 'package:flutter_test/flutter_test.dart';
import 'package:legal_service_app/models/documentation_service.dart';
import 'package:legal_service_app/models/documentation_request.dart';
import 'package:legal_service_app/models/document_file.dart';
import 'package:legal_service_app/models/chat_message.dart';

void main() {
  group('Model Serialization Tests', () {
    test('DocumentationService parses from valid JSON', () {
      final json = {
        'serviceId': 101,
        'name': 'Residential Lease Agreement',
        'description': 'Standard residential tenancy contract',
        'isActive': true,
        'requiredDocuments': ['National Identity Card (NIC)', 'Title Deed Copy'],
      };

      final service = DocumentationService.fromJson(json);
      expect(service.serviceId, 101);
      expect(service.name, 'Residential Lease Agreement');
      expect(service.requiredDocuments.length, 2);
      expect(service.requiredDocuments.first, 'National Identity Card (NIC)');
    });

    test('DocumentFile correctly formats file sizes and statuses', () {
      final json = {
        'fileId': 5,
        'requestId': 12,
        'fileName': 'NIC_Front.pdf',
        'contentType': 'application/pdf',
        'fileSize': 2048000,
        'documentStatus': 'VERIFIED',
      };

      final file = DocumentFile.fromJson(json);
      expect(file.fileId, 5);
      expect(file.formattedFileSize, '2.0 MB');
      expect(file.documentStatus, 'VERIFIED');
    });

    test('DocumentationRequest parses nested DocumentFiles and missing documents', () {
      final json = {
        'requestId': 42,
        'customerId': 1,
        'serviceId': 101,
        'serviceName': 'Residential Lease Agreement',
        'documentType': 'Lease',
        'status': 'REQUIRES_DOCUMENTS',
        'missingDocuments': ['Title Deed Copy'],
        'documentFiles': [
          {
            'fileId': 1,
            'requestId': 42,
            'fileName': 'NIC.pdf',
            'contentType': 'application/pdf',
            'fileSize': 1024,
            'documentStatus': 'VERIFIED',
          }
        ],
      };

      final req = DocumentationRequest.fromJson(json);
      expect(req.requestId, 42);
      expect(req.status, 'REQUIRES_DOCUMENTS');
      expect(req.missingDocuments.length, 1);
      expect(req.documentFiles.length, 1);
      expect(req.documentFiles.first.fileName, 'NIC.pdf');
    });

    test('ChatMessage factories produce valid model structures', () {
      final userMsg = ChatMessage.user('Hello Assistant');
      expect(userMsg.isUser, true);
      expect(userMsg.content, 'Hello Assistant');

      final agentMsg = ChatMessage.agent('How can I help?', options: ['Docs', 'Clerks']);
      expect(agentMsg.isUser, false);
      expect(agentMsg.actionOptions?.length, 2);
    });
  });
}
