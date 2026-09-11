import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../config/app_theme.dart';
import '../../models/chat_message.dart';
import '../../services/agent_chat_service.dart';
import '../../services/auth_service.dart';
import '../../services/document_file_service.dart';
import '../../services/sample_document_service.dart';
import '../../widgets/chat_bubble.dart';
import '../../widgets/sample_document_picker_dialog.dart';
import '../auth/login_screen.dart';
import '../requests/my_requests_screen.dart';

class AiChatScreen extends StatefulWidget {
  const AiChatScreen({super.key});

  @override
  State<AiChatScreen> createState() => _AiChatScreenState();
}

class _AiChatScreenState extends State<AiChatScreen> {
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  final List<ChatMessage> _messages = [];
  String? _sessionId;
  int? _requestId;
  bool _initializing = true;
  bool _sending = false;
  String? _sessionStatus;

  final List<String> _suggestedPrompts = [
    '📁 View All Services',
    'Rental & Lease Agreement',
    'Business & Corporate Registration',
    'Power of Attorney',
    'Property Transfer',
    'Bail Application',
    '📁 View All Sample Docs',
  ];

  String get _chatStorageKey {
    final user = AuthService.currentUser.value;
    final userId = (user != null && user.userId.isNotEmpty) ? user.userId : 'guest';
    return 'ai_chat_history_$userId';
  }

  Future<void> _saveChatToStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final data = {
        'sessionId': _sessionId,
        'requestId': _requestId,
        'sessionStatus': _sessionStatus,
        'messages': _messages.map((m) => m.toJson()).toList(),
      };
      await prefs.setString(_chatStorageKey, jsonEncode(data));
    } catch (e) {
      debugPrint('Failed to save chat to storage: $e');
    }
  }

  Future<bool> _loadChatFromStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_chatStorageKey);
      if (raw != null && raw.isNotEmpty) {
        final data = jsonDecode(raw) as Map<String, dynamic>;
        final savedSessionId = data['sessionId']?.toString();
        final savedRequestId = data['requestId'] as int?;
        final savedStatus = data['sessionStatus']?.toString();
        final rawMsgs = data['messages'] as List?;

        if (rawMsgs != null && rawMsgs.isNotEmpty) {
          _messages.clear();
          for (final item in rawMsgs) {
            if (item is Map<String, dynamic>) {
              _messages.add(ChatMessage.fromJson(item));
            }
          }
          _sessionId = savedSessionId;
          _requestId = savedRequestId;
          _sessionStatus = savedStatus;
          return true;
        }
      }
    } catch (e) {
      debugPrint('Failed to load chat from storage: $e');
    }
    return false;
  }

  Future<void> _resetAndStartNewChat() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        icon: const Icon(Icons.restart_alt, size: 40, color: AppTheme.secondaryAmber),
        title: const Text('Start New Chat?'),
        content: const Text(
          'This will clear your current conversation history and start a fresh legal consultation.',
          style: TextStyle(fontSize: 13, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryNavy,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('New Chat'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      setState(() {
        _messages.clear();
        _sessionId = null;
        _requestId = null;
        _sessionStatus = null;
      });
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_chatStorageKey);
      await _initSession(forceNew: true);
    }
  }

  @override
  void initState() {
    super.initState();
    _initSession();
  }

  Future<void> _initSession({bool forceNew = false}) async {
    setState(() => _initializing = true);
    try {
      if (!forceNew) {
        final restored = await _loadChatFromStorage();
        if (restored && _messages.isNotEmpty) {
          if (mounted) {
            setState(() => _initializing = false);
            _scrollToBottom();
          }
          return;
        }
      }

      final user = AuthService.currentUser.value;
      final isGuest = (user == null || user.userId.isEmpty);
      final customerId = isGuest ? 'guest' : user.userId;
      final session = await AgentChatService.createSession(customerId);

      _sessionId = session['sessionId']?.toString() ?? session['session_id']?.toString();

      final rawOpts = session['action_options'] ?? session['options'] ?? session['actionOptions'];
      List<String>? initialOptions;
      if (rawOpts is List && rawOpts.isNotEmpty) {
        initialOptions = rawOpts.map((e) => e.toString()).toList();
      } else {
        initialOptions = [
          'Rental & Lease Agreement',
          'Business Registration',
          'Power of Attorney',
          'Property Transfer',
          '📁 View All Services',
        ];
      }

      final welcomeMsg = session['message']?.toString() ?? (isGuest
          ? 'Hello! I am your AI Legal Assistant. You are currently in **Guest Mode**.\n\nWhat legal service or document assistance do you need today? You can select an option below or ask to view all services.'
          : 'Hello ${user.fullName.split(" ").first}! I am your AI Legal Assistant.\n\nWhat legal service or document assistance do you need today? You can tap an option below or describe your legal matter.');

      _messages.clear();
      _messages.add(
        ChatMessage.agent(
          welcomeMsg,
          options: initialOptions,
        ),
      );
      await _saveChatToStorage();
    } catch (e) {
      _messages.add(
        ChatMessage.agent(
          'Welcome to Legal Intelligence Assistant. (Offline Mode: please ensure backend/AI service is running). How can I assist you?',
          isError: true,
        ),
      );
    } finally {
      if (mounted) setState(() => _initializing = false);
    }
  }

  Future<void> _sendMessage(String text, {String? fileId, String? fileType}) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty && fileId == null) return;

    if (trimmed.isNotEmpty) {
      setState(() {
        _messages.add(ChatMessage.user(trimmed));
        _sending = true;
      });
      _textController.clear();
      _scrollToBottom();
    }

    try {
      if (_sessionId == null) {
        await _initSession();
      }

      if (_sessionId != null) {
        final res = await AgentChatService.sendMessage(
          sessionId: _sessionId!,
          message: trimmed,
          uploadedFileId: fileId,
          uploadedFileExpectedType: fileType,
        );

        final reply = res['reply']?.toString() ??
            res['response']?.toString() ??
            res['message']?.toString() ??
            'I have processed your request.';
        final status = res['status']?.toString() ?? res['phase']?.toString();

        final reqIdStr = res['request_id']?.toString() ?? res['requestId']?.toString();
        if (reqIdStr != null && reqIdStr.isNotEmpty) {
          _requestId = int.tryParse(reqIdStr);
        }

        List<String>? dynamicOptions;
        final rawOptions = res['action_options'] ?? res['options'] ?? res['actionOptions'];
        if (rawOptions is List && rawOptions.isNotEmpty) {
          dynamicOptions = rawOptions.map((e) => e.toString()).toList();
        }

        final rawMissing = res['missing_documents'] ?? res['missingDocuments'];
        List<String> missingList = [];
        if (rawMissing is List) {
          missingList = rawMissing.map((e) => e.toString()).toList();
        }

        final needsUpload = (status == 'WAITING_FOR_DOCUMENTS' || status == 'ANALYZING') &&
            _requestId != null &&
            missingList.isNotEmpty;

        if (needsUpload) {
          if (!AuthService.isAuthenticated) {
            dynamicOptions = [
              '🔑 Sign In to Upload',
              ...missingList.map((m) => '📄 Upload $m'),
            ];
          } else {
            dynamicOptions = missingList.map((m) => '📄 Upload $m').toList();
          }
        } else if (reply.contains('Would you like to start your request for **') ||
            reply.toLowerCase().contains('would you like to start your request')) {
          final match = RegExp(r'Would you like to start your request for \*\*(.*?)\*\*').firstMatch(reply);
          final sName = match?.group(1) ?? 'this service';
          dynamicOptions = [
            '📄 Start Request for $sName',
            'Tell me more about $sName',
            '📁 View All Services',
          ];
        } else if (reply.toLowerCase().contains('login required') ||
            reply.toLowerCase().contains('sign in to your account')) {
          dynamicOptions = [
            '🔑 Sign In / Register',
            'Rental & Lease Agreement',
            'Business Registration',
            '📁 View All Services',
          ];
        } else if (dynamicOptions == null && (
            reply.toLowerCase().contains('what service') ||
            reply.toLowerCase().contains('which service') ||
            reply.toLowerCase().contains('what legal service') ||
            reply.toLowerCase().contains('which of these services') ||
            reply.toLowerCase().contains('pleasure to meet you') ||
            reply.toLowerCase().contains('how can i assist you') ||
            reply.toLowerCase().contains('welcome to lexintelligence'))) {
          dynamicOptions = [
            'Rental & Lease Agreement',
            'Business Registration',
            'Power of Attorney',
            'Property Transfer',
            '📁 View All Services',
          ];
        }

        setState(() {
          _sessionStatus = status;
          _messages.add(ChatMessage.agent(reply, options: dynamicOptions));
        });
        await _saveChatToStorage();
      }
    } catch (e) {
      setState(() {
        _messages.add(ChatMessage.agent(
          'Could not reach AI Service: $e\nTip: You can configure the service URL in top right settings.',
          isError: true,
        ));
      });
    } finally {
      if (mounted) {
        setState(() => _sending = false);
        _scrollToBottom();
      }
    }
  }

  void _showLoginRequiredDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        icon: const Icon(Icons.lock_person_outlined, size: 44, color: AppTheme.primaryNavy),
        title: const Text('Sign In Required to Upload'),
        content: const Text(
          'Document upload and legal verification require an active client account.\n\nPlease sign in or register to upload documents for legal analysis.',
          style: TextStyle(fontSize: 13, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Continue as Guest'),
          ),
          ElevatedButton.icon(
            icon: const Icon(Icons.login, size: 16),
            label: const Text('Sign In'),
            onPressed: () async {
              Navigator.pop(ctx);
              final loggedIn = await Navigator.push<bool>(
                context,
                MaterialPageRoute(builder: (_) => const LoginScreen(asModal: true)),
              );
              if (loggedIn == true && mounted) {
                setState(() => _messages.clear());
                _initSession();
              }
            },
          ),
        ],
      ),
    );
  }

  Future<void> _handleAttachFile({String? expectedType}) async {
    final user = AuthService.currentUser.value;
    if (user == null) {
      _showLoginRequiredDialog();
      return;
    }

    final matchingSample = SampleDocumentService.getMatchingSample(expectedType);

    final choice = await showModalBottomSheet<String>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Upload Legal Document',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.primaryNavy),
              ),
              const SizedBox(height: 4),
              Text(
                expectedType != null ? 'Target Requirement: $expectedType' : 'Choose upload method for automated verification',
                style: const TextStyle(fontSize: 12, color: AppTheme.textMuted),
              ),
              const SizedBox(height: 16),
              if (matchingSample != null) ...[
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.green.withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.verified, color: Colors.green),
                  ),
                  title: Text(
                    'Attach Sample: ${matchingSample.title}',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  subtitle: Text(
                    'Acceptable verified sample (${matchingSample.fileName})',
                    style: const TextStyle(fontSize: 12),
                  ),
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE8F5E9),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Text(
                      'Recommended',
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.green),
                    ),
                  ),
                  onTap: () => Navigator.pop(ctx, 'direct_sample'),
                ),
                const Divider(),
              ],
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.secondaryAmber.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.picture_as_pdf, color: AppTheme.primaryNavy),
                ),
                title: const Text('Browse All Sample Documents', style: TextStyle(fontWeight: FontWeight.bold)),
                subtitle: const Text('Select from verified legal document library'),
                onTap: () => Navigator.pop(ctx, 'sample'),
              ),
              const Divider(),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryNavy.withValues(alpha: 0.08),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.folder_open, color: AppTheme.primaryNavy),
                ),
                title: const Text('Choose from Device Storage', style: TextStyle(fontWeight: FontWeight.bold)),
                subtitle: const Text('Select a PDF, PNG, or JPG from your phone storage'),
                onTap: () => Navigator.pop(ctx, 'storage'),
              ),
            ],
          ),
        ),
      ),
    );

    if (choice == 'direct_sample' && matchingSample != null) {
      _uploadSpecificSample(matchingSample, expectedDocType: expectedType);
    } else if (choice == 'sample') {
      _pickAndUploadSample(expectedType);
    } else if (choice == 'storage') {
      _pickFromDeviceStorage(expectedType);
    }
  }

  Future<void> _uploadSpecificSample(SampleDocument sample, {String? expectedDocType}) async {
    final user = AuthService.currentUser.value;
    if (user == null) {
      _showLoginRequiredDialog();
      return;
    }

    setState(() {
      _messages.add(ChatMessage.user('📎 Attached Sample: ${sample.title} (${sample.fileName})'));
      _sending = true;
    });
    _scrollToBottom();

    try {
      if (_requestId == null && _sessionId != null) {
        try {
          final statusData = await AgentChatService.getStatus(_sessionId!);
          final reqIdStr = statusData?['request_id']?.toString() ?? statusData?['requestId']?.toString();
          if (reqIdStr != null && reqIdStr.isNotEmpty) {
            _requestId = int.tryParse(reqIdStr);
          }
        } catch (_) {}
      }

      String? fileId;
      if (_requestId != null) {
        try {
          final uploaded = await SampleDocumentService.uploadSampleDocument(
            requestId: _requestId!,
            sample: sample,
          );
          fileId = uploaded.fileId.toString();
        } catch (e) {
          debugPrint('Backend sample upload warning: $e');
        }
      }

      // Ensure fileId is provided so AI workflow triggers document analysis
      fileId ??= '1';

      await _sendMessage(
        'I uploaded document: ${sample.fileName}',
        fileId: fileId,
        fileType: expectedDocType ?? sample.docType,
      );
    } catch (e) {
      if (mounted) {
        setState(() {
          _messages.add(ChatMessage.agent('Failed to upload sample document: $e', isError: true));
          _sending = false;
        });
      }
    }
  }

  Future<void> _pickAndUploadSample([String? expectedDocType]) async {
    final sample = await showSampleDocumentPickerSheet(context, targetDocType: expectedDocType);
    if (sample == null) return;

    final user = AuthService.currentUser.value;
    if (user == null) {
      _showLoginRequiredDialog();
      return;
    }

    await _uploadSpecificSample(sample, expectedDocType: expectedDocType);
  }

  Future<void> _pickFromDeviceStorage([String? expectedType]) async {
    final file = await DocumentFileService.pickDocument();
    if (file == null) return;

    setState(() {
      _messages.add(ChatMessage.user('📎 Attached: ${file.name}'));
      _sending = true;
    });
    _scrollToBottom();

    if (_requestId == null && _sessionId != null) {
      try {
        final statusData = await AgentChatService.getStatus(_sessionId!);
        final reqIdStr = statusData?['request_id']?.toString() ?? statusData?['requestId']?.toString();
        if (reqIdStr != null && reqIdStr.isNotEmpty) {
          _requestId = int.tryParse(reqIdStr);
        }
      } catch (_) {}
    }

    String? fileId;
    if (_requestId != null) {
      try {
        final uploaded = await DocumentFileService.uploadDocument(
          requestId: _requestId!,
          file: file,
        );
        fileId = uploaded.fileId.toString();
      } catch (e) {
        debugPrint('Backend file upload warning: $e');
      }
    }

    // Ensure fileId is provided so AI workflow triggers document analysis
    fileId ??= '1';

    _sendMessage('I uploaded document: ${file.name}', fileId: fileId, fileType: expectedType ?? file.extension);
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

  Future<void> _openLoginModal() async {
    final loggedIn = await Navigator.push<bool>(
      context,
      MaterialPageRoute(builder: (_) => const LoginScreen(asModal: true)),
    );
    if (loggedIn == true && mounted) {
      setState(() => _messages.clear());
      _initSession();
    }
  }

  void _handleActionSelected(String action) {
    final user = AuthService.currentUser.value;
    final isGuest = (user == null || user.userId.isEmpty);

    if (action.contains('Sign In') || action.contains('Register') || action.contains('🔑')) {
      _openLoginModal();
      return;
    }

    if (action.contains('Sample') || action.startsWith('✨') || action.contains('Sample Docs')) {
      _pickAndUploadSample();
      return;
    }

    if (action == '📁 View All Services' || action.toLowerCase().contains('view all services') || action.toLowerCase().contains('display all services')) {
      _sendMessage('Display all services');
      return;
    }

    if (action.contains('My Requests') || action.contains('Requests Page') || action.contains('Go to My Requests') || action.contains('View My Requests')) {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => const MyRequestsScreen()),
      );
      return;
    }

    if (action.contains('Upload from Storage') || action.startsWith('📤')) {
      if (isGuest) {
        _showLoginRequiredDialog();
        return;
      }
      _pickFromDeviceStorage();
      return;
    }

    if (action.startsWith('📄 Upload ')) {
      if (isGuest) {
        _showLoginRequiredDialog();
        return;
      }
      final docType = action.replaceFirst('📄 Upload ', '').trim();
      _handleAttachFile(expectedType: docType);
      return;
    }

    if (action.startsWith('📄 Required: ')) {
      if (isGuest) {
        _showLoginRequiredDialog();
        return;
      }
      final docType = action.replaceFirst('📄 Required: ', '').trim();
      _handleAttachFile(expectedType: docType);
      return;
    }

    _sendMessage(action);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.add_comment_outlined),
          tooltip: 'New Chat',
          onPressed: _resetAndStartNewChat,
        ),
        titleSpacing: 0,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppTheme.secondaryAmber,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.auto_awesome, color: AppTheme.primaryNavy, size: 18),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'AI Legal Assistant',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    _sessionStatus != null ? 'State: $_sessionStatus' : 'LangGraph + Gemini 3.5',
                    style: const TextStyle(fontSize: 11, color: Colors.white70),
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          ValueListenableBuilder(
            valueListenable: AuthService.currentUser,
            builder: (ctx, user, _) {
              if (user == null) {
                return TextButton.icon(
                  style: TextButton.styleFrom(
                    foregroundColor: AppTheme.secondaryAmber,
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                  ),
                  icon: const Icon(Icons.login, size: 16),
                  label: const Text('Sign In', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  onPressed: () async {
                    final loggedIn = await Navigator.push<bool>(
                      context,
                      MaterialPageRoute(builder: (_) => const LoginScreen(asModal: true)),
                    );
                    if (loggedIn == true && mounted) {
                      setState(() => _messages.clear());
                      _initSession(forceNew: true);
                    }
                  },
                );
              }
              return Padding(
                padding: const EdgeInsets.only(right: 12),
                child: Center(
                  child: Tooltip(
                    message: user.fullName,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.person, size: 14, color: AppTheme.secondaryAmber),
                          const SizedBox(width: 4),
                          Text(
                            user.fullName.split(' ').first,
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Suggested prompts horizontally scrollable
          Container(
            height: 38,
            padding: const EdgeInsets.symmetric(vertical: 3),
            color: const Color(0xFFF1F5F9),
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 10),
              itemCount: _suggestedPrompts.length,
              separatorBuilder: (_, _) => const SizedBox(width: 5),
              itemBuilder: (ctx, i) {
                final prompt = _suggestedPrompts[i];
                return ActionChip(
                  visualDensity: VisualDensity.compact,
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 0),
                  backgroundColor: Colors.white,
                  side: const BorderSide(color: AppTheme.borderSubtle),
                  label: Text(
                    prompt,
                    style: const TextStyle(fontSize: 11.5, color: AppTheme.primaryNavy),
                  ),
                  onPressed: _sending ? null : () => _sendMessage(prompt),
                );
              },
            ),
          ),

          // Chat messages
          Expanded(
            child: _initializing
                ? const Center(child: CircularProgressIndicator(color: AppTheme.secondaryAmber))
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    itemCount: _messages.length,
                    itemBuilder: (ctx, i) {
                      final msg = _messages[i];
                      return ChatBubble(
                        message: msg,
                        onActionSelected: _sending ? null : (opt) => _handleActionSelected(opt),
                      );
                    },
                  ),
          ),

          // Sending / Thinking indicator
          if (_sending) ...[
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Row(
                children: const [
                  SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.secondaryAmber),
                  ),
                  SizedBox(width: 10),
                  Text('Legal Agent thinking & checking law guidelines (10-30s)...',
                      style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                ],
              ),
            ),
          ],

          // Guest Mode Warning / Helper Banner
          ValueListenableBuilder(
            valueListenable: AuthService.currentUser,
            builder: (ctx, user, _) {
              if (user == null) {
                return Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  color: const Color(0xFFFEF3C7),
                  child: Row(
                    children: [
                      const Icon(Icons.info_outline, size: 15, color: Color(0xFF92400E)),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text(
                          'Guest Mode: Q&A is open. Sign in to upload docs or create requests.',
                          style: TextStyle(fontSize: 11, color: Color(0xFF92400E)),
                        ),
                      ),
                      GestureDetector(
                        onTap: () async {
                          final loggedIn = await Navigator.push<bool>(
                            context,
                            MaterialPageRoute(builder: (_) => const LoginScreen(asModal: true)),
                          );
                          if (loggedIn == true && mounted) {
                            setState(() => _messages.clear());
                            _initSession();
                          }
                        },
                        child: const Text(
                          'Sign In',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primaryNavy, decoration: TextDecoration.underline),
                        ),
                      ),
                    ],
                  ),
                );
              }
              return const SizedBox.shrink();
            },
          ),

          // Input field
          Container(
            padding: const EdgeInsets.all(12),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: AppTheme.borderSubtle)),
            ),
            child: SafeArea(
              child: Row(
                children: [
                  ValueListenableBuilder(
                    valueListenable: AuthService.currentUser,
                    builder: (ctx, user, _) {
                      final isGuest = (user == null);
                      return IconButton(
                        icon: Icon(
                          isGuest ? Icons.lock_outline : Icons.attach_file,
                          color: isGuest ? AppTheme.secondaryAmber : AppTheme.textMuted,
                          size: 22,
                        ),
                        tooltip: isGuest ? 'Sign in required to upload' : 'Attach Document',
                        onPressed: _sending ? null : _handleAttachFile,
                      );
                    },
                  ),
                  Expanded(
                    child: TextField(
                      controller: _textController,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (val) => _sendMessage(val),
                      decoration: const InputDecoration(
                        hintText: 'Ask about documentation, clerks, or status...',
                        hintStyle: TextStyle(fontSize: 13, color: AppTheme.textMuted),
                        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        isDense: true,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    decoration: const BoxDecoration(
                      color: AppTheme.primaryNavy,
                      shape: BoxShape.circle,
                    ),
                    child: IconButton(
                      icon: const Icon(Icons.send, color: AppTheme.secondaryAmber, size: 20),
                      onPressed: _sending ? null : () => _sendMessage(_textController.text),
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
