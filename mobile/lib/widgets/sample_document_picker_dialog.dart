import 'package:flutter/material.dart';
import '../config/app_theme.dart';
import '../services/document_and_clerk/sample_document_service.dart';
import 'sample_document_viewer_dialog.dart';

Future<SampleDocument?> showSampleDocumentPickerSheet(BuildContext context, {String? targetDocType}) async {
  final matching = SampleDocumentService.getMatchingSample(targetDocType);
  final List<SampleDocument> displaySamples = List.from(SampleDocumentService.samples);
  if (matching != null) {
    displaySamples.removeWhere((s) => s.fileName == matching.fileName);
    displaySamples.insert(0, matching);
  }

  return await showModalBottomSheet<SampleDocument>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        top: 20,
        left: 20,
        right: 20,
        bottom: MediaQuery.of(ctx).padding.bottom + 20,
      ),
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(ctx).size.height * 0.88,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppTheme.primaryNavy,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.verified, color: AppTheme.secondaryAmber, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      targetDocType != null ? 'Sample: $targetDocType' : 'Sample Documents (${displaySamples.length})',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.primaryNavy),
                    ),
                    Text(
                      targetDocType != null
                          ? 'Choose or preview verified legal document'
                          : 'Click "View" to preview document or "Select" to upload',
                      style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.pop(ctx),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Notice box
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFFEFF6FF),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFBFDBFE)),
            ),
            child: Row(
              children: [
                const Icon(Icons.touch_app_outlined, color: Color(0xFF1D4ED8), size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    targetDocType != null
                        ? 'Tap 👁️ View to inspect document text & stamps, or Select to upload directly.'
                        : 'All 9 legal documents are certified templates. Tap 👁️ View to preview or Select to upload.',
                    style: const TextStyle(fontSize: 11, color: Color(0xFF1E40AF)),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Document list
          Flexible(
            child: ListView.separated(
              shrinkWrap: true,
              itemCount: displaySamples.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (ctx, i) {
                final sample = displaySamples[i];
                final isRecommended = matching != null && sample.fileName == matching.fileName;
                return Card(
                  margin: EdgeInsets.zero,
                  elevation: isRecommended ? 2 : 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(
                      color: isRecommended ? AppTheme.secondaryAmber : AppTheme.borderSubtle,
                      width: isRecommended ? 2 : 1,
                    ),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            GestureDetector(
                              onTap: () {
                                SampleDocumentViewerDialog.show(
                                  ctx,
                                  sample,
                                  onUpload: () => Navigator.pop(ctx, sample),
                                );
                              },
                              child: Stack(
                                children: [
                                  Container(
                                    width: 48,
                                    height: 56,
                                    decoration: BoxDecoration(
                                      color: AppTheme.primaryNavy.withValues(alpha: 0.08),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: AppTheme.borderSubtle),
                                    ),
                                    child: ClipRRect(
                                      borderRadius: BorderRadius.circular(7),
                                      child: Image.asset(
                                        sample.previewAssetPath,
                                        fit: BoxFit.cover,
                                        errorBuilder: (_, _, _) => Icon(sample.icon, color: AppTheme.primaryNavy, size: 22),
                                      ),
                                    ),
                                  ),
                                  Positioned(
                                    bottom: 2,
                                    right: 2,
                                    child: Container(
                                      padding: const EdgeInsets.all(2),
                                      decoration: BoxDecoration(
                                        color: Colors.black87,
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: const Icon(Icons.zoom_in, color: Colors.white, size: 10),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          sample.title,
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFDCFCE7),
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: const Text(
                                          '✓ VERIFIED',
                                          style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF166534)),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    sample.description,
                                    style: const TextStyle(fontSize: 11, color: AppTheme.slateDark),
                                  ),
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      Text(
                                        sample.fileName,
                                        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppTheme.textMuted),
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        '•  ${sample.fileSize}',
                                        style: const TextStyle(fontSize: 10, color: AppTheme.textMuted),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton.icon(
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(vertical: 6),
                                  side: const BorderSide(color: AppTheme.primaryNavy),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                                icon: const Icon(Icons.visibility_outlined, size: 14, color: AppTheme.primaryNavy),
                                label: const Text('View Document', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.primaryNavy)),
                                onPressed: () {
                                  SampleDocumentViewerDialog.show(
                                    ctx,
                                    sample,
                                    onUpload: () => Navigator.pop(ctx, sample),
                                  );
                                },
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: ElevatedButton.icon(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: isRecommended ? AppTheme.secondaryAmber : AppTheme.primaryNavy,
                                  foregroundColor: isRecommended ? AppTheme.primaryNavy : Colors.white,
                                  padding: const EdgeInsets.symmetric(vertical: 6),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                                icon: const Icon(Icons.check_circle_outline, size: 14),
                                label: const Text('Select & Upload', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                onPressed: () => Navigator.pop(ctx, sample),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    ),
  );
}
