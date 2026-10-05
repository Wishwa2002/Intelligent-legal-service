import 'package:flutter/material.dart';
import '../../../config/app_theme.dart';
import '../../../models/documentation_service.dart';
import '../../../services/documentation_service.dart';
import '../../../widgets/server_settings_dialog.dart';
import 'manual_request_dialog.dart';
import '../../chat/ai_chat_screen.dart';

class ServicesCatalogScreen extends StatefulWidget {
  const ServicesCatalogScreen({super.key});

  @override
  State<ServicesCatalogScreen> createState() => _ServicesCatalogScreenState();
}

class _ServicesCatalogScreenState extends State<ServicesCatalogScreen> {
  List<DocumentationService> _services = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchServices();
  }

  Future<void> _fetchServices() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final list = await DocumentationApiService.getServices();
      if (mounted) {
        setState(() {
          _services = list;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to load services: $e';
          _loading = false;
        });
      }
    }
  }

  void _openManualRequestModal([DocumentationService? initialService]) {
    if (_services.isEmpty) {
      _fetchServices();
      return;
    }
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => ManualRequestCreationBottomSheet(
        services: _services,
        initialService: initialService,
      ),
    );
  }

  void _openRequestModal(DocumentationService service) {
    _openManualRequestModal(service);
  }


  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Row(
          children: [
            Text('⚖️ ', style: TextStyle(fontSize: 18)),
            Text('Legal', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, letterSpacing: -0.2)),
            Text('Ease', style: TextStyle(color: AppTheme.gold, fontWeight: FontWeight.bold, letterSpacing: -0.2)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_task_rounded, color: AppTheme.gold),
            tooltip: 'Create Manual Request',
            onPressed: () => _openManualRequestModal(),
          ),
          IconButton(
            icon: const Icon(Icons.settings_input_antenna),
            tooltip: 'Server Settings',
            onPressed: () => showServerSettingsDialog(context, onSaved: _fetchServices),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchServices,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.gold))
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.cloud_off, size: 48, color: Colors.grey),
                        const SizedBox(height: 12),
                        Text(_error!, textAlign: TextAlign.center, style: const TextStyle(fontSize: 13)),
                        const SizedBox(height: 16),
                        ElevatedButton(onPressed: _fetchServices, child: const Text('Retry Connection')),
                      ],
                    ),
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [

                    // ── Legal Documentation Services (Matching ServicesSection) ──
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text(
                            'WHAT WE OFFER',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 1.2,
                              color: AppTheme.goldDark,
                            ),
                          ),
                          SizedBox(height: 4),
                          Text(
                            'Legal Documentation Services',
                            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.primaryNavy),
                          ),
                          SizedBox(height: 4),
                          Text(
                            'Professional document review, legal drafting, and automated clerk assignment.',
                            style: TextStyle(fontSize: 13, color: AppTheme.textMuted),
                          ),
                        ],
                      ),
                    ),

                    // ── Direct Create Request Action Banner ───────────────────────
                    Container(
                      margin: const EdgeInsets.only(top: 14, bottom: 18),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [AppTheme.primaryNavy, Color(0xFF1E293B)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppTheme.gold.withValues(alpha: 0.3)),
                        boxShadow: [
                          BoxShadow(
                            color: AppTheme.primaryNavy.withValues(alpha: 0.18),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: AppTheme.gold.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.post_add_rounded, color: AppTheme.gold, size: 24),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: const [
                                Text(
                                  'Know what to submit?',
                                  style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                                ),
                                SizedBox(height: 2),
                                Text(
                                  'Create a request directly for Admin & Clerk review.',
                                  style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 11),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.gold,
                              foregroundColor: AppTheme.primaryNavy,
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              elevation: 0,
                            ),
                            icon: const Icon(Icons.add, size: 16),
                            label: const Text('Create Request', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold)),
                            onPressed: () => _openManualRequestModal(),
                          ),
                        ],
                      ),
                    ),

                    // Service Cards
                    ..._services.map((svc) {
                      return Container(
                        margin: const EdgeInsets.only(bottom: 16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFE3E9F1)),
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.primaryNavy.withValues(alpha: 0.04),
                              blurRadius: 12,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(18),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: AppTheme.primaryNavy,
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: const Icon(Icons.description_outlined, color: AppTheme.gold, size: 22),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      svc.name,
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                        color: AppTheme.primaryNavy,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Text(
                                svc.description,
                                style: const TextStyle(fontSize: 13, color: AppTheme.textMuted, height: 1.4),
                              ),

                              // Gold accent line matching web ServicesSection
                              Container(
                                margin: const EdgeInsets.only(top: 12, bottom: 12),
                                height: 2,
                                width: 40,
                                decoration: BoxDecoration(
                                  color: AppTheme.gold,
                                  borderRadius: BorderRadius.circular(1),
                                ),
                              ),

                              if (svc.requiredDocuments.isNotEmpty) ...[
                                const Text(
                                  'Required Documents:',
                                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primaryNavy),
                                ),
                                const SizedBox(height: 6),
                                Wrap(
                                  spacing: 6,
                                  runSpacing: 6,
                                  children: svc.requiredDocuments
                                      .map((d) => Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                            decoration: BoxDecoration(
                                              color: AppTheme.gold.withValues(alpha: 0.12),
                                              borderRadius: BorderRadius.circular(6),
                                              border: Border.all(color: AppTheme.gold.withValues(alpha: 0.3)),
                                            ),
                                            child: Text(
                                              d,
                                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: AppTheme.goldDark),
                                            ),
                                          ))
                                      .toList(),
                                ),
                              ],
                              const SizedBox(height: 16),
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppTheme.primaryNavy,
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                    elevation: 0,
                                  ),
                                  onPressed: () => _openRequestModal(svc),
                                  child: const Text('Request This Service'),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                  ],
                ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const AiChatScreen()),
          );
        },
        backgroundColor: AppTheme.gold,
        icon: const Icon(Icons.smart_toy_rounded, color: AppTheme.primaryNavy),
        label: const Text(
          'Document Agent',
          style: TextStyle(
            color: AppTheme.primaryNavy,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}
