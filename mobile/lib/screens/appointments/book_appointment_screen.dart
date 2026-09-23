import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../models/lawyer.dart';
import '../../services/auth_service.dart';
import '../../services/lawyer_service.dart';
import '../../services/appointment_service.dart';
import '../auth/login_screen.dart';
import 'my_appointments_screen.dart';

class BookAppointmentScreen extends StatefulWidget {
  final Lawyer lawyer;
  final String? initialCategory;

  const BookAppointmentScreen({
    super.key,
    required this.lawyer,
    this.initialCategory,
  });

  @override
  State<BookAppointmentScreen> createState() => _BookAppointmentScreenState();
}

class _BookAppointmentScreenState extends State<BookAppointmentScreen> {
  final _formKey = GlobalKey<FormState>();
  final _descriptionController = TextEditingController();

  late String _selectedCategory;
  late DateTime _selectedDate;
  String _consultationType = 'Online'; // 'Online' or 'In-Person'

  List<AvailabilitySlot> _slots = [];
  String? _selectedSlotId;
  bool _slotsLoading = true;
  String? _slotsError;

  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _selectedCategory = widget.initialCategory ?? widget.lawyer.primarySpecialization;
    // Default to tomorrow
    _selectedDate = DateTime.now().add(const Duration(days: 1));
    _fetchSlots();
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    super.dispose();
  }

  String _formatDateYMD(DateTime dt) {
    final y = dt.year.toString().padLeft(4, '0');
    final m = dt.month.toString().padLeft(2, '0');
    final d = dt.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }

  Future<void> _fetchSlots() async {
    setState(() {
      _slotsLoading = true;
      _slotsError = null;
      _selectedSlotId = null;
    });

    try {
      final dateStr = _formatDateYMD(_selectedDate);
      final slots = await LawyerService.getAvailableSlots(widget.lawyer.lawyerId, dateStr);
      if (mounted) {
        setState(() {
          _slots = slots;
          _slotsLoading = false;
          // Pre-select first available slot if any
          final firstAvailable = slots.where((s) => !s.isBooked).firstOrNull;
          if (firstAvailable != null) {
            _selectedSlotId = firstAvailable.slotId;
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _slotsError = 'Failed to load slots: $e';
          _slotsLoading = false;
        });
      }
    }
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate.isBefore(now) ? now.add(const Duration(days: 1)) : _selectedDate,
      firstDate: now,
      lastDate: now.add(const Duration(days: 60)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppTheme.primaryNavy,
              onPrimary: Colors.white,
              onSurface: AppTheme.primaryNavy,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null && picked != _selectedDate) {
      setState(() {
        _selectedDate = picked;
      });
      _fetchSlots();
    }
  }

  Future<void> _submitBooking() async {
    if (!_formKey.currentState!.validate()) return;

    if (_selectedSlotId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select an available afternoon time slot.')),
      );
      return;
    }

    final user = AuthService.currentUser.value;
    if (user == null) {
      final shouldLogin = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('Sign In Required'),
          content: const Text('You must be signed in as a client to submit an appointment booking.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Sign In'),
            ),
          ],
        ),
      );

      if (shouldLogin == true && mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const LoginScreen()),
        );
      }
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      await AppointmentService.bookAppointment(
        lawyerId: widget.lawyer.lawyerId,
        slotId: _selectedSlotId!,
        customerId: user.userId,
        description: _descriptionController.text.trim(),
        consultationType: _consultationType,
        legalServiceCategory: _selectedCategory,
      );

      if (!mounted) return;

      // Show success modal
      await showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: const BoxDecoration(
                  color: Color(0xFFDCFCE7),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.check_circle, color: Color(0xFF16A34A), size: 40),
              ),
              const SizedBox(height: 16),
              const Text(
                'Appointment Requested!',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primaryNavy),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFFDE68A)),
                ),
                child: const Text(
                  'STATUS: REQUESTED',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF92400E)),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Your consultation request with ${widget.lawyer.name} for ${_formatDateYMD(_selectedDate)} has been sent to administration and legal counsel for review.',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 12, color: Color(0xFF475569)),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryNavy,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () {
                    Navigator.pop(ctx);
                    Navigator.pushReplacement(
                      context,
                      MaterialPageRoute(builder: (_) => const MyAppointmentsScreen()),
                    );
                  },
                  child: const Text('View My Appointments'),
                ),
              ),
            ],
          ),
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Booking failed: $e'), backgroundColor: Colors.red.shade700),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Book Consultation', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── 1. Lawyer Summary Card ──
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 24,
                      backgroundColor: AppTheme.primaryNavy,
                      child: Text(
                        widget.lawyer.name.isNotEmpty ? widget.lawyer.name.split(' ').last[0] : 'L',
                        style: const TextStyle(color: AppTheme.secondaryAmber, fontWeight: FontWeight.bold),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.lawyer.name,
                            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.primaryNavy),
                          ),
                          Text(
                            widget.lawyer.qualification,
                            style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${widget.lawyer.experience} yrs experience · ${widget.lawyer.licenseNumber}',
                            style: const TextStyle(fontSize: 11, color: AppTheme.secondaryAmber, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // ── 2. Legal Service Category ──
              const Text(
                'LEGAL SERVICE AREA',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.8, color: AppTheme.textMuted),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFCBD5E1)),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    isExpanded: true,
                    value: _selectedCategory,
                    items: [
                      'Criminal Law',
                      'Family Law',
                      'Corporate Law',
                      'Property Law',
                    ].map((cat) {
                      return DropdownMenuItem(
                        value: cat,
                        child: Text(cat, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                      );
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) {
                        setState(() => _selectedCategory = val);
                      }
                    },
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // ── 3. Date Selection & Calendar ──
              const Text(
                'CONSULTATION DATE',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.8, color: AppTheme.textMuted),
              ),
              const SizedBox(height: 8),
              InkWell(
                onTap: _pickDate,
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFCBD5E1)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.calendar_today, size: 20, color: AppTheme.primaryNavy),
                          const SizedBox(width: 12),
                          Text(
                            _formatDateYMD(_selectedDate),
                            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.primaryNavy),
                          ),
                        ],
                      ),
                      const Text(
                        'Change Date',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.secondaryAmber),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // ── 4. Available 4 Afternoon Slots (3:00 - 5:00 PM) ──
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'AVAILABLE TIME SLOTS (AFTERNOON)',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.8, color: AppTheme.textMuted),
                  ),
                  Text(
                    '3:00 PM – 5:00 PM',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.blue.shade700),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              if (_slotsLoading)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 20),
                    child: CircularProgressIndicator(color: AppTheme.secondaryAmber),
                  ),
                )
              else if (_slotsError != null)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Text(_slotsError!, style: const TextStyle(fontSize: 12, color: Colors.red)),
                )
              else if (_slots.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 16),
                  child: Text(
                    'No afternoon slots available for this date. Please choose another day.',
                    style: TextStyle(fontSize: 12, color: AppTheme.textMuted),
                  ),
                )
              else
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 10,
                    mainAxisSpacing: 10,
                    childAspectRatio: 2.8,
                  ),
                  itemCount: _slots.length,
                  itemBuilder: (context, idx) {
                    final slot = _slots[idx];
                    final isSelected = _selectedSlotId == slot.slotId;
                    return InkWell(
                      onTap: slot.isBooked
                          ? null
                          : () {
                              setState(() => _selectedSlotId = slot.slotId);
                            },
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                        decoration: BoxDecoration(
                          color: slot.isBooked
                              ? const Color(0xFFF1F5F9)
                              : isSelected
                                  ? AppTheme.primaryNavy
                                  : Colors.white,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: slot.isBooked
                                ? const Color(0xFFE2E8F0)
                                : isSelected
                                    ? AppTheme.primaryNavy
                                    : const Color(0xFFCBD5E1),
                            width: isSelected ? 2 : 1,
                          ),
                        ),
                        child: Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                slot.formattedTime,
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: slot.isBooked
                                      ? const Color(0xFF94A3B8)
                                      : isSelected
                                          ? AppTheme.secondaryAmber
                                          : AppTheme.primaryNavy,
                                ),
                              ),
                              if (slot.isBooked)
                                const Text(
                                  'Booked',
                                  style: TextStyle(fontSize: 9, color: Color(0xFFEF4444), fontWeight: FontWeight.bold),
                                ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),

              const SizedBox(height: 20),

              // ── 5. Consultation Type (Online vs In-Person) ──
              const Text(
                'CONSULTATION MODE',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.8, color: AppTheme.textMuted),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () => setState(() => _consultationType = 'Online'),
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
                        decoration: BoxDecoration(
                          color: _consultationType == 'Online' ? const Color(0xFFEFF6FF) : Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: _consultationType == 'Online' ? const Color(0xFF2563EB) : const Color(0xFFCBD5E1),
                            width: _consultationType == 'Online' ? 2 : 1,
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Text('🌐', style: TextStyle(fontSize: 16)),
                            const SizedBox(width: 8),
                            Text(
                              'Online Video',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: _consultationType == 'Online' ? const Color(0xFF1D4ED8) : AppTheme.slateDark,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: InkWell(
                      onTap: () => setState(() => _consultationType = 'In-Person'),
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
                        decoration: BoxDecoration(
                          color: _consultationType == 'In-Person' ? const Color(0xFFFEF3C7) : Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: _consultationType == 'In-Person' ? const Color(0xFFD97706) : const Color(0xFFCBD5E1),
                            width: _consultationType == 'In-Person' ? 2 : 1,
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Text('🏢', style: TextStyle(fontSize: 16)),
                            const SizedBox(width: 8),
                            Text(
                              'In-Person Chambers',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: _consultationType == 'In-Person' ? const Color(0xFFB45309) : AppTheme.slateDark,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // ── 6. Description of Legal Issue ──
              const Text(
                'DESCRIPTION OF LEGAL ISSUE',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.8, color: AppTheme.textMuted),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _descriptionController,
                maxLines: 4,
                decoration: InputDecoration(
                  hintText: 'Describe your legal situation, charges, disputes, or contracts for counsel review...',
                  hintStyle: const TextStyle(fontSize: 13, color: AppTheme.textMuted),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                  ),
                  filled: true,
                  fillColor: Colors.white,
                ),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) {
                    return 'Please provide a brief description of your legal matter.';
                  }
                  if (val.trim().length < 10) {
                    return 'Please enter at least 10 characters to assist counsel.';
                  }
                  return null;
                },
              ),

              const SizedBox(height: 28),

              // ── 7. Submit Button ──
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.gold,
                    foregroundColor: AppTheme.primaryNavy,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                  onPressed: _isSubmitting ? null : _submitBooking,
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(color: AppTheme.primaryNavy, strokeWidth: 2.5),
                        )
                      : const Text(
                          'Confirm & Request Appointment',
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
