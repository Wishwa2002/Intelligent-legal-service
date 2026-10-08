import 'package:flutter/material.dart';
import '../../../config/app_theme.dart';
import '../../../models/documentation_service.dart';
import '../../../services/auth_service.dart';
import '../../../services/documentation_service.dart';
import '../../auth/login_screen.dart';
import '../requests/request_detail_screen.dart';

class ManualRequestCreationBottomSheet extends StatefulWidget {
  final List<DocumentationService> services;
  final DocumentationService? initialService;

  const ManualRequestCreationBottomSheet({
    super.key,
    required this.services,
    this.initialService,
  });

  @override
  State<ManualRequestCreationBottomSheet> createState() => _ManualRequestCreationBottomSheetState();
}

class _ManualRequestCreationBottomSheetState extends State<ManualRequestCreationBottomSheet> {
  DocumentationService? _selectedService;
  final _docTitleController = TextEditingController();
  final _notesController = TextEditingController();
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    if (widget.initialService != null) {
      _selectedService = widget.initialService;
    } else if (widget.services.isNotEmpty) {
      _selectedService = widget.services.first;
    }
    if (_selectedService != null) {
      _docTitleController.text = _selectedService!.name;
    }
  }

  @override
  void dispose() {
    _docTitleController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  void _onServiceChanged(DocumentationService? svc) {
    if (svc == null) return;
    setState(() {
      _selectedService = svc;
      _docTitleController.text = svc.name;
    });
  }

  Future<void> _submitRequest() async {
    if (_selectedService == null) return;

    final user = AuthService.currentUser.value;
    if (user == null) {
      final loggedIn = await Navigator.push<bool>(
        context,
        MaterialPageRoute(builder: (_) => const LoginScreen()),
      );
      if (loggedIn != true) return;
    }

    setState(() => _submitting = true);
    try {
      final currentUser = AuthService.currentUser.value;
      final customerId = currentUser != null
          ? (int.tryParse(currentUser.userId) ?? 1)
          : 1;

      final docType = _docTitleController.text.trim().isNotEmpty
          ? _docTitleController.text.trim()
          : _selectedService!.name;

      final created = await DocumentationApiService.createRequest(
        customerId: customerId,
        serviceId: _selectedService!.serviceId,
        documentType: docType,
      );

      if (mounted) {
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Request #${created.requestId} submitted for review!'),
            backgroundColor: AppTheme.statusCompleted,
            action: SnackBarAction(
              label: 'View',
              textColor: Colors.white,
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => RequestDetailScreen(requestId: created.requestId),
                  ),
                );
              },
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to create request: $e'),
            backgroundColor: AppTheme.statusRequiresDocs,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final svc = _selectedService;

    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Row
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryNavy,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.post_add_rounded, color: AppTheme.gold, size: 22),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Create Service Request',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primaryNavy),
                      ),
                      Text(
                        'Direct submission for Admin & Clerk review',
                        style: TextStyle(fontSize: 11, color: AppTheme.textMuted),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Service Selection Dropdown
            const Text(
              'Select Legal Service:',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.primaryNavy),
            ),
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                border: Border.all(color: const Color(0xFFCBD5E1)),
                borderRadius: BorderRadius.circular(10),
                color: Colors.white,
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<DocumentationService>(
                  value: svc,
                  isExpanded: true,
                  icon: const Icon(Icons.arrow_drop_down, color: AppTheme.primaryNavy),
                  items: widget.services.map((s) {
                    return DropdownMenuItem<DocumentationService>(
                      value: s,
                      child: Text(
                        s.name,
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.primaryNavy),
                        overflow: TextOverflow.ellipsis,
                      ),
                    );
                  }).toList(),
                  onChanged: _onServiceChanged,
                ),
              ),
            ),

            if (svc != null) ...[
              const SizedBox(height: 12),
              Text(
                svc.description,
                style: const TextStyle(fontSize: 12, color: AppTheme.textMuted, height: 1.3),
              ),

              // Required Documents Checklist Box
              if (svc.requiredDocuments.isNotEmpty) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFFBEB),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFFDE68A)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: const [
                          Icon(Icons.checklist_rounded, size: 16, color: Color(0xFF92400E)),
                          SizedBox(width: 6),
                          Text(
                            'Required Documents for Submission:',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF92400E)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: svc.requiredDocuments
                            .map((d) => Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(color: const Color(0xFFF59E0B)),
                                  ),
                                  child: Text(
                                    d,
                                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF92400E)),
                                  ),
                                ))
                            .toList(),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        '💡 You can attach these documents directly after creating this request.',
                        style: TextStyle(fontSize: 10.5, color: Color(0xFF78350F), fontStyle: FontStyle.italic),
                      ),
                    ],
                  ),
                ),
              ],
            ],

            const SizedBox(height: 16),

            // Document Title / Reference field
            TextField(
              controller: _docTitleController,
              decoration: const InputDecoration(
                labelText: 'Request Title / Document Name',
                hintText: 'e.g. Property Transfer Deed - Colombo Plot 4',
                border: OutlineInputBorder(),
                isDense: true,
              ),
            ),

            const SizedBox(height: 20),

            // Submit Button
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryNavy,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
                icon: _submitting
                    ? const SizedBox.shrink()
                    : const Icon(Icons.check_circle_outline, color: AppTheme.gold),
                label: _submitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(color: AppTheme.gold, strokeWidth: 2),
                      )
                    : const Text(
                        'Create Request & Begin Review',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                      ),
                onPressed: _submitting ? null : _submitRequest,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
