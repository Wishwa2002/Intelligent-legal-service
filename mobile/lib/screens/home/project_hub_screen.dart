import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../services/auth_service.dart';
import '../../widgets/server_settings_dialog.dart';
import '../appointments/lawyers_screen.dart';
import '../appointments/my_appointments_screen.dart';
import '../careers/careers_screen.dart';
import '../document_and_clerk/services/services_catalog_screen.dart';
import '../document_and_clerk/requests/my_requests_screen.dart';

class ProjectHubScreen extends StatelessWidget {
  final Function(int)? onSwitchTab;

  const ProjectHubScreen({super.key, this.onSwitchTab});

  @override
  Widget build(BuildContext context) {
    final user = AuthService.currentUser.value;
    final userName = user != null && user.fullName.isNotEmpty
        ? user.fullName.split(' ').first
        : 'Client';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: AppTheme.primaryNavy,
        elevation: 0,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppTheme.gold.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppTheme.gold.withValues(alpha: 0.6)),
              ),
              child: const Icon(Icons.account_balance_rounded, size: 18, color: AppTheme.gold),
            ),
            const SizedBox(width: 10),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'LegalEase Platform',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                Text(
                  '4-Member Integrated System',
                  style: TextStyle(fontSize: 10, color: Color(0xFFCBD5E1), letterSpacing: 0.5),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_input_antenna_rounded, color: AppTheme.gold),
            tooltip: 'Server Settings',
            onPressed: () => showServerSettingsDialog(context),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Welcome Banner ───────────────────────────────────────
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppTheme.primaryNavy, Color(0xFF0F172A), Color(0xFF1E293B)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(22),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primaryNavy.withValues(alpha: 0.28),
                    blurRadius: 18,
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
                          color: AppTheme.gold.withValues(alpha: 0.18),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppTheme.gold.withValues(alpha: 0.6)),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.stars_rounded, size: 13, color: AppTheme.gold),
                            SizedBox(width: 4),
                            Text(
                              'INTEGRATED LEGAL HUB',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.gold,
                                letterSpacing: 0.8,
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (user != null)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            user.userType.toUpperCase(),
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFFE2E8F0),
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Text(
                    'Welcome, $userName',
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Select any module below to access counsel, documentation, consultations, or customer support services.',
                    style: TextStyle(fontSize: 12, color: Color(0xFFCBD5E1), height: 1.45),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 22),

            // ── Section Title ────────────────────────────────────────
            Row(
              children: [
                Container(
                  width: 4,
                  height: 18,
                  decoration: BoxDecoration(
                    color: AppTheme.primaryNavy,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(width: 8),
                const Text(
                  'Project Modules & Services',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primaryNavy,
                  ),
                ),
                const Spacer(),
                const Text(
                  '4 Core Parts',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF64748B),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 14),

            // ── 4 Main Module Cards (2x2 Grid) ───────────────────────
            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 2,
              crossAxisSpacing: 14,
              mainAxisSpacing: 14,
              childAspectRatio: 0.95,
              children: [
                // 1. Lawyer Services (Member 1)
                _buildModuleCard(
                  context: context,
                  title: 'Lawyer\nServices',
                  partLabel: 'MEMBER 1 • COUNSEL',
                  description: 'Advocate profiles, bar qualifications & practice areas',
                  icon: Icons.balance_rounded,
                  gradientColors: const [Color(0xFF1E3A8A), Color(0xFF2563EB)],
                  accentColor: const Color(0xFF93C5FD),
                  badgeColor: const Color(0xFF3B82F6),
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const LawyersScreen()),
                    );
                  },
                ),

                // 2. Document & Clerk (Member 3)
                _buildModuleCard(
                  context: context,
                  title: 'Document &\nClerk Services',
                  partLabel: 'MEMBER 3 • DOCUMENT SERVICES',
                  description: '12 legal document services, clerk reviews & filings',
                  icon: Icons.description_rounded,
                  gradientColors: const [Color(0xFF92400E), Color(0xFFD97706)],
                  accentColor: const Color(0xFFFDE68A),
                  badgeColor: const Color(0xFFF59E0B),
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const ServicesCatalogScreen()),
                    );
                  },
                ),

                // 3. Consultation & Booking (Member 2)
                _buildModuleCard(
                  context: context,
                  title: 'Booking &\nConsultation',
                  partLabel: 'MEMBER 2 • SLOTS',
                  description: 'Afternoon slots, conflict validation & appointments',
                  icon: Icons.event_available_rounded,
                  gradientColors: const [Color(0xFF065F46), Color(0xFF059669)],
                  accentColor: const Color(0xFFA7F3D0),
                  badgeColor: const Color(0xFF10B981),
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const MyAppointmentsScreen()),
                    );
                  },
                ),

                // 4. Customer Service & Support (Member 4)
                _buildModuleCard(
                  context: context,
                  title: 'Customer\nSupport',
                  partLabel: 'MEMBER 4 • SUPPORT',
                  description: 'Case tracking, hotline helpdesk & client support',
                  icon: Icons.support_agent_rounded,
                  gradientColors: const [Color(0xFF581C87), Color(0xFF7C3AED)],
                  accentColor: const Color(0xFFDDD6FE),
                  badgeColor: const Color(0xFF8B5CF6),
                  onTap: () => _showCustomerServiceOptions(context),
                ),
              ],
            ),

            const SizedBox(height: 20),

            // ── Quick Access Row ─────────────────────────────────────
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.03),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const MyRequestsScreen()),
                        );
                      },
                      borderRadius: BorderRadius.circular(12),
                      child: const Row(
                        children: [
                          Icon(Icons.assignment_outlined, size: 20, color: Color(0xFFD97706)),
                          SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('My Requests', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                Text('Track clerk reviews', style: TextStyle(fontSize: 10, color: Colors.grey)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  Container(height: 28, width: 1, color: const Color(0xFFE2E8F0)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: InkWell(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const CareersScreen()),
                        );
                      },
                      borderRadius: BorderRadius.circular(12),
                      child: const Row(
                        children: [
                          Icon(Icons.work_outline, size: 20, color: Color(0xFF2563EB)),
                          SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Careers', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                Text('Legal & tech roles', style: TextStyle(fontSize: 10, color: Colors.grey)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildModuleCard({
    required BuildContext context,
    required String title,
    required String partLabel,
    required String description,
    required IconData icon,
    required List<Color> gradientColors,
    required Color accentColor,
    required Color badgeColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: gradientColors,
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: gradientColors.first.withValues(alpha: 0.32),
              blurRadius: 14,
              offset: const Offset(0, 5),
            ),
          ],
        ),
        padding: const EdgeInsets.all(15),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            // Top Row: Icon + Arrow
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.all(9),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(icon, size: 24, color: Colors.white),
                ),
                Container(
                  padding: const EdgeInsets.all(5),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.arrow_forward_rounded, size: 14, color: Colors.white),
                ),
              ],
            ),

            // Middle: Part badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.22),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                partLabel,
                style: TextStyle(
                  fontSize: 8.5,
                  fontWeight: FontWeight.w800,
                  color: accentColor,
                  letterSpacing: 0.5,
                ),
              ),
            ),

            // Bottom: Title & short description
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    height: 1.15,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  description,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 9.5,
                    color: Colors.white.withValues(alpha: 0.85),
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showCustomerServiceOptions(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(22),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.support_agent_rounded, color: Color(0xFF7C3AED), size: 24),
                SizedBox(width: 10),
                Text(
                  'Customer Service & Support',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: AppTheme.primaryNavy),
                ),
              ],
            ),
            const SizedBox(height: 6),
            const Text(
              'Select an option to track requests or consult the AI assistant:',
              style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF7C3AED).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.assignment_turned_in_rounded, color: Color(0xFF7C3AED)),
              ),
              title: const Text('My Service Requests & Files', style: TextStyle(fontWeight: FontWeight.bold)),
              subtitle: const Text('View submitted requests and uploaded legal documents', style: TextStyle(fontSize: 11)),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {
                Navigator.pop(ctx);
                Navigator.push(context, MaterialPageRoute(builder: (_) => const MyRequestsScreen()));
              },
            ),
            const Divider(),
            ListTile(
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF7C3AED).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.headset_mic_rounded, color: Color(0xFF7C3AED)),
              ),
              title: const Text('Customer Helpdesk & Support', style: TextStyle(fontWeight: FontWeight.bold)),
              subtitle: const Text('Direct assistance for platform inquiries', style: TextStyle(fontSize: 11)),
              trailing: const Icon(Icons.info_outline),
              onTap: () {
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Support Hotline: +94 11 234 5678 • help@legalease.lk')),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
