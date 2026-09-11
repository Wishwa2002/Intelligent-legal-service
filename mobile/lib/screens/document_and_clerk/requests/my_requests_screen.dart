import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../config/app_theme.dart';
import '../../../models/documentation_request.dart';
import '../../../services/auth_service.dart';
import '../../../services/documentation_service.dart';
import '../../../widgets/status_badge.dart';
import '../../auth/login_screen.dart';
import '../../auth/register_screen.dart';
import 'request_detail_screen.dart';

class MyRequestsScreen extends StatefulWidget {
  const MyRequestsScreen({super.key});

  @override
  State<MyRequestsScreen> createState() => _MyRequestsScreenState();
}

class _MyRequestsScreenState extends State<MyRequestsScreen> {
  List<DocumentationRequest> _requests = [];
  bool _loading = true;
  String? _error;
  String _statusFilter = 'ALL';

  @override
  void initState() {
    super.initState();
    _fetchRequests();
  }

  Future<void> _fetchRequests() async {
    final user = AuthService.currentUser.value;
    if (user == null) {
      if (mounted) {
        setState(() {
          _loading = false;
          _requests = [];
        });
      }
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final customerId = int.tryParse(user.userId);
      final list = await DocumentationApiService.getRequests(customerId: customerId);
      if (mounted) {
        setState(() {
          _requests = list;
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

  List<DocumentationRequest> get _filteredRequests {
    if (_statusFilter == 'ALL') return _requests;
    return _requests.where((r) => r.status.toUpperCase() == _statusFilter).toList();
  }

  final _trackController = TextEditingController();

  @override
  void dispose() {
    _trackController.dispose();
    super.dispose();
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
        title: const Text('Track by Request ID'),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'Enter Request ID (e.g. 1)',
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
              'Personal documentation requests and uploaded legal documents are securely linked to your registered client account.',
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
                    _fetchRequests();
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
                  _fetchRequests();
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
                  child: Text('OR TRACK BY ID', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.textMuted)),
                ),
                Expanded(child: Divider()),
              ],
            ),
            const SizedBox(height: 14),
            const Text(
              'Have an existing reference? Track your request status directly without signing in:',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: AppTheme.textMuted),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _trackController,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      hintText: 'Request ID (e.g. 1)',
                      prefixIcon: const Icon(Icons.tag, size: 18),
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
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
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Legal Requests'),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            tooltip: 'Track by Request ID',
            onPressed: _showTrackDialog,
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
            onPressed: _fetchRequests,
          ),
        ],
      ),
      body: ValueListenableBuilder(
        valueListenable: AuthService.currentUser,
        builder: (ctx, user, _) {
          if (user == null) {
            return _buildLoginPrompt();
          }

          return Column(
            children: [
              // Filter Chips
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(
                  children: [
                    _buildFilterChip('ALL', 'All (${_requests.length})'),
                    const SizedBox(width: 8),
                    _buildFilterChip('PENDING', 'Pending'),
                    const SizedBox(width: 8),
                    _buildFilterChip('UNDER_REVIEW', 'Under Review'),
                    const SizedBox(width: 8),
                    _buildFilterChip('ASSIGNED', 'Assigned'),
                    const SizedBox(width: 8),
                    _buildFilterChip('COMPLETED', 'Completed'),
                  ],
                ),
              ),

              Expanded(
                child: _loading
                    ? const Center(child: CircularProgressIndicator(color: AppTheme.secondaryAmber))
                    : _error != null
                        ? Center(
                            child: Padding(
                              padding: const EdgeInsets.all(24),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.error_outline, size: 48, color: Colors.grey),
                                  const SizedBox(height: 12),
                                  Text(_error!, textAlign: TextAlign.center),
                                  const SizedBox(height: 16),
                                  ElevatedButton(onPressed: _fetchRequests, child: const Text('Retry')),
                                ],
                              ),
                            ),
                          )
                        : _filteredRequests.isEmpty
                            ? Center(
                                child: Padding(
                                  padding: const EdgeInsets.all(32),
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: const [
                                      Icon(Icons.assignment_outlined, size: 56, color: AppTheme.textMuted),
                                      SizedBox(height: 16),
                                      Text(
                                        'No documentation requests',
                                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                      ),
                                      SizedBox(height: 6),
                                      Text(
                                        'You have no requests matching the selected filter.',
                                        textAlign: TextAlign.center,
                                        style: TextStyle(color: AppTheme.textMuted, fontSize: 13),
                                      ),
                                    ],
                                  ),
                                ),
                              )
                            : RefreshIndicator(
                                onRefresh: _fetchRequests,
                                child: ListView.builder(
                                  padding: const EdgeInsets.all(16),
                                  itemCount: _filteredRequests.length,
                                  itemBuilder: (ctx, i) {
                                    final req = _filteredRequests[i];
                                    final dateStr = req.createdAt != null
                                        ? DateFormat('MMM d, yyyy').format(req.createdAt!.toLocal())
                                        : '';

                                    return Card(
                                      margin: const EdgeInsets.only(bottom: 12),
                                      child: InkWell(
                                        borderRadius: BorderRadius.circular(16),
                                        onTap: () {
                                          Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                              builder: (_) => RequestDetailScreen(requestId: req.requestId),
                                            ),
                                          ).then((_) => _fetchRequests());
                                        },
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
                                                      req.serviceName ?? req.documentType,
                                                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                                                    ),
                                                  ),
                                                  StatusBadge(status: req.status),
                                                ],
                                              ),
                                              const SizedBox(height: 8),
                                              Row(
                                                children: [
                                                  Text('ID: #${req.requestId}',
                                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.primaryNavy)),
                                                  if (dateStr.isNotEmpty) ...[
                                                    const SizedBox(width: 8),
                                                    const Text('•', style: TextStyle(color: AppTheme.textMuted)),
                                                    const SizedBox(width: 8),
                                                    Text(dateStr, style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                                                  ],
                                                ],
                                              ),
                                              if (req.assignedClerkName != null) ...[
                                                const SizedBox(height: 6),
                                                Row(
                                                  children: [
                                                    const Icon(Icons.person_pin, size: 14, color: AppTheme.statusAssigned),
                                                    const SizedBox(width: 4),
                                                    Text('Clerk: ${req.assignedClerkName}',
                                                        style: const TextStyle(fontSize: 12, color: AppTheme.primaryNavy, fontWeight: FontWeight.w500)),
                                                  ],
                                                ),
                                              ],
                                              if (req.missingDocuments.isNotEmpty) ...[
                                                const SizedBox(height: 8),
                                                Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                                  decoration: BoxDecoration(
                                                    color: const Color(0xFFFEF2F2),
                                                    borderRadius: BorderRadius.circular(6),
                                                  ),
                                                  child: Text(
                                                    '⚠️ Missing: ${req.missingDocuments.join(", ")}',
                                                    style: const TextStyle(fontSize: 11, color: Color(0xFF991B1B)),
                                                  ),
                                                ),
                                              ],
                                              const SizedBox(height: 10),
                                              Row(
                                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                children: [
                                                  Text(
                                                    '${req.documentFiles.length} file(s) attached',
                                                    style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
                                                  ),
                                                  const Row(
                                                    children: [
                                                      Text('View Details', style: TextStyle(fontSize: 12, color: AppTheme.secondaryAmber, fontWeight: FontWeight.bold)),
                                                      Icon(Icons.chevron_right, size: 16, color: AppTheme.secondaryAmber),
                                                    ],
                                                  ),
                                                ],
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    );
                                  },
                                ),
                              ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildFilterChip(String key, String label) {
    final isSelected = _statusFilter == key;
    return ChoiceChip(
      label: Text(label, style: TextStyle(fontSize: 12, color: isSelected ? Colors.white : AppTheme.slateDark)),
      selected: isSelected,
      selectedColor: AppTheme.primaryNavy,
      backgroundColor: Colors.white,
      side: BorderSide(color: isSelected ? AppTheme.primaryNavy : AppTheme.borderSubtle),
      onSelected: (val) {
        if (val) setState(() => _statusFilter = key);
      },
    );
  }
}
