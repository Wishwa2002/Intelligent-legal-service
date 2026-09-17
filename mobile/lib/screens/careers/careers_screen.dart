import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../models/career_model.dart';
import '../../services/career_service.dart';
import 'job_application_dialog.dart';

// Helper to resolve role images bundled in mobile/assets/careers/
String getRoleAsset(String title, [int index = 0]) {
  final lower = title.toLowerCase();
  if (lower.contains('corporate') || lower.contains('commercial')) {
    return 'assets/careers/corporate_counsel.jpg';
  }
  if (lower.contains('clerk') || lower.contains('documentation') || lower.contains('operation')) {
    return 'assets/careers/legal_clerk.jpg';
  }
  if (lower.contains('litigation') || lower.contains('dispute') || lower.contains('associate')) {
    return 'assets/careers/litigation_associate.jpg';
  }
  if (lower.contains('ai') || lower.contains('engineer') || lower.contains('tech') || lower.contains('intelligence')) {
    return 'assets/careers/ai_legal_tech.jpg';
  }
  const fallbacks = [
    'assets/careers/corporate_counsel.jpg',
    'assets/careers/legal_clerk.jpg',
    'assets/careers/litigation_associate.jpg',
    'assets/careers/ai_legal_tech.jpg',
  ];
  return fallbacks[index % fallbacks.length];
}

class CareersScreen extends StatefulWidget {
  const CareersScreen({super.key});

  @override
  State<CareersScreen> createState() => _CareersScreenState();
}

class _CareersScreenState extends State<CareersScreen> {
  List<CareerModel> _careers = [];
  bool _loading = true;
  String? _error;
  String _selectedDepartment = 'ALL';

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

  List<String> get _departments {
    final depts = <String>{'ALL'};
    for (final c in _careers) {
      depts.add(c.department);
    }
    return depts.toList();
  }

  List<CareerModel> get _filteredCareers {
    if (_selectedDepartment == 'ALL') return _careers;
    return _careers.where((c) => c.department == _selectedDepartment).toList();
  }

  @override
  Widget build(BuildContext context) {
    final canPop = Navigator.canPop(context);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Careers & Vacancies', style: TextStyle(fontWeight: FontWeight.bold)),
        leading: canPop
            ? IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => Navigator.pop(context),
              )
            : null,
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
                        Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: AppTheme.textMuted)),
                        const SizedBox(height: 16),
                        ElevatedButton(onPressed: _fetchCareers, child: const Text('Retry')),
                      ],
                    ),
                  ),
                )
              : CustomScrollView(
                  slivers: [
                    // Hero Branding Header
                    SliverToBoxAdapter(
                      child: Container(
                        margin: const EdgeInsets.fromLTRB(16, 16, 16, 12),
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.1),
                              blurRadius: 16,
                              offset: const Offset(0, 6),
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
                                    color: AppTheme.secondaryAmber.withValues(alpha: 0.2),
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(
                                      color: AppTheme.secondaryAmber.withValues(alpha: 0.5),
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: const [
                                      Icon(Icons.stars_rounded, color: AppTheme.secondaryAmber, size: 14),
                                      SizedBox(width: 4),
                                      Text(
                                        'PUBLIC PORTAL',
                                        style: TextStyle(
                                          color: AppTheme.secondaryAmber,
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                          letterSpacing: 0.5,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Text(
                                  '${_careers.length} Roles Open',
                                  style: const TextStyle(
                                    color: Colors.white70,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            const Text(
                              'Join Our Legal Chambers & Tech Team',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                letterSpacing: -0.3,
                              ),
                            ),
                            const SizedBox(height: 6),
                            const Text(
                              'Open opportunities for counsel, documentation clerks, litigation associates, and AI engineers. Anyone can apply directly.',
                              style: TextStyle(
                                color: Color(0xFF94A3B8),
                                fontSize: 12,
                                height: 1.4,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    // Filter Chips Bar
                    if (_departments.length > 1)
                      SliverToBoxAdapter(
                        child: SizedBox(
                          height: 48,
                          child: ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            scrollDirection: Axis.horizontal,
                            itemCount: _departments.length,
                            itemBuilder: (ctx, idx) {
                              final dept = _departments[idx];
                              final isSelected = _selectedDepartment == dept;
                              return Padding(
                                padding: const EdgeInsets.only(right: 8),
                                child: FilterChip(
                                  selected: isSelected,
                                  showCheckmark: false,
                                  label: Text(
                                    dept == 'ALL' ? 'All Roles' : dept,
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                      color: isSelected ? AppTheme.primaryNavy : AppTheme.slateDark,
                                    ),
                                  ),
                                  backgroundColor: Colors.white,
                                  selectedColor: AppTheme.secondaryAmber.withValues(alpha: 0.35),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    side: BorderSide(
                                      color: isSelected ? AppTheme.secondaryAmber : const Color(0xFFE2E8F0),
                                    ),
                                  ),
                                  onSelected: (_) {
                                    setState(() => _selectedDepartment = dept);
                                  },
                                ),
                              );
                            },
                          ),
                        ),
                      ),

                    const SliverToBoxAdapter(child: SizedBox(height: 8)),

                    // Career Cards List
                    _filteredCareers.isEmpty
                        ? const SliverFillRemaining(
                            hasScrollBody: false,
                            child: Center(
                              child: Text(
                                'No job openings found in this category.',
                                style: TextStyle(color: AppTheme.textMuted),
                              ),
                            ),
                          )
                        : SliverPadding(
                            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                            sliver: SliverList(
                              delegate: SliverChildBuilderDelegate(
                                (ctx, i) {
                                  final career = _filteredCareers[i];
                                  final imageAsset = getRoleAsset(career.jobTitle, i);

                                  return Container(
                                    margin: const EdgeInsets.only(bottom: 18),
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(20),
                                      border: Border.all(color: const Color(0xFFE2E8F0)),
                                      boxShadow: [
                                        BoxShadow(
                                          color: Colors.black.withValues(alpha: 0.04),
                                          blurRadius: 12,
                                          offset: const Offset(0, 4),
                                        ),
                                      ],
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        // Header Image with Badges
                                        Stack(
                                          children: [
                                            ClipRRect(
                                              borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                                              child: Image.asset(
                                                imageAsset,
                                                height: 160,
                                                width: double.infinity,
                                                fit: BoxFit.cover,
                                                errorBuilder: (context, error, stackTrace) => Container(
                                                  height: 160,
                                                  color: AppTheme.primaryNavy,
                                                  child: const Center(
                                                    child: Icon(Icons.gavel_rounded, color: AppTheme.secondaryAmber, size: 48),
                                                  ),
                                                ),
                                              ),
                                            ),
                                            // Top Gradient Overlay
                                            Positioned(
                                              top: 0,
                                              left: 0,
                                              right: 0,
                                              height: 60,
                                              child: Container(
                                                decoration: BoxDecoration(
                                                  borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                                                  gradient: LinearGradient(
                                                    colors: [
                                                      Colors.black.withValues(alpha: 0.5),
                                                      Colors.transparent,
                                                    ],
                                                    begin: Alignment.topCenter,
                                                    end: Alignment.bottomCenter,
                                                  ),
                                                ),
                                              ),
                                            ),
                                            // Department Pill Badge
                                            Positioned(
                                              top: 12,
                                              left: 12,
                                              child: Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                                decoration: BoxDecoration(
                                                  color: const Color(0xFF0F172A).withValues(alpha: 0.85),
                                                  borderRadius: BorderRadius.circular(10),
                                                  border: Border.all(
                                                    color: AppTheme.secondaryAmber.withValues(alpha: 0.4),
                                                  ),
                                                ),
                                                child: Text(
                                                  career.department,
                                                  style: const TextStyle(
                                                    color: AppTheme.secondaryAmber,
                                                    fontSize: 11,
                                                    fontWeight: FontWeight.bold,
                                                  ),
                                                ),
                                              ),
                                            ),
                                            // Ref ID Pill
                                            Positioned(
                                              top: 12,
                                              right: 12,
                                              child: Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                                decoration: BoxDecoration(
                                                  color: Colors.black.withValues(alpha: 0.6),
                                                  borderRadius: BorderRadius.circular(8),
                                                ),
                                                child: Text(
                                                  'Ref #${career.careerId}',
                                                  style: const TextStyle(
                                                    color: Colors.white,
                                                    fontSize: 10,
                                                    fontWeight: FontWeight.w600,
                                                  ),
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),

                                        // Body Info
                                        Padding(
                                          padding: const EdgeInsets.all(16),
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                career.jobTitle,
                                                style: const TextStyle(
                                                  fontSize: 17,
                                                  fontWeight: FontWeight.bold,
                                                  color: AppTheme.primaryNavy,
                                                  letterSpacing: -0.2,
                                                ),
                                              ),
                                              const SizedBox(height: 8),

                                              // Metadata Badges Row
                                              Row(
                                                children: [
                                                  Container(
                                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                                    decoration: BoxDecoration(
                                                      color: const Color(0xFFF1F5F9),
                                                      borderRadius: BorderRadius.circular(6),
                                                    ),
                                                    child: Row(
                                                      mainAxisSize: MainAxisSize.min,
                                                      children: [
                                                        const Icon(Icons.schedule, size: 12, color: AppTheme.slateDark),
                                                        const SizedBox(width: 4),
                                                        Text(
                                                          career.jobType,
                                                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: AppTheme.slateDark),
                                                        ),
                                                      ],
                                                    ),
                                                  ),
                                                  const SizedBox(width: 8),
                                                  Expanded(
                                                    child: Row(
                                                      children: [
                                                        const Icon(Icons.location_on_outlined, size: 13, color: AppTheme.textMuted),
                                                        const SizedBox(width: 2),
                                                        Flexible(
                                                          child: Text(
                                                            career.location,
                                                            overflow: TextOverflow.ellipsis,
                                                            style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                                                          ),
                                                        ),
                                                      ],
                                                    ),
                                                  ),
                                                ],
                                              ),
                                              const SizedBox(height: 12),

                                              // Description
                                              Text(
                                                career.description,
                                                maxLines: 4,
                                                overflow: TextOverflow.ellipsis,
                                                style: const TextStyle(
                                                  fontSize: 12.5,
                                                  height: 1.45,
                                                  color: Color(0xFF475569),
                                                ),
                                              ),
                                              const SizedBox(height: 16),

                                              // Action Button
                                              Row(
                                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                children: [
                                                  const Text(
                                                    'Accepting Applications',
                                                    style: TextStyle(
                                                      fontSize: 11,
                                                      fontWeight: FontWeight.w600,
                                                      color: Color(0xFF059669),
                                                    ),
                                                  ),
                                                  ElevatedButton.icon(
                                                    style: ElevatedButton.styleFrom(
                                                      backgroundColor: AppTheme.secondaryAmber,
                                                      foregroundColor: AppTheme.primaryNavy,
                                                      elevation: 0,
                                                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                                      shape: RoundedRectangleBorder(
                                                        borderRadius: BorderRadius.circular(12),
                                                      ),
                                                    ),
                                                    icon: const Icon(Icons.send_rounded, size: 14),
                                                    label: const Text(
                                                      'Apply Now',
                                                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                                    ),
                                                    onPressed: () => _openApplyDialog(career),
                                                  ),
                                                ],
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  );
                                },
                                childCount: _filteredCareers.length,
                              ),
                            ),
                          ),
                  ],
                ),
    );
  }
}
