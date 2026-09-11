import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../config/app_theme.dart';
import '../../../models/documentation_request.dart';
import '../../../services/documentation_service.dart';
import '../../../services/document_file_service.dart';
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

  Future<void> _handleUploadFile() async {
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

                          // Missing documents alert
                          if (_request!.missingDocuments.isNotEmpty) ...[
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
