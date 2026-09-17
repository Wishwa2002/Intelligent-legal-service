import 'package:flutter/material.dart';
import '../config/app_theme.dart';
import '../services/document_and_clerk/sample_document_service.dart';

/// Interactive viewer dialog to view full high-resolution sample legal documents.
class SampleDocumentViewerDialog extends StatelessWidget {
  final SampleDocument sample;
  final VoidCallback? onUpload;

  const SampleDocumentViewerDialog({
    super.key,
    required this.sample,
    this.onUpload,
  });

  static Future<void> show(
    BuildContext context,
    SampleDocument sample, {
    VoidCallback? onUpload,
  }) {
    return showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => SampleDocumentViewerDialog(
        sample: sample,
        onUpload: onUpload,
      ),
    );
  }

  static Future<void> showByName(
    BuildContext context,
    String fileNameOrTitle, {
    VoidCallback? onUpload,
  }) {
    SampleDocument? matched;
    for (final s in SampleDocumentService.samples) {
      if (s.fileName.toLowerCase() == fileNameOrTitle.toLowerCase() ||
          s.title.toLowerCase() == fileNameOrTitle.toLowerCase() ||
          fileNameOrTitle.toLowerCase().contains(s.fileName.toLowerCase().replaceAll('.pdf', '')) ||
          s.fileName.toLowerCase().contains(fileNameOrTitle.toLowerCase().replaceAll('.pdf', ''))) {
        matched = s;
        break;
      }
    }
    matched ??= SampleDocumentService.getMatchingSample(fileNameOrTitle);
    matched ??= SampleDocumentService.samples.first;

    return show(context, matched, onUpload: onUpload);
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;

    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      backgroundColor: const Color(0xFF0F172A),
      child: Container(
        width: double.infinity,
        constraints: BoxConstraints(maxHeight: size.height * 0.88),
        child: Column(
          children: [
            // Top Bar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: const BoxDecoration(
                color: Color(0xFF1E293B),
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                border: Border(bottom: BorderSide(color: Color(0xFF334155))),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryNavy,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppTheme.secondaryAmber.withValues(alpha: 0.4)),
                    ),
                    child: Icon(sample.icon, color: AppTheme.secondaryAmber, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          sample.title,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                              decoration: BoxDecoration(
                                color: const Color(0xFF065F46),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text(
                                '✓ VALID LEGAL TEMPLATE',
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFFA7F3D0),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              sample.fileName,
                              style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white70),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),

            // Document Zoomable Preview Body
            Expanded(
              child: Container(
                color: const Color(0xFF090D16),
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    InteractiveViewer(
                      minScale: 0.8,
                      maxScale: 4.0,
                      boundaryMargin: const EdgeInsets.all(20),
                      child: Center(
                        child: Container(
                          margin: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(8),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.6),
                                blurRadius: 16,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.asset(
                              sample.previewAssetPath,
                              fit: BoxFit.contain,
                              errorBuilder: (ctx, err, stack) => Container(
                                padding: const EdgeInsets.all(32),
                                color: const Color(0xFF1E293B),
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.description, size: 64, color: AppTheme.secondaryAmber),
                                    const SizedBox(height: 16),
                                    Text(
                                      sample.title,
                                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      sample.description,
                                      style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                                      textAlign: TextAlign.center,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    Positioned(
                      bottom: 12,
                      right: 12,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.7),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: Colors.white12),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.zoom_in, color: Colors.white70, size: 14),
                            SizedBox(width: 4),
                            Text(
                              'Pinch to zoom',
                              style: TextStyle(color: Colors.white70, fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Bottom Footer with details and upload button
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: const BoxDecoration(
                color: Color(0xFF1E293B),
                borderRadius: BorderRadius.vertical(bottom: Radius.circular(20)),
                border: Border(top: BorderSide(color: Color(0xFF334155))),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          sample.docType,
                          style: const TextStyle(
                            color: AppTheme.secondaryAmber,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          sample.description,
                          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  if (onUpload != null) ...[
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.secondaryAmber,
                        foregroundColor: AppTheme.primaryNavy,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      onPressed: () {
                        Navigator.pop(context);
                        onUpload?.call();
                      },
                      icon: const Icon(Icons.upload_file, size: 16),
                      label: const Text('Attach & Upload', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                    ),
                  ] else ...[
                    OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white70,
                        side: const BorderSide(color: Color(0xFF475569)),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Close', style: TextStyle(fontSize: 12)),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
