import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../config/app_theme.dart';
import '../models/chat_message.dart';
import '../services/document_and_clerk/sample_document_service.dart';
import 'markdown_formatted_text.dart';
import 'sample_document_viewer_dialog.dart';

class ChatBubble extends StatelessWidget {
  final ChatMessage message;
  final Function(String action)? onActionSelected;

  const ChatBubble({
    super.key,
    required this.message,
    this.onActionSelected,
  });

  @override
  Widget build(BuildContext context) {
    final isUser = message.isUser;
    final timeStr = DateFormat('h:mm a').format(message.timestamp);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 12),
      child: Column(
        crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (!isUser) ...[
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: AppTheme.primaryNavy,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Icon(Icons.smart_toy_outlined, color: AppTheme.secondaryAmber, size: 18),
                ),
                const SizedBox(width: 8),
              ],
              Flexible(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: isUser ? AppTheme.primaryNavy : Colors.white,
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(16),
                      topRight: const Radius.circular(16),
                      bottomLeft: isUser ? const Radius.circular(16) : const Radius.circular(4),
                      bottomRight: isUser ? const Radius.circular(4) : const Radius.circular(16),
                    ),
                    border: isUser ? null : Border.all(color: AppTheme.borderSubtle),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.04),
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      MarkdownFormattedText(
                        text: message.content,
                        baseStyle: TextStyle(
                          color: isUser ? Colors.white : AppTheme.slateDark,
                          fontSize: 14,
                          height: 1.4,
                        ),
                        boldColor: isUser ? Colors.white : AppTheme.primaryNavy,
                      ),
                      if (isUser && _findMatchingSample(message.content) != null) ...[
                        const SizedBox(height: 8),
                        _buildSampleCard(context, _findMatchingSample(message.content)!, isUser),
                      ],
                      const SizedBox(height: 4),
                      Align(
                        alignment: Alignment.bottomRight,
                        child: Text(
                          timeStr,
                          style: TextStyle(
                            fontSize: 10,
                            color: isUser ? Colors.white70 : AppTheme.textMuted,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              if (isUser) ...[
                const SizedBox(width: 8),
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: AppTheme.secondaryAmber,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Icon(Icons.person, color: AppTheme.primaryNavy, size: 18),
                ),
              ],
            ],
          ),
          if (message.actionOptions != null && message.actionOptions!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Padding(
              padding: const EdgeInsets.only(left: 40),
              child: Wrap(
                spacing: 4,
                runSpacing: 4,
                children: message.actionOptions!.map((opt) {
                  final isSample = opt.contains('Sample') || opt.contains('✨');
                  final isUpload = opt.contains('Upload') || opt.contains('📤');
                  return ActionChip(
                    visualDensity: VisualDensity.compact,
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    avatar: isSample
                        ? const Icon(Icons.verified, size: 14, color: AppTheme.primaryNavy)
                        : (isUpload
                            ? const Icon(Icons.upload_file, size: 14, color: AppTheme.primaryNavy)
                            : null),
                    label: Text(
                      opt,
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: (isSample || isUpload) ? FontWeight.bold : FontWeight.w500,
                        color: AppTheme.primaryNavy,
                      ),
                    ),
                    backgroundColor: isSample
                        ? const Color(0xFFFEF3C7)
                        : (isUpload ? const Color(0xFFEFF6FF) : Colors.white),
                    side: BorderSide(
                      color: isSample
                          ? AppTheme.secondaryAmber
                          : (isUpload ? const Color(0xFF93C5FD) : AppTheme.borderSubtle),
                      width: isSample ? 1.5 : 1.0,
                    ),
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    onPressed: () => onActionSelected?.call(opt),
                  );
                }).toList(),
              ),
            ),
          ],
        ],
      ),
    );
  }

  SampleDocument? _findMatchingSample(String content) {
    if (!content.contains('📎') && !content.toLowerCase().contains('attached')) {
      return null;
    }

    final lower = content.toLowerCase();
    for (final sample in SampleDocumentService.samples) {
      final base = sample.fileName.toLowerCase().replaceAll('.pdf', '').replaceAll('.png', '');
      if (lower.contains(sample.fileName.toLowerCase()) ||
          lower.contains(base) ||
          lower.contains(sample.title.toLowerCase())) {
        return sample;
      }
    }
    return null;
  }

  Widget _buildSampleCard(BuildContext context, SampleDocument sample, bool isUser) {
    return InkWell(
      onTap: () => SampleDocumentViewerDialog.show(context, sample),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.all(8),
        margin: const EdgeInsets.only(top: 4),
        decoration: BoxDecoration(
          color: isUser ? Colors.white.withValues(alpha: 0.15) : const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isUser ? Colors.white30 : const Color(0xFFCBD5E1),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: Image.asset(
                sample.previewAssetPath,
                width: 32,
                height: 40,
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => Icon(
                  sample.icon,
                  size: 22,
                  color: isUser ? Colors.white : AppTheme.primaryNavy,
                ),
              ),
            ),
            const SizedBox(width: 10),
            Flexible(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Flexible(
                        child: Text(
                          sample.title,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: isUser ? Colors.white : AppTheme.primaryNavy,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                        decoration: BoxDecoration(
                          color: isUser ? Colors.white24 : const Color(0xFFDCFCE7),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          'PREVIEW',
                          style: TextStyle(
                            fontSize: 8.5,
                            fontWeight: FontWeight.bold,
                            color: isUser ? Colors.white : const Color(0xFF166534),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.visibility,
                        size: 12,
                        color: isUser ? AppTheme.secondaryAmber : const Color(0xFF2563EB),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'Click to view full document (${sample.fileSize})',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: isUser ? AppTheme.secondaryAmber : const Color(0xFF2563EB),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
