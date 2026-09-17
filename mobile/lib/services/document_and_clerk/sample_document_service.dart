import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../models/document_file.dart';
import '../api_client.dart';

class SampleDocument {
  final String title;
  final String fileName;
  final String docType;
  final String description;
  final String fileSize;
  final IconData icon;

  const SampleDocument({
    required this.title,
    required this.fileName,
    required this.docType,
    required this.description,
    required this.fileSize,
    this.icon = Icons.picture_as_pdf,
  });

  String get previewAssetPath => 'assets/sample_documents/${fileName.replaceAll('.pdf', '.png')}';
}

class SampleDocumentService {
  static const List<SampleDocument> samples = [
    SampleDocument(
      title: 'National Identity Card (NIC)',
      fileName: 'NIC_Copy.pdf',
      docType: 'National Identity Card (NIC)',
      description: 'Verified Sri Lankan Identity Card (Alexander Vance • 198512345678)',
      fileSize: '2.5 KB',
      icon: Icons.badge_outlined,
    ),
    SampleDocument(
      title: 'Tenancy Agreement',
      fileName: 'Tenancy_Agreement.pdf',
      docType: 'Tenancy Agreement',
      description: 'Official 24-month commercial lease contract with covenants & signatures',
      fileSize: '2.7 KB',
      icon: Icons.handshake_outlined,
    ),
    SampleDocument(
      title: 'Property Title Deed / Asset Proof',
      fileName: 'Asset_Ownership_Proof.pdf',
      docType: 'Property Deed Copy',
      description: 'Land Registry Title Deed No. LRD/WP/Asset-9901 with certified title',
      fileSize: '2.5 KB',
      icon: Icons.home_work_outlined,
    ),
    SampleDocument(
      title: 'Power of Attorney Draft',
      fileName: 'Power_of_Attorney_Draft.pdf',
      docType: 'Power of Attorney Draft',
      description: 'General Power of Attorney deed granting legal representation powers',
      fileSize: '2.7 KB',
      icon: Icons.gavel_outlined,
    ),
    SampleDocument(
      title: 'Last Will and Testament Agreement',
      fileName: 'Draft_Will_Agreement.pdf',
      docType: 'Draft Will Agreement',
      description: 'Verified testamentary declaration with two-witness attestation',
      fileSize: '2.7 KB',
      icon: Icons.history_edu_outlined,
    ),
    SampleDocument(
      title: 'Sworn Affidavit Draft',
      fileName: 'Completed_Affidavit_Draft.pdf',
      docType: 'Completed Affidavit Draft',
      description: 'Notarized sworn affidavit statement for official legal submission',
      fileSize: '2.7 KB',
      icon: Icons.verified_outlined,
    ),
    SampleDocument(
      title: 'Witness Identification Details',
      fileName: 'Witness_Details.pdf',
      docType: 'Witness Details',
      description: 'Official verified statements and NIC details of independent witnesses',
      fileSize: '2.5 KB',
      icon: Icons.people_outline,
    ),
    SampleDocument(
      title: 'Original Legal Contract',
      fileName: 'Original_Contract.pdf',
      docType: 'Original Contract',
      description: 'Standard certified legal agreement between corporate parties',
      fileSize: '3.0 KB',
      icon: Icons.description_outlined,
    ),
    SampleDocument(
      title: 'Amendment Request Letter',
      fileName: 'Amendment_Request_Letter.pdf',
      docType: 'Amendment Request Letter',
      description: 'Formal application letter requesting documentation amendments',
      fileSize: '2.7 KB',
      icon: Icons.mail_outline,
    ),
  ];

  static SampleDocument? getMatchingSample(String? docType) {
    if (docType == null || docType.isEmpty) return null;
    final clean = docType.toLowerCase().trim();

    // 1. Identity documents
    if (clean.contains('nic') || clean.contains('identity') || clean.contains('passport') || clean.contains('surety nic') || clean.contains('signatory')) {
      return samples.firstWhere((s) => s.fileName == 'NIC_Copy.pdf', orElse: () => samples.first);
    }
    // 2. Agreements, Tenancy, Contracts, NDAs, Custody/Settlement
    if (clean.contains('tenancy') || clean.contains('lease') || clean.contains('rent')) {
      return samples.firstWhere((s) => s.fileName == 'Tenancy_Agreement.pdf', orElse: () => samples.first);
    }
    if (clean.contains('nda') || clean.contains('vetting') || clean.contains('settlement') || clean.contains('custody')) {
      return samples.firstWhere((s) => s.fileName == 'Tenancy_Agreement.pdf', orElse: () => samples.first);
    }
    if (clean.contains('contract') || clean.contains('draft agreement') || clean.contains('business registration') || clean.contains('br')) {
      return samples.firstWhere((s) => s.fileName == 'Original_Contract.pdf', orElse: () => samples.first);
    }
    // 3. Property, Deeds, Asset Proof, Survey Plans, Pedigree, Day Book
    if (clean.contains('deed') || clean.contains('asset') || clean.contains('title') || clean.contains('survey') || clean.contains('plan') || clean.contains('pedigree') || clean.contains('day book') || clean.contains('property')) {
      return samples.firstWhere((s) => s.fileName == 'Asset_Ownership_Proof.pdf', orElse: () => samples.first);
    }
    // 4. Power of Attorney
    if (clean.contains('attorney') || clean.contains('poa') || clean.contains('proxy')) {
      return samples.firstWhere((s) => s.fileName == 'Power_of_Attorney_Draft.pdf', orElse: () => samples.first);
    }
    // 5. Last Will & Testament
    if (clean.contains('will') || clean.contains('testament') || clean.contains('probate') || clean.contains('letters of administration')) {
      return samples.firstWhere((s) => s.fileName == 'Draft_Will_Agreement.pdf', orElse: () => samples.first);
    }
    // 6. Witness & Certified Certificates (Marriage, Death, Grama Niladhari)
    if (clean.contains('witness')) {
      return samples.firstWhere((s) => s.fileName == 'Witness_Details.pdf', orElse: () => samples.first);
    }
    // 7. Affidavits, Petitions, Plaints & Formal Certificates
    if (clean.contains('affidavit') || clean.contains('certificate') || clean.contains('death') || clean.contains('marriage') || clean.contains('grama') || clean.contains('niladhari') || clean.contains('plaint') || clean.contains('injunction')) {
      return samples.firstWhere((s) => s.fileName == 'Completed_Affidavit_Draft.pdf', orElse: () => samples.first);
    }
    // 8. Formal Letters, Notices, Invoices & Address Proofs
    if (clean.contains('letter') || clean.contains('notice') || clean.contains('demand') || clean.contains('amendment') || clean.contains('address') || clean.contains('invoice') || clean.contains('evidence')) {
      return samples.firstWhere((s) => s.fileName == 'Amendment_Request_Letter.pdf', orElse: () => samples.first);
    }

    return samples.first;
  }

  static Future<File> getSampleFile(SampleDocument sample) async {
    final byteData = await rootBundle.load('assets/sample_documents/${sample.fileName}');
    final bytes = byteData.buffer.asUint8List(byteData.offsetInBytes, byteData.lengthInBytes);

    final tempDir = await Directory.systemTemp.createTemp('legal_sample_');
    final tempFile = File('${tempDir.path}/${sample.fileName}');
    await tempFile.writeAsBytes(bytes);
    return tempFile;
  }

  static Future<DocumentFile> uploadSampleDocument({
    required int requestId,
    required SampleDocument sample,
  }) async {
    final file = await getSampleFile(sample);
    final bytes = await file.readAsBytes();

    final res = await ApiClient.uploadFile(
      '/api/documentation-requests/$requestId/files',
      fileFieldName: 'file',
      fileName: sample.fileName,
      fileBytes: bytes,
      filePath: file.path,
    );

    return DocumentFile.fromJson(res as Map<String, dynamic>);
  }
}
