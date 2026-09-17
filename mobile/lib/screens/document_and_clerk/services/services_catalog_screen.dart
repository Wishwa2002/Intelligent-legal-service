import 'package:flutter/material.dart';
import '../../../config/app_theme.dart';
import '../../../models/documentation_service.dart';
import '../../../services/documentation_service.dart';
import '../../../widgets/server_settings_dialog.dart';
import 'request_creation_dialog.dart';

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

  void _openRequestModal(DocumentationService service) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => RequestCreationBottomSheet(service: service),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Row(
          children: [
            Text('LEX', style: TextStyle(color: AppTheme.secondaryAmber, fontWeight: FontWeight.bold)),
            Text('INTELLIGENCE', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ],
        ),
        actions: [
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
          ? const Center(child: CircularProgressIndicator(color: AppTheme.secondaryAmber))
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
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Legal Documentation Services',
                            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.primaryNavy),
                          ),
                          SizedBox(height: 4),
                          Text(
                            'Automated legal review, AI document verification, and clerk assignment.',
                            style: TextStyle(fontSize: 13, color: AppTheme.textMuted),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    ..._services.map((svc) {
                      return Card(
                        margin: const EdgeInsets.only(bottom: 16),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: AppTheme.primaryNavy,
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: const Icon(Icons.gavel, color: AppTheme.secondaryAmber, size: 20),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      svc.name,
                                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.primaryNavy),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Text(svc.description, style: const TextStyle(fontSize: 13, color: AppTheme.slateDark)),
                              if (svc.requiredDocuments.isNotEmpty) ...[
                                const SizedBox(height: 12),
                                const Text('Required Documents:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.textMuted)),
                                const SizedBox(height: 6),
                                Wrap(
                                  spacing: 6,
                                  runSpacing: 6,
                                  children: svc.requiredDocuments
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
                              const SizedBox(height: 16),
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton(
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
    );
  }
}
