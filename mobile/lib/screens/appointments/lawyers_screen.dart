import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../models/lawyer.dart';
import '../../services/auth_service.dart';
import '../../services/lawyer_service.dart';
import 'book_appointment_screen.dart';
import 'scheduling_agent_screen.dart';

class LawyersScreen extends StatefulWidget {
  final String? initialCategory;

  const LawyersScreen({super.key, this.initialCategory});

  @override
  State<LawyersScreen> createState() => _LawyersScreenState();
}

class _LawyersScreenState extends State<LawyersScreen> {
  List<Lawyer> _lawyers = [];
  bool _loading = true;
  String? _error;
  String _selectedCategory = 'All';
  String _searchQuery = '';

  final List<String> _categories = [
    'All',
    'Corporate & Commercial Law',
    'Criminal Law',
    'Real Estate & Property Law',
    'Labour & Employment Law',
    'Tax Law',
  ];

  @override
  void initState() {
    super.initState();
    if (widget.initialCategory != null && widget.initialCategory!.isNotEmpty) {
      _selectedCategory = widget.initialCategory!;
    }
    _loadLawyers();
  }

  Future<void> _loadLawyers() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final list = await LawyerService.getLawyers(
        specialization: _selectedCategory == 'All' ? null : _selectedCategory,
        search: _searchQuery.isNotEmpty ? _searchQuery : null,
      );
      if (mounted) {
        setState(() {
          _lawyers = list;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to load lawyers: $e';
          _loading = false;
        });
      }
    }
  }

  void _onCategorySelected(String category) {
    setState(() {
      _selectedCategory = category;
    });
    _loadLawyers();
  }

  List<Lawyer> get _filteredLawyers {
    if (_searchQuery.trim().isEmpty) return _lawyers;
    final q = _searchQuery.toLowerCase();
    return _lawyers.where((l) {
      return l.name.toLowerCase().contains(q) ||
          l.qualification.toLowerCase().contains(q) ||
          l.profileDescription.toLowerCase().contains(q) ||
          l.licenseNumber.toLowerCase().contains(q) ||
          l.specializations.any((s) => s.name.toLowerCase().contains(q));
    }).toList();
  }

  Future<void> _showAddLawyerDialog() async {
    final formKey = GlobalKey<FormState>();
    final nameCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final qualCtrl = TextEditingController(text: 'LL.B Attorney-at-Law');
    final expCtrl = TextEditingController(text: '5');
    final licCtrl = TextEditingController();
    final passCtrl = TextEditingController(text: 'LawyerPassword123!');
    final descCtrl = TextEditingController();

    String selectedCat = _selectedCategory != 'All' ? _selectedCategory : LawyerService.categories.first;
    bool isSaving = false;
    String? modalError;

    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: const [
              Icon(Icons.person_add_alt_1, color: AppTheme.primaryNavy, size: 24),
              SizedBox(width: 10),
              Text('Register New Lawyer', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
            ],
          ),
          content: SizedBox(
            width: 480,
            child: SingleChildScrollView(
              child: Form(
                key: formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (modalError != null)
                      Container(
                        padding: const EdgeInsets.all(10),
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF2F2),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFFCA5A5)),
                        ),
                        child: Text(modalError!, style: const TextStyle(fontSize: 12, color: Color(0xFFB91C1C))),
                      ),
                    TextFormField(
                      controller: nameCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Full Name & Title *',
                        hintText: 'e.g. Advocate Nimal Fernando',
                        isDense: true,
                      ),
                      validator: (val) => val == null || val.trim().isEmpty ? 'Name is required' : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: emailCtrl,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(
                        labelText: 'Email Address *',
                        hintText: 'counsel@legalease.com',
                        isDense: true,
                      ),
                      validator: (val) => val == null || !val.contains('@') ? 'Valid email required' : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: phoneCtrl,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                        labelText: 'Phone Number',
                        hintText: '+94 77 123 4567',
                        isDense: true,
                      ),
                    ),
                    const SizedBox(height: 12),
                    // Category Selection (strictly 1 category)
                    const Text(
                      'PRACTICE CATEGORY (ONE CATEGORY) *',
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.8, color: AppTheme.textMuted),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF9C3),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFFACC15)),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          isExpanded: true,
                          value: selectedCat,
                          items: LawyerService.categories.map((c) {
                            return DropdownMenuItem<String>(
                              value: c,
                              child: Text(c, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                            );
                          }).toList(),
                          onChanged: (val) {
                            if (val != null) setModalState(() => selectedCat = val);
                          },
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          flex: 2,
                          child: TextFormField(
                            controller: qualCtrl,
                            decoration: const InputDecoration(
                              labelText: 'Qualification',
                              isDense: true,
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextFormField(
                            controller: expCtrl,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'Years Exp',
                              isDense: true,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: licCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Bar / License Number *',
                        hintText: 'SC/AT/2020/1234',
                        isDense: true,
                      ),
                      validator: (val) => val == null || val.trim().isEmpty ? 'License number required' : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: passCtrl,
                      obscureText: true,
                      decoration: const InputDecoration(
                        labelText: 'Portal Password',
                        hintText: 'LawyerPassword123!',
                        isDense: true,
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: descCtrl,
                      maxLines: 2,
                      decoration: const InputDecoration(
                        labelText: 'Profile Summary',
                        hintText: 'Brief experience and focus areas...',
                        isDense: true,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: isSaving ? null : () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryNavy, foregroundColor: Colors.white),
              onPressed: isSaving
                  ? null
                  : () async {
                      if (!formKey.currentState!.validate()) return;
                      setModalState(() {
                        isSaving = true;
                        modalError = null;
                      });

                      final nav = Navigator.of(context);
                      final messenger = ScaffoldMessenger.of(context);
                      try {
                        await LawyerService.createLawyer(
                          name: nameCtrl.text.trim(),
                          email: emailCtrl.text.trim(),
                          phoneNumber: phoneCtrl.text.trim(),
                          qualification: qualCtrl.text.trim(),
                          experience: int.tryParse(expCtrl.text.trim()) ?? 0,
                          licenseNumber: licCtrl.text.trim(),
                          profileDescription: descCtrl.text.trim(),
                          category: selectedCat,
                          password: passCtrl.text.trim(),
                        );
                        if (!mounted) return;
                        nav.pop();
                        messenger.showSnackBar(
                          SnackBar(
                            content: Text('Lawyer "${nameCtrl.text.trim()}" registered successfully under $selectedCat.'),
                            backgroundColor: Colors.green.shade700,
                          ),
                        );
                        _loadLawyers();
                      } catch (e) {
                        setModalState(() {
                          isSaving = false;
                          modalError = e.toString();
                        });
                      }
                    },
              child: isSaving
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Add Lawyer'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthService.currentUser.value;
    final isAdmin = user != null && user.userType.toLowerCase() == 'admin';

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Find a Lawyer',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        actions: [
          if (isAdmin)
            IconButton(
              icon: const Icon(Icons.person_add, color: AppTheme.secondaryAmber),
              tooltip: 'Add Lawyer',
              onPressed: _showAddLawyerDialog,
            ),
          IconButton(
            icon: const Icon(Icons.auto_awesome, color: AppTheme.secondaryAmber),
            tooltip: 'AI Scheduling Assistant',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const SchedulingAgentScreen()),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadLawyers,
          ),
        ],
      ),
      floatingActionButton: isAdmin
          ? FloatingActionButton.extended(
              onPressed: _showAddLawyerDialog,
              backgroundColor: AppTheme.primaryNavy,
              foregroundColor: AppTheme.secondaryAmber,
              icon: const Icon(Icons.add),
              label: const Text('Add Lawyer', style: TextStyle(fontWeight: FontWeight.bold)),
            )
          : null,
      body: Column(
        children: [
          // ── Header & Category Pills ──
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Search bar
                TextField(
                  onChanged: (val) {
                    setState(() => _searchQuery = val);
                  },
                  onSubmitted: (_) => _loadLawyers(),
                  decoration: InputDecoration(
                    hintText: 'Search lawyer by name, practice...',
                    prefixIcon: const Icon(Icons.search, size: 20, color: AppTheme.textMuted),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: () {
                              setState(() => _searchQuery = '');
                              _loadLawyers();
                            },
                          )
                        : null,
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                    ),
                    filled: true,
                    fillColor: const Color(0xFFF8FAFC),
                  ),
                ),
                const SizedBox(height: 10),

                // AI Scheduling Smart Assistant Banner
                InkWell(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const SchedulingAgentScreen()),
                    );
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppTheme.primaryNavy, Color(0xFF1E3A8A)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.primaryNavy.withValues(alpha: 0.2),
                          blurRadius: 6,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: const Row(
                      children: [
                        CircleAvatar(
                          radius: 16,
                          backgroundColor: Colors.white24,
                          child: Icon(Icons.auto_awesome, color: AppTheme.secondaryAmber, size: 18),
                        ),
                        SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'AI Lawyer Scheduling Assistant',
                                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'Describe your legal issue to match an attorney & 30-min slot automatically',
                                style: TextStyle(color: Colors.white70, fontSize: 11),
                              ),
                            ],
                          ),
                        ),
                        Icon(Icons.arrow_forward_ios, color: AppTheme.secondaryAmber, size: 14),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                // Types of laws tabs
                const Text(
                  'TYPES OF LAWS',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.8,
                    color: AppTheme.textMuted,
                  ),
                ),
                const SizedBox(height: 8),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: _categories.map((category) {
                      final isSelected = _selectedCategory == category;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(category),
                          selected: isSelected,
                          selectedColor: AppTheme.primaryNavy,
                          backgroundColor: const Color(0xFFF1F5F9),
                          labelStyle: TextStyle(
                            fontSize: 12,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                            color: isSelected ? Colors.white : AppTheme.slateDark,
                          ),
                          onSelected: (_) => _onCategorySelected(category),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1, thickness: 1, color: Color(0xFFE2E8F0)),

          // ── Lawyers List ──
          Expanded(
            child: _loading
                ? const Center(
                    child: CircularProgressIndicator(color: AppTheme.secondaryAmber),
                  )
                : _error != null
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(_error!, style: const TextStyle(color: Colors.red)),
                            const SizedBox(height: 12),
                            ElevatedButton(
                              onPressed: _loadLawyers,
                              child: const Text('Try Again'),
                            ),
                          ],
                        ),
                      )
                    : _filteredLawyers.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.search_off, size: 48, color: AppTheme.textMuted),
                                const SizedBox(height: 12),
                                Text(
                                  'No lawyers found in "$_selectedCategory"',
                                  style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.slateDark),
                                ),
                                const SizedBox(height: 4),
                                const Text(
                                  'Try selecting a different practice area or clearing search.',
                                  style: TextStyle(fontSize: 12, color: AppTheme.textMuted),
                                ),
                                if (isAdmin) ...[
                                  const SizedBox(height: 16),
                                  ElevatedButton.icon(
                                    icon: const Icon(Icons.add),
                                    label: Text('Add Lawyer to $_selectedCategory'),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppTheme.primaryNavy,
                                      foregroundColor: Colors.white,
                                    ),
                                    onPressed: _showAddLawyerDialog,
                                  ),
                                ],
                              ],
                            ),
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.all(16),
                            itemCount: _filteredLawyers.length,
                            separatorBuilder: (context, index) => const SizedBox(height: 16),
                            itemBuilder: (context, index) {
                              final lawyer = _filteredLawyers[index];
                              return _buildLawyerCard(lawyer);
                            },
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildLawyerCard(Lawyer lawyer) {
    final categoryName = lawyer.specializations.isNotEmpty
        ? lawyer.specializations.first.name
        : 'Legal Counsel';

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
          // Lawyer info header
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 26,
                backgroundColor: AppTheme.primaryNavy,
                child: Text(
                  lawyer.name.trim().isNotEmpty ? lawyer.name.trim().split(' ').last[0] : 'L',
                  style: const TextStyle(
                    color: AppTheme.secondaryAmber,
                    fontWeight: FontWeight.bold,
                    fontSize: 18,
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      lawyer.name,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.primaryNavy,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      lawyer.qualification,
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF64748B),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(Icons.workspace_premium, size: 14, color: AppTheme.secondaryAmber),
                        const SizedBox(width: 4),
                        Text(
                          '${lawyer.experience} yrs exp · ${lawyer.licenseNumber}',
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppTheme.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // Primary Practice Category Tag
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFFDE68A)),
                ),
                child: Text(
                  categoryName,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF92400E),
                  ),
                ),
              ),
            ],
          ),

          if (lawyer.profileDescription.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              lawyer.profileDescription,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 12,
                color: Color(0xFF475569),
                height: 1.4,
              ),
            ),
          ],

          const SizedBox(height: 16),

          // Book Consultation button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              icon: const Icon(Icons.calendar_month, size: 16),
              label: const Text('Book Consultation'),
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
                  MaterialPageRoute(
                    builder: (_) => BookAppointmentScreen(
                      lawyer: lawyer,
                      initialCategory: _selectedCategory != 'All' ? _selectedCategory : lawyer.primarySpecialization,
                    ),
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
