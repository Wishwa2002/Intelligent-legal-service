import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../services/auth_service.dart';
import '../appointments/scheduling_agent_screen.dart';

class CommonAiScreen extends StatefulWidget {
  const CommonAiScreen({super.key});

  @override
  State<CommonAiScreen> createState() => _CommonAiScreenState();
}

class _CommonAiMessage {
  final String text;
  final bool isUser;
  final DateTime timestamp;

  _CommonAiMessage({
    required this.text,
    required this.isUser,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();
}

class _CommonAiScreenState extends State<CommonAiScreen> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<_CommonAiMessage> _messages = [];
  bool _thinking = false;

  final List<String> _suggestedQuestions = [
    '📅 Schedule Consultation with a Lawyer (AI Agent)',
    '⚖️ How do I file a civil lawsuit in Sri Lanka?',
    '🏢 What are the steps for company registration?',
    '👨‍👩‍👧 How are child custody matters handled?',
    '🏠 What is required for land title transfers?',
    '📜 How do I execute a Power of Attorney?',
  ];

  @override
  void initState() {
    super.initState();
    _initWelcome();
  }

  void _initWelcome() {
    final user = AuthService.currentUser.value;
    final name = (user != null && user.fullName.isNotEmpty)
        ? user.fullName.split(' ').first
        : 'there';

    _messages.add(
      _CommonAiMessage(
        text: 'Hello $name! I am the **LegalEase Common AI Assistant**.\n\n'
            'I can provide general guidance on Sri Lankan legal processes, explain common legal terminology, and help guide you through our legal practice.\n\n'
            '*(Note: For specific legal document verification & OCR clause analysis, please open the **Documents** tab to consult the **Document Agent**).*',
        isUser: false,
      ),
    );
  }

  void _sendMessage(String query) {
    final trimmed = query.trim();
    if (trimmed.isEmpty) return;

    if (trimmed.contains('Schedule Consultation') || trimmed.contains('Lawyer (AI Agent)')) {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => const SchedulingAgentScreen()),
      );
      return;
    }

    setState(() {
      _messages.add(_CommonAiMessage(text: trimmed, isUser: true));
      _thinking = true;
    });
    _controller.clear();
    _scrollToBottom();

    // Generate responsive general legal guidance
    Future.delayed(const Duration(milliseconds: 900), () {
      if (!mounted) return;
      final reply = _generateGeneralLegalResponse(trimmed);
      setState(() {
        _thinking = false;
        _messages.add(_CommonAiMessage(text: reply, isUser: false));
      });
      _scrollToBottom();
    });
  }

  String _generateGeneralLegalResponse(String query) {
    final lower = query.toLowerCase();

    if (lower.contains('company') || lower.contains('business') || lower.contains('incorporat')) {
      return '**Company Registration in Sri Lanka (Companies Act No. 07 of 2007)**:\n\n'
          '1. **Name Approval**: Reserve your proposed company name via the e-ROC portal.\n'
          '2. **Form Filing**: Complete Form 1 (Company Registration), Form 18 (Consent of Directors), and Form 19 (Consent of Secretary).\n'
          '3. **Articles of Association**: Draft adoption of Model Articles or customized legal articles.\n'
          '4. **Official Registration**: Submit to the Registrar General of Companies (ROC).\n\n'
          '💡 You can request formal corporate registration drafting in our **Documents** section.';
    }

    if (lower.contains('custody') || lower.contains('family') || lower.contains('divorce')) {
      return '**Family & Custody Law in Sri Lanka**:\n\n'
          'Under Roman-Dutch Law and Sri Lankan civil procedure, child custody determinations strictly prioritize **the best interests of the child**.\n\n'
          '• **Preferential Custody**: Courts typically award physical custody to the parent best positioned to safeguard the child’s moral, educational, and emotional welfare.\n'
          '• **Access Rights**: Non-custodial parents are generally granted reasonable visitation rights.\n\n'
          '⚖️ To consult a family law advocate, visit the **Lawyers** tab to book a 3:00–5:00 PM afternoon slot.';
    }

    if (lower.contains('land') || lower.contains('property') || lower.contains('deed') || lower.contains('title')) {
      return '**Property & Title Transfer Procedure**:\n\n'
          '1. **Search of Encumbrances**: Obtain extracts from the relevant Land Registry for the past 30 years.\n'
          '2. **Pedigree Examination**: Verify title continuity and ensure no encumbrances, lis pendens, or mortgages exist.\n'
          '3. **Deed of Transfer**: Drafted and attested by a commissioned Notary Public with two competent witnesses.\n'
          '4. **Stamp Duty & Registration**: Pay Provincial Council stamp duty and register at the Land Registry.\n\n'
          '📄 For deed verification and clerk attestation, visit our **Documents** tab.';
    }

    if (lower.contains('civil') || lower.contains('lawsuit') || lower.contains('court')) {
      return '**Civil Litigation Overview (Civil Procedure Code)**:\n\n'
          '• **Letter of Demand (LOD)**: Sent by an Attorney-at-Law demanding performance or settlement within a specified timeframe (typically 14 days).\n'
          '• **Plaint Filing**: If unpaid, a formal Plaint is filed in the District Court or Primary Court depending on the financial jurisdiction.\n'
          '• **Summons & Answer**: The court issues summons, and the defendant files an Answer within the stipulated timeframe.\n\n'
          '⚖️ You can browse our civil law advocates under the **Lawyers** tab.';
    }

    return 'Thank you for your inquiry regarding **"$query"**.\n\n'
        'Our legal system adheres to Roman-Dutch Law alongside Sri Lankan statutory enactments.\n\n'
        '• **Counsel & Representation**: You can schedule a direct consultation with specialist advocates in the **Lawyers** tab.\n'
        '• **Document Requests & Clerks**: For statutory deeds, affidavits, and lease agreements, explore the **Documents** tab.\n'
        '• **Multi-Agent Expansion**: Other member specialized AI agents will be available here as they deploy.';
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 16,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(7),
              decoration: BoxDecoration(
                color: AppTheme.secondaryAmber,
                borderRadius: BorderRadius.circular(9),
              ),
              child: const Icon(Icons.auto_awesome, color: AppTheme.primaryNavy, size: 18),
            ),
            const SizedBox(width: 10),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'AI Agent',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                Text(
                  'Common Legal AI Assistant',
                  style: TextStyle(fontSize: 11, color: Colors.white70),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_month, color: AppTheme.secondaryAmber),
            tooltip: 'Lawyer Scheduling Assistant',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const SchedulingAgentScreen()),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.restart_alt),
            tooltip: 'Clear Chat',
            onPressed: () {
              setState(() {
                _messages.clear();
                _initWelcome();
              });
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Sub-banner
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: const Color(0xFFF1F5F9),
            child: const Row(
              children: [
                Icon(Icons.info_outline, size: 14, color: AppTheme.textMuted),
                SizedBox(width: 6),
                Expanded(
                  child: Text(
                    'Common AI legal hub. Domain-specific member agents connect here.',
                    style: TextStyle(fontSize: 11, color: AppTheme.textMuted),
                  ),
                ),
              ],
            ),
          ),

          // Message stream
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (ctx, idx) {
                final msg = _messages[idx];
                return Align(
                  alignment: msg.isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    constraints: BoxConstraints(
                      maxWidth: MediaQuery.of(context).size.width * 0.82,
                    ),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: msg.isUser ? AppTheme.primaryNavy : Colors.white,
                      borderRadius: BorderRadius.circular(16).copyWith(
                        bottomRight: msg.isUser ? const Radius.circular(0) : const Radius.circular(16),
                        bottomLeft: !msg.isUser ? const Radius.circular(0) : const Radius.circular(16),
                      ),
                      border: msg.isUser ? null : Border.all(color: const Color(0xFFE2E8F0)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.04),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Text(
                      msg.text,
                      style: TextStyle(
                        fontSize: 13.5,
                        color: msg.isUser ? Colors.white : const Color(0xFF1E293B),
                        height: 1.45,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),

          if (_thinking)
            Padding(
              padding: const EdgeInsets.only(bottom: 8, left: 18),
              child: Row(
                children: [
                  const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.gold),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'AI is thinking...',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600, fontStyle: FontStyle.italic),
                  ),
                ],
              ),
            ),

          // Suggested chips
          if (_messages.length <= 1)
            Container(
              height: 40,
              margin: const EdgeInsets.only(bottom: 8),
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: _suggestedQuestions.length,
                separatorBuilder: (ctx, index) => const SizedBox(width: 8),
                itemBuilder: (ctx, i) {
                  return ActionChip(
                    label: Text(_suggestedQuestions[i], style: const TextStyle(fontSize: 11)),
                    backgroundColor: Colors.white,
                    side: const BorderSide(color: Color(0xFFCBD5E1)),
                    onPressed: () => _sendMessage(_suggestedQuestions[i]),
                  );
                },
              ),
            ),

          // Input field
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 10,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            child: SafeArea(
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      minLines: 1,
                      maxLines: 4,
                      decoration: InputDecoration(
                        hintText: 'Ask general legal question...',
                        hintStyle: const TextStyle(fontSize: 13, color: AppTheme.textMuted),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: const BorderSide(color: AppTheme.primaryNavy),
                        ),
                      ),
                      onSubmitted: _sendMessage,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    decoration: const BoxDecoration(
                      color: AppTheme.primaryNavy,
                      shape: BoxShape.circle,
                    ),
                    child: IconButton(
                      icon: const Icon(Icons.send_rounded, color: AppTheme.gold, size: 18),
                      onPressed: () => _sendMessage(_controller.text),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
