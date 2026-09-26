import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../config/app_theme.dart';
import '../../models/appointment.dart';
import '../../models/documentation_request.dart';
import '../../services/auth_service.dart';
import '../../services/appointment_service.dart';
import '../../services/documentation_service.dart';
import '../../widgets/status_badge.dart';
import '../appointments/lawyers_screen.dart';
import '../auth/login_screen.dart';
import '../auth/register_screen.dart';
import '../document_and_clerk/requests/request_detail_screen.dart';
import '../document_and_clerk/services/services_catalog_screen.dart';

class MyRequestsScreen extends StatefulWidget {
  const MyRequestsScreen({super.key});

  @override
  State<MyRequestsScreen> createState() => _MyRequestsScreenState();
}

class _MyRequestsScreenState extends State<MyRequestsScreen> {
  List<DocumentationRequest> _docRequests = [];
  List<Appointment> _lawyerAppointments = [];
  bool _loading = true;
  String? _error;

  // Filter: 'ALL', 'DOCUMENTS', 'LAWYERS'
  String _categoryFilter = 'ALL';
  String _statusFilter = 'ALL';

  final TextEditingController _trackController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchAllRequests();
  }

  @override
  void dispose() {
    _trackController.dispose();
    super.dispose();
  }

  Future<void> _fetchAllRequests() async {
    final user = AuthService.currentUser.value;
    if (user == null) {
      if (mounted) {
        setState(() {
          _loading = false;
          _docRequests = [];
          _lawyerAppointments = [];
        });
      }
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final isClerk = user.userType.toLowerCase() == 'clerk';
      final isLawyer = user.userType.toLowerCase() == 'lawyer';
      final idInt = int.tryParse(user.userId);

      // Fetch Document & Clerk requests
      List<DocumentationRequest> docs = [];
      try {
        if (isClerk) {
          docs = await DocumentationApiService.getRequests(clerkId: idInt);
        } else if (!isLawyer) {
          docs = await DocumentationApiService.getRequests(customerId: idInt);
        }
      } catch (e) {
        debugPrint('Error loading document requests: $e');
      }

      // Fetch Lawyer appointments
      List<Appointment> appts = [];
      try {
        if (isLawyer) {
          appts = await AppointmentService.getAppointments(lawyerId: user.userId);
        } else {
          appts = await AppointmentService.getAppointments(customerId: user.userId);
        }
      } catch (e) {
        debugPrint('Error loading lawyer appointments: $e');
      }

      if (mounted) {
        setState(() {
          _docRequests = docs;
          _lawyerAppointments = appts;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to load requests: $e';
          _loading = false;
        });
      }
    }
  }

  Future<void> _cancelBooking(Appointment appt) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Cancel Consultation?'),
        content: Text(
          'Are you sure you want to cancel your consultation with ${appt.lawyerName} on ${appt.date}?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Keep Booking'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFDC2626),
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Cancel Booking'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      await AppointmentService.cancelAppointment(
        appt.appointmentId,
        reason: 'Cancelled by user from mobile requests.',
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Consultation cancelled successfully.')),
      );
      _fetchAllRequests();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to cancel consultation: $e')),
      );
    }
  }

  void _trackById([String? directId]) {
    final idText = (directId ?? _trackController.text).trim();
    final id = int.tryParse(idText);
    if (id == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid numeric Request ID.')),
      );
      return;
    }
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => RequestDetailScreen(requestId: id),
      ),
    );
  }

  void _showTrackDialog() {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Track Document Request'),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'Enter Document Request ID (e.g. 1)',
            prefixIcon: Icon(Icons.tag),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              _trackById(controller.text);
            },
            child: const Text('Track'),
          ),
        ],
      ),
    );
  }

  List<DocumentationRequest> get _filteredDocRequests {
    if (_statusFilter == 'ALL') return _docRequests;
    return _docRequests.where((r) {
      final s = r.status.toUpperCase();
      if (_statusFilter == 'PENDING') return s == 'PENDING' || s == 'REQUESTED';
      if (_statusFilter == 'ACTIVE') return s == 'UNDER_REVIEW' || s == 'APPROVED' || s == 'CONFIRMED';
      if (_statusFilter == 'COMPLETED') return s == 'COMPLETED';
      if (_statusFilter == 'CANCELLED') return s == 'REJECTED' || s == 'CANCELLED';
      return s == _statusFilter;
    }).toList();
  }

  List<Appointment> get _filteredLawyerAppointments {
    if (_statusFilter == 'ALL') return _lawyerAppointments;
    return _lawyerAppointments.where((a) {
      final s = a.status.toUpperCase();
      if (_statusFilter == 'PENDING') return s == 'REQUESTED' || s == 'PENDING';
      if (_statusFilter == 'ACTIVE') return s == 'CONFIRMED';
      if (_statusFilter == 'COMPLETED') return s == 'COMPLETED';
      if (_statusFilter == 'CANCELLED') return s == 'CANCELLED' || s == 'REJECTED';
      return s == _statusFilter;
    }).toList();
  }

  Widget _buildLoginPrompt() {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppTheme.primaryNavy.withValues(alpha: 0.08),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.lock_person_outlined, size: 52, color: AppTheme.primaryNavy),
            ),
            const SizedBox(height: 18),
            const Text(
              'Sign In to View All Requests',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.primaryNavy),
            ),
            const SizedBox(height: 8),
            const Text(
              'View all your lawyer consultations, document preparation cases, and clerk assignments in one centralized hub.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: AppTheme.textMuted, height: 1.4),
            ),
            const SizedBox(height: 22),
            SizedBox(
              width: double.infinity,
              height: 46,
              child: ElevatedButton.icon(
                icon: const Icon(Icons.login),
                label: const Text('Sign In to Your Account', style: TextStyle(fontSize: 15)),
                onPressed: () async {
                  final loggedIn = await Navigator.push<bool>(
                    context,
                    MaterialPageRoute(builder: (_) => const LoginScreen(asModal: true)),
                  );
                  if (loggedIn == true) {
                    _fetchAllRequests();
                  }
                },
              ),
            ),
            const SizedBox(height: 10),
            TextButton(
              onPressed: () async {
                final registered = await Navigator.push<bool>(
                  context,
                  MaterialPageRoute(builder: (_) => const RegisterScreen()),
                );
                if (registered == true) {
                  _fetchAllRequests();
                }
              },
              child: const Text('Create New Account', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
            const SizedBox(height: 16),
            Row(
              children: const [
                Expanded(child: Divider()),
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: 12),
                  child: Text('OR TRACK DOCUMENT BY ID', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.textMuted)),
                ),
                Expanded(child: Divider()),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _trackController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      hintText: 'Document Request ID (e.g. 1)',
                      prefixIcon: Icon(Icons.tag, size: 18),
                      isDense: true,
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.secondaryAmber,
                    foregroundColor: AppTheme.primaryNavy,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  ),
                  onPressed: () => _trackById(),
                  child: const Text('Track', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthService.currentUser.value;
    final totalDocs = _filteredDocRequests.length;
    final totalAppts = _filteredLawyerAppointments.length;
    final totalAll = totalDocs + totalAppts;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('All Requests & Bookings', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            Text(
              user != null
                  ? '${user.userType.toUpperCase()} • $totalAll total items'
                  : 'Centralized Legal Requests',
              style: const TextStyle(fontSize: 11, color: Colors.white70),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            tooltip: 'Track by ID',
            onPressed: _showTrackDialog,
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
            onPressed: _fetchAllRequests,
          ),
        ],
      ),
      body: user == null
          ? _buildLoginPrompt()
          : _loading
              ? const Center(child: CircularProgressIndicator(color: AppTheme.gold))
              : _error != null
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.error_outline, size: 48, color: Colors.red),
                            const SizedBox(height: 12),
                            Text(_error!, textAlign: TextAlign.center),
                            const SizedBox(height: 16),
                            ElevatedButton(onPressed: _fetchAllRequests, child: const Text('Retry')),
                          ],
                        ),
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _fetchAllRequests,
                      child: ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          // ── Category Tabs: ALL / DOCUMENTS / LAWYERS ──
                          SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: Row(
                              children: [
                                _buildCategoryTab('ALL', 'All Requests (${_docRequests.length + _lawyerAppointments.length})', Icons.dashboard_outlined),
                                const SizedBox(width: 8),
                                _buildCategoryTab('DOCUMENTS', '📄 Documents & Clerk (${_docRequests.length})', Icons.description_outlined),
                                const SizedBox(width: 8),
                                _buildCategoryTab('LAWYERS', '⚖️ Lawyers (${_lawyerAppointments.length})', Icons.balance_outlined),
                              ],
                            ),
                          ),

                          const SizedBox(height: 12),

                          // ── Status Filter Chips ──
                          SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: Row(
                              children: [
                                _buildStatusChip('ALL', 'All Status'),
                                const SizedBox(width: 6),
                                _buildStatusChip('PENDING', 'Pending / Requested'),
                                const SizedBox(width: 6),
                                _buildStatusChip('ACTIVE', 'Confirmed / Under Review'),
                                const SizedBox(width: 6),
                                _buildStatusChip('COMPLETED', 'Completed'),
                                const SizedBox(width: 6),
                                _buildStatusChip('CANCELLED', 'Cancelled / Rejected'),
                              ],
                            ),
                          ),

                          const SizedBox(height: 16),

                          // ── Empty State ──
                          if (totalAll == 0)
                            _buildEmptyState()
                          else ...[
                            // ── Document & Clerk Items ──
                            if (_categoryFilter == 'ALL' || _categoryFilter == 'DOCUMENTS') ...[
                              if (_categoryFilter == 'ALL' && _filteredDocRequests.isNotEmpty)
                                Padding(
                                  padding: const EdgeInsets.only(bottom: 10, top: 4),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.description_rounded, size: 16, color: Color(0xFFD97706)),
                                      const SizedBox(width: 6),
                                      Text(
                                        'DOCUMENT & CLERK REQUESTS (${_filteredDocRequests.length})',
                                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primaryNavy, letterSpacing: 0.5),
                                      ),
                                    ],
                                  ),
                                ),
                              ..._filteredDocRequests.map((req) => _buildDocRequestCard(req)),
                            ],

                            // ── Lawyer Consultation Items ──
                            if (_categoryFilter == 'ALL' || _categoryFilter == 'LAWYERS') ...[
                              if (_categoryFilter == 'ALL' && _filteredLawyerAppointments.isNotEmpty)
                                Padding(
                                  padding: const EdgeInsets.only(bottom: 10, top: 12),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.balance_rounded, size: 16, color: Color(0xFF2563EB)),
                                      const SizedBox(width: 6),
                                      Text(
                                        'LAWYER CONSULTATION BOOKINGS (${_filteredLawyerAppointments.length})',
                                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primaryNavy, letterSpacing: 0.5),
                                      ),
                                    ],
                                  ),
                                ),
                              ..._filteredLawyerAppointments.map((appt) => _buildLawyerAppointmentCard(appt)),
                            ],
                          ],
                        ],
                      ),
                    ),
    );
  }

  Widget _buildCategoryTab(String key, String label, IconData icon) {
    final isSelected = _categoryFilter == key;
    return InkWell(
      onTap: () => setState(() => _categoryFilter = key),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primaryNavy : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isSelected ? AppTheme.primaryNavy : const Color(0xFFCBD5E1)),
          boxShadow: isSelected
              ? [BoxShadow(color: AppTheme.primaryNavy.withValues(alpha: 0.2), blurRadius: 6, offset: const Offset(0, 2))]
              : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: isSelected ? Colors.white : AppTheme.primaryNavy,
          ),
        ),
      ),
    );
  }

  Widget _buildStatusChip(String key, String label) {
    final isSelected = _statusFilter == key;
    return ChoiceChip(
      label: Text(label, style: TextStyle(fontSize: 11, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
      selected: isSelected,
      selectedColor: AppTheme.gold,
      backgroundColor: const Color(0xFFF1F5F9),
      onSelected: (_) => setState(() => _statusFilter = key),
    );
  }

  Widget _buildDocRequestCard(DocumentationRequest req) {
    final dateStr = req.createdAt != null
        ? DateFormat('MMM d, y • h:mm a').format(req.createdAt!)
        : 'Recent';

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey.withValues(alpha: 0.15)),
      ),
      elevation: 1,
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => RequestDetailScreen(requestId: req.requestId)),
          );
        },
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFD97706).withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      '#DOC-${req.requestId}',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFFD97706)),
                    ),
                  ),
                  StatusBadge(status: req.status),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                req.serviceName ?? req.documentType,
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.primaryNavy),
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  const Icon(Icons.badge_outlined, size: 14, color: AppTheme.textMuted),
                  const SizedBox(width: 4),
                  Text(
                    req.assignedClerkName != null
                        ? 'Assigned Clerk: ${req.assignedClerkName}'
                        : 'Clerk: Pending assignment',
                    style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(Icons.attach_file, size: 14, color: AppTheme.textMuted),
                  const SizedBox(width: 4),
                  Text(
                    '${req.documentFiles.length} file(s) attached',
                    style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
                  ),
                  const Spacer(),
                  Text(
                    dateStr,
                    style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLawyerAppointmentCard(Appointment appt) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey.withValues(alpha: 0.15)),
      ),
      elevation: 1,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFF2563EB).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.balance, size: 12, color: Color(0xFF2563EB)),
                      SizedBox(width: 4),
                      Text(
                        'LAWYER CONSULTATION',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF2563EB)),
                      ),
                    ],
                  ),
                ),
                _buildAppointmentStatusBadge(appt.status),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              'Advocate: ${appt.lawyerName}',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.primaryNavy),
            ),
            if (appt.legalServiceCategory != null) ...[
              const SizedBox(height: 3),
              Text(
                appt.legalServiceCategory!,
                style: const TextStyle(fontSize: 12, color: Color(0xFF475569), fontWeight: FontWeight.w500),
              ),
            ],
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.event, size: 16, color: AppTheme.primaryNavy),
                  const SizedBox(width: 6),
                  Text(
                    '${appt.date} • ${appt.startTime} – ${appt.endTime}',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.primaryNavy),
                  ),
                ],
              ),
            ),
            if (appt.canCancel) ...[
              const SizedBox(height: 10),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                  style: TextButton.styleFrom(
                    foregroundColor: const Color(0xFFDC2626),
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  ),
                  icon: const Icon(Icons.cancel_outlined, size: 14),
                  label: const Text('Cancel Booking', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  onPressed: () => _cancelBooking(appt),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildAppointmentStatusBadge(String status) {
    Color bg;
    Color fg;
    final upper = status.toUpperCase();
    if (upper == 'CONFIRMED') {
      bg = const Color(0xFFD1FAE5);
      fg = const Color(0xFF065F46);
    } else if (upper == 'REQUESTED' || upper == 'PENDING') {
      bg = const Color(0xFFFEF3C7);
      fg = const Color(0xFF92400E);
    } else if (upper == 'COMPLETED') {
      bg = const Color(0xFFE0E7FF);
      fg = const Color(0xFF3730A3);
    } else {
      bg = const Color(0xFFFEE2E2);
      fg = const Color(0xFF991B1B);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        upper,
        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: fg),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.inbox_outlined, size: 48, color: AppTheme.textMuted),
            ),
            const SizedBox(height: 16),
            const Text(
              'No Requests Found',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primaryNavy),
            ),
            const SizedBox(height: 6),
            const Text(
              'You have no active document service requests or lawyer appointments under this filter.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: AppTheme.textMuted),
            ),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryNavy,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  ),
                  icon: const Icon(Icons.description, size: 16),
                  label: const Text('Doc Services', style: TextStyle(fontSize: 12)),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const ServicesCatalogScreen()),
                    );
                  },
                ),
                const SizedBox(width: 10),
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppTheme.primaryNavy,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  ),
                  icon: const Icon(Icons.balance, size: 16),
                  label: const Text('Book Lawyer', style: TextStyle(fontSize: 12)),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const LawyersScreen()),
                    );
                  },
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
