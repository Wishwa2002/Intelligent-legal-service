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
    SampleDocument(
      title: 'Claim Evidence & Invoices',
      fileName: 'Claim_Evidence_Invoices.pdf',
      docType: 'Claim Evidence / Invoices',
      description: 'Itemized commercial tax invoices and sworn declaration of unpaid claim',
      fileSize: '2.8 KB',
      icon: Icons.receipt_long_outlined,
    ),
    SampleDocument(
      title: 'Opposing Party Service Address Proof',
      fileName: 'Demand_Notice_Address_Proof.pdf',
      docType: 'Opposing Party Service Address',
      description: 'Certified process server confirmation of defendant registered office address',
      fileSize: '2.7 KB',
      icon: Icons.location_on_outlined,
    ),
    SampleDocument(
      title: 'Grama Niladhari Certificate',
      fileName: 'Grama_Niladhari_Certificate.pdf',
      docType: 'Surety NIC & Grama Niladhari Certificate',
      description: 'Official Ministry of Home Affairs residence and character certificate for bail surety',
      fileSize: '2.7 KB',
      icon: Icons.badge_outlined,
    ),
    SampleDocument(
      title: 'Client Proxy Authorization',
      fileName: 'Client_Proxy_Authorization.pdf',
      docType: 'Client NIC & Proxy',
      description: 'Supreme Court Advocate proxy appointment under Civil Procedure Code Section 27',
      fileSize: '2.8 KB',
      icon: Icons.assignment_ind_outlined,
    ),
    SampleDocument(
      title: 'Business Registration Form (Form 1)',
      fileName: 'Business_Registration_Form.pdf',
      docType: 'Business Registration Form',
      description: 'Official Companies Act No. 07 of 2007 Pvt Ltd incorporation application form',
      fileSize: '2.9 KB',
      icon: Icons.business_outlined,
    ),
    SampleDocument(
      title: 'Articles of Association',
      fileName: 'Articles_of_Association.pdf',
      docType: 'Articles of Association',
      description: 'Model Articles of Association establishing corporate capacity and shareholding',
      fileSize: '2.7 KB',
      icon: Icons.menu_book_outlined,
    ),
    SampleDocument(
      title: 'Registered Office Address Proof',
      fileName: 'Registered_Address_Proof.pdf',
      docType: 'Registered Address Proof',
      description: 'Colombo Municipal Council certified assessment rates and premises occupation certificate',
      fileSize: '2.7 KB',
      icon: Icons.domain_verification_outlined,
    ),
    SampleDocument(
      title: 'Certified Title Deed Copy',
      fileName: 'Property_Deed_Copy.pdf',
      docType: 'Prior Title Deed Copy',
      description: 'Certified true extract of registered Land Registry conveyance deed with pedigree',
      fileSize: '2.8 KB',
      icon: Icons.apartment_outlined,
    ),
    SampleDocument(
      title: 'Certified Cadastral Survey Plan',
      fileName: 'Certified_Survey_Plan.pdf',
      docType: 'Survey Plan',
      description: 'Licensed Surveyor boundary survey plan approved by Local Authority & SG',
      fileSize: '2.8 KB',
      icon: Icons.map_outlined,
    ),
    SampleDocument(
      title: 'Sale & Purchase Agreement Draft',
      fileName: 'Sale_Agreement_Draft.pdf',
      docType: 'Sale Agreement Draft',
      description: 'Bilateral agreement to sell real property with payment schedule & clear title covenants',
      fileSize: '2.8 KB',
      icon: Icons.handshake_outlined,
    ),
  ];

  static SampleDocument? getMatchingSample(String? docType) {
    if (docType == null || docType.isEmpty) return null;
    final clean = docType.toLowerCase().trim();

    // 1. Specific Document Matches First
    if (clean.contains('invoice') || clean.contains('claim evidence') || clean.contains('evidence of claim')) {
      return samples.firstWhere((s) => s.fileName == 'Claim_Evidence_Invoices.pdf', orElse: () => samples.first);
    }
    if (clean.contains('service address') || clean.contains('opposing party') || clean.contains('address for service')) {
      return samples.firstWhere((s) => s.fileName == 'Demand_Notice_Address_Proof.pdf', orElse: () => samples.first);
    }
    if (clean.contains('grama') || clean.contains('niladhari')) {
      return samples.firstWhere((s) => s.fileName == 'Grama_Niladhari_Certificate.pdf', orElse: () => samples.first);
    }
    if (clean.contains('proxy')) {
      return samples.firstWhere((s) => s.fileName == 'Client_Proxy_Authorization.pdf', orElse: () => samples.first);
    }
    if (clean.contains('business registration form') || clean.contains('form 1') || clean.contains('br form')) {
      return samples.firstWhere((s) => s.fileName == 'Business_Registration_Form.pdf', orElse: () => samples.first);
    }
    if (clean.contains('articles') || clean.contains('association') || clean.contains('aoa')) {
      return samples.firstWhere((s) => s.fileName == 'Articles_of_Association.pdf', orElse: () => samples.first);
    }
    if (clean.contains('registered address') || clean.contains('address proof') || clean.contains('premise')) {
      return samples.firstWhere((s) => s.fileName == 'Registered_Address_Proof.pdf', orElse: () => samples.first);
    }
    if (clean.contains('survey') || clean.contains('plan')) {
      return samples.firstWhere((s) => s.fileName == 'Certified_Survey_Plan.pdf', orElse: () => samples.first);
    }
    if (clean.contains('sale agreement') || clean.contains('agreement to sell')) {
      return samples.firstWhere((s) => s.fileName == 'Sale_Agreement_Draft.pdf', orElse: () => samples.first);
    }
    if (clean.contains('prior title') || clean.contains('deed copy') || (clean.contains('deed') && !clean.contains('gift'))) {
      return samples.firstWhere((s) => s.fileName == 'Property_Deed_Copy.pdf', orElse: () => samples.first);
    }

    // 2. Identity documents
    if (clean.contains('nic') || clean.contains('identity') || clean.contains('passport') || clean.contains('signatory') || clean.contains('surety')) {
      return samples.firstWhere((s) => s.fileName == 'NIC_Copy.pdf', orElse: () => samples.first);
    }

    // 3. Agreements, Tenancy, Contracts, NDAs, Custody/Settlement
    if (clean.contains('tenancy') || clean.contains('lease') || clean.contains('rent')) {
      return samples.firstWhere((s) => s.fileName == 'Tenancy_Agreement.pdf', orElse: () => samples.first);
    }
    if (clean.contains('contract') || clean.contains('draft agreement') || clean.contains('corporate registration')) {
      return samples.firstWhere((s) => s.fileName == 'Original_Contract.pdf', orElse: () => samples.first);
    }

    // 4. Property & Asset Proof
    if (clean.contains('asset') || clean.contains('title') || clean.contains('ownership')) {
      return samples.firstWhere((s) => s.fileName == 'Asset_Ownership_Proof.pdf', orElse: () => samples.first);
    }

    // 5. Power of Attorney
    if (clean.contains('attorney') || clean.contains('poa') || clean.contains('authority')) {
      return samples.firstWhere((s) => s.fileName == 'Power_of_Attorney_Draft.pdf', orElse: () => samples.first);
    }

    // 6. Last Will & Testament
    if (clean.contains('will') || clean.contains('testament') || clean.contains('probate')) {
      return samples.firstWhere((s) => s.fileName == 'Draft_Will_Agreement.pdf', orElse: () => samples.first);
    }

    // 7. Witness & Certified Certificates
    if (clean.contains('witness')) {
      return samples.firstWhere((s) => s.fileName == 'Witness_Details.pdf', orElse: () => samples.first);
    }

    // 8. Affidavits, Petitions, Plaints & Formal Statements
    if (clean.contains('affidavit') || clean.contains('facts') || clean.contains('declaration')) {
      return samples.firstWhere((s) => s.fileName == 'Completed_Affidavit_Draft.pdf', orElse: () => samples.first);
    }

    // 9. Formal Letters, Notices, Demands & Requests
    if (clean.contains('letter') || clean.contains('notice') || clean.contains('demand') || clean.contains('amendment')) {
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
