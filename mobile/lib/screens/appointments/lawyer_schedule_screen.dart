import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../models/appointment.dart';
import '../../models/lawyer.dart';
import '../../services/auth_service.dart';
import '../../services/appointment_service.dart';
import '../../services/lawyer_service.dart';

class LawyerScheduleScreen extends StatefulWidget {
  const LawyerScheduleScreen({super.key});

  @override
  State<LawyerScheduleScreen> createState() => _LawyerScheduleScreenState();
}

class _LawyerScheduleScreenState extends State<LawyerScheduleScreen> {
  List<Appointment> _consultations = [];
  bool _loading = true;
  String? _error;
  String _activeTab = 'All';

  final List<String> _tabs = [
    'All',
    'Requested',
    'Confirmed',
    'Completed',
  ];

  @override
  void initState() {
    super.initState();
    _fetchConsultations();
  }

  Future<void> _fetchConsultations() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final user = AuthService.currentUser.value;
      final list = await AppointmentService.getAppointments(
        lawyerId: user?.lawyerId,
        lawyerEmail: user?.email,
        status: _activeTab == 'All' ? null : _activeTab,
      );
      if (mounted) {
        setState(() {
          _consultations = list;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to load consultations: $e';
          _loading = false;
        });
      }
    }
  }

  Future<void> _confirmConsultation(Appointment appt) async {
    try {
      await AppointmentService.confirmAppointment(
        appt.appointmentId,
        notes: 'Confirmed by legal counsel.',
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Consultation with ${appt.customerName} confirmed.')),
        );
        _fetchConsultations();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Action failed: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _completeConsultation(Appointment appt) async {
    try {
      await AppointmentService.completeAppointment(
        appt.appointmentId,
        notes: 'Consultation concluded successfully.',
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Consultation marked as Completed.')),
        );
        _fetchConsultations();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Action failed: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _declineConsultation(Appointment appt) async {
    final reasonController = TextEditingController();
    final shouldDecline = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Decline Consultation'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Are you sure you want to decline consultation for ${appt.customerName}?'),
            const SizedBox(height: 12),
            TextField(
              controller: reasonController,
              decoration: const InputDecoration(
                labelText: 'Reason for decline (Optional)',
                hintText: 'e.g., Conflict of interest, court hearing...',
                border: OutlineInputBorder(),
                isDense: true,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFDC2626), foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Decline'),
          ),
        ],
      ),
    );

    if (shouldDecline != true) return;

    try {
      await AppointmentService.rejectAppointment(
        appt.appointmentId,
        reason: reasonController.text.trim().isEmpty ? 'Declined by counsel.' : reasonController.text.trim(),
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Consultation declined.')),
        );
        _fetchConsultations();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Action failed: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _rescheduleConsultation(Appointment appt) async {
    DateTime selectedDate = DateTime.now().add(const Duration(days: 1));
    List<AvailabilitySlot> slots = [];
    String? chosenSlotId;
    bool slotsLoading = true;

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          void fetchSlotsForDate() async {
            setModalState(() => slotsLoading = true);
            final dStr = '${selectedDate.year}-${selectedDate.month.toString().padLeft(2, '0')}-${selectedDate.day.toString().padLeft(2, '0')}';
            final list = await LawyerService.getAvailableSlots(appt.lawyerId, dStr);
            setModalState(() {
              slots = list;
              slotsLoading = false;
              final first = list.where((s) => !s.isBooked).firstOrNull;
              chosenSlotId = first?.slotId;
            });
          }

          if (slots.isEmpty && slotsLoading) {
            fetchSlotsForDate();
          }

          return Padding(
            padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Reschedule Consultation', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.calendar_today, color: AppTheme.primaryNavy),
                  title: Text('${selectedDate.year}-${selectedDate.month.toString().padLeft(2, '0')}-${selectedDate.day.toString().padLeft(2, '0')}'),
                  trailing: const Text('Change Date', style: TextStyle(color: AppTheme.secondaryAmber, fontWeight: FontWeight.bold)),
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: ctx,
                      initialDate: selectedDate,
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 60)),
                    );
                    if (picked != null) {
                      setModalState(() => selectedDate = picked);
                      fetchSlotsForDate();
                    }
                  },
                ),
                const SizedBox(height: 10),
                const Text('Select Afternoon Slot:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.textMuted)),
                const SizedBox(height: 8),
                if (slotsLoading)
                  const Center(child: Padding(padding: EdgeInsets.all(12), child: CircularProgressIndicator()))
                else
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: slots.map((s) {
                      final isSelected = chosenSlotId == s.slotId;
                      return ChoiceChip(
                        label: Text(s.formattedTime),
                        selected: isSelected,
                        onSelected: s.isBooked ? null : (_) => setModalState(() => chosenSlotId = s.slotId),
                      );
                    }).toList(),
                  ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryNavy, foregroundColor: Colors.white),
                    onPressed: chosenSlotId == null
                        ? null
                        : () async {
                            Navigator.pop(ctx);
                            try {
                              await AppointmentService.rescheduleAppointment(appt.appointmentId, chosenSlotId!, reason: 'Rescheduled by counsel.');
                              _fetchConsultations();
                            } catch (e) {
                              if (!mounted) return;
                              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
                            }
                          },
                    child: const Text('Confirm New Slot'),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Counsel Consultations', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchConsultations,
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter Tabs
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _tabs.map((t) {
                  final isSelected = _activeTab == t;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(t),
                      selected: isSelected,
                      selectedColor: AppTheme.primaryNavy,
                      backgroundColor: const Color(0xFFF1F5F9),
                      labelStyle: TextStyle(
                        fontSize: 12,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                        color: isSelected ? Colors.white : AppTheme.slateDark,
                      ),
                      onSelected: (_) {
                        setState(() => _activeTab = t);
                        _fetchConsultations();
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
          const Divider(height: 1, thickness: 1, color: Color(0xFFE2E8F0)),

          // List
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: AppTheme.secondaryAmber))
                : _error != null
                    ? Center(child: Text(_error!))
                    : _consultations.isEmpty
                        ? const Center(child: Text('No consultations in this view.'))
                        : ListView.separated(
                            padding: const EdgeInsets.all(16),
                            itemCount: _consultations.length,
                            separatorBuilder: (context, index) => const SizedBox(height: 14),
                            itemBuilder: (context, idx) {
                              final appt = _consultations[idx];
                              final isRequested = appt.status == 'Requested' || appt.status == 'Rescheduled';
                              final isConfirmed = appt.status == 'Confirmed';

                              return Container(
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(color: const Color(0xFFE2E8F0)),
                                ),
                                padding: const EdgeInsets.all(16),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          appt.customerName,
                                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.primaryNavy),
                                        ),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: appt.isRequested ? const Color(0xFFFEF3C7) : const Color(0xFFDBEAFE),
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                          child: Text(
                                            appt.status.toUpperCase(),
                                            style: TextStyle(
                                              fontSize: 10,
                                              fontWeight: FontWeight.bold,
                                              color: appt.isRequested ? const Color(0xFF92400E) : const Color(0xFF1E40AF),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      '${appt.date} · ${appt.formattedTimeSlot} (${appt.consultationType})',
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF2563EB)),
                                    ),
                                    if (appt.description != null && appt.description!.isNotEmpty) ...[
                                      const SizedBox(height: 8),
                                      Text(
                                        appt.description!,
                                        style: const TextStyle(fontSize: 12, color: Color(0xFF475569)),
                                      ),
                                    ],
                                    const SizedBox(height: 14),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.end,
                                      children: [
                                        if (isRequested) ...[
                                          OutlinedButton(
                                            style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                                            onPressed: () => _declineConsultation(appt),
                                            child: const Text('Decline'),
                                          ),
                                          const SizedBox(width: 8),
                                          ElevatedButton(
                                            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF16A34A), foregroundColor: Colors.white),
                                            onPressed: () => _confirmConsultation(appt),
                                            child: const Text('Confirm'),
                                          ),
                                        ] else if (isConfirmed) ...[
                                          OutlinedButton(
                                            onPressed: () => _rescheduleConsultation(appt),
                                            child: const Text('Reschedule'),
                                          ),
                                          const SizedBox(width: 8),
                                          ElevatedButton(
                                            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryNavy, foregroundColor: Colors.white),
                                            onPressed: () => _completeConsultation(appt),
                                            child: const Text('Complete'),
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
