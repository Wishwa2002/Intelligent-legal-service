import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../config/app_theme.dart';
import '../../../models/documentation_request.dart';
import '../../../services/documentation_service.dart';
import '../../../services/document_file_service.dart';
import '../../../services/document_and_clerk/sample_document_service.dart';
import '../../../widgets/sample_document_picker_dialog.dart';
import '../../../widgets/status_badge.dart';
import '../../../widgets/document_upload_card.dart';

class RequestDetailScreen extends StatefulWidget {
  final int requestId;

  const RequestDetailScreen({super.key, required this.requestId});

  @override
  State<RequestDetailScreen> createState() => _RequestDetailScreenState();
}

class _RequestDetailScreenState extends State<RequestDetailScreen> {
  DocumentationRequest? _request;
  bool _loading = true;
  bool _uploading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadDetails();
  }

  Future<void> _loadDetails() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final req = await DocumentationApiService.getRequestById(widget.requestId);
      if (mounted) {
        setState(() {
          _request = req;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  Future<void> _handleUploadFile([String? targetDocType]) async {
    final matchingSample = SampleDocumentService.getMatchingSample(
      targetDocType ??
          (_request?.missingDocuments.isNotEmpty == true
              ? _request!.missingDocuments.first
              : _request?.documentType),
    );

    final choice = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 14),
              const Text(
                'Upload Document',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.primaryNavy),
              ),
              const SizedBox(height: 4),
              const Text(
                'Select a verified sample legal document or upload from your device.',
                style: TextStyle(fontSize: 12, color: AppTheme.textMuted),
              ),
              const SizedBox(height: 16),

              if (matchingSample != null) ...[
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppTheme.secondaryAmber.withAlpha(40),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.verified, color: Color(0xFFD97706)),
                  ),
                  title: Text('Use Sample: ${matchingSample.title}',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  subtitle: Text('Fast verified document (${matchingSample.fileName})',
                      style: const TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                  trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: AppTheme.textMuted),
                  onTap: () => Navigator.pop(ctx, 'direct_sample'),
                ),
                const Divider(height: 1),
              ],

              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.blue.withAlpha(30),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.library_books_rounded, color: Colors.blue),
                ),
                title: const Text('Browse All Sample Documents',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                subtitle: const Text('Choose from 9 pre-verified legal templates',
                    style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: AppTheme.textMuted),
                onTap: () => Navigator.pop(ctx, 'browse_sample'),
              ),
              const Divider(height: 1),

              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.purple.withAlpha(30),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.folder_open_rounded, color: Colors.purple),
                ),
                title: const Text('Choose from Device (PDF or Photo)',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                subtitle: const Text('Select a file or take a picture from your device',
                    style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: AppTheme.textMuted),
                onTap: () => Navigator.pop(ctx, 'device'),
              ),
            ],
          ),
        ),
      ),
    );

    if (choice == null) return;

    if (choice == 'direct_sample' && matchingSample != null) {
      await _uploadSample(matchingSample);
    } else if (choice == 'browse_sample') {
      if (!mounted) return;
      final sample = await showSampleDocumentPickerSheet(context, targetDocType: targetDocType);
      if (sample != null) {
        await _uploadSample(sample);
      }
    } else if (choice == 'device') {
      await _pickAndUploadDeviceFile();
    }
  }

  Future<void> _uploadSample(SampleDocument sample) async {
    setState(() => _uploading = true);
    try {
      await SampleDocumentService.uploadSampleDocument(
        requestId: widget.requestId,
        sample: sample,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Sample "${sample.title}" uploaded successfully!'),
            backgroundColor: AppTheme.statusCompleted,
          ),
        );
      }
      await _loadDetails();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to upload sample: $e'),
            backgroundColor: AppTheme.statusRequiresDocs,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _pickAndUploadDeviceFile() async {
    final file = await DocumentFileService.pickDocument();
    if (file == null) return;

    setState(() => _uploading = true);
    try {
      await DocumentFileService.uploadDocument(
        requestId: widget.requestId,
        file: file,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${file.name} uploaded successfully!'),
            backgroundColor: AppTheme.statusCompleted,
          ),
        );
      }
      await _loadDetails();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Upload failed: $e'),
            backgroundColor: AppTheme.statusRequiresDocs,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Widget _buildTimeline(String currentStatus) {
    final steps = ['PENDING', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'];
    final statusIndex = steps.indexOf(currentStatus.toUpperCase());
    final activeIndex = statusIndex == -1 ? 0 : statusIndex;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Workflow Progress', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 16),
          Row(
            children: List.generate(steps.length * 2 - 1, (index) {
              if (index.isOdd) {
                final prevStepIdx = index ~/ 2;
                final isDone = prevStepIdx < activeIndex;
                return Expanded(
                  child: Container(
                    height: 3,
                    color: isDone ? AppTheme.primaryNavy : AppTheme.borderSubtle,
                  ),
                );
              }

              final stepIdx = index ~/ 2;
              final isDone = stepIdx <= activeIndex;
              final isCurrent = stepIdx == activeIndex;

              return Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isDone ? (isCurrent ? AppTheme.secondaryAmber : AppTheme.primaryNavy) : Colors.white,
                  border: Border.all(
                    color: isDone ? AppTheme.primaryNavy : AppTheme.borderSubtle,
                    width: 2,
                  ),
                ),
                child: Center(
                  child: isDone
                      ? Icon(
                          isCurrent ? Icons.circle : Icons.check,
                          size: 14,
                          color: isCurrent ? AppTheme.primaryNavy : Colors.white,
                        )
                      : Text('${stepIdx + 1}', style: const TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                ),
              );
            }),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: const [
              Text('Pending', style: TextStyle(fontSize: 10, color: AppTheme.textMuted)),
              Text('Review', style: TextStyle(fontSize: 10, color: AppTheme.textMuted)),
              Text('Assigned', style: TextStyle(fontSize: 10, color: AppTheme.textMuted)),
              Text('Active', style: TextStyle(fontSize: 10, color: AppTheme.textMuted)),
              Text('Done', style: TextStyle(fontSize: 10, color: AppTheme.textMuted)),
            ],
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Request #${widget.requestId}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadDetails,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.secondaryAmber))
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.error_outline, size: 48, color: Colors.red),
                        const SizedBox(height: 12),
                        Text(_error!, textAlign: TextAlign.center),
                        const SizedBox(height: 16),
                        ElevatedButton(onPressed: _loadDetails, child: const Text('Retry')),
                      ],
                    ),
                  ),
                )
              : _request == null
                  ? const Center(child: Text('Request not found'))
                  : RefreshIndicator(
                      onRefresh: _loadDetails,
                      child: ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          // Header Card
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Expanded(
                                        child: Text(
                                          _request!.serviceName ?? _request!.documentType,
                                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                                        ),
                                      ),
                                      StatusBadge(status: _request!.status),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  if (_request!.createdAt != null)
                                    Text(
                                      'Submitted: ${DateFormat('MMMM d, yyyy').format(_request!.createdAt!.toLocal())}',
                                      style: const TextStyle(fontSize: 13, color: AppTheme.textMuted),
                                    ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),

                          // Progress Timeline
                          _buildTimeline(_request!.status),
                          const SizedBox(height: 16),

                          // Assigned Clerk Card
                          if (_request!.assignedClerkName != null) ...[
                            Card(
                              child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        color: AppTheme.primaryNavy,
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: const Icon(Icons.badge, color: AppTheme.secondaryAmber, size: 24),
                                    ),
                                    const SizedBox(width: 14),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Text('Assigned Legal Clerk', style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                                          Text(
                                            _request!.assignedClerkName!,
                                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                          ),
                                          const Text('Handling verification and processing', style: TextStyle(fontSize: 12, color: Colors.black54)),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(height: 16),
                          ],

                          // Action Required: Re-upload / Upload Document Requested by Clerk or Admin
                          if (_request!.reuploadNote != null && _request!.reuploadNote!.isNotEmpty) ...[
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFFFBEB),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: const Color(0xFFFDE68A), width: 1.5),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.amber.withAlpha(20),
                                    blurRadius: 8,
                                    offset: const Offset(0, 3),
                                  ),
                                ],
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(6),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFD97706),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: const Icon(Icons.notification_important_rounded, color: Colors.white, size: 20),
                                      ),
                                      const SizedBox(width: 10),
                                      const Expanded(
                                        child: Text(
                                          'Action Required: Document Requested',
                                          style: TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 14,
                                            color: Color(0xFF92400E),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 10),
                                  Text(
                                    _request!.reuploadNote!,
                                    style: const TextStyle(
                                      fontSize: 13,
                                      color: Color(0xFF78350F),
                                      fontWeight: FontWeight.w600,
                                      height: 1.4,
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  SizedBox(
                                    width: double.infinity,
                                    child: ElevatedButton.icon(
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: AppTheme.primaryNavy,
                                        foregroundColor: AppTheme.secondaryAmber,
                                        padding: const EdgeInsets.symmetric(vertical: 12),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                      ),
                                      icon: _uploading
                                          ? const SizedBox(
                                              width: 16,
                                              height: 16,
                                              child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.secondaryAmber),
                                            )
                                          : const Icon(Icons.cloud_upload, size: 18),
                                      label: Text(
                                        _uploading ? 'Uploading Document...' : 'Upload / Replace Document',
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                      ),
                                      onPressed: _uploading ? null : _handleUploadFile,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 16),
                          ],

                          // Missing documents alert
                          if (_request!.missingDocuments.isNotEmpty && (_request!.reuploadNote == null || _request!.reuploadNote!.isEmpty)) ...[
                            Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEF2F2),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: const Color(0xFFFECACA)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Row(
                                    children: [
                                      Icon(Icons.warning_amber_rounded, color: Color(0xFFDC2626), size: 20),
                                      SizedBox(width: 8),
                                      Text(
                                        'Action Required: Missing Documents',
                                        style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF991B1B)),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  ..._request!.missingDocuments.map((doc) => Padding(
                                        padding: const EdgeInsets.only(left: 28, bottom: 4),
                                        child: Text('• $doc', style: const TextStyle(fontSize: 13, color: Color(0xFF7F1D1D))),
                                      )),
                                ],
                              ),
                            ),
                            const SizedBox(height: 16),
                          ],

                          // Upload Document Section Header
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Uploaded Documents (${_request!.documentFiles.length})',
                                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                              ),
                              ElevatedButton.icon(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppTheme.secondaryAmber,
                                  foregroundColor: AppTheme.primaryNavy,
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                ),
                                icon: _uploading
                                    ? const SizedBox(
                                        width: 14,
                                        height: 14,
                                        child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primaryNavy),
                                      )
                                    : const Icon(Icons.upload_file, size: 16),
                                label: Text(_uploading ? 'Uploading...' : 'Upload Doc'),
                                onPressed: _uploading ? null : _handleUploadFile,
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),

                          if (_request!.documentFiles.isEmpty)
                            Container(
                              padding: const EdgeInsets.all(28),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: AppTheme.borderSubtle),
                              ),
                              child: Column(
                                children: [
                                  const Icon(Icons.cloud_upload_outlined, size: 40, color: AppTheme.textMuted),
                                  const SizedBox(height: 8),
                                  const Text('No documents uploaded yet', style: TextStyle(fontWeight: FontWeight.bold)),
                                  const SizedBox(height: 4),
                                  const Text('Attach required PDFs or images to proceed with clerk review.',
                                      textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                                  const SizedBox(height: 12),
                                  OutlinedButton.icon(
                                    icon: const Icon(Icons.add),
                                    label: const Text('Choose File'),
                                    onPressed: _uploading ? null : _handleUploadFile,
                                  ),
                                ],
                              ),
                            )
                          else
                            ..._request!.documentFiles.map((file) => DocumentUploadCard(
                                  file: file,
                                  onReupload: _handleUploadFile,
                                )),
                        ],
                      ),
                    ),
    );
  }
}
