import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../models/career_model.dart';
import '../../services/career_service.dart';
import 'job_application_dialog.dart';

class CareersScreen extends StatefulWidget {
  const CareersScreen({super.key});

  @override
  State<CareersScreen> createState() => _CareersScreenState();
}

class _CareersScreenState extends State<CareersScreen> {
  List<CareerModel> _careers = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchCareers();
  }

  Future<void> _fetchCareers() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final list = await CareerService.getCareers();
      if (mounted) {
        setState(() {
          _careers = list;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to load careers: $e';
          _loading = false;
        });
      }
    }
  }

  void _openApplyDialog(CareerModel career) {
    showDialog(
      context: context,
      builder: (_) => JobApplicationDialog(career: career),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Careers & Vacancies'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchCareers,
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
                        const Icon(Icons.work_off_outlined, size: 48, color: Colors.grey),
                        const SizedBox(height: 12),
                        Text(_error!, textAlign: TextAlign.center),
                        const SizedBox(height: 16),
                        ElevatedButton(onPressed: _fetchCareers, child: const Text('Retry')),
                      ],
                    ),
                  ),
                )
              : _careers.isEmpty
                  ? const Center(child: Text('No job openings posted at this time.'))
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _careers.length,
                      itemBuilder: (ctx, i) {
                        final career = _careers[i];
                        return Card(
                          margin: const EdgeInsets.only(bottom: 14),
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
                                        career.jobTitle,
                                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.primaryNavy),
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFF1F5F9),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(career.jobType, style: const TextStyle(fontSize: 11, color: AppTheme.slateDark)),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Row(
                                  children: [
                                    const Icon(Icons.apartment, size: 14, color: AppTheme.textMuted),
                                    const SizedBox(width: 4),
                                    Text(career.department, style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                                    const SizedBox(width: 12),
                                    const Icon(Icons.location_on_outlined, size: 14, color: AppTheme.textMuted),
                                    const SizedBox(width: 4),
                                    Text(career.location, style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                                  ],
                                ),
                                const SizedBox(height: 10),
                                Text(
                                  career.description,
                                  style: const TextStyle(fontSize: 13, color: AppTheme.slateDark),
                                ),
                                const SizedBox(height: 14),
                                Align(
                                  alignment: Alignment.centerRight,
                                  child: ElevatedButton.icon(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppTheme.secondaryAmber,
                                      foregroundColor: AppTheme.primaryNavy,
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                    ),
                                    icon: const Icon(Icons.send_rounded, size: 16),
                                    label: const Text('Apply Now', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                    onPressed: () => _openApplyDialog(career),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
    );
  }
}
