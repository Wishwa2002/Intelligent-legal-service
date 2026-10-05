import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../config/app_theme.dart';
import '../models/document_file.dart';

class DocumentUploadCard extends StatelessWidget {
  final DocumentFile file;
  final VoidCallback? onReupload;

  const DocumentUploadCard({
    super.key,
    required this.file,
    this.onReupload,
  });

  @override
  Widget build(BuildContext context) {
    final isVerified = file.documentStatus.toUpperCase() == 'VERIFIED';
    final isRejected = file.documentStatus.toUpperCase() == 'REJECTED';

    Color statusColor = AppTheme.statusPending;
    IconData statusIcon = Icons.access_time_filled;
    if (isVerified) {
      statusColor = AppTheme.statusCompleted;
      statusIcon = Icons.check_circle;
    } else if (isRejected) {
      statusColor = AppTheme.statusRequiresDocs;
      statusIcon = Icons.cancel;
    }

    final dateStr = file.uploadDate != null
        ? DateFormat('MMM d, yyyy • h:mm a').format(file.uploadDate!.toLocal())
        : 'Uploaded';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isRejected
              ? AppTheme.statusRequiresDocs.withValues(alpha: 0.4)
              : AppTheme.borderSubtle,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: isRejected
                      ? AppTheme.statusRequiresDocs.withValues(alpha: 0.1)
                      : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  file.fileName.endsWith('.pdf') ? Icons.picture_as_pdf : Icons.insert_drive_file,
                  color: file.fileName.endsWith('.pdf') ? const Color(0xFFDC2626) : AppTheme.primaryNavy,
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      file.fileName,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        color: AppTheme.primaryNavy,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${file.formattedFileSize} • $dateStr',
                      style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
                    ),
                  ],
                ),
              ),
              Row(
                children: [
                  Icon(statusIcon, color: statusColor, size: 18),
                  const SizedBox(width: 4),
                  Text(
                    file.documentStatus,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: statusColor,
                    ),
                  ),
                ],
              ),
            ],
          ),
          if (isRejected && file.rejectionReason != null && file.rejectionReason!.isNotEmpty) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFFECACA)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.info_outline, size: 16, color: Color(0xFFDC2626)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Feedback: ${file.rejectionReason}',
                      style: const TextStyle(fontSize: 12, color: Color(0xFF991B1B)),
                    ),
                  ),
                ],
              ),
            ),
          ],
          if (isRejected && onReupload != null) ...[
            const SizedBox(height: 10),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                icon: const Icon(Icons.upload_file, size: 16),
                label: const Text('Re-upload Document', style: TextStyle(fontSize: 12)),
                onPressed: onReupload,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
