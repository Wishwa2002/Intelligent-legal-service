import 'package:flutter/material.dart';
import '../../../config/app_theme.dart';
import '../../../models/documentation_service.dart';
import '../../../services/documentation_service.dart';
import '../../../widgets/server_settings_dialog.dart';
import 'request_creation_dialog.dart';
import '../../appointments/lawyers_screen.dart';
import '../../appointments/my_appointments_screen.dart';

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
            Text('⚖️ ', style: TextStyle(fontSize: 18)),
            Text('Legal', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, letterSpacing: -0.2)),
            Text('Ease', style: TextStyle(color: AppTheme.gold, fontWeight: FontWeight.bold, letterSpacing: -0.2)),
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
                    // ── Hero Banner (Matching Website Hero Section) ──
                    Container(
                      margin: const EdgeInsets.only(bottom: 18),
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [AppTheme.primaryNavy, Color(0xFF090D18)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: AppTheme.primaryNavy.withValues(alpha: 0.25),
                            blurRadius: 16,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppTheme.gold.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: AppTheme.gold.withValues(alpha: 0.6)),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.shield_outlined, size: 12, color: AppTheme.gold),
                                SizedBox(width: 4),
                                Text(
                                  'A MODERN LEGAL PRACTICE',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.gold,
                                    letterSpacing: 0.8,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 12),
                          const Text(
                            'Trusted counsel, supported by intelligent technology',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                              letterSpacing: -0.3,
                              height: 1.25,
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Connect with bar-certified advocates across criminal, family, corporate, and property law with verified documentation assistance.',
                            style: TextStyle(fontSize: 12, color: Color(0xFFE2E8F0), height: 1.45),
                          ),
                        ],
                      ),
                    ),

                    // ── Member 2: Lawyer Consultation & Booking Card ──
                    Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppTheme.gold.withValues(alpha: 0.6), width: 1.5),
                        boxShadow: [
                          BoxShadow(
                            color: AppTheme.gold.withValues(alpha: 0.08),
                            blurRadius: 16,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: AppTheme.primaryNavy,
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.gavel, size: 12, color: AppTheme.gold),
                                    SizedBox(width: 4),
                                    Text(
                                      'APPOINTMENT BOOKING',
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: AppTheme.gold,
                                        letterSpacing: 0.6,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              TextButton.icon(
                                style: TextButton.styleFrom(
                                  foregroundColor: AppTheme.primaryNavy,
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                ),
                                icon: const Icon(Icons.calendar_today, size: 14, color: AppTheme.goldDark),
                                label: const Text('My Bookings', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                onPressed: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(builder: (_) => const MyAppointmentsScreen()),
                                  );
                                },
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          const Text(
                            'Consult a Specialist Lawyer',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primaryNavy),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Select your law domain, choose an advocate, and book your preferred afternoon consultation slot (3:00 – 5:00 PM).',
                            style: TextStyle(fontSize: 12, color: AppTheme.textMuted, height: 1.4),
                          ),
                          const SizedBox(height: 14),

                          // Types of laws chips
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              _buildLawTypeButton('Criminal Law', '⚖️', context),
                              _buildLawTypeButton('Family Law', '👨‍👩‍👧', context),
                              _buildLawTypeButton('Corporate Law', '💼', context),
                              _buildLawTypeButton('Property Law', '🏠', context),
                            ],
                          ),
                          const SizedBox(height: 16),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                              icon: const Icon(Icons.people, size: 16),
                              label: const Text('Browse All Advocates & Slots →'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.gold,
                                foregroundColor: AppTheme.primaryNavy,
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                elevation: 0,
                              ),
                              onPressed: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (_) => const LawyersScreen()),
                                );
                              },
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 28),

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
                    const SizedBox(height: 14),

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
    );
  }

  Widget _buildLawTypeButton(String title, String emoji, BuildContext context) {
    return InkWell(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => LawyersScreen(initialCategory: title),
          ),
        );
      },
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(emoji, style: const TextStyle(fontSize: 14)),
            const SizedBox(width: 6),
            Text(
              title,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.primaryNavy),
            ),
          ],
        ),
      ),
    );
  }
}
