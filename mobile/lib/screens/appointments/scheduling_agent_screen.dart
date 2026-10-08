import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../services/auth_service.dart';
import '../../services/appointment_service.dart';
import '../../services/scheduling_agent_service.dart';
import '../../widgets/markdown_formatted_text.dart';
import 'my_appointments_screen.dart';

class SchedulingAgentScreen extends StatefulWidget {
  final String? initialPrompt;

  const SchedulingAgentScreen({super.key, this.initialPrompt});

  @override
  State<SchedulingAgentScreen> createState() => _SchedulingAgentScreenState();
}

class _SchedulingChatMessage {
  final String text;
  final bool isUser;
  final DateTime timestamp;
  final List<String> actionOptions;
  final String? actionType;
  final List<Map<String, dynamic>> cards;
  final Map<String, dynamic>? confirmedBooking;

  _SchedulingChatMessage({
    required this.text,
    required this.isUser,
    DateTime? timestamp,
    this.actionOptions = const [],
    this.actionType,
    this.cards = const [],
    this.confirmedBooking,
  }) : timestamp = timestamp ?? DateTime.now();
}

class _SchedulingAgentScreenState extends State<SchedulingAgentScreen> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  final List<_SchedulingChatMessage> _messages = [];
  String? _sessionId;
  bool _initializing = true;
  bool _sending = false;
  List<String> _currentActionOptions = [];

  final List<String> _suggestedPrompts = [
    '🏢 Business & Company Formation',
    '🏠 Eviction & Landlord Dispute',
    '⚖️ Wrongful Employment Dismissal',
    '🛡️ Criminal Defense & Bail',
    '📊 Corporate Tax Assessment',
  ];

  @override
  void initState() {
    super.initState();
    _startSession();
  }

  Future<void> _startSession() async {
    setState(() => _initializing = true);
    final user = AuthService.currentUser.value;
    final customerId = (user != null && user.userId.isNotEmpty)
        ? AppointmentService.formatCustomerId(user.userId)
        : '00000000-0000-0000-0000-000000000001';
    final clientName = user?.fullName;

    try {
      final res = await SchedulingAgentService.createSession(
        customerId,
        clientName: clientName,
        userRole: user?.userType ?? 'Client',
      );

      final sid = res['sessionId']?.toString() ?? res['session_id']?.toString() ?? '';
      final msg = res['message']?.toString() ?? 'Hello! I am your Lawyer Scheduling Assistant.';
      final rawActions = res['action_options'] as List? ?? [];
      final actions = rawActions.map((e) => e.toString()).toList();

      if (mounted) {
        setState(() {
          _sessionId = sid;
          _initializing = false;
          _messages.add(_SchedulingChatMessage(
            text: msg,
            isUser: false,
            actionOptions: actions,
          ));
          _currentActionOptions = actions.isNotEmpty ? actions : _suggestedPrompts;
        });

        // If an initial prompt was provided, send it automatically
        if (widget.initialPrompt != null && widget.initialPrompt!.isNotEmpty) {
          _sendMessage(widget.initialPrompt!);
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _initializing = false;
          _messages.add(_SchedulingChatMessage(
            text: 'Welcome to the Lawyer Scheduling Assistant. How can I help you book a consultation today?',
            isUser: false,
            actionOptions: _suggestedPrompts,
          ));
          _currentActionOptions = _suggestedPrompts;
        });
      }
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage(
    String text, {
    String? selectedLawyerId,
    String? selectedSlotId,
    String? selectedSlotTime,
    String? consultationType,
  }) async {
    final clean = text.trim();
    if (clean.isEmpty) return;

    final sid = _sessionId ?? 'session-${DateTime.now().millisecondsSinceEpoch}';

    setState(() {
      _messages.add(_SchedulingChatMessage(
        text: clean,
        isUser: true,
      ));
      _sending = true;
    });
    _controller.clear();
    _scrollToBottom();

    try {
      final res = await SchedulingAgentService.sendMessage(
        sessionId: sid,
        message: clean,
        selectedLawyerId: selectedLawyerId,
        selectedSlotId: selectedSlotId,
        selectedSlotTime: selectedSlotTime,
        consultationType: consultationType,
      );

      final reply = res['message']?.toString() ?? 'I processed your request.';
      final rawActions = res['action_options'] as List? ?? [];
      final actions = rawActions.map((e) => e.toString()).toList();
      final actionType = res['action_type']?.toString();
      final rawCards = res['cards'] as List? ?? [];
      final cards = rawCards.map((c) => Map<String, dynamic>.from(c as Map)).toList();
      final confirmed = res['confirmed_booking'] is Map
          ? Map<String, dynamic>.from(res['confirmed_booking'] as Map)
          : null;

      if (mounted) {
        setState(() {
          _sending = false;
          _messages.add(_SchedulingChatMessage(
            text: reply,
            isUser: false,
            actionOptions: actions,
            actionType: actionType,
            cards: cards,
            confirmedBooking: confirmed,
          ));
          if (actions.isNotEmpty) {
            _currentActionOptions = actions;
          }
        });
        _scrollToBottom();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _sending = false;
          _messages.add(_SchedulingChatMessage(
            text: 'Unable to reach AI scheduling service: $e. Please verify backend is active.',
            isUser: false,
          ));
        });
        _scrollToBottom();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: AppTheme.primaryNavy,
        foregroundColor: Colors.white,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Lawyer Scheduling Assistant',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: Color(0xFF10B981),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 5),
                const Text(
                  'LangGraph AI Agent Active',
                  style: TextStyle(fontSize: 11, color: AppTheme.secondaryAmber),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Start Fresh Session',
            icon: const Icon(Icons.restart_alt, color: Colors.white),
            onPressed: () {
              setState(() {
                _messages.clear();
                _currentActionOptions.clear();
              });
              _startSession();
            },
          ),
          IconButton(
            tooltip: 'My Consultations',
            icon: const Icon(Icons.calendar_month, color: AppTheme.secondaryAmber),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const MyAppointmentsScreen()),
              );
            },
          ),
        ],
      ),
      body: _initializing
          ? const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(color: AppTheme.primaryNavy),
                  SizedBox(height: 16),
                  Text('Initializing Scheduling AI Agent...', style: TextStyle(color: AppTheme.textMuted)),
                ],
              ),
            )
          : Column(
              children: [
                // Chat Message List
                Expanded(
                  child: ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    itemCount: _messages.length + (_sending ? 1 : 0),
                    itemBuilder: (context, i) {
                      if (i == _messages.length && _sending) {
                        return _buildThinkingIndicator();
                      }
                      return _buildMessageItem(_messages[i]);
                    },
                  ),
                ),

                // Action chips / suggestions
                if (_currentActionOptions.isNotEmpty && !_sending)
                  _buildQuickActionRibbon(),

                // Bottom Input Bar
                _buildInputBar(),
              ],
            ),
    );
  }

  Widget _buildThinkingIndicator() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 16,
            backgroundColor: AppTheme.primaryNavy,
            child: const Icon(Icons.auto_awesome, size: 16, color: AppTheme.secondaryAmber),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.secondaryAmber),
                ),
                SizedBox(width: 8),
                Text('Agent is matching attorneys & open slots...', style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageItem(_SchedulingChatMessage msg) {
    if (msg.isUser) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.end,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Flexible(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: AppTheme.primaryNavy,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(18),
                    topRight: Radius.circular(18),
                    bottomLeft: Radius.circular(18),
                    bottomRight: Radius.circular(4),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.primaryNavy.withValues(alpha: 0.15),
                      blurRadius: 4,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Text(
                  msg.text,
                  style: const TextStyle(color: Colors.white, fontSize: 14, height: 1.4),
                ),
              ),
            ),
          ],
        ),
      );
    }

    // Agent Message
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 16,
            backgroundColor: AppTheme.primaryNavy,
            child: const Icon(Icons.balance, size: 16, color: AppTheme.secondaryAmber),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(4),
                      topRight: Radius.circular(18),
                      bottomLeft: Radius.circular(18),
                      bottomRight: Radius.circular(18),
                    ),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.04),
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: MarkdownFormattedText(
                    text: msg.text,
                    baseStyle: const TextStyle(color: AppTheme.slateDark, fontSize: 14, height: 1.45),
                    boldColor: AppTheme.primaryNavy,
                  ),
                ),

                // Render Cards (Slots, Lawyers, or Confirmation)
                if (msg.cards.isNotEmpty)
                  _buildCardsWidget(msg.cards),

                // Render Success Booking Card
                if (msg.confirmedBooking != null)
                  _buildSuccessCard(msg.confirmedBooking!),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCardsWidget(List<Map<String, dynamic>> cards) {
    final first = cards.first;
    final type = first['type']?.toString();

    // 1. Available 30-Minute Slot Badges
    if (type == 'slot_card') {
      return Container(
        margin: const EdgeInsets.only(top: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFBFDBFE)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.schedule, size: 16, color: Color(0xFF2563EB)),
                SizedBox(width: 6),
                Text(
                  'Select a 30-Minute Time Slot:',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF1E3A8A)),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: cards.map((c) {
                final slotId = c['slot_id']?.toString() ?? '';
                final fTime = c['formatted_time']?.toString() ?? '';
                return ActionChip(
                  avatar: const Icon(Icons.alarm, size: 14, color: AppTheme.primaryNavy),
                  label: Text(
                    fTime,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.primaryNavy),
                  ),
                  backgroundColor: const Color(0xFFEFF6FF),
                  side: const BorderSide(color: Color(0xFF93C5FD)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  onPressed: () {
                    _sendMessage(
                      'Slot: $fTime',
                      selectedSlotId: slotId,
                      selectedSlotTime: fTime,
                    );
                  },
                );
              }).toList(),
            ),
          ],
        ),
      );
    }

    // 2. Lawyer Match Cards
    if (type == 'lawyer_card') {
      return Container(
        margin: const EdgeInsets.only(top: 8),
        child: Column(
          children: cards.map((c) {
            final lawyerId = c['lawyer_id']?.toString() ?? '';
            final name = c['name']?.toString() ?? 'Attorney';
            final exp = c['experience']?.toString() ?? '0';
            final lic = c['license']?.toString() ?? '';
            final score = (c['match_score'] as num?)?.toDouble() ?? 0.9;
            final scorePct = (score * 100).toInt();

            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 20,
                    backgroundColor: AppTheme.primaryNavy,
                    child: Text(
                      name.isNotEmpty ? name.split(' ').last[0] : 'L',
                      style: const TextStyle(color: AppTheme.secondaryAmber, fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.primaryNavy)),
                        Text('$exp yrs exp · $lic', style: const TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFECFDF5),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFA7F3D0)),
                    ),
                    child: Text(
                      '$scorePct% Match',
                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF065F46)),
                    ),
                  ),
                  const SizedBox(width: 6),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryNavy,
                      foregroundColor: Colors.white,
                      visualDensity: VisualDensity.compact,
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 0),
                      textStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                    onPressed: () {
                      _sendMessage('Select: $name', selectedLawyerId: lawyerId);
                    },
                    child: const Text('Select'),
                  ),
                ],
              ),
            );
          }).toList(),
        ),
      );
    }

    return const SizedBox.shrink();
  }

  Widget _buildSuccessCard(Map<String, dynamic> booking) {
    final aptId = booking['appointmentId']?.toString() ?? '';
    final date = booking['date']?.toString() ?? '';
    final startTime = booking['startTime']?.toString() ?? '';
    final lawyerName = booking['lawyerName']?.toString() ?? 'Attorney';

    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFECFDF5),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFA7F3D0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.check_circle, color: Color(0xFF059669), size: 18),
              SizedBox(width: 6),
              Text(
                'Consultation Confirmed',
                style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF065F46), fontSize: 13),
              ),
            ],
          ),
          const SizedBox(height: 6),
          if (aptId.isNotEmpty)
            Text('ID: $aptId', style: const TextStyle(fontSize: 10, color: Color(0xFF047857), fontWeight: FontWeight.bold)),
          Text('With: $lawyerName', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF047857))),
          Text('Scheduled: $date at $startTime', style: const TextStyle(fontSize: 12, color: Color(0xFF065F46))),
          const SizedBox(height: 10),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF059669),
              foregroundColor: Colors.white,
              visualDensity: VisualDensity.compact,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            icon: const Icon(Icons.calendar_month, size: 15),
            label: const Text('View in My Appointments', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const MyAppointmentsScreen()),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActionRibbon() {
    return Container(
      height: 44,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: _currentActionOptions.length,
        itemBuilder: (context, idx) {
          final opt = _currentActionOptions[idx];
          final isConfirm = opt.contains('Confirm');
          return Padding(
            padding: const EdgeInsets.only(right: 6),
            child: ActionChip(
              backgroundColor: isConfirm ? const Color(0xFF10B981) : Colors.white,
              side: BorderSide(color: isConfirm ? const Color(0xFF059669) : const Color(0xFFCBD5E1)),
              label: Text(
                opt,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: isConfirm ? Colors.white : AppTheme.primaryNavy,
                ),
              ),
              onPressed: () => _sendMessage(opt),
            ),
          );
        },
      ),
    );
  }

  Widget _buildInputBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Colors.grey.shade200)),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: _controller,
                textInputAction: TextInputAction.send,
                onSubmitted: (val) => _sendMessage(val),
                decoration: InputDecoration(
                  hintText: 'Describe legal issue (e.g. eviction, company registration)...',
                  hintStyle: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(24),
                    borderSide: BorderSide(color: Colors.grey.shade300),
                  ),
                  filled: true,
                  fillColor: const Color(0xFFF8FAFC),
                ),
              ),
            ),
            const SizedBox(width: 8),
            CircleAvatar(
              backgroundColor: AppTheme.primaryNavy,
              child: IconButton(
                icon: const Icon(Icons.send, color: AppTheme.secondaryAmber, size: 18),
                onPressed: () => _sendMessage(_controller.text),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
