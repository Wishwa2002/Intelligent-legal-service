import 'package:flutter/material.dart';
import '../../../config/app_theme.dart';
import '../../../models/documentation_service.dart';
import '../../../services/auth_service.dart';
import '../../../services/documentation_service.dart';
import '../../auth/login_screen.dart';
import '../requests/request_detail_screen.dart';

class RequestCreationBottomSheet extends StatefulWidget {
  final DocumentationService service;
  const RequestCreationBottomSheet({super.key, required this.service});

  @override
  State<RequestCreationBottomSheet> createState() => _RequestCreationBottomSheetState();
}

class _RequestCreationBottomSheetState extends State<RequestCreationBottomSheet> {
  final _docTypeController = TextEditingController();
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _docTypeController.text = widget.service.name;
  }

  Future<void> _submitRequest() async {
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

      final created = await DocumentationApiService.createRequest(
        customerId: customerId,
        serviceId: widget.service.serviceId,
        documentType: _docTypeController.text.trim(),
      );

      if (mounted) {
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Request #${created.requestId} created!'),
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
            content: Text('Error: $e'),
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
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Request ${widget.service.name}',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            widget.service.description,
            style: const TextStyle(fontSize: 13, color: AppTheme.textMuted),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _docTypeController,
            decoration: const InputDecoration(
              labelText: 'Document Type / Title',
              hintText: 'e.g. Residential Lease Agreement',
            ),
          ),
          if (widget.service.requiredDocuments.isNotEmpty) ...[
            const SizedBox(height: 16),
            const Text('Documents you will need to provide:',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.slateDark)),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: widget.service.requiredDocuments
                  .map((d) => Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFFFDE68A)),
                        ),
                        child: Text(d, style: const TextStyle(fontSize: 11, color: Color(0xFF92400E))),
                      ))
                  .toList(),
            ),
          ],
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.secondaryAmber,
                foregroundColor: AppTheme.primaryNavy,
              ),
              onPressed: _submitting ? null : _submitRequest,
              child: _submitting
                  ? const CircularProgressIndicator(color: AppTheme.primaryNavy)
                  : const Text('Submit Request & Begin Review', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }
}
