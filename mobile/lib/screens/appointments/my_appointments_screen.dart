import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../models/appointment.dart';
import '../../services/auth_service.dart';
import '../../services/appointment_service.dart';
import '../auth/login_screen.dart';
import 'lawyers_screen.dart';

class MyAppointmentsScreen extends StatefulWidget {
  const MyAppointmentsScreen({super.key});

  @override
  State<MyAppointmentsScreen> createState() => _MyAppointmentsScreenState();
}

class _MyAppointmentsScreenState extends State<MyAppointmentsScreen> {
  List<Appointment> _appointments = [];
  bool _loading = true;
  String? _error;
  String _activeTab = 'All';

  final List<String> _tabs = [
    'All',
    'Requested',
    'Confirmed',
    'Completed',
    'Cancelled',
  ];

  @override
  void initState() {
    super.initState();
    _fetchAppointments();
  }

  Future<void> _fetchAppointments() async {
    final user = AuthService.currentUser.value;
    if (user == null) {
      setState(() {
        _loading = false;
      });
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final list = await AppointmentService.getAppointments(
        customerId: user.userId,
        status: _activeTab == 'All' ? null : _activeTab,
      );
      if (mounted) {
        setState(() {
          _appointments = list;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to load appointments: $e';
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
        title: const Text('Cancel Appointment?'),
        content: Text(
          'Are you sure you want to cancel your consultation with ${appt.lawyerName} on ${appt.date}?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Keep Booking'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFDC2626), foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Cancel Consultation'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      await AppointmentService.cancelAppointment(
        appt.appointmentId,
        reason: 'Cancelled by customer.',
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Appointment has been cancelled.')),
        );
        _fetchAppointments();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to cancel: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _showHistoryModal(Appointment appt) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Appointment Audit Trail',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.primaryNavy),
                ),
                IconButton(
                  icon: const Icon(Icons.close, size: 20),
                  onPressed: () => Navigator.pop(ctx),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (appt.history.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Text('Initial status: Requested (pending counsel review).', style: TextStyle(fontSize: 13, color: AppTheme.textMuted)),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: appt.history.length,
                separatorBuilder: (context, index) => const Divider(height: 16),
                itemBuilder: (context, idx) {
                  final h = appt.history[idx];
                  return Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(h.previousStatus, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                              const Text('  →  ', style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
                              Text(
                                h.newStatus,
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF2563EB)),
                              ),
                            ],
                          ),
                        ],
                      ),
                      Text(
                        '${h.changedDate.month}/${h.changedDate.day} ${h.changedDate.hour.toString().padLeft(2, '0')}:${h.changedDate.minute.toString().padLeft(2, '0')}',
                        style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                      ),
                    ],
                  );
                },
              ),
          ],
        ),
      ),
    );
  }

  Color _getStatusBg(String status) {
    switch (status.toLowerCase()) {
      case 'requested':
        return const Color(0xFFFEF3C7);
      case 'confirmed':
        return const Color(0xFFDBEAFE);
      case 'completed':
        return const Color(0xFFDCFCE7);
      case 'rescheduled':
        return const Color(0xFFEDE9FE);
      case 'cancelled':
      case 'rejected':
      default:
        return const Color(0xFFF1F5F9);
    }
  }

  Color _getStatusText(String status) {
    switch (status.toLowerCase()) {
      case 'requested':
        return const Color(0xFF92400E);
      case 'confirmed':
        return const Color(0xFF1E40AF);
      case 'completed':
        return const Color(0xFF166534);
      case 'rescheduled':
        return const Color(0xFF5B21B6);
      case 'cancelled':
      case 'rejected':
      default:
        return const Color(0xFF475569);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthService.currentUser.value;

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Appointments', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchAppointments,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppTheme.primaryNavy,
        foregroundColor: AppTheme.secondaryAmber,
        icon: const Icon(Icons.add),
        label: const Text('Book Lawyer', style: TextStyle(fontWeight: FontWeight.bold)),
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const LawyersScreen()),
          );
        },
      ),
      body: user == null
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.lock_outline, size: 52, color: AppTheme.primaryNavy),
                    const SizedBox(height: 14),
                    const Text(
                      'Sign In to View Appointments',
                      style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: AppTheme.primaryNavy),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Please log in with your client account to review and track consultation bookings.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 13, color: AppTheme.textMuted),
                    ),
                    const SizedBox(height: 20),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryNavy,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 12),
                      ),
                      onPressed: () async {
                        await Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const LoginScreen()),
                        );
                        _fetchAppointments();
                      },
                      child: const Text('Sign In Now'),
                    ),
                  ],
                ),
              ),
            )
          : Column(
              children: [
                // ── Status Filter Chips ──
                Container(
                  color: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: _tabs.map((tab) {
                        final isSelected = _activeTab == tab;
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(
                            label: Text(
                              tab,
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                color: isSelected ? Colors.white : AppTheme.slateDark,
                              ),
                            ),
                            selected: isSelected,
                            selectedColor: AppTheme.primaryNavy,
                            backgroundColor: const Color(0xFFF1F5F9),
                            onSelected: (_) {
                              setState(() => _activeTab = tab);
                              _fetchAppointments();
                            },
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ),
                const Divider(height: 1, thickness: 1, color: Color(0xFFE2E8F0)),

                // ── Appointment Cards ──
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
                                    const Icon(Icons.cloud_off, size: 48, color: Colors.grey),
                                    const SizedBox(height: 12),
                                    Text(_error!, textAlign: TextAlign.center, style: const TextStyle(fontSize: 13)),
                                    const SizedBox(height: 16),
                                    ElevatedButton(onPressed: _fetchAppointments, child: const Text('Retry')),
                                  ],
                                ),
                              ),
                            )
                          : _appointments.isEmpty
                              ? Center(
                                  child: Padding(
                                    padding: const EdgeInsets.all(28),
                                    child: Column(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(Icons.event_busy, size: 52, color: Color(0xFF94A3B8)),
                                        const SizedBox(height: 14),
                                        Text(
                                          'No $_activeTab Appointments',
                                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.primaryNavy),
                                        ),
                                        const SizedBox(height: 6),
                                        const Text(
                                          'You can browse our specialized legal counsel and book a consultation in minutes.',
                                          textAlign: TextAlign.center,
                                          style: TextStyle(fontSize: 13, color: AppTheme.textMuted),
                                        ),
                                        const SizedBox(height: 20),
                                        ElevatedButton.icon(
                                          icon: const Icon(Icons.search, size: 16),
                                          label: const Text('Explore Lawyers'),
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: AppTheme.primaryNavy,
                                            foregroundColor: Colors.white,
                                          ),
                                          onPressed: () {
                                            Navigator.push(
                                              context,
                                              MaterialPageRoute(builder: (_) => const LawyersScreen()),
                                            );
                                          },
                                        ),
                                      ],
                                    ),
                                  ),
                                )
                              : ListView.separated(
                                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
                                  itemCount: _appointments.length,
                                  separatorBuilder: (context, index) => const SizedBox(height: 14),
                                  itemBuilder: (context, idx) {
                                    final appt = _appointments[idx];
                                    final canCancel = appt.status == 'Requested' || appt.status == 'Confirmed' || appt.status == 'Rescheduled';

                                    return Container(
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius: BorderRadius.circular(16),
                                        border: Border.all(color: const Color(0xFFE2E8F0)),
                                        boxShadow: [
                                          BoxShadow(
                                            color: Colors.black.withValues(alpha: 0.03),
                                            blurRadius: 10,
                                            offset: const Offset(0, 4),
                                          ),
                                        ],
                                      ),
                                      padding: const EdgeInsets.all(16),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          // Top Row: Status badge & Consultation Mode
                                          Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                                decoration: BoxDecoration(
                                                  color: _getStatusBg(appt.status),
                                                  borderRadius: BorderRadius.circular(12),
                                                ),
                                                child: Text(
                                                  appt.status.toUpperCase(),
                                                  style: TextStyle(
                                                    fontSize: 11,
                                                    fontWeight: FontWeight.bold,
                                                    color: _getStatusText(appt.status),
                                                  ),
                                                ),
                                              ),
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                                decoration: BoxDecoration(
                                                  color: appt.consultationType == 'In-Person'
                                                      ? const Color(0xFFFEF3C7)
                                                      : const Color(0xFFEFF6FF),
                                                  borderRadius: BorderRadius.circular(8),
                                                  border: Border.all(
                                                    color: appt.consultationType == 'In-Person'
                                                        ? const Color(0xFFFDE68A)
                                                        : const Color(0xFFBFDBFE),
                                                  ),
                                                ),
                                                child: Row(
                                                  mainAxisSize: MainAxisSize.min,
                                                  children: [
                                                    Text(appt.consultationType == 'In-Person' ? '🏢' : '🌐', style: const TextStyle(fontSize: 12)),
                                                    const SizedBox(width: 4),
                                                    Text(
                                                      appt.consultationType,
                                                      style: TextStyle(
                                                        fontSize: 11,
                                                        fontWeight: FontWeight.w600,
                                                        color: appt.consultationType == 'In-Person'
                                                            ? const Color(0xFF92400E)
                                                            : const Color(0xFF1D4ED8),
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                            ],
                                          ),

                                          const SizedBox(height: 12),

                                          // Lawyer & Category
                                          Text(
                                            appt.lawyerName,
                                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.primaryNavy),
                                          ),
                                          if (appt.legalServiceCategory != null) ...[
                                            const SizedBox(height: 2),
                                            Text(
                                              appt.legalServiceCategory!,
                                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF2563EB)),
                                            ),
                                          ],

                                          const SizedBox(height: 10),

                                          // Date & Slot
                                          Container(
                                            padding: const EdgeInsets.all(10),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFFF8FAFC),
                                              borderRadius: BorderRadius.circular(10),
                                              border: Border.all(color: const Color(0xFFE2E8F0)),
                                            ),
                                            child: Row(
                                              children: [
                                                const Icon(Icons.calendar_today, size: 16, color: AppTheme.primaryNavy),
                                                const SizedBox(width: 8),
                                                Text(appt.date, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.primaryNavy)),
                                                const Spacer(),
                                                const Icon(Icons.access_time, size: 16, color: AppTheme.secondaryAmber),
                                                const SizedBox(width: 6),
                                                Text(appt.formattedTimeSlot, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.slateDark)),
                                              ],
                                            ),
                                          ),

                                          // Issue Description
                                          if (appt.description != null && appt.description!.isNotEmpty) ...[
                                            const SizedBox(height: 12),
                                            const Text(
                                              'Legal Issue Summary:',
                                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.textMuted),
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              appt.description!,
                                              style: const TextStyle(fontSize: 12, color: Color(0xFF334155)),
                                              maxLines: 3,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ],

                                          const SizedBox(height: 14),

                                          // Actions
                                          Row(
                                            mainAxisAlignment: MainAxisAlignment.end,
                                            children: [
                                              TextButton.icon(
                                                icon: const Icon(Icons.history, size: 16),
                                                label: const Text('Audit Trail', style: TextStyle(fontSize: 12)),
                                                onPressed: () => _showHistoryModal(appt),
                                              ),
                                              if (canCancel) ...[
                                                const SizedBox(width: 8),
                                                OutlinedButton(
                                                  style: OutlinedButton.styleFrom(
                                                    foregroundColor: const Color(0xFFDC2626),
                                                    side: const BorderSide(color: Color(0xFFFCA5A5)),
                                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                                  ),
                                                  onPressed: () => _cancelBooking(appt),
                                                  child: const Text('Cancel', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                                ),
                                              ],
                                            ],
                                          ),
                                        ],
                                      ),
                                    );
                                  },
                                ),
                ),
              ],
            ),
    );
  }
}
